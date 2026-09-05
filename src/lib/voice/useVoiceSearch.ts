"use client";

import { useEffect, useRef, useState } from "react";

/**
 * マイク音声を録音し、サーバーの `/api/transcribe` で文字起こしする。
 *
 * ブラウザ標準のSpeechRecognitionは、Chromiumの一部の派生ブラウザ(Arc等)では
 * Google専用のAPIキーが無いために動作しない(networkエラー)。その代替としてWhisperを
 * 使っているが、ブラウザ内で動かせる大きさのモデル(whisper-tiny)では日本語の精度が
 * 実用に耐えなかったため、CLIP検索と同じくサーバー側で大きいモデルを動かす方式にした。
 *
 * 音声はブラウザ側でAudioContextを使って16kHz・モノラルのPCMまで復号し、
 * 16bit整数に落として送る。サーバーにwebm/opusのデコーダを持たせずに済む。
 */
export function useVoiceSearch(onResult: (text: string) => void) {
  const [isSupported, setIsSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  /** Float32のPCMを16bit整数に落とす(送信量を半分にするため) */
  const toInt16 = (pcm: Float32Array): Int16Array => {
    const samples = new Int16Array(pcm.length);
    for (let i = 0; i < pcm.length; i++) {
      const clamped = Math.max(-1, Math.min(1, pcm[i]));
      samples[i] = Math.round(clamped * 32767);
    }
    return samples;
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

  const transcribe = async (pcm: Float32Array) => {
    setIsTranscribing(true);
    try {
      const samples = toInt16(pcm);
      const response = await fetch("/api/transcribe", {
        method: "POST",
        headers: { "Content-Type": "application/octet-stream" },
        body: samples.buffer as ArrayBuffer,
      });
      const data: { text?: string; error?: string } = await response.json();

      if (!response.ok) {
        setError(data.error ?? "文字起こしに失敗しました");
        return;
      }
      if (data.text) {
        onResultRef.current(data.text);
      } else {
        setError("音声が聞き取れませんでした。もう一度お試しください");
      }
    } catch {
      setError("文字起こしに失敗しました");
    } finally {
      setIsTranscribing(false);
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

      // 初回はサーバー側でのモデル読み込みに時間がかかるため、話している間に先に読み込ませておく
      void fetch("/api/transcribe", { method: "POST", headers: { "x-warmup": "1" } }).catch(() => {});

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
          await transcribe(await decodeToPcm16k(blob));
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

  return { isSupported, isListening, isTranscribing, error, startListening, stopListening };
}
