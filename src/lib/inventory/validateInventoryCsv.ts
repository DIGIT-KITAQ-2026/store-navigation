import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { parseCsv } from "./parseCsv";
import { findMissingRequiredColumns, type CsvColumn } from "./csvSchema";
import { parseNonNegativeInteger, parseNonNegativeNumber, parseCountedAt } from "./csvFieldParsers";
import { getActiveCategories } from "@/lib/category/fetchCategories";

export const MAX_CSV_CHARACTERS = 2_000_000; // 概ね2MB相当(UTF-8で1文字最大3バイト換算でも安全側)
export const MAX_CSV_DATA_ROWS = 2000;

export type InventoryCsvRowStatus = "ok" | "warning" | "error";

export interface InventoryCsvRowResult {
  /** ヘッダー行を1行目とした、Excel等で見たときの行番号(データ行は2始まり) */
  rowNumber: number;
  status: InventoryCsvRowStatus;
  messages: string[];
  raw: {
    storeCode: string;
    shelfCode: string;
    sku: string;
    productName: string;
    categoryCode: string;
    actualStock: string;
    countedAt: string;
    janCode: string;
    bookStock: string;
    unit: string;
    costPrice: string;
    sellingPrice: string;
  };
  parsed: {
    actualStock: number | null;
    bookStock: number | null;
    costPrice: number | null;
    sellingPrice: number | null;
    countedAtIso: string | null;
  };
  resolved: {
    categoryId: string | null;
    shelfLocationId: string | null;
    productId: string | null;
  };
}

export interface InventoryCsvValidationResult {
  /** ファイル全体が原因で1行も検証できなかった場合のみ設定される(この場合rowsは空) */
  fileError?: string;
  summary: {
    totalRows: number;
    okRows: number;
    warningRows: number;
    errorRows: number;
  };
  rows: InventoryCsvRowResult[];
}

interface ValidateInventoryCsvOptions {
  supabase: SupabaseClient<Database>;
  /** 認証済み管理者のprofiles.store_id(正本)。CSV内のstore_codeの照合先はこのstoreIdの店舗 */
  storeId: string;
  /** storeIdに対応する店舗のstores.entry_qr_code。CSVのstore_code列と比較する */
  storeEntryQrCode: string;
}

function emptyResult(fileError: string): InventoryCsvValidationResult {
  return { fileError, summary: { totalRows: 0, okRows: 0, warningRows: 0, errorRows: 0 }, rows: [] };
}

function getCell(cells: string[], index: number | undefined): string {
  if (index === undefined) return "";
  return (cells[index] ?? "").trim();
}

/**
 * 棚卸しCSVを解析し、店舗・カテゴリ・棚・商品との整合性を検証する。
 * プレビューAPI・確定(import)APIの両方から同じ関数を呼び、必ずサーバー側で再検証する
 * (クライアント側の検証だけを信用しない)。
 *
 * 行ごとの判定は3段階:
 * - error: この行はinventory_countsへ保存しない(必須項目欠落・重複SKU・不明なカテゴリ/棚・
 *   他店舗の棚や商品・カテゴリ不一致・不正な数値/日時など)
 * - warning: 保存はするが注意が必要(jan_codeで商品が特定できない=product_idはnullで保存)
 * - ok: そのまま保存可能
 *
 * 確定(import)側は、1件でもerror行があれば全体を中断する(一部の行だけ保存された
 * 中途半端な状態を避けるため)。
 */
