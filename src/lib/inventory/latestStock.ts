import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

export interface LatestStockRow {
  actualStock: number;
  unit: string | null;
  countedAt: string;
}

export interface StockLookupTarget {
  productId: string | null;
  shelfLocationId: string | null;
}

export interface LatestStockMaps {
  /** 商品(product_id)単位の最新棚卸行。商品ごとの実地棚卸があれば最優先で使う。 */
  byProductId: Map<string, LatestStockRow>;
  /**
   * 棚(shelf_location_id)単位の最新棚卸行(product_id IS NULLの行のみ)。
   * 商品未登録SKUの棚卸し(jan_codeが空、または一致する商品がない行)は、この棚に属する
   * 商品の在庫状態のフォールバックとして使う(docs/データベース設計.md 8.6節の設計意図に沿った
   * 解釈。「商品ごとの最新棚卸」を商品IDで厳密に取れない場合の代替であり、仕様書に明記された
   * 挙動ではないため注意)。
   */
  byShelfLocationId: Map<string, LatestStockRow>;
}

function reduceLatestByKey<Row extends { counted_at: string; actual_stock: number; unit: string | null }>(
  rows: Row[],
  keyOf: (row: Row) => string | null
): Map<string, LatestStockRow> {
  const result = new Map<string, LatestStockRow>();
  for (const row of rows) {
    const key = keyOf(row);
    if (key === null) continue;
    // 呼び出し側で counted_at DESC, created_at DESC 済みの結果を渡す前提。
    // 同一キーで最初に出てきた行(=最新)だけを残す。
    if (!result.has(key)) {
      result.set(key, { actualStock: row.actual_stock, unit: row.unit, countedAt: row.counted_at });
    }
  }
  return result;
}

/**
 * 対象の商品ID・棚IDに関係するinventory_countsの最新行だけをまとめて取得する。
 * PostgREST(Supabase JSクライアント)にはDISTINCT ONに相当する機能がないため、
 * counted_at DESC, created_at DESCで並べ替えたうえで、同一キーの最初の行(=最新)だけを
 * クライアント側で残す(RPC・新規Migrationなしで実現できる範囲での最小限の集計)。
 * 対象store_id・対象IDに絞り込んだ問い合わせのみ行い、テーブル全件は取得しない。
 *
 * 同時刻(counted_at)が複数ある場合のタイブレークはcreated_atの降順とする
 * (安定した順序の仕様が確認できなかったための実装判断)。
 */
export async function fetchLatestStockForStore(
  supabase: SupabaseClient<Database>,
  storeId: string,
  targets: StockLookupTarget[]
): Promise<LatestStockMaps> {
  const productIds = [...new Set(targets.map((t) => t.productId).filter((v): v is string => !!v))];
  const shelfLocationIds = [
    ...new Set(targets.map((t) => t.shelfLocationId).filter((v): v is string => !!v)),
  ];

  let byProductId = new Map<string, LatestStockRow>();
  if (productIds.length > 0) {
    const { data, error } = await supabase
      .from("inventory_counts")
      .select("product_id, actual_stock, unit, counted_at, created_at")
      .eq("store_id", storeId)
      .in("product_id", productIds)
      .order("counted_at", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) throw error;
    byProductId = reduceLatestByKey(data ?? [], (row) => row.product_id);
  }

  let byShelfLocationId = new Map<string, LatestStockRow>();
  if (shelfLocationIds.length > 0) {
    const { data, error } = await supabase
      .from("inventory_counts")
      .select("shelf_location_id, actual_stock, unit, counted_at, created_at")
      .eq("store_id", storeId)
      .is("product_id", null)
      .in("shelf_location_id", shelfLocationIds)
      .order("counted_at", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) throw error;
    byShelfLocationId = reduceLatestByKey(data ?? [], (row) => row.shelf_location_id);
  }

  return { byProductId, byShelfLocationId };
}

/**
 * 商品ごとの最新在庫を解決する。商品IDに紐づく棚卸し行を最優先し、無ければ同じ棚の
 * (商品未登録の)棚卸し行にフォールバックする。どちらもなければnull(=在庫情報なし)。
 */
export function resolveLatestStock(
  target: StockLookupTarget,
  maps: LatestStockMaps
): LatestStockRow | null {
  if (target.productId) {
    const byProduct = maps.byProductId.get(target.productId);
    if (byProduct) return byProduct;
  }
  if (target.shelfLocationId) {
    const byShelf = maps.byShelfLocationId.get(target.shelfLocationId);
    if (byShelf) return byShelf;
  }
  return null;
}
