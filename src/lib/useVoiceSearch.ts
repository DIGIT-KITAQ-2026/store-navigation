"use client";

import { useEffect, useRef, useState } from "react";

type WorkerResponse =
  | { type: "load-progress"; progress: number }
  | { type: "ready" }
  | { type: "result"; text: string }
  | { type: "error"; message: string };

/**
 * マイク音声を録音し、ブラウザ内(Web Worker)で動くWhisperでその場で文字起こしする。
 *
 * ブラウザ標準のSpeechRecognition(旧実装)は、Chromiumの一部の派生ブラウザ(Arc等)では
 * Google専用のAPIキーが無いために動作しない(networkエラー)ことが分かったため、
 * 外部サービス・APIキー無しで完結するこの方式に切り替えた。初回のみモデル(数十MB)を
 * ダウンロードするが、以降はブラウザにキャッシュされる。
 */
export function useVoiceSearch(onResult: (text: string) => void) {
  const [isSupported, setIsSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [loadProgress, setLoadProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const workerRef = useRef<Worker | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const onResultRef = useRef(onResult);

  useEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);

  useEffect(() => {
    // getUserMedia/MediaRecorderの対応状況はSSR時には分からないため、マウント後に判定する
    // (サーバー描画とクライアント初回描画を一致させるためのハイドレーション安全なパターン)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsSupported(
      typeof window !== "undefined" &&
        !!navigator.mediaDevices?.getUserMedia &&
        typeof MediaRecorder !== "undefined"
    );

    return () => {
      workerRef.current?.terminate();
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const getWorker = () => {
    if (!workerRef.current) {
      workerRef.current = new Worker(new URL("./whisperWorker.ts", import.meta.url));
    }
    return workerRef.current;
  };

  const transcribe = (audio: Float32Array) => {
    setIsTranscribing(true);
    setLoadProgress(null);

    const worker = getWorker();
    const handleMessage = (event: MessageEvent<WorkerResponse>) => {
      const data = event.data;
      if (data.type === "load-progress") {
        setLoadProgress(data.progress);
      } else if (data.type === "result") {
        worker.removeEventListener("message", handleMessage);
        setIsTranscribing(false);
        setLoadProgress(null);
        if (data.text) {
          onResultRef.current(data.text);
        } else {
          setError("音声が聞き取れませんでした。もう一度お試しください");
        }
      } else if (data.type === "error") {
        worker.removeEventListener("message", handleMessage);
        setIsTranscribing(false);
        setLoadProgress(null);
        setError(data.message || "文字起こしに失敗しました");
      }
    };
    worker.addEventListener("message", handleMessage);
    worker.postMessage({ type: "transcribe", audio }, [audio.buffer]);
  };

  const decodeToPcm16k = async (blob: Blob): Promise<Float32Array> => {
    const arrayBuffer = await blob.arrayBuffer();
    const audioCtx = new AudioContext({ sampleRate: 16000 });
    try {
      const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
      return audioBuffer.getChannelData(0);
    } finally {
      await audioCtx.close();
    }
  };

  const startListening = async () => {
    if (!isSupported) {
      setError("この端末・ブラウザは音声入力に対応していません");
      return;
    }

    setError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        setIsListening(false);

        const blob = new Blob(chunksRef.current, { type: mediaRecorder.mimeType });
        chunksRef.current = [];

        try {
          const pcm = await decodeToPcm16k(blob);
          transcribe(pcm);
        } catch {
          setError("録音データの処理に失敗しました");
        }
      };

      mediaRecorder.start();
      setIsListening(true);
    } catch {
      setError("マイクの使用が許可されていません。ブラウザの設定を確認してください");
    }
  };

  const stopListening = () => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
  };

  return {
    isSupported,
    isListening,
    isTranscribing,
    loadProgress,
    error,
    startListening,
    stopListening,
  };
}
