import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { CatalogItem, ClaudeSearchMatch } from "./searchProductsWithClaude";
import type { SearchResultItem } from "@/types/product";

function toShelfNumber(locationCode: string): string {
  return locationCode.replace(/^Shelf_/, "");
}

/** 単一デモ店舗のMVPスコープのため、最初の店舗の全商品を検索対象カタログとして取得する */
export async function fetchStoreCatalog(supabase: SupabaseClient<Database>): Promise<{
  catalog: CatalogItem[];
  locationCodeByProductId: Map<string, string>;
} | null> {
  const { data: store, error: storeError } = await supabase
    .from("stores")
    .select("id")
    .limit(1)
    .single();

  if (storeError || !store) return null;

  const { data: products, error: productsError } = await supabase
    .from("products")
    .select("id, name, category, description, shelves(shelf_locations(location_code))")
    .eq("store_id", store.id);

  if (productsError) return null;

  const catalog: CatalogItem[] = (products ?? []).map((product) => ({
    id: product.id,
    name: product.name,
    category: product.category,
    description: product.description,
  }));

  const locationCodeByProductId = new Map<string, string>();
  for (const product of products ?? []) {
    const locationCode = product.shelves?.shelf_locations?.location_code;
    if (locationCode) locationCodeByProductId.set(product.id, locationCode);
  }

  return { catalog, locationCodeByProductId };
}

/** AIの一致結果を、実在するカタログ商品・棚位置とだけ突き合わせてUI表示用の形に変換する */
export function mapMatchesToResults(
  matches: ClaudeSearchMatch[],
  catalog: CatalogItem[],
  locationCodeByProductId: Map<string, string>
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
        },
        matchReason: match.reason,
      };
    })
    .filter((result): result is SearchResultItem => result !== null);
}
