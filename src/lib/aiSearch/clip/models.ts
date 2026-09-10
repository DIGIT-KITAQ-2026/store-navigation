import { pipeline } from "@huggingface/transformers";
import type { Locale } from "@/lib/i18n/locales";

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

/**
 * テキスト側の埋め込みモデル。**検索する言語で使い分ける。**
 *
 * 日本語はruri(日本語専用)が明確に強い。抽象検索20問の意味検索層だけでの実測は
 * 到達18/20・1位一致17/20(e5)に対し、20/20・19/20(ruri)。サイズも147MBと
 * e5の470MBより小さい。「喉が渇いた」で緑茶が1位に来るのもruriだけだった。
 *
 * ただしruriは中国語・韓国語で大きく落ちる(実測: 「마스크」でe5は1位、ruriは31位。
 * 「口罩」でe5は3位、ruriは37位)。当アプリは4言語対応なので、日本語以外はe5のまま使う。
 * 英語はruriでも落ちないが、判定を単純に保つため日本語かどうかだけで切り替える。
 *
 * どちらも検索語と文書側に別の接頭辞を付けて使う前提で学習されているモデルなので、
 * 接頭辞を付けずに使うと精度が落ちる(embedQuery/embedPassagesを必ず経由すること)。
 */
export interface TextModel {
  id: string;
  queryPrefix: string;
  passagePrefix: string;
  /**
   * 「該当なし」と判断する基準(matchProducts.ts参照)。
   * スコアの出方がモデルごとに違うため、モデルと一緒に持つ。
   */
  outOfStoreMargin: number;
}

const JAPANESE_TEXT_MODEL: TextModel = {
  id: "sirasagi62/ruri-v3-30m-ONNX",
  queryPrefix: "検索クエリ: ",
  passagePrefix: "検索文書: ",
  outOfStoreMargin: -0.04,
};

const MULTILINGUAL_TEXT_MODEL: TextModel = {
  id: "Xenova/multilingual-e5-small",
  queryPrefix: "query: ",
  passagePrefix: "passage: ",
  // 店外ラベル(OUT_OF_STORE_LABELS)が英語のため、日本語以外の検索語はラベル側にも
  // 強く似てしまい、日本語と同じ基準では弾かれすぎる。実測(該当あり11件・該当なし6件)は
  // 該当あり -0.0443〜0.0446 / 該当なし -0.1029〜-0.0169 で、
  // -0.01 のままだと該当ありの5/11が0件になっていた。
  outOfStoreMargin: -0.05,
};

/** その言語で使う埋め込みモデルを返す */
export function textModelFor(locale: Locale): TextModel {
  return locale === "ja" ? JAPANESE_TEXT_MODEL : MULTILINGUAL_TEXT_MODEL;
}

const VISION_MODEL = "Xenova/clip-vit-base-patch32";

type TextEmbedder = Awaited<ReturnType<typeof pipeline<"feature-extraction">>>;
type ImageEmbedder = Awaited<ReturnType<typeof pipeline<"image-feature-extraction">>>;
type ImageClassifier = Awaited<ReturnType<typeof pipeline<"zero-shot-image-classification">>>;

/** 読み込んだテキストモデルはモデルごとに使い回す(日本語用と多言語用が同居しうる) */
const textEmbedderPromises = new Map<string, Promise<TextEmbedder>>();
let imageClassifierPromise: Promise<ImageClassifier> | null = null;
let imageEmbedderPromise: Promise<ImageEmbedder> | null = null;

export function getTextEmbedder(model: TextModel): Promise<TextEmbedder> {
  const loaded = textEmbedderPromises.get(model.id);
  if (loaded) return loaded;

  const loading = pipeline("feature-extraction", model.id, { dtype: "fp32" });
  textEmbedderPromises.set(model.id, loading);
  return loading;
}

export function getImageClassifier(): Promise<ImageClassifier> {
  if (!imageClassifierPromise) {
    imageClassifierPromise = pipeline("zero-shot-image-classification", VISION_MODEL, { dtype: "fp32" });
  }
  return imageClassifierPromise;
}

/**
 * 画像を512次元のベクトルへ変換する側。Open Images V7で学習した分類器
 * (model/oiv7ProductClassifier.json)への入力に使う。
 */
export function getImageEmbedder(): Promise<ImageEmbedder> {
  if (!imageEmbedderPromise) {
    imageEmbedderPromise = pipeline("image-feature-extraction", VISION_MODEL, { dtype: "fp32" });
  }
  return imageEmbedderPromise;
}

/** 文字列を正規化済み(長さ1)のベクトルへ変換する */
async function embedTexts(texts: string[], model: TextModel): Promise<number[][]> {
  if (texts.length === 0) return [];
  const embedder = await getTextEmbedder(model);
  const output = await embedder(texts, { pooling: "mean", normalize: true });
  return output.tolist() as number[][];
}

/** 検索語をベクトルにする */
export async function embedQuery(query: string, model: TextModel): Promise<number[]> {
  const [vector] = await embedTexts([`${model.queryPrefix}${query}`], model);
  return vector;
}

/** 商品などの文書側をベクトルにする */
export async function embedPassages(passages: string[], model: TextModel): Promise<number[][]> {
  return embedTexts(
    passages.map((passage) => `${model.passagePrefix}${passage}`),
    model
  );
}

/** 正規化済みベクトル同士のコサイン類似度(内積と同値) */
export function cosineSimilarity(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += a[i] * b[i];
  return sum;
}
