import type { CatalogItem, ClaudeSearchMatch } from "./searchProductsWithClaude";
import { embedQuery, textModelForQuery } from "./clip/models";
import { matchProductsByVector } from "./clip/matchProducts";
import { fallbackSearch, normalizeSearchText, stripSearchPunctuation } from "./fallbackSearch";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/locales";
import { buildSearchReason } from "./searchReasons";

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
/**
 * 検索語が「商品名そのもの」か、「目的・状況」かを見分ける。
 *
 * 商品名で検索したのに一致する商品が無いなら、その店に置いていないということなので
 * 0件を返したい。意味検索に回すと無関係な商品が出てしまう
 * (実測: 取り扱いのない「にんじん」で「綿棒」が出ていた)。
 * 一方「喉が渇いた」のような目的の検索語は、一致しなくても意味検索で拾いたい。
 *
 * 形態素解析を入れずに済ませるため、助詞・語尾・長さで判定している。
 * 「に」「と」「か」などは名詞にも頻出するため助詞の判定からは外している
 * (入れると「にんじん」が目的の検索語と判定されてしまう)。
 *
 * **日本語専用の判定なので、日本語以外では使わないこと。** 助詞も語尾も日本語のものしか
 * 見ていないため、短い外国語はすべて「商品名」と判定される。商品名は日本語なので
 * 文字列一致も当たらず、「mask」「口罩」「마스크」がどれも0件になっていた。
 */
const INTENT_PARTICLES = /[をがはへで]|の[^り]/;
const INTENT_WORDS = /(たい|ほしい|欲しい|ください|どこ|ある|ありま|する|して|です|ませ|ない|探)/;
const INTENT_VERB_ENDING = /[たるいうくぐすつぬぶむえ]$/;
const MAX_PRODUCT_NAME_LENGTH = 8;

function looksLikeProductName(query: string): boolean {
  if (query.length > MAX_PRODUCT_NAME_LENGTH) return false;
  return !(
    INTENT_PARTICLES.test(query) ||
    INTENT_WORDS.test(query) ||
    INTENT_VERB_ENDING.test(query)
  );
}

export async function searchProductsWithClip(
  query: string,
  catalog: CatalogItem[],
  locale: Locale = DEFAULT_LOCALE
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
        words
        .flatMap((word) => fallbackSearch(word, catalog, locale))
        .map((match) => [match.productId, match])
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

  // 商品名で検索されたのに1件も一致しないなら、その商品は置いていない。
  // 意味検索に回すと無関係な商品が出てしまうのでここで打ち切る。
  // 日本語以外は判定できない(looksLikeProductNameのコメント参照)ので打ち切らない
  if (locale === "ja" && lexicalMatches.length === 0 && looksLikeProductName(trimmed)) return [];

  // 2) 意味検索(「カレーの材料」のような目的ベースの検索語を拾う)
  // 埋め込みモデルは検索語の文字種で使い分ける(かなが有れば日本語モデル。clip/models.ts参照)
  const textModel = textModelForQuery(trimmed, locale);
  const queryVector = await embedQuery(trimmed, textModel);
  const semanticMatches = await matchProductsByVector(
    queryVector,
    catalog,
    textModel,
    (item) => buildSearchReason("semantic", { query: trimmed, name: item.name }, locale)
  );

  // 文字列一致を優先し、意味検索の結果は重複を除いて後ろに足す
  return [...lexicalMatches, ...semanticMatches.filter((match) => !lexicalIds.has(match.productId))];
}
