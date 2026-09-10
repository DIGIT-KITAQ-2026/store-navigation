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
import { isProductNameQuery } from "@/lib/category/isProductNameQuery";
import { expandEmojiQuery } from "@/lib/aiSearch/emojiQueries";
import { rankMatches } from "@/lib/aiSearch/rankMatches";
import { expandIntentQuery } from "@/lib/aiSearch/intentQueries";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const rawQuery = typeof body?.query === "string" ? body.query.trim() : "";
  // 絵文字で検索されたら日本語に置き換えてから探す(「😷」→「マスク」)。
  // 続けて、意味検索が結び付けられない言い回しに商品の語を足す(「喉が渇いた」→ 緑茶)。
  // 以降の層(カテゴリ検索・文字列一致・意味検索)はすべてこの変換後の語を見る
  const query = expandIntentQuery(expandEmojiQuery(rawQuery));

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
  const { catalog, locationCodeByProductId, categoryIdByProductId, stockInfoByProductId } = catalogResult;

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

  // カテゴリ一致商品を優先しつつ、既存検索(文字列一致→意味検索)内部の順序は変更しない。
  // ただし商品名そのもので検索された場合は、その商品だけを返す。カテゴリ検索は一致した
  // カテゴリの商品を全件返すため、混ぜると「歯ブラシ」で衛生カテゴリの5商品が並んでしまう
  const categoryNames = [...new Set(categoryKeywordIndex.map((entry) => entry.categoryName))];
  const mergedMatches = isProductNameQuery(query, catalog, categoryNames)
    ? matches
    : mergeSearchMatches(categoryMatches, matches);
  // 左上から読まれるので、商品名が当たっている商品を先頭に寄せる
  const rankedMatches = rankMatches(query, mergedMatches, catalog);
  const results: SearchResultItem[] = mapMatchesToResults(
    rankedMatches,
    catalog,
    locationCodeByProductId,
    stockInfoByProductId
  );
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
