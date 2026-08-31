import type { CatalogItem, ClaudeSearchMatch } from "./searchProductsWithClaude";

function normalizeQuery(rawQuery: string): string {
  return rawQuery
    .trim()
    .replace(/　/g, " ")
    .replace(/\s+/g, " ")
    .toLowerCase();
}

/**
 * claude CLIが失敗した場合の代替手段。商品名・カテゴリー・説明文への単純な部分一致検索。
 * AI検索と違い抽象的な検索語には対応できないが、最低限「商品が見つからない」状態を避ける。
 */
export function fallbackSearch(query: string, catalog: CatalogItem[]): ClaudeSearchMatch[] {
  const normalizedQuery = normalizeQuery(query);
  if (normalizedQuery.length === 0) return [];

  const matches: ClaudeSearchMatch[] = [];

  for (const item of catalog) {
    const name = item.name.toLowerCase();
    const category = (item.category ?? "").toLowerCase();
    const description = (item.description ?? "").toLowerCase();

    if (name.includes(normalizedQuery)) {
      matches.push({ productId: item.id, reason: `商品名「${item.name}」が検索語に一致しました` });
    } else if (category.includes(normalizedQuery)) {
      matches.push({ productId: item.id, reason: `カテゴリー「${item.category}」が検索語に一致しました` });
    } else if (description.includes(normalizedQuery)) {
      matches.push({ productId: item.id, reason: "商品説明が検索語に一致しました" });
    }
  }

  return matches;
}
