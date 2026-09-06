import type { ClaudeSearchMatch } from "@/lib/aiSearch/searchProductsWithClaude";

/**
 * 複数の検索結果リストをproductIdで重複除去しながら統合する。
 * 先に渡したリストを優先する(同じ商品が複数リストにある場合、最初に出現した理由を残す)。
 * カテゴリ検索結果を先頭に渡すことで、既存のOpenCLIP検索内部の並び順(文字列一致→意味検索)
 * 自体には手を入れずに、カテゴリ一致商品を優先表示できる。
 */
export function mergeSearchMatches(...matchLists: ClaudeSearchMatch[][]): ClaudeSearchMatch[] {
  const seenProductIds = new Set<string>();
  const merged: ClaudeSearchMatch[] = [];

  for (const matches of matchLists) {
    for (const match of matches) {
      if (seenProductIds.has(match.productId)) continue;
      seenProductIds.add(match.productId);
      merged.push(match);
    }
  }

  return merged;
}
