import type { ClaudeSearchMatch, CatalogItem } from "@/lib/aiSearch/searchProductsWithClaude";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/locales";
import { buildSearchReason } from "@/lib/aiSearch/searchReasons";
import { normalizeCategoryText } from "./normalize";
import type { CategoryKeywordIndexEntry } from "./fetchCategories";

/**
 * 短すぎるキーワードによる誤検出を避けるための、部分一致に必要な最小文字数。
 * 完全一致はこの長さ制限を受けない(現状の登録キーワードは最短でも2文字のため実害は無いが、
 * 将来1文字キーワードが追加された場合の事故を防ぐガード)。
 */
const MIN_SUBSTRING_KEYWORD_LENGTH = 2;

export interface CategoryMatch {
  categoryId: string;
  categoryCode: string;
  categoryName: string;
  matchedKeyword: string;
}

/**
 * 正規化済み検索語と、キーワード索引(category_keywords)を突き合わせて一致カテゴリを求める。
 * 完全一致に加え、検索語の文中にキーワードが含まれる場合も対象にする
 * (例:「歯磨き用品はどこ」→「歯磨き」を検出)。複数カテゴリが一致した場合は全て返す。
 * 純粋関数(DBアクセス無し)。
 */
export function findMatchingCategories(
  query: string,
  index: CategoryKeywordIndexEntry[]
): CategoryMatch[] {
  const normalizedQuery = normalizeCategoryText(query);
  if (normalizedQuery.length === 0) return [];

  const matchedByCategory = new Map<string, CategoryMatch>();

  for (const entry of index) {
    if (matchedByCategory.has(entry.categoryId)) continue;

    const keyword = entry.normalizedKeyword;
    if (keyword.length === 0) continue;

    const isExactMatch = normalizedQuery === keyword;
    const isContainedMatch =
      keyword.length >= MIN_SUBSTRING_KEYWORD_LENGTH && normalizedQuery.includes(keyword);

    if (!isExactMatch && !isContainedMatch) continue;

    matchedByCategory.set(entry.categoryId, {
      categoryId: entry.categoryId,
      categoryCode: entry.categoryCode,
      categoryName: entry.categoryName,
      matchedKeyword: entry.normalizedKeyword,
    });
  }

  return [...matchedByCategory.values()];
}

/**
 * 検索語に一致したカテゴリに属する商品を検索候補に変換する。
 * 未知の検索語(一致カテゴリ無し)の場合は空配列を返すだけで、カテゴリを捏造しない。
 */
export function matchProductsByCategory(
  query: string,
  catalog: CatalogItem[],
  categoryIdByProductId: Map<string, string>,
  keywordIndex: CategoryKeywordIndexEntry[],
  locale: Locale = DEFAULT_LOCALE
): ClaudeSearchMatch[] {
  const categoryMatches = findMatchingCategories(query, keywordIndex);
  if (categoryMatches.length === 0) return [];

  const matchByCategoryId = new Map(categoryMatches.map((match) => [match.categoryId, match]));

  return catalog.flatMap((item): ClaudeSearchMatch[] => {
    const categoryId = categoryIdByProductId.get(item.id);
    if (!categoryId) return [];

    const match = matchByCategoryId.get(categoryId);
    if (!match) return [];

    return [
      {
        productId: item.id,
        reason: buildSearchReason(
          "categoryKeywordMatch",
          { categoryName: match.categoryName, keyword: match.matchedKeyword },
          locale
        ),
      },
    ];
  });
}
