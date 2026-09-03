/// <reference lib="webworker" />

// ブラウザ内(Web Worker上)でWhisperを動かし、音声をその場で文字起こしする。
// SpeechRecognition(ブラウザ内蔵の音声認識)はChromiumの一部の派生ブラウザ(Arc等)では
// GoogleのクラウドAPIキーが無いために動作しないため、外部サービスを使わずに済むこの方式にした。
// メインスレッドをブロックしないよう推論はこのWorker内で行う。

import { pipeline, type AutomaticSpeechRecognitionPipeline } from "@huggingface/transformers";

const MODEL_ID = "Xenova/whisper-tiny";

type WorkerRequest =
  | { type: "load" }
  | { type: "transcribe"; audio: Float32Array };

type WorkerResponse =
  | { type: "load-progress"; progress: number }
  | { type: "ready" }
  | { type: "result"; text: string }
  | { type: "error"; message: string };

let transcriberPromise: Promise<AutomaticSpeechRecognitionPipeline> | null = null;

function loadTranscriber(): Promise<AutomaticSpeechRecognitionPipeline> {
  if (!transcriberPromise) {
    transcriberPromise = pipeline("automatic-speech-recognition", MODEL_ID, {
      dtype: "fp32",
      device: "wasm",
      progress_callback: (event: { status: string; progress?: number }) => {
        if (event.status === "progress" && typeof event.progress === "number") {
          post({ type: "load-progress", progress: event.progress });
        }
      },
    });
  }
  return transcriberPromise;
}

function post(message: WorkerResponse) {
  (self as unknown as Worker).postMessage(message);
}

self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const data = event.data;

  if (data.type === "load") {
    try {
      await loadTranscriber();
      post({ type: "ready" });
    } catch (error) {
      post({ type: "error", message: error instanceof Error ? error.message : "モデルの読み込みに失敗しました" });
    }
    return;
  }

  if (data.type === "transcribe") {
    try {
      const transcriber = await loadTranscriber();
      const output = await transcriber(data.audio, { language: "japanese", task: "transcribe" });
      const result = Array.isArray(output) ? output[0] : output;
      const text = typeof result?.text === "string" ? result.text.trim() : "";
      post({ type: "result", text });
    } catch (error) {
      post({ type: "error", message: error instanceof Error ? error.message : "文字起こしに失敗しました" });
    }
  }
};
