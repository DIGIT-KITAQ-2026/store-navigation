import { cookies } from "next/headers";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import type { ClaudeSearchMatch } from "@/lib/aiSearch/searchProductsWithClaude";
import { searchProductsWithClip } from "@/lib/aiSearch/searchProductsWithClip";
import { fallbackSearch } from "@/lib/aiSearch/fallbackSearch";
import { fetchStoreCatalog, mapMatchesToResults } from "@/lib/aiSearch/catalog";
import { translateProducts } from "@/lib/translate/productTranslation";
import { DEFAULT_LOCALE, LOCALE_COOKIE_NAME, isLocale } from "@/lib/i18n/locales";
import type { SearchResultItem } from "@/types/product";
import { fetchCategoryKeywordIndex } from "@/lib/category/fetchCategories";
import { matchProductsByCategory } from "@/lib/category/categoryMatch";
import { mergeSearchMatches } from "@/lib/category/mergeSearchMatches";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const query = typeof body?.query === "string" ? body.query.trim() : "";

  if (query.length === 0) {
    return Response.json({ results: [] satisfies SearchResultItem[] });
  }

  const cookieStore = await cookies();
  const localeCookie = cookieStore.get(LOCALE_COOKIE_NAME)?.value;
  const locale = isLocale(localeCookie) ? localeCookie : DEFAULT_LOCALE;

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
  const { catalog, locationCodeByProductId, categoryIdByProductId } = catalogResult;

  // カテゴリDB(category_keywords)による検索。DBが未適用/障害中でも既存検索を止めないよう、
  // fetchCategoryKeywordIndex自体が内部で失敗を吸収して空配列を返す(詳細はそちらのコメント参照)。
  const categoryKeywordIndex = await fetchCategoryKeywordIndex(supabase);
  const categoryMatches = matchProductsByCategory(
    query,
    catalog,
    categoryIdByProductId,
    categoryKeywordIndex,
    locale
  );

  let matches: ClaudeSearchMatch[];
  let usedFallback = false;
  try {
    matches = await searchProductsWithClip(query, catalog, locale);
  } catch (error) {
    console.error("[api/search] CLIPによるAI検索に失敗したため、通常検索にフォールバックします", error);
    matches = fallbackSearch(query, catalog, locale);
    usedFallback = true;
  }

  // カテゴリ一致商品を優先しつつ、既存検索(文字列一致→意味検索)内部の順序は変更しない
  const mergedMatches = mergeSearchMatches(categoryMatches, matches);
  const results: SearchResultItem[] = mapMatchesToResults(mergedMatches, catalog, locationCodeByProductId);
  const translatedProducts = await translateProducts(
    results.map((result) => result.product),
    locale
  );
  const translatedResults: SearchResultItem[] = results.map((result, index) => ({
    ...result,
    product: translatedProducts[index],
  }));

  return Response.json({ results: translatedResults, usedFallback });
}
