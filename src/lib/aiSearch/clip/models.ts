import { pipeline, RawImage } from "@huggingface/transformers";
import { getInferenceBaseUrl, callInferenceServer } from "@/lib/aiInference/inferenceProxy";

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

/** 文字列を正規化済み(長さ1)のベクトルへ変換する(このマシンでモデルを実際に動かす) */
export async function embedTextsLocal(texts: string[]): Promise<number[][]> {
  const embedder = await getTextEmbedder();
  const output = await embedder(texts, { pooling: "mean", normalize: true });
  return output.tolist() as number[][];
}

/**
 * 文字列を正規化済み(長さ1)のベクトルへ変換する。
 * `AI_INFERENCE_BASE_URL`が設定されていれば、モデルをそのマシンへ委譲する
 * (Vercel等、モデルを実行できない環境向け)。未設定ならこのマシンでそのまま実行する。
 */
export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const baseUrl = getInferenceBaseUrl();
  if (baseUrl) {
    return callInferenceServer<number[][]>("/api/internal/embed-text", { texts });
  }
  return embedTextsLocal(texts);
}

/**
 * 画像を英語ラベル候補に対してゼロショット分類する(このマシンでモデルを実際に動かす)。
 * `imageBase64`はJPEG/PNG等のバイナリをbase64文字列化したもの。
 */
export async function classifyImageLocal(
  imageBase64: string,
  labels: string[]
): Promise<Array<{ label: string; score: number }>> {
  const classifier = await getImageClassifier();
  const imageBuffer = Buffer.from(imageBase64, "base64");
  const image = await RawImage.fromBlob(new Blob([new Uint8Array(imageBuffer)]));
  return (await classifier(image, labels)) as Array<{ label: string; score: number }>;
}

/**
 * 画像を英語ラベル候補に対してゼロショット分類する。
 * `AI_INFERENCE_BASE_URL`が設定されていれば、モデルをそのマシンへ委譲する
 * (Vercel等、モデルを実行できない環境向け)。未設定ならこのマシンでそのまま実行する。
 */
export async function classifyImage(
  imageBuffer: Buffer,
  labels: string[]
): Promise<Array<{ label: string; score: number }>> {
  const baseUrl = getInferenceBaseUrl();
  const imageBase64 = imageBuffer.toString("base64");
  if (baseUrl) {
    return callInferenceServer<Array<{ label: string; score: number }>>("/api/internal/classify-image", {
      imageBase64,
      labels,
    });
  }
  return classifyImageLocal(imageBase64, labels);
}

/** 正規化済みベクトル同士のコサイン類似度(内積と同値) */
export function cosineSimilarity(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += a[i] * b[i];
  return sum;
}
