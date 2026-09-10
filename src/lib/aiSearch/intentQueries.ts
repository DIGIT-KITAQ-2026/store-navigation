import { normalizeSearchText } from "./fallbackSearch";

/**
 * 目的の言い回し → 当店で該当する商品の語。検索語に足してから検索する。
 *
 * 意味検索(clip/models.ts)がどうしても結び付けられない言い回しだけをここに書く。
 * **まず意味検索で届かないことを scripts/search-eval で確かめてから足すこと。**
 * 以前は飲み物の言い回し5件もここに書いていたが、埋め込みモデルをruriに替えたら
 * 「喉が渇いた」で緑茶が1位に来るようになったため不要になった。
 *
 * 置き換えではなく追加なので、元の言い回しでの意味検索も従来どおり効く。
 * 追加した語が商品名に当たると、その商品だけを返す経路に乗る
 * (searchProductsWithClipのhasNameMatch参照)。
 *
 * **当店に実在する商品にだけ対応付けること。** 無い商品の語を足すと、
 * 「置いていない」と答えるべき場面で無関係な商品が出てしまう。
 * 商品が増減したらこの表も見直す(絵文字の表 emojiQueries.ts と同じ扱い)。
 */
const INTENT_QUERIES: { pattern: RegExp; terms: string }[] = [
  /**
   * 「書き間違えた」で消しゴムが1位にならない。
   * 消しゴムの説明文「鉛筆書きをきれいに消せる」と鉛筆セットの「筆記や下書きに使う」が
   * どちらも「書き」を含むため、文字の重なり(rankMatches)でも順位を決められない。
   * 意味検索でも消しゴムは2位止まりだった。
   */
  { pattern: /(間違|まちが|書き損じ)/, terms: "消しゴム" },
];

/**
 * 検索語に、目的から推測できる商品の語を足す。当てはまらなければ元の検索語をそのまま返す。
 */
export function expandIntentQuery(query: string): string {
  const normalized = normalizeSearchText(query);
  if (normalized.length === 0) return query;

  const added = new Set<string>();
  for (const { pattern, terms } of INTENT_QUERIES) {
    if (pattern.test(normalized)) added.add(terms);
  }
  if (added.size === 0) return query;

  return `${query} ${[...added].join(" ")}`;
}
