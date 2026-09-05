import { pipeline } from "@huggingface/transformers";

/**
 * CLIP系モデルの読み込み。プロセス内で1度だけ読み込み、以降は使い回す。
 * 初回リクエストのみモデルのダウンロード・初期化で時間がかかる。
 *
 * - テキスト側: clip-ViT-B-32-multilingual-v1(50言語以上対応)。日本語のクエリ・商品名を
 *   同じベクトル空間に埋め込む。英語の語句とも意味が近ければ近い位置に来るため、
 *   画像検索(英語ラベル経由)からの照合にも使える。
 * - 画像側: CLIPのゼロショット画像分類。英語のラベル候補に対するスコアを返す。
 *
 * ※ 日本語で直接画像照合できるCLIP(jina-clip-v2等)はONNX配布が揃っておらず、
 *   多言語テキストモデルは射影層が無く画像ベクトル(512次元)と次元が合わないため、
 *   「画像→英語ラベル→多言語埋め込み→日本語商品」という経路にしている。
 */

const TEXT_MODEL = "aurantium/clip-ViT-B-32-multilingual-v1";
const VISION_MODEL = "Xenova/clip-vit-base-patch32";

type TextEmbedder = Awaited<ReturnType<typeof pipeline<"feature-extraction">>>;
type ImageClassifier = Awaited<ReturnType<typeof pipeline<"zero-shot-image-classification">>>;

let textEmbedderPromise: Promise<TextEmbedder> | null = null;
let imageClassifierPromise: Promise<ImageClassifier> | null = null;

export function getTextEmbedder(): Promise<TextEmbedder> {
  if (!textEmbedderPromise) {
    textEmbedderPromise = pipeline("feature-extraction", TEXT_MODEL, { dtype: "fp32" });
  }
  return textEmbedderPromise;
}

export function getImageClassifier(): Promise<ImageClassifier> {
  if (!imageClassifierPromise) {
    imageClassifierPromise = pipeline("zero-shot-image-classification", VISION_MODEL, { dtype: "fp32" });
  }
  return imageClassifierPromise;
}

/** 文字列を正規化済み(長さ1)のベクトルへ変換する */
export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const embedder = await getTextEmbedder();
  const output = await embedder(texts, { pooling: "mean", normalize: true });
  return output.tolist() as number[][];
}

/** 正規化済みベクトル同士のコサイン類似度(内積と同値) */
export function cosineSimilarity(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += a[i] * b[i];
  return sum;
}
