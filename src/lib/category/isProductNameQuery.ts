import type { CatalogItem } from "@/lib/aiSearch/searchProductsWithClaude";
import { normalizeSearchText } from "@/lib/aiSearch/fallbackSearch";

/**
 * 検索語が特定の商品を指しているかどうか。
 *
 * 指しているなら、その商品を出せば用は足りているので、同じカテゴリの商品まで並べない。
 * カテゴリ検索は一致したカテゴリの商品を全件返すため、これを付けないと
 * 「マスク」で衛生カテゴリの5商品が、「電池」で電気カテゴリの5商品が丸ごと出てしまう。
 *
 * 商品名に含まれるかで判定する(「電池」→「単3乾電池」、「ティッシュ」→「ウェットティッシュ」)。
 * ただしカテゴリ名そのもの(「掃除」「化粧」など)は、まとめて見たい意図なので対象外にする。
 * カテゴリ名を除外しないと、「掃除」が「掃除用ブラシ」に含まれるせいで
 * 掃除カテゴリをまとめて出す本来の動きまで止まってしまう。
 *
 * 商品名だけを見て、説明文やカテゴリー欄は見ない。説明文まで見ると
 * 「野菜」のような広い語が特定の商品を指していると誤判定されるため。
 *
 * 空白で区切られた語も個別に見る。絵文字を日本語へ置き換えると
 * 「😷が欲しい」→「マスク が欲しい」のように語が分かれるため、
 * 全体では一致しなくても「マスク」の部分で判定できるようにしている。
 */
export function isProductNameQuery(
  query: string,
  catalog: CatalogItem[],
  categoryNames: string[]
): boolean {
  const normalizedQuery = normalizeSearchText(query);
  if (normalizedQuery.length === 0) return false;

  const candidates = [normalizedQuery, ...normalizedQuery.split(" ")].filter(
    (candidate) => candidate.length > 0
  );

  return candidates.some((candidate) => {
    const isCategoryName = categoryNames.some(
      (name) => normalizeSearchText(name) === candidate
    );
    if (isCategoryName) return false;
    return catalog.some((item) => normalizeSearchText(item.name).includes(candidate));
  });
}
