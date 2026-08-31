import { createSupabaseServiceClient } from "@/lib/supabase/server";
import {
  searchProductsWithClaude,
  type CatalogItem,
  type ClaudeSearchMatch,
} from "@/lib/aiSearch/searchProductsWithClaude";
import { fallbackSearch } from "@/lib/aiSearch/fallbackSearch";
import type { SearchResultItem } from "@/types/product";

function toShelfNumber(locationCode: string): string {
  return locationCode.replace(/^Shelf_/, "");
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const query = typeof body?.query === "string" ? body.query.trim() : "";

  if (query.length === 0) {
    return Response.json({ results: [] satisfies SearchResultItem[] });
  }

  let supabase;
  try {
    supabase = createSupabaseServiceClient();
  } catch (error) {
    console.error("[api/search] Supabaseクライアントの初期化に失敗しました", error);
    return Response.json({ error: "サーバー設定が不足しています" }, { status: 500 });
  }

  const { data: store, error: storeError } = await supabase
    .from("stores")
    .select("id")
    .limit(1)
    .single();

  if (storeError || !store) {
    return Response.json({ error: "店舗情報の取得に失敗しました" }, { status: 500 });
  }

  const { data: products, error: productsError } = await supabase
    .from("products")
    .select("id, name, category, description, shelves(shelf_locations(location_code))")
    .eq("store_id", store.id);

  if (productsError) {
    return Response.json({ error: "商品情報の取得に失敗しました" }, { status: 500 });
  }

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

  let matches: ClaudeSearchMatch[];
  let usedFallback = false;
  try {
    matches = await searchProductsWithClaude(query, catalog);
  } catch (error) {
    console.error("[api/search] claude CLIによるAI検索に失敗したため、通常検索にフォールバックします", error);
    matches = fallbackSearch(query, catalog);
    usedFallback = true;
  }

  const catalogById = new Map(catalog.map((item) => [item.id, item]));

  const results: SearchResultItem[] = matches
    .map((match) => {
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

  return Response.json({ results, usedFallback });
}
