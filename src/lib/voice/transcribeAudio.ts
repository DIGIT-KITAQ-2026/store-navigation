import type { AutomaticSpeechRecognitionPipeline } from "@huggingface/transformers";
import { callInferenceServer, getInferenceBaseUrl } from "@/lib/aiInference/inferenceProxy";

/**
 * 音声認識モデル。whisper-large-v3-turboを日本語45000時間で追加学習したものを使う。
 *
 * 当初はブラウザ内(Web Worker)でwhisper-tinyを動かしていたが、日本語の精度が実用に耐えなかった
 * (評価音声30本で、目的の商品にたどり着けたのは8本のみ。「牛乳が欲しい」→「ご視聴ありがとう
 * ございました」のような破綻もあった)。精度を上げるにはモデルを大きくするしかなく、
 * ブラウザに配信できる大きさではないため、CLIP検索と同じくサーバー側で動かす方式に変更した。
 *
 * その後 onnx-community/whisper-large-v3-turbo を使っていたが、店内のざわめきを想定した
 * 雑音下で崩れた(「緑茶はどこに」→「よくちゃはどこに」、「ボールペンが欲しいです」→
 * 「ゴールテンカゴシーンです」など)。前処理・ビームサーチ・語彙プロンプトはいずれも
 * 効果がなく、モデルを替えるのが唯一効いた。scripts/voice-eval/ での実測:
 *
 *   条件      turbo      これ
 *   静か      43/45  →  44/45   (文字誤り率 7.9% → 5.3%)
 *   SNR20dB   41/45  →  42/45   (文字誤り率  11% → 8.2%)
 *   SNR10dB   36/45  →  39/45   (文字誤り率  88% →  18%)
 *   SNR5dB    28/45  →  31/45   (文字誤り率  38% →  31%)
 *
 * 元モデルは efwkjn/whisper-ja-760M。turboと同じ構造(encoder 32層・decoder 4層)のまま
 * 雑音増強込みで追加学習されているので、そのまま差し替えられる。
 *
 * 量子化はq4。q8・fp32では読み込みに失敗するか、メモリと速度の面で実用的でない。
 * ただしq4でも約1.16GBあり(turboは約760MB)、プロセス起動後の初回リクエストは
 * モデル読み込みで1分ほど待たされる。2回目以降は使い回すので影響しない。
 */
const MODEL_ID = "willopcbeta/whisper-ja-760M-ONNX";

let transcriberPromise: Promise<AutomaticSpeechRecognitionPipeline> | null = null;

/**
 * モデルの読み込みは初回のみ1分ほどかかるため、プロセス内で使い回す。
 * `@huggingface/transformers`(と依存のonnxruntime-nodeネイティブバインディング)は
 * Vercel等のサーバーレス環境では読み込めない。プロキシ経由(`AI_INFERENCE_BASE_URL`設定時)では
 * このモジュールに一切触れないよう、staticインポートではなく実行時の動的importにする。
 */
export function loadTranscriber(): Promise<AutomaticSpeechRecognitionPipeline> {
  if (!transcriberPromise) {
    transcriberPromise = import("@huggingface/transformers").then(({ pipeline }) =>
      pipeline("automatic-speech-recognition", MODEL_ID, { dtype: "q4" })
    );
  }
  return transcriberPromise;
}

/**
 * 16kHz・モノラルのPCMを日本語として文字起こしする(このマシン上でモデルを実行する実体)。
 * `language`を固定しないと英語として書き起こされたり翻訳されたりするため必ず指定する。
 * `/api/internal/transcribe`からも直接呼ばれる(プロキシ経由で無限ループしないよう、
 * こちらは常にローカル実行のみを行う)。
 */
export async function transcribeJapaneseLocal(audio: Float32Array): Promise<string> {
  const transcriber = await loadTranscriber();
  const output = await transcriber(audio, { language: "japanese", task: "transcribe" });
  const result = Array.isArray(output) ? output[0] : output;
  return typeof result?.text === "string" ? result.text.trim() : "";
}

/**
 * 16kHz・モノラルのPCMを日本語として文字起こしする。
 * `AI_INFERENCE_BASE_URL`が設定されていれば、Whisperモデルを持つ外部推論サーバーへ
 * 転送する(Vercel上で動かす想定)。未設定ならこのプロセス内でモデルを実行する。
 */
export async function transcribeJapanese(audio: Float32Array): Promise<string> {
  const baseUrl = getInferenceBaseUrl();
  if (baseUrl) {
    const result = await callInferenceServer<{ text: string }>("/api/internal/transcribe", {
      audio: Array.from(audio),
    });
    return result.text;
  }
  return transcribeJapaneseLocal(audio);
}
