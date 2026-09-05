import type { CatalogItem, ClaudeSearchMatch } from "./searchProductsWithClaude";

/**
 * 句読点を落として空白を整える。
 *
 * 音声入力を入れてから必要になった処理。文字起こしは文末に句点を付けるため
 * 「喉が渇いた。」のようになり、そのままでは意味検索のスコアが下がって0件になる
 * (実測: 「喉が渇いた」→ミネラルウォーター / 「喉が渇いた。」→0件)。
 */
export function stripSearchPunctuation(rawText: string): string {
  return rawText
    .normalize("NFKC")
    .replace(/[。、．，,.!！?？「」『』・]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * 文字列一致で使う正規化。検索語と商品テキストの両方に同じ変換をかけて突き合わせる。
 *
 * 同じ言葉でも文字起こしによって「にんじん」「ニンジン」と揺れるため、カタカナはひらがなへ寄せる。
 * ただしこの変換は意味検索の埋め込みには使わない。カタカナ語をひらがなにすると
 * 埋め込みの質が落ちるため(実測:「カレーの材料」の結果に無関係な商品が混ざるようになった)。
 */
export function normalizeSearchText(rawText: string): string {
  return (
    stripSearchPunctuation(rawText)
      // カタカナ(ァ〜ヶ)をひらがなへ。長音符「ー」は範囲外なので双方に残る
      .replace(/[\u30a1-\u30f6]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0x60))
      .toLowerCase()
  );
}

/**
 * claude CLIが失敗した場合の代替手段。商品名・カテゴリー・説明文への単純な部分一致検索。
 * AI検索と違い抽象的な検索語には対応できないが、最低限「商品が見つからない」状態を避ける。
 */
export function fallbackSearch(query: string, catalog: CatalogItem[]): ClaudeSearchMatch[] {
  const normalizedQuery = normalizeSearchText(query);
  if (normalizedQuery.length === 0) return [];

  const matches: ClaudeSearchMatch[] = [];

  for (const item of catalog) {
    const name = normalizeSearchText(item.name);
    const category = normalizeSearchText(item.category ?? "");
    const description = normalizeSearchText(item.description ?? "");

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
