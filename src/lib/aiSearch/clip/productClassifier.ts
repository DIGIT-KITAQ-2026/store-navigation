import { getImageEmbedder } from "./models";
import { OIV7_CLASS_QUERIES } from "./oiv7ClassQueries";
import weights from "./model/oiv7ProductClassifier.json";
import { getInferenceBaseUrl, callInferenceServer } from "@/lib/aiInference/inferenceProxy";

/**
 * Open Images V7 の画像で学習した、商品カテゴリの分類器。
 *
 * CLIPの画像エンコーダはそのまま使い、その出力(512次元)の上に線形分類器だけを
 * 学習させている(linear probe)。CLIP本体を再学習していないためGPUは不要で、
 * 重みもこのリポジトリに置ける大きさ(230KB)に収まる。
 *
 * 学習データはOIv7の人手確認済み画像ラベルから、当店の取扱品目に対応する54クラス・
 * 9,875枚を取得したもの。同じ検証データでの実測は、学習なしのゼロショット分類が44.4%に対し
 * この分類器は59.5%。
 *
 * 「商品ではない」写真のために Not_a_product クラスも学習させている(車・人・家具など
 * OIv7の店外物体750枚)。これが無いと商品以外の写真でも必ずどれかの商品クラスに寄ってしまい、
 * 確信度だけでは切り分けられなかった(実測: 靴0.297 と ノート0.294 が重なった)。
 */
interface ClassifierWeights {
  classes: string[];
  dim: number;
  weights: number[];
  bias: number[];
}

const model = weights as ClassifierWeights;

export interface ClassPrediction {
  /** OIv7のクラス名。NOT_A_PRODUCT_CLASSなら「商品ではない」 */
  className: string;
  /** 対応する日本語の検索語。未対応のクラスならnull */
  query: string | null;
  /** その分類である確率(0〜1) */
  score: number;
}

/** ベクトルを単位長にそろえる(学習時と同じ前処理) */
function normalize(vector: number[]): number[] {
  const length = Math.hypot(...vector);
  return length > 0 ? vector.map((value) => value / length) : vector;
}

function softmax(values: number[]): number[] {
  const max = Math.max(...values);
  const exponentials = values.map((value) => Math.exp(value - max));
  const total = exponentials.reduce((sum, value) => sum + value, 0);
  return exponentials.map((value) => value / total);
}

/** 画像を分類し、確率の高い順に返す(このマシンでモデルを実際に動かす) */
export async function classifyProductImageLocal(imageBuffer: Buffer): Promise<ClassPrediction[]> {
  const { RawImage } = await import("@huggingface/transformers");
  const image = await RawImage.fromBlob(new Blob([new Uint8Array(imageBuffer)]));

  const embedder = await getImageEmbedder();
  const output = await embedder(image);
  const vector = normalize(Array.from(output.data as Float32Array));

  const { classes, dim, weights: w, bias } = model;
  const logits = classes.map((_, k) => {
    let sum = bias[k];
    const offset = k * dim;
    for (let d = 0; d < dim; d++) sum += w[offset + d] * vector[d];
    return sum;
  });

  const probabilities = softmax(logits);
  return classes
    .map((className, index) => ({
      className,
      query: OIV7_CLASS_QUERIES[className] ?? null,
      score: probabilities[index],
    }))
    .sort((a, b) => b.score - a.score);
}

/**
 * 画像を分類し、確率の高い順に返す。
 * `AI_INFERENCE_BASE_URL`が設定されていれば、モデルをそのマシンへ委譲する
 * (Vercel等、モデルを実行できない環境向け)。未設定ならこのマシンでそのまま実行する。
 */
export async function classifyProductImage(imageBuffer: Buffer): Promise<ClassPrediction[]> {
  const baseUrl = getInferenceBaseUrl();
  if (baseUrl) {
    return callInferenceServer<ClassPrediction[]>("/api/internal/classify-image", {
      imageBase64: imageBuffer.toString("base64"),
    });
  }
  return classifyProductImageLocal(imageBuffer);
}
