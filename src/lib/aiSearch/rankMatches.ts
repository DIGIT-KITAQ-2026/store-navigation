import type { CatalogItem, ClaudeSearchMatch } from "./searchProductsWithClaude";
import { normalizeSearchText } from "./fallbackSearch";

/**
 * 検索結果を「手がかりの強さ」で並べ替える。
 *
 * 結果は左上から順に読まれるので、いちばん確からしい商品が先頭に来る必要がある。
 * カテゴリ検索は一致カテゴリの商品をカタログ順で全件返し、文字列一致も商品名・カテゴリー・
 * 説明文のどれに当たったかを区別せず返すため、そのまま並べると弱い手がかりが上に来ていた
 * (実測:「歯磨き」→ 1位が説明文の一致だけの「歯ブラシ」、2位が商品名が一致する「歯磨き用品」。
 *  「用品」→ 1位が「単3乾電池」で、「歯磨き用品」「ネイルケア用品」がその下)。
 *
 * 並べ替えは2段階。まず商品名が当たっているかどうかで分け、その中では
 * 検索語と商品テキスト(名前・カテゴリー・説明文)の文字の重なりが多い順にする。
 *
 * 重なりを見るのは、意味検索のスコアが僅差で並ぶため順位が実質決まらないから
 * (実測:「食器を洗いたい」で1位が小皿、キッチンスポンジは3位。
 *  小皿の説明文「取り分けや薬味用に使う小さめの平皿」は検索語と1文字も重ならないのに対し、
 *  キッチンスポンジは「食器洗いに使う」で重なる)。
 * 重なりも同じなら元の順序を保ち、カテゴリ検索・意味検索が決めた順序を尊重する。
 */

/** 商品名が検索語そのもの */
const EXACT_NAME = 0;
/** 商品名と検索語が部分的に重なる */
const NAME_OVERLAP = 1;
/** カテゴリー・説明文の一致や意味検索。元の順序のまま後ろへ */
const WEAK = 2;

/**
 * 検索語が商品名を含む向き(「歯ブラシはどこ」→「歯ブラシ」)を見るときの、商品名の最小文字数。
 * 1文字の商品名まで許すと、無関係な検索語にもほぼ必ず当たってしまう。
 */
const MIN_NAME_LENGTH_FOR_CONTAINMENT = 2;

/**
 * 検索語と商品テキストの重なり具合を0〜1で返す。
 *
 * 形態素解析を入れずに済ませるため2文字の並びで見ている。1文字だと「い」「し」のような
 * どこにでもある文字で差が付かず、3文字以上だと言い回しが少し違うだけで当たらなくなる。
 */
function overlapRatio(query: string, productText: string): number {
  const compact = query.replace(/\s+/g, "");
  if (compact.length < 2 || productText.length === 0) return 0;

  const pairs = new Set<string>();
  for (let i = 0; i < compact.length - 1; i++) pairs.add(compact.slice(i, i + 2));

  let matched = 0;
  for (const pair of pairs) if (productText.includes(pair)) matched++;
  return matched / pairs.size;
}

function strengthOf(name: string, words: string[]): number {
  if (name.length === 0) return WEAK;
  if (words.some((word) => word === name)) return EXACT_NAME;

  const overlaps = words.some(
    (word) =>
      name.includes(word) ||
      (name.length >= MIN_NAME_LENGTH_FOR_CONTAINMENT && word.includes(name))
  );
  return overlaps ? NAME_OVERLAP : WEAK;
}

export function rankMatches(
  query: string,
  matches: ClaudeSearchMatch[],
  catalog: CatalogItem[]
): ClaudeSearchMatch[] {
  const normalizedQuery = normalizeSearchText(query);
  // 画像検索から「サーモン 切り身」のように複数語で呼ばれるため、語ごとに見る
  const words = normalizedQuery.split(" ").filter(Boolean);
  if (words.length === 0 || matches.length <= 1) return matches;

  const itemById = new Map(catalog.map((item) => [item.id, item]));

  return matches
    .map((match, order) => {
      const item = itemById.get(match.productId);
      const name = item ? normalizeSearchText(item.name) : "";
      const productText = item
        ? normalizeSearchText([item.name, item.category, item.description].filter(Boolean).join(" "))
        : "";
      return {
        match,
        order,
        strength: strengthOf(name, words),
        overlap: overlapRatio(normalizedQuery, productText),
      };
    })
    .sort((a, b) => a.strength - b.strength || b.overlap - a.overlap || a.order - b.order)
    .map((entry) => entry.match);
}
