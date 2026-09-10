import type { CatalogItem, ClaudeSearchMatch } from "../searchProductsWithClaude";
import { cosineSimilarity, embedPassages, type TextModel } from "./models";
import { OUT_OF_STORE_LABELS } from "./outOfStoreLabels";

/**
 * 「該当なし」の判断: 商品への最高類似度が、店が扱わない物体(OUT_OF_STORE_LABELS)への
 * 最高類似度を、モデルごとの基準値(TextModel.outOfStoreMargin)以上に上回らなければ0件にする。
 *
 * 類似度の絶対値では分離できない(実測: 該当あり0.807〜0.884 / 該当なし0.785〜0.867)。
 * 「店外の物体と比べてどちらに近いか」なら部分的に分離でき、
 * 該当あり20/20を残したまま該当なしを5/10弾ける。
 *
 * 値は埋め込みモデルごとに測り直すこと。ruri-v3-30mでの実測は
 * 該当あり -0.0362〜0.0259 / 該当なし -0.1047〜0.0237 で、両者は重なっている。
 * 取りこぼし(実在する商品を0件にする)の方が実害が大きいので、
 * 該当ありの最小(-0.0362)より少し下に置いて、該当なしの取りこぼしを許容している。
 */


/**
 * 最上位からこの差の範囲内のものだけを返す。
 * ruri-v3-30mでは、期待する商品を拾うのに必要な1位からの差は最大0.0071だった。
 * 「掃除」「旅行」のように複数商品を並べたい検索語のために少し広く採っている。
 */
const SCORE_MARGIN = 0.02;

/** 1回の検索で返す最大件数 */
const MAX_RESULTS = 5;

function buildProductText(item: CatalogItem): string {
  return [item.name, item.category, item.description].filter(Boolean).join(" ");
}

/**
 * 商品カタログの埋め込みは検索のたびに作り直すと遅いため、カタログの内容が変わるまで使い回す。
 * 単一デモ店舗のMVPスコープなので、キャッシュは1世代だけ保持すれば十分。
 */
const catalogVectorCache = new Map<string, { signature: string; vectors: number[][] }>();

function catalogSignature(catalog: CatalogItem[]): string {
  return catalog.map((item) => `${item.id}:${buildProductText(item)}`).join("|");
}

/** 店外ラベルは固定なので、モデルごとに1度だけ埋め込む */
const outOfStoreVectorPromises = new Map<string, Promise<number[][]>>();

/**
 * 埋め込みが失敗した場合(推論サーバーへの一時的な接続断など)にrejectしたPromiseを
 * そのままキャッシュしてしまうと、プロセスを再起動するまで全ての意味検索が
 * 永久に失敗し続けてしまう。失敗時はキャッシュから消し、次回また取得し直せるようにする。
 */
function getOutOfStoreVectors(model: TextModel): Promise<number[][]> {
  const loaded = outOfStoreVectorPromises.get(model.id);
  if (loaded) return loaded;

  const loading = embedPassages([...OUT_OF_STORE_LABELS], model).catch((error: unknown) => {
    outOfStoreVectorPromises.delete(model.id);
    throw error;
  });
  outOfStoreVectorPromises.set(model.id, loading);
  return loading;
}

async function getCatalogVectors(catalog: CatalogItem[], model: TextModel): Promise<number[][]> {
  const signature = catalogSignature(catalog);
  const cached = catalogVectorCache.get(model.id);
  if (cached && cached.signature === signature) return cached.vectors;

  const vectors = await embedPassages(catalog.map(buildProductText), model);
  catalogVectorCache.set(model.id, { signature, vectors });
  return vectors;
}

/**
 * 与えられたクエリ(日本語の検索語、または画像から得た英語ラベル)のベクトルと
 * 商品カタログを突き合わせ、関連度の高い商品を返す。
 */
export async function matchProductsByVector(
  queryVector: number[],
  catalog: CatalogItem[],
  model: TextModel,
  buildReason: (item: CatalogItem, score: number) => string,
  outOfStoreMargin: number = model.outOfStoreMargin
): Promise<ClaudeSearchMatch[]> {
  if (catalog.length === 0) return [];

  const catalogVectors = await getCatalogVectors(catalog, model);

  const scored = catalog
    .map((item, index) => ({ item, score: cosineSimilarity(queryVector, catalogVectors[index]) }))
    .sort((a, b) => b.score - a.score);

  const top = scored[0];
  if (!top) return [];

  const outOfStoreVectors = await getOutOfStoreVectors(model);
  const bestOutOfStore = outOfStoreVectors.reduce(
    (best, vector) => Math.max(best, cosineSimilarity(queryVector, vector)),
    -1
  );
  if (top.score - bestOutOfStore < outOfStoreMargin) return [];

  return scored
    .filter((entry) => entry.score >= top.score - SCORE_MARGIN)
    .slice(0, MAX_RESULTS)
    .map((entry) => ({ productId: entry.item.id, reason: buildReason(entry.item, entry.score) }));
}
