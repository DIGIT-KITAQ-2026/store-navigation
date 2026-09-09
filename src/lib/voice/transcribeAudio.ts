import type { AutomaticSpeechRecognitionPipeline } from "@huggingface/transformers";
import { callInferenceServer, getInferenceBaseUrl } from "@/lib/aiInference/inferenceProxy";

/**
 * 音声認識モデル。日本語の精度を優先してlarge-v3-turboを使う。
 *
 * 当初はブラウザ内(Web Worker)でwhisper-tinyを動かしていたが、日本語の精度が実用に耐えなかった
 * (評価音声30本で、目的の商品にたどり着けたのは8本のみ。「牛乳が欲しい」→「ご視聴ありがとう
 * ございました」のような破綻もあった)。精度を上げるにはモデルを大きくするしかなく、
 * whisper-smallでも260MB、large-v3-turboは760MBとブラウザに配信できる大きさではないため、
 * CLIP検索と同じくサーバー側で動かす方式に変更した。
 *
 * 量子化はq4。q8・fp32では読み込みに失敗するか、メモリと速度の面で実用的でない。
 */
const MODEL_ID = "onnx-community/whisper-large-v3-turbo";

let transcriberPromise: Promise<AutomaticSpeechRecognitionPipeline> | null = null;

/**
 * モデルの読み込みは初回のみ20秒ほどかかるため、プロセス内で使い回す。
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
 * 転送する(Vercel上で動かす想定)。未設定ならこのプロセス内でモデルを実行する
 * (今までのdevelopと完全に同じ挙動)。
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
