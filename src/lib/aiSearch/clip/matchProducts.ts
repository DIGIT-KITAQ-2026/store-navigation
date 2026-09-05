import type { CatalogItem, ClaudeSearchMatch } from "../searchProductsWithClaude";
import { cosineSimilarity, embedTexts } from "./models";

/**
 * 類似度の下限。これを下回るものは「該当なし」として返さない。
 *
 * 実測値(デモ店舗の商品で計測):
 *   該当あり … 「カレーの材料」0.872 / 「野菜」0.820 / 「飲み物が欲しい」0.782
 *   該当なし … 「自動車のタイヤ」0.727 / 「掃除機」0.708 / 「パソコンの充電器」0.678
 * 両者の境界に置いている。商品構成や埋め込みモデルを変えた場合は再調整が必要。
 */
const MIN_SCORE = 0.75;

/** 最上位からこの差の範囲内のものだけを返す(1位だけが突出している場合に無関係な商品を混ぜない) */
const SCORE_MARGIN = 0.08;

/** 1回の検索で返す最大件数 */
const MAX_RESULTS = 5;

function buildProductText(item: CatalogItem): string {
  return [item.name, item.category, item.description].filter(Boolean).join(" ");
}

/**
 * 商品カタログの埋め込みは検索のたびに作り直すと遅いため、カタログの内容が変わるまで使い回す。
 * 単一デモ店舗のMVPスコープなので、キャッシュは1世代だけ保持すれば十分。
 */
let cache: { signature: string; vectors: number[][] } | null = null;

function catalogSignature(catalog: CatalogItem[]): string {
  return catalog.map((item) => `${item.id}:${buildProductText(item)}`).join("|");
}

async function getCatalogVectors(catalog: CatalogItem[]): Promise<number[][]> {
  const signature = catalogSignature(catalog);
  if (cache && cache.signature === signature) return cache.vectors;

  const vectors = await embedTexts(catalog.map(buildProductText));
  cache = { signature, vectors };
  return vectors;
}

/**
 * 与えられたクエリ(日本語の検索語、または画像から得た英語ラベル)のベクトルと
 * 商品カタログを突き合わせ、関連度の高い商品を返す。
 */
export async function matchProductsByVector(
  queryVector: number[],
  catalog: CatalogItem[],
  buildReason: (item: CatalogItem, score: number) => string,
  minScore: number = MIN_SCORE
): Promise<ClaudeSearchMatch[]> {
  if (catalog.length === 0) return [];

  const catalogVectors = await getCatalogVectors(catalog);

  const scored = catalog
    .map((item, index) => ({ item, score: cosineSimilarity(queryVector, catalogVectors[index]) }))
    .sort((a, b) => b.score - a.score);

  const top = scored[0];
  if (!top || top.score < minScore) return [];

  return scored
    .filter((entry) => entry.score >= minScore && entry.score >= top.score - SCORE_MARGIN)
    .slice(0, MAX_RESULTS)
    .map((entry) => ({ productId: entry.item.id, reason: buildReason(entry.item, entry.score) }));
}
