import type { pipeline } from "@huggingface/transformers";
import type { Locale } from "@/lib/i18n/locales";
import { getInferenceBaseUrl, callInferenceServer } from "@/lib/aiInference/inferenceProxy";

/**
 * 検索に使うモデルの読み込み。プロセス内で1度だけ読み込み、以降は使い回す。
 * 初回リクエストのみモデルのダウンロード・初期化で時間がかかる。
 *
 * `AI_INFERENCE_BASE_URL`が設定されていれば、実行を外部の推論サーバーへ委譲する
 * (Vercel等モデルを実行できない環境向け)。未設定ならこのプロセス内で実行する。
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
export type TextModelKey = "japanese" | "multilingual";

export interface TextModel {
  /**
   * 内部API(/api/internal/embed-text)へどのモデルを使うか伝えるための識別子。
   * モデル名をそのまま受け取ると、外部に公開されるエンドポイントに任意のモデルを
   * 読み込ませられてしまうため、ここに定義した2つだけを指せるようにしている。
   */
  key: TextModelKey;
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
  key: "japanese",
  id: "sirasagi62/ruri-v3-30m-ONNX",
  queryPrefix: "検索クエリ: ",
  passagePrefix: "検索文書: ",
  outOfStoreMargin: -0.04,
};

const MULTILINGUAL_TEXT_MODEL: TextModel = {
  key: "multilingual",
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

/** ひらがな・カタカナ。これが含まれていれば日本語だと判断できる */
const KANA = /[\u3041-\u309f\u30a1-\u30ff]/;
/** ハングル。中国語と韓国語は多言語モデルの方が強い */
const HANGUL = /[\uac00-\ud7af]/;

/**
 * 検索語に使うモデルを決める。**表示言語ではなく検索語そのものを見る。**
 *
 * 表示言語で決めていたが、英語表示のまま日本語で検索されると多言語モデルが使われ、
 * 「喉が渇いた」で緑茶が出なかった(実測: 日本語モデルなら1位、多言語モデルでは19位)。
 * 日本の店舗なので、表示言語が何であれ日本語で入力されることは普通にある。
 *
 * かなが含まれていれば日本語で確定。ハングルなら多言語モデル。
 * 漢字だけの場合は日本語か中国語か判別できないため、表示言語で決める。
 */
export function textModelForQuery(query: string, locale: Locale): TextModel {
  if (KANA.test(query)) return JAPANESE_TEXT_MODEL;
  if (HANGUL.test(query)) return MULTILINGUAL_TEXT_MODEL;
  return textModelFor(locale);
}

/** 内部APIが受け取った識別子からモデルを引く。知らない識別子はnull(モデルを読み込ませない) */
export function textModelByKey(key: string): TextModel | null {
  if (key === JAPANESE_TEXT_MODEL.key) return JAPANESE_TEXT_MODEL;
  if (key === MULTILINGUAL_TEXT_MODEL.key) return MULTILINGUAL_TEXT_MODEL;
  return null;
}

const VISION_MODEL = "Xenova/clip-vit-base-patch32";

type TextEmbedder = Awaited<ReturnType<typeof pipeline<"feature-extraction">>>;
type ImageEmbedder = Awaited<ReturnType<typeof pipeline<"image-feature-extraction">>>;

/** 読み込んだテキストモデルはモデルごとに使い回す(日本語用と多言語用が同居しうる) */
const textEmbedderPromises = new Map<string, Promise<TextEmbedder>>();
let imageEmbedderPromise: Promise<ImageEmbedder> | null = null;

// `@huggingface/transformers`(と依存のonnxruntime-nodeネイティブバインディング)は
// Vercel等のサーバーレス環境では読み込めない。プロキシ経由(`AI_INFERENCE_BASE_URL`設定時)では
// このモジュールに一切触れないよう、staticインポートではなく実行時の動的importにする。
export function getTextEmbedder(model: TextModel): Promise<TextEmbedder> {
  const loaded = textEmbedderPromises.get(model.id);
  if (loaded) return loaded;

  const loading = import("@huggingface/transformers").then(({ pipeline }) =>
    pipeline("feature-extraction", model.id, { dtype: "fp32" })
  );
  textEmbedderPromises.set(model.id, loading);
  return loading;
}

/**
 * 画像を512次元のベクトルへ変換する側。Open Images V7で学習した分類器
 * (model/oiv7ProductClassifier.json)への入力に使う。
 */
export function getImageEmbedder(): Promise<ImageEmbedder> {
  if (!imageEmbedderPromise) {
    imageEmbedderPromise = import("@huggingface/transformers").then(({ pipeline }) =>
      pipeline("image-feature-extraction", VISION_MODEL, { dtype: "fp32" })
    );
  }
  return imageEmbedderPromise;
}

/** 文字列を正規化済み(長さ1)のベクトルへ変換する(このマシンでモデルを実際に動かす) */
export async function embedTextsLocal(texts: string[], model: TextModel): Promise<number[][]> {
  const embedder = await getTextEmbedder(model);
  const output = await embedder(texts, { pooling: "mean", normalize: true });
  return output.tolist() as number[][];
}

/**
 * 文字列を正規化済み(長さ1)のベクトルへ変換する。
 * `AI_INFERENCE_BASE_URL`が設定されていれば、モデルをそのマシンへ委譲する。
 */
async function embedTexts(texts: string[], model: TextModel): Promise<number[][]> {
  if (texts.length === 0) return [];
  if (getInferenceBaseUrl()) {
    return callInferenceServer<number[][]>("/api/internal/embed-text", {
      texts,
      modelKey: model.key,
    });
  }
  return embedTextsLocal(texts, model);
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

/**
 * 画像を512次元のベクトルへ変換する(このマシンでモデルを実際に動かす)。
 * `imageBase64`はJPEG/PNG等のバイナリをbase64文字列化したもの。
 */
export async function embedImageLocal(imageBase64: string): Promise<number[]> {
  const embedder = await getImageEmbedder();
  const { RawImage } = await import("@huggingface/transformers");
  const imageBuffer = Buffer.from(imageBase64, "base64");
  const image = await RawImage.fromBlob(new Blob([new Uint8Array(imageBuffer)]));
  const output = await embedder(image);
  return Array.from(output.data as Float32Array);
}

/**
 * 画像を512次元のベクトルへ変換する。
 * `AI_INFERENCE_BASE_URL`が設定されていれば、モデルをそのマシンへ委譲する。
 */
export async function embedImage(imageBuffer: Buffer): Promise<number[]> {
  const imageBase64 = imageBuffer.toString("base64");
  if (getInferenceBaseUrl()) {
    return callInferenceServer<number[]>("/api/internal/embed-image", { imageBase64 });
  }
  return embedImageLocal(imageBase64);
}

/** 正規化済みベクトル同士のコサイン類似度(内積と同値) */
export function cosineSimilarity(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += a[i] * b[i];
  return sum;
}
