import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { CatalogItem, ClaudeSearchMatch } from "./searchProductsWithClaude";
import type { SearchResultItem } from "@/types/product";
import { fetchLatestStockForStore, resolveLatestStock } from "@/lib/inventory/latestStock";
import { buildStockInfo, UNKNOWN_STOCK_INFO, type StockInfo } from "@/lib/inventory/stockStatus";

function toShelfNumber(locationCode: string): string {
  return locationCode.replace(/^Shelf_/, "");
}

/**
 * 単一デモ店舗のMVPスコープのため、最初の店舗の全商品を検索対象カタログとして取得する。
 * category_idが未設定の商品(新カテゴリ体系への移行前の旧商品)は、物理棚の再割り当てが
 * 済んでおらず案内先が実態と一致しないため、検索対象から除外する。
 */
export async function fetchStoreCatalog(supabase: SupabaseClient<Database>): Promise<{
  catalog: CatalogItem[];
  locationCodeByProductId: Map<string, string>;
  categoryIdByProductId: Map<string, string>;
  stockInfoByProductId: Map<string, StockInfo>;
} | null> {
  const { data: store, error: storeError } = await supabase
    .from("stores")
    .select("id")
    .limit(1)
    .single();

  if (storeError || !store) return null;

  const { data: products, error: productsError } = await supabase
    .from("products")
    .select("id, name, category, category_id, description, shelves(shelf_locations(id, location_code))")
    .eq("store_id", store.id)
    .not("category_id", "is", null);

  if (productsError) return null;

  const catalog: CatalogItem[] = (products ?? []).map((product) => ({
    id: product.id,
    name: product.name,
    category: product.category,
    description: product.description,
  }));

  const locationCodeByProductId = new Map<string, string>();
  const categoryIdByProductId = new Map<string, string>();
  const shelfLocationIdByProductId = new Map<string, string>();
  for (const product of products ?? []) {
    const shelfLocation = product.shelves?.shelf_locations;
    if (shelfLocation?.location_code) locationCodeByProductId.set(product.id, shelfLocation.location_code);
    if (shelfLocation?.id) shelfLocationIdByProductId.set(product.id, shelfLocation.id);
    if (product.category_id) categoryIdByProductId.set(product.id, product.category_id);
  }

  const stockMaps = await fetchLatestStockForStore(
    supabase,
    store.id,
    (products ?? []).map((product) => ({
      productId: product.id,
      shelfLocationId: shelfLocationIdByProductId.get(product.id) ?? null,
    }))
  );
  const stockInfoByProductId = new Map<string, StockInfo>();
  for (const product of products ?? []) {
    const target = {
      productId: product.id,
      shelfLocationId: shelfLocationIdByProductId.get(product.id) ?? null,
    };
    stockInfoByProductId.set(product.id, buildStockInfo(resolveLatestStock(target, stockMaps)));
  }

  return { catalog, locationCodeByProductId, categoryIdByProductId, stockInfoByProductId };
}

/** AIの一致結果を、実在するカタログ商品・棚位置とだけ突き合わせてUI表示用の形に変換する */
export function mapMatchesToResults(
  matches: ClaudeSearchMatch[],
  catalog: CatalogItem[],
  locationCodeByProductId: Map<string, string>,
  stockInfoByProductId: Map<string, StockInfo>
): SearchResultItem[] {
  const catalogById = new Map(catalog.map((item) => [item.id, item]));

  return matches
    .map((match): SearchResultItem | null => {
      const product = catalogById.get(match.productId);
      const locationCode = locationCodeByProductId.get(match.productId);
      if (!product || !locationCode) return null;

      return {
        product: {
          id: product.id,
          name: product.name,
          category: product.category ?? "",
          shelfId: locationCode,
          shelfNumber: toShelfNumber(locationCode),
          description: product.description ?? "",
          stock: stockInfoByProductId.get(product.id) ?? UNKNOWN_STOCK_INFO,
        },
        matchReason: match.reason,
      };
    })
    .filter((result): result is SearchResultItem => result !== null);
}
