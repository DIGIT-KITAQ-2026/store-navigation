import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { searchProductsWithClaude, type ClaudeSearchMatch } from "@/lib/aiSearch/searchProductsWithClaude";
import { fallbackSearch } from "@/lib/aiSearch/fallbackSearch";
import { fetchStoreCatalog, mapMatchesToResults } from "@/lib/aiSearch/catalog";
import type { SearchResultItem } from "@/types/product";

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

  const catalogResult = await fetchStoreCatalog(supabase);
  if (!catalogResult) {
    return Response.json({ error: "店舗・商品情報の取得に失敗しました" }, { status: 500 });
  }
  const { catalog, locationCodeByProductId } = catalogResult;

  let matches: ClaudeSearchMatch[];
  let usedFallback = false;
  try {
    matches = await searchProductsWithClaude(query, catalog);
  } catch (error) {
    console.error("[api/search] claude CLIによるAI検索に失敗したため、通常検索にフォールバックします", error);
    matches = fallbackSearch(query, catalog);
    usedFallback = true;
  }

  const results: SearchResultItem[] = mapMatchesToResults(matches, catalog, locationCodeByProductId);

  return Response.json({ results, usedFallback });
}
