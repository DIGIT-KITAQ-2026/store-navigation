import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { requireAdminSession, adminAuthErrorResponse } from "@/lib/supabase/adminAuth";
import type { InventoryHistoryRow } from "@/lib/inventory/inventoryHistory";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

const SHELF_CODES = new Set([
  "Shelf_01",
  "Shelf_02",
  "Shelf_03",
  "Shelf_04",
  "Shelf_05",
  "Shelf_06",
  "Shelf_07",
  "Shelf_08",
]);
const STOCK_FILTERS = new Set(["available", "outOfStock"]);

/** 未指定はデフォルト値。指定されていて不正な場合だけnull(呼び出し側で400にする)。 */
function parseLimit(raw: string | null): number | null {
  if (raw === null) return DEFAULT_LIMIT;
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0 || value > MAX_LIMIT) return null;
  return value;
}

function parseOffset(raw: string | null): number | null {
  if (raw === null) return 0;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 0) return null;
  return value;
}

/**
 * 確定取込済みの棚卸し結果(inventory_counts)を一覧取得する読み取り専用API。
 * 管理者認証必須・現在の管理者が所属するstore_idだけに絞り込む(他店舗のデータは返さない)。
 * product_name自体はinventory_countsに保存されていない(CSVのproduct_nameはinsert時に
 * 保持しない設計 - src/app/api/admin/inventory/import/route.ts参照)ため、
 * products.nameが解決できる行だけ商品名を返し、できない行はnullのまま返す
 * (呼び出し側で「商品未登録」等と表示し、推測した名前を表示しない)。
 */
export async function GET(request: Request) {
  const session = await requireAdminSession();
  if (!session.ok) return adminAuthErrorResponse(session);
  const { storeId } = session;

  const url = new URL(request.url);
  const limit = parseLimit(url.searchParams.get("limit"));
  if (limit === null) {
    return Response.json({ error: `limitは1以上${MAX_LIMIT}以下の整数で指定してください` }, { status: 400 });
  }
  const offset = parseOffset(url.searchParams.get("offset"));
  if (offset === null) {
    return Response.json({ error: "offsetは0以上の整数で指定してください" }, { status: 400 });
  }
  const shelfCode = url.searchParams.get("shelf")?.trim() || null;
  if (shelfCode !== null && !SHELF_CODES.has(shelfCode)) {
    return Response.json({ error: "shelfの指定が不正です" }, { status: 400 });
  }
  const stockParam = url.searchParams.get("stock");
  if (stockParam !== null && !STOCK_FILTERS.has(stockParam)) {
    return Response.json({ error: "stockの指定が不正です" }, { status: 400 });
  }
  const stockFilter = stockParam;

  let supabase;
  try {
    supabase = createSupabaseServiceClient();
  } catch (error) {
    console.error("[api/admin/inventory/history] Supabaseクライアントの初期化に失敗しました", error);
    return Response.json({ error: "サーバー設定が不足しています" }, { status: 500 });
  }

  let shelfLocationId: string | null = null;
  if (shelfCode) {
    const { data: shelf, error: shelfError } = await supabase
      .from("shelf_locations")
      .select("id")
      .eq("store_id", storeId)
      .eq("location_code", shelfCode)
      .maybeSingle();
    if (shelfError) {
      console.error("[api/admin/inventory/history] 棚の取得に失敗しました", shelfError);
      return Response.json({ error: "棚卸履歴の取得に失敗しました" }, { status: 500 });
    }
    if (!shelf) {
      return Response.json({ rows: [], hasMore: false, total: 0 });
    }
    shelfLocationId = shelf.id;
  }

  let query = supabase
    .from("inventory_counts")
    .select(
      "id, counted_at, sku, jan_code, unit, actual_stock, book_stock, product_id, products(name), categories(code, name), shelf_locations(location_code)",
      { count: "exact" }
    )
    .eq("store_id", storeId)
    .order("counted_at", { ascending: false })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (shelfLocationId) query = query.eq("shelf_location_id", shelfLocationId);
  if (stockFilter === "available") query = query.gt("actual_stock", 0);
  if (stockFilter === "outOfStock") query = query.eq("actual_stock", 0);

  const { data, error, count } = await query;

  if (error) {
    console.error("[api/admin/inventory/history] 棚卸履歴の取得に失敗しました", error);
    return Response.json({ error: "棚卸履歴の取得に失敗しました" }, { status: 500 });
  }

  const rows: InventoryHistoryRow[] = (data ?? []).map((row) => ({
    id: row.id,
    countedAt: row.counted_at,
    sku: row.sku,
    janCode: row.jan_code,
    unit: row.unit,
    actualStock: row.actual_stock,
    bookStock: row.book_stock,
    productId: row.product_id,
    productName: row.products?.name ?? null,
    categoryCode: row.categories?.code ?? null,
    categoryName: row.categories?.name ?? null,
    shelfCode: row.shelf_locations?.location_code ?? null,
  }));

  const hasMore = typeof count === "number" ? offset + rows.length < count : rows.length === limit;

  return Response.json({ rows, hasMore, total: count ?? null });
}