export async function validateInventoryCsv(
  csvText: string,
  { supabase, storeId, storeEntryQrCode }: ValidateInventoryCsvOptions
): Promise<InventoryCsvValidationResult> {
  // 文字コード起因の文字化け(UTF-8以外で保存されたCSV等)を検出する。BOM付きUTF-8は許容する
  const withoutBom = csvText.startsWith("﻿") ? csvText.slice(1) : csvText;

  if (withoutBom.length > MAX_CSV_CHARACTERS) {
    return emptyResult("ファイルサイズが大きすぎます。行数を分けて取り込んでください。");
  }
  if (withoutBom.includes("�")) {
    return emptyResult("文字コードが不正な可能性があります。UTF-8で保存し直してください。");
  }
  if (withoutBom.trim().length === 0) {
    return emptyResult("ファイルが空です。");
  }

  const table = parseCsv(withoutBom);
  if (table.length === 0) {
    return emptyResult("ファイルが空です。");
  }

  const [header, ...dataRows] = table;
  const missingColumns = findMissingRequiredColumns(header);
  if (missingColumns.length > 0) {
    return emptyResult(`必須列が不足しています: ${missingColumns.join(", ")}`);
  }
  if (dataRows.length === 0) {
    return emptyResult("データ行がありません。");
  }
  if (dataRows.length > MAX_CSV_DATA_ROWS) {
    return emptyResult(`データ行が多すぎます(最大${MAX_CSV_DATA_ROWS}行)。ファイルを分割してください。`);
  }

  const columnIndex = new Map<string, number>();
  header.forEach((column, index) => {
    const trimmed = column.trim();
    if (!columnIndex.has(trimmed)) columnIndex.set(trimmed, index);
  });
  const indexOf = (column: CsvColumn) => columnIndex.get(column);

  const rows: InventoryCsvRowResult[] = dataRows.map((cells, i) => {
    const rowNumber = i + 2;
    const messages: string[] = [];

    if (cells.length !== header.length) {
      return {
        rowNumber,
        status: "error",
        messages: ["列の数がヘッダーと一致しません。"],
        raw: {
          storeCode: "",
          shelfCode: "",
          sku: "",
          productName: "",
          categoryCode: "",
          actualStock: "",
          countedAt: "",
          janCode: "",
          bookStock: "",
          unit: "",
          costPrice: "",
          sellingPrice: "",
        },
        parsed: { actualStock: null, bookStock: null, costPrice: null, sellingPrice: null, countedAtIso: null },
        resolved: { categoryId: null, shelfLocationId: null, productId: null },
      };
    }

    const raw = {
      storeCode: getCell(cells, indexOf("store_code")),
      shelfCode: getCell(cells, indexOf("shelf_code")),
      sku: getCell(cells, indexOf("sku")),
      productName: getCell(cells, indexOf("product_name")),
      categoryCode: getCell(cells, indexOf("category_code")),
      actualStock: getCell(cells, indexOf("actual_stock")),
      countedAt: getCell(cells, indexOf("counted_at")),
      janCode: getCell(cells, indexOf("jan_code")),
      bookStock: getCell(cells, indexOf("book_stock")),
      unit: getCell(cells, indexOf("unit")),
      costPrice: getCell(cells, indexOf("cost_price")),
      sellingPrice: getCell(cells, indexOf("selling_price")),
    };

    if (raw.storeCode.length === 0) messages.push("store_codeが空です。");
    if (raw.shelfCode.length === 0) messages.push("shelf_codeが空です。");
    if (raw.sku.length === 0) messages.push("skuが空です。");
    if (raw.productName.length === 0) messages.push("product_nameが空です。");
    if (raw.categoryCode.length === 0) messages.push("category_codeが空です。");

    const actualStock = parseNonNegativeInteger(raw.actualStock);
    if (actualStock === null) messages.push("actual_stockは0以上の整数で入力してください。");

    const countedAtIso = parseCountedAt(raw.countedAt);
    if (countedAtIso === null) {
      messages.push("counted_atはYYYY-MM-DDまたはYYYY-MM-DD HH:mm形式で入力してください。");
    }

    let bookStock: number | null = null;
    if (raw.bookStock.length > 0) {
      bookStock = parseNonNegativeInteger(raw.bookStock);
      if (bookStock === null) messages.push("book_stockは空欄または0以上の整数で入力してください。");
    }

    let costPrice: number | null = null;
    if (raw.costPrice.length > 0) {
      costPrice = parseNonNegativeNumber(raw.costPrice);
      if (costPrice === null) messages.push("cost_priceは空欄または0以上の数値で入力してください。");
    }

    let sellingPrice: number | null = null;
    if (raw.sellingPrice.length > 0) {
      sellingPrice = parseNonNegativeNumber(raw.sellingPrice);
      if (sellingPrice === null) messages.push("selling_priceは空欄または0以上の数値で入力してください。");
    }

    if (raw.storeCode.length > 0 && raw.storeCode !== storeEntryQrCode) {
      messages.push("store_codeが担当店舗と一致しません。");
    }

    return {
      rowNumber,
      status: messages.length > 0 ? "error" : "ok",
      messages,
      raw,
      parsed: {
        actualStock,
        bookStock,
        costPrice,
        sellingPrice,
        countedAtIso,
      },
      resolved: { categoryId: null, shelfLocationId: null, productId: null },
    };
  });

  // 同一CSV内のSKU重複を検出する(空のskuは対象外。空チェックは別メッセージで既に付与済み)
  const skuCounts = new Map<string, number>();
  for (const row of rows) {
    if (row.raw.sku.length === 0) continue;
    skuCounts.set(row.raw.sku, (skuCounts.get(row.raw.sku) ?? 0) + 1);
  }
  for (const row of rows) {
    if (row.raw.sku.length === 0) continue;
    if ((skuCounts.get(row.raw.sku) ?? 0) > 1) {
      row.messages.push("このskuはCSV内で重複しています。");
      row.status = "error";
    }
  }

  // --- ここから店舗・カテゴリ・棚・商品DBとの突き合わせ(まとめて取得しN+1を避ける) ---

  const categories = await getActiveCategories(supabase);
  const categoryByCode = new Map(categories.map((category) => [category.code, category]));

  const shelfCodes = [...new Set(rows.map((row) => row.raw.shelfCode).filter((code) => code.length > 0))];
  const { data: ourShelvesData, error: ourShelvesError } = await supabase
    .from("shelf_locations")
    .select("id, location_code, category_id")
    .eq("store_id", storeId)
    .in("location_code", shelfCodes.length > 0 ? shelfCodes : [""]);
  if (ourShelvesError) throw ourShelvesError;
  const ourShelfByCode = new Map((ourShelvesData ?? []).map((shelf) => [shelf.location_code, shelf]));

  const missingShelfCodes = shelfCodes.filter((code) => !ourShelfByCode.has(code));
  const otherStoreShelfCodes = new Set<string>();
  if (missingShelfCodes.length > 0) {
    const { data: anyShelvesData, error: anyShelvesError } = await supabase
      .from("shelf_locations")
      .select("location_code")
      .in("location_code", missingShelfCodes);
    if (anyShelvesError) throw anyShelvesError;
    for (const shelf of anyShelvesData ?? []) otherStoreShelfCodes.add(shelf.location_code);
  }

  const janCodes = [...new Set(rows.map((row) => row.raw.janCode).filter((code) => code.length > 0))];
  const { data: productsData, error: productsError } =
    janCodes.length > 0
      ? await supabase.from("products").select("id, barcode, store_id, category_id").in("barcode", janCodes)
      : { data: [], error: null };
  if (productsError) throw productsError;
  const productByBarcode = new Map((productsData ?? []).map((product) => [product.barcode, product]));

  for (const row of rows) {
    const category = row.raw.categoryCode.length > 0 ? categoryByCode.get(row.raw.categoryCode) : undefined;
    if (row.raw.categoryCode.length > 0 && !category) {
      row.messages.push("category_codeが登録されているカテゴリに見つかりません。");
      row.status = "error";
    }
    if (category) row.resolved.categoryId = category.id;

    if (row.raw.shelfCode.length > 0) {
      const ourShelf = ourShelfByCode.get(row.raw.shelfCode);
      if (ourShelf) {
        row.resolved.shelfLocationId = ourShelf.id;
        if (category && ourShelf.category_id && ourShelf.category_id !== category.id) {
          row.messages.push("category_codeがこの棚に設定されているカテゴリと一致しません。");
          row.status = "error";
        }
      } else if (otherStoreShelfCodes.has(row.raw.shelfCode)) {
        row.messages.push("shelf_codeは他店舗の棚です。");
        row.status = "error";
      } else {
        row.messages.push("shelf_codeに一致する棚が見つかりません。");
        row.status = "error";
      }
    }

    if (row.raw.janCode.length > 0) {
      const product = productByBarcode.get(row.raw.janCode);
      if (product && product.store_id !== storeId) {
        row.messages.push("jan_codeが他店舗の商品と一致しました。");
        row.status = "error";
      } else if (product) {
        row.resolved.productId = product.id;
        if (category && product.category_id && product.category_id !== category.id) {
          row.messages.push("category_codeが登録済み商品のカテゴリと一致しません。");
          row.status = "error";
        }
      }
    }

    if (!row.resolved.productId && row.status !== "error") {
      row.messages.push("商品未登録のため、product_idなしで棚卸しデータとして保存します。");
      row.status = "warning";
    }
  }

  const summary = rows.reduce(
    (acc, row) => {
      acc.totalRows += 1;
      if (row.status === "ok") acc.okRows += 1;
      else if (row.status === "warning") acc.warningRows += 1;
      else acc.errorRows += 1;
      return acc;
    },
    { totalRows: 0, okRows: 0, warningRows: 0, errorRows: 0 }
  );

  return { summary, rows };
}
