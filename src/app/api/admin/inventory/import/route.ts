import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { requireAdminSession, adminAuthErrorResponse } from "@/lib/supabase/adminAuth";
import { validateInventoryCsv, type InventoryCsvRowResult } from "@/lib/inventory/validateInventoryCsv";
import { decodeCsvBytes } from "@/lib/inventory/decodeCsvBytes";
import type { Database } from "@/lib/supabase/database.types";

type InventoryCountInsert = Database["public"]["Tables"]["inventory_counts"]["Insert"];

function toInsertRow(
  row: InventoryCsvRowResult,
  storeId: string,
  now: string
): InventoryCountInsert | null {
  if (row.parsed.actualStock === null || row.parsed.countedAtIso === null) return null;

  return {
    store_id: storeId,
    product_id: row.resolved.productId,
    shelf_location_id: row.resolved.shelfLocationId,
    sku: row.raw.sku,
    jan_code: row.raw.janCode.length > 0 ? row.raw.janCode : null,
    category_id: row.resolved.categoryId,
    book_stock: row.parsed.bookStock,
    actual_stock: row.parsed.actualStock,
    unit: row.raw.unit.length > 0 ? row.raw.unit : null,
    cost_price: row.parsed.costPrice,
    selling_price: row.parsed.sellingPrice,
    counted_at: row.parsed.countedAtIso,
    created_at: now,
    updated_at: now,
  };
}

// 棚卸しCSVの確定取込API。プレビューAPIと同じ検証をここでも必ず再実行し
// (クライアント側の検証だけを信用しない)、1件でもerror行があれば何も保存せず中断する。
// 保存は1回のinsert(複数行)にまとめる。PostgRESTの複数行insertはPostgres側で単一の
// INSERT文として実行されるため、これ自体で「一部の行だけ保存される」状態を避けられる
// (このスコープでは追加のRPC・トランザクション制御は導入しない)。
export async function POST(request: Request) {
  const session = await requireAdminSession();
  if (!session.ok) return adminAuthErrorResponse(session);
  const { storeId } = session;

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");
  if (!(file instanceof Blob)) {
    return Response.json({ error: "CSVファイルが指定されていません" }, { status: 400 });
  }

  const decoded = decodeCsvBytes(new Uint8Array(await file.arrayBuffer()));
  if (!decoded.ok) {
    return Response.json({ error: decoded.error }, { status: 400 });
  }

  let supabase;
  try {
    supabase = createSupabaseServiceClient();
  } catch (error) {
    console.error("[api/admin/inventory/import] Supabaseクライアントの初期化に失敗しました", error);
    return Response.json({ error: "サーバー設定が不足しています" }, { status: 500 });
  }

  const { data: store, error: storeError } = await supabase
    .from("stores")
    .select("entry_qr_code")
    .eq("id", storeId)
    .maybeSingle();

  if (storeError || !store) {
    console.error("[api/admin/inventory/import] 店舗情報の取得に失敗しました", storeError);
    return Response.json({ error: "店舗情報の取得に失敗しました" }, { status: 500 });
  }

  let result;
  try {
    result = await validateInventoryCsv(decoded.text, {
      supabase,
      storeId,
      storeEntryQrCode: store.entry_qr_code,
    });
  } catch (error) {
    console.error("[api/admin/inventory/import] CSVの検証に失敗しました", error);
    return Response.json({ error: "CSVの検証に失敗しました" }, { status: 500 });
  }

  if (result.fileError) {
    return Response.json({ error: result.fileError }, { status: 400 });
  }
  if (result.summary.errorRows > 0) {
    return Response.json(
      {
        error: "エラーのある行が含まれています。内容を修正してから再度取り込んでください。",
        summary: result.summary,
        rows: result.rows,
      },
      { status: 400 }
    );
  }

  const now = new Date().toISOString();
  const insertRows = result.rows
    .map((row) => toInsertRow(row, storeId, now))
    .filter((row): row is InventoryCountInsert => row !== null);

  if (insertRows.length !== result.rows.length) {
    // errorRows === 0のはずなのに数値/日時が解決できない行がある=検証ロジックの不整合。
    // 誤ったデータを保存するより、ここで止めて報告する方が安全
    console.error("[api/admin/inventory/import] 検証済みのはずの行で必須値が欠落しています");
    return Response.json({ error: "CSVの検証結果が不整合のため中断しました" }, { status: 500 });
  }
  if (insertRows.length === 0) {
    return Response.json({ error: "保存対象の行がありません" }, { status: 400 });
  }

  const { error: insertError } = await supabase.from("inventory_counts").insert(insertRows);

  if (insertError) {
    if (insertError.code === "23505") {
      return Response.json(
        { error: "同じ店舗・sku・counted_atの組み合わせが既に登録されています。counted_atを確認してください。" },
        { status: 409 }
      );
    }
    console.error("[api/admin/inventory/import] 棚卸しデータの保存に失敗しました", insertError);
    return Response.json({ error: "棚卸しデータの保存に失敗しました: " + insertError.message }, { status: 400 });
  }

  return Response.json({ ok: true, insertedCount: insertRows.length });
}
