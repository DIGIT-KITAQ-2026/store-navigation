import type { CatalogItem, ClaudeSearchMatch } from "./searchProductsWithClaude";
import { embedTexts } from "./clip/models";
import { matchProductsByVector } from "./clip/matchProducts";
import { fallbackSearch, normalizeSearchText, stripSearchPunctuation } from "./fallbackSearch";

/**
 * 自然文の検索語で商品を検索する。文字列一致(語彙検索)と意味検索の2段構えにしている。
 *
 * 意味検索だけだと「にんじん」のような商品名そのものでの検索に当たらない。これは商品名に
 * 説明文を連結した長いテキストと比べると、短い検索語との類似度が薄まってしまうため
 * (実測: 「にんじん」→ カレールー0.767 > にんじん0.717)。
 * かといって商品名だけと比べる方式も使えない。このモデルは短い日本語同士だと無関係でも
 * 0.94前後の高いスコアを返すため(実測: 「にんじん」vs「から揚げ」0.972)、
 * 完全一致以外は区別できないうえ、該当なしの判定もできなくなる。
 *
 * そこで、確実な手がかりである文字列一致を先に採り、そこから漏れる
 * 「カレーの材料」のような目的ベースの検索語を意味検索で拾う。
 */
export async function searchProductsWithClip(
  query: string,
  catalog: CatalogItem[]
): Promise<ClaudeSearchMatch[]> {
  // 音声入力は文末に句点が付く。付いたままだと意味検索のスコアが下がって0件になるため落とす。
  // ここでカタカナをひらがなに寄せないのは、意味検索の埋め込みが劣化するため(fallbackSearch参照)
  const trimmed = stripSearchPunctuation(query);
  if (trimmed.length === 0 || catalog.length === 0) return [];

  // 1) 商品名・カテゴリー・説明文への文字列一致(商品名そのもので検索された場合に効く)
  //    画像検索から「サーモン 切り身」のような複数語で呼ばれるため、語ごとに照合して束ねる
  const words = trimmed.split(" ").filter(Boolean);
  const lexicalMatches = [
    ...new Map(
      words.flatMap((word) => fallbackSearch(word, catalog)).map((match) => [match.productId, match])
    ).values(),
  ];
  const lexicalIds = new Set(lexicalMatches.map((match) => match.productId));

  // 商品名そのものに一致した場合は、それが探しているものと判断して意味検索を混ぜない。
  // 混ぜると「にんじん」の結果に無関係な「カレールー」(意味スコア0.767)が付いてしまうため。
  // 説明文にだけ一致した場合(例:「野菜」がキャベツの説明「葉物野菜」に一致)は
  // 他にも該当商品がある可能性が高いので、意味検索も併用する。
  const hasNameMatch = catalog.some(
    (item) =>
      lexicalIds.has(item.id) &&
      words.some((word) => normalizeSearchText(item.name).includes(normalizeSearchText(word)))
  );
  if (hasNameMatch) return lexicalMatches;

  // 2) 意味検索(「カレーの材料」のような目的ベースの検索語を拾う)
  const [queryVector] = await embedTexts([trimmed]);
  const semanticMatches = await matchProductsByVector(
    queryVector,
    catalog,
    (item) => `「${trimmed}」に関連する商品として「${item.name}」が見つかりました`
  );

  // 文字列一致を優先し、意味検索の結果は重複を除いて後ろに足す
  return [...lexicalMatches, ...semanticMatches.filter((match) => !lexicalIds.has(match.productId))];
}
