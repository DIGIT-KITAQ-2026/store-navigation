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
 * 音声はブラウザ側で16kHz・モノラルのPCMまで復号し、16bit整数に落として送る。
 * サーバーにwebm/opusのデコーダを持たせずに済む。
 */

/** Whisperが前提とするサンプリングレート */
const TARGET_SAMPLE_RATE = 16_000;
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

    // localhost以外のhttp://ではブラウザがマイクを一切使わせないため、
    // 対応していない端末なのか、開き方の問題なのかを区別できるようにしておく
    if (typeof window !== "undefined" && !window.isSecureContext) {
      setError(
        "この開き方ではマイクを使えません。https:// か localhost で開いてください"
      );
    }

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

  /**
   * 録音データを16kHz・モノラルのPCMに変換する。
   *
   * 以前は`new AudioContext({ sampleRate: 16000 })`で復号と同時にレート変換していたが、
   * Windowsでは音声デバイスが16kHzに対応していないとこの時点でNotSupportedErrorになり、
   * 文字起こしが始まらないことがある。端末の既定レートで復号してから、
   * デバイスに縛られないOfflineAudioContextでレート変換する方式にしている。
   */
  const decodeToPcm16k = async (blob: Blob): Promise<Float32Array> => {
    const arrayBuffer = await blob.arrayBuffer();

    const decodeContext = new AudioContext();
    let decoded: AudioBuffer;
    try {
      decoded = await decodeContext.decodeAudioData(arrayBuffer);
    } finally {
      await decodeContext.close();
    }

    if (decoded.sampleRate === TARGET_SAMPLE_RATE && decoded.numberOfChannels === 1) {
      return decoded.getChannelData(0);
    }

    // チャンネル数1で描画させることで、ステレオ録音もモノラルにまとめられる
    const frameCount = Math.max(1, Math.ceil(decoded.duration * TARGET_SAMPLE_RATE));
    const offline = new OfflineAudioContext(1, frameCount, TARGET_SAMPLE_RATE);
    const source = offline.createBufferSource();
    source.buffer = decoded;
    source.connect(offline.destination);
    source.start();
    return (await offline.startRendering()).getChannelData(0);
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
    } catch (requestError) {
      console.error("[useVoiceSearch] 文字起こしの要求に失敗しました", requestError);
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
        } catch (decodeError) {
          // 原因の切り分けができるよう、握りつぶさず種類を残す
          console.error("[useVoiceSearch] 録音データの変換に失敗しました", decodeError);
          const reason = decodeError instanceof Error ? decodeError.name : "";
          setError(`録音データの処理に失敗しました${reason ? `(${reason})` : ""}`);
        }
      };

      mediaRecorder.start();
      setIsListening(true);
    } catch (mediaError) {
      console.error("[useVoiceSearch] マイクを開けませんでした", mediaError);
      const name = mediaError instanceof Error ? mediaError.name : "";
      setError(
        name === "NotFoundError"
          ? "マイクが見つかりません。接続と既定のデバイス設定を確認してください"
          : "マイクの使用が許可されていません。ブラウザの設定を確認してください"
      );
    }
  };

  const stopListening = () => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
  };

  return { isSupported, isListening, isTranscribing, error, startListening, stopListening };
}
