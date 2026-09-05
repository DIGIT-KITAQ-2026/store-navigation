import { pipeline, type AutomaticSpeechRecognitionPipeline } from "@huggingface/transformers";

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

/** モデルの読み込みは初回のみ20秒ほどかかるため、プロセス内で使い回す */
export function loadTranscriber(): Promise<AutomaticSpeechRecognitionPipeline> {
  if (!transcriberPromise) {
    transcriberPromise = pipeline("automatic-speech-recognition", MODEL_ID, { dtype: "q4" });
  }
  return transcriberPromise;
}

/**
 * 16kHz・モノラルのPCMを日本語として文字起こしする。
 * `language`を固定しないと英語として書き起こされたり翻訳されたりするため必ず指定する。
 */
export async function transcribeJapanese(audio: Float32Array): Promise<string> {
  const transcriber = await loadTranscriber();
  const output = await transcriber(audio, { language: "japanese", task: "transcribe" });
  const result = Array.isArray(output) ? output[0] : output;
  return typeof result?.text === "string" ? result.text.trim() : "";
}
