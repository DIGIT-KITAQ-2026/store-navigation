"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import type { QrDimensions } from "html5-qrcode/esm/core";
import { suppressMediaAbortError } from "./suppressMediaAbortError";

// 商品バーコード(JAN/EAN-13)を主対象としつつ、QRコードも読めるようにしておく
const SUPPORTED_FORMATS = [
  Html5QrcodeSupportedFormats.EAN_13,
  Html5QrcodeSupportedFormats.EAN_8,
  Html5QrcodeSupportedFormats.UPC_A,
  Html5QrcodeSupportedFormats.UPC_E,
  Html5QrcodeSupportedFormats.CODE_128,
  Html5QrcodeSupportedFormats.QR_CODE,
];

// 前のステップで読み取ったバーコードがカメラの画角に残ったまま次のスキャン画面へ
// 遷移すると、起動直後の数フレームで同じバーコードを即座に再検出してしまう
// (例: 棚バーコードをスキャンした直後、商品バーコード読み取り画面に切り替わった瞬間に
// 同じ棚バーコードを商品バーコードとして誤検出する)。start()完了からこの時間内の
// 検出は無視し、対象を持ち替える・カメラを構え直すための猶予を設ける。
const SCAN_WARMUP_MS = 2000;

// EAN-13等の1次元バーコードは横長の帯なので、正方形のqrboxだと読み取り枠内に
// バーコード全体が収まりにくい。ビューファインダー幅に対して横長の枠を返す。
function calculateScanBox(viewfinderWidth: number, viewfinderHeight: number): QrDimensions {
  const width = Math.round(Math.min(viewfinderWidth * 0.9, 500));
  const height = Math.round(Math.min(viewfinderHeight * 0.55, width * 0.5));
  return { width, height };
}

interface UseBarcodeScannerOptions {
  onDetected: (code: string) => void;
}

async function teardown(scanner: Html5Qrcode): Promise<void> {
  // scanner.isScanning(公開フィールド)は内部のvideo"playing"イベントに紐づいており、
  // start()の完了(内部状態は既にSCANNING)より遅れて true になる。ここで判定に使うと
  // カメラを閉じ損ねて映像タグが残り続けるため、常にstop()を試みてエラーは無視する。
  try {
    await scanner.stop();
  } catch {
    // まだSCANNING状態に遷移していない場合などは何もしなくてよい
  }
  try {
    scanner.clear();
  } catch {
    // ignore
  }
}

// html5-qrcodeのカメラ起動/停止をラップする共通処理。
// start()はgetUserMediaの許可待ちなどで時間がかかり、開発時のReact Strict Mode
// (mount→cleanup→mountを即座に再実行する)ではstop()がstart()の完了より先に
// 呼ばれてしまう。generationトークンで「自分より新しいstart/stopが呼ばれていないか」
// を完了後に確認し、古い場合は自分自身を後始末することで、カメラの二重起動や
// DOM上への映像タグの重複挿入を防ぐ。
export function useBarcodeScanner(elementId: string, { onDetected }: UseBarcodeScannerOptions) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const generationRef = useRef(0);
  const onDetectedRef = useRef(onDetected);
  // start()完了時にDate.now() + SCAN_WARMUP_MSをセットし、これより前の検出は無視する
  const readyAtRef = useRef(0);

  useEffect(() => {
    onDetectedRef.current = onDetected;
  }, [onDetected]);

  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [torchSupported, setTorchSupported] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [zoomRange, setZoomRange] = useState<{ min: number; max: number; step: number } | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);

  const stop = useCallback(async () => {
    generationRef.current += 1;
    const scanner = scannerRef.current;
    scannerRef.current = null;
    setIsScanning(false);
    setTorchSupported(false);
    setTorchOn(false);
    setZoomRange(null);
    setZoomLevel(1);
    if (scanner) {
      await teardown(scanner);
    }
  }, []);

  const start = useCallback(async () => {
    if (scannerRef.current) return;
    setError(null);

    const generation = ++generationRef.current;
    const scanner = new Html5Qrcode(elementId, {
      formatsToSupport: SUPPORTED_FORMATS,
      // 対応端末(主にAndroid Chrome)ではネイティブのBarcodeDetector APIを使う。
      // JS実装(zxing)より高速・高精度で、1次元バーコードの読み取り成功率が大きく上がる。
      useBarCodeDetectorIfSupported: true,
      verbose: false,
    });

    try {
      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 15,
          qrbox: calculateScanBox,
          videoConstraints: {
            facingMode: "environment",
            // 低解像度だとバーコードの細い線が潰れて読み取れないため、高めの解像度を要求する
            // (対応していないカメラでは自動的に最大解像度にフォールバックされる)
            width: { ideal: 1920 },
            height: { ideal: 1080 },
            advanced: [{ focusMode: "continuous" } as MediaTrackConstraintSet],
          },
        },
        (decodedText) => {
          if (Date.now() < readyAtRef.current) return;
          onDetectedRef.current(decodedText);
        },
        () => {
          // フレームごとの未検出コールバック。頻繁に呼ばれるため無視する。
        }
      );

      if (generationRef.current !== generation) {
        // start()完了より先にstop()/別のstart()が呼ばれていた場合は、
        // このインスタンスは後始末して破棄する(カメラ・DOM要素を残さない)
        await teardown(scanner);
        return;
      }

      scannerRef.current = scanner;
      readyAtRef.current = Date.now() + SCAN_WARMUP_MS;
      setIsScanning(true);

      // 暗い場所での読み取り失敗が多いため、対応端末ではライト(トーチ)を操作できるようにする
      try {
        const torch = scanner.getRunningTrackCameraCapabilities().torchFeature();
        setTorchSupported(torch.isSupported());
      } catch {
        setTorchSupported(false);
      }

      // スマホのレンズには最短合焦距離があり、近づきすぎるとピント調整不能でぼやける。
      // 対応端末ではズームを使えるようにし、物理的に近づかなくても大きく映せるようにする
      try {
        const zoom = scanner.getRunningTrackCameraCapabilities().zoomFeature();
        if (zoom.isSupported()) {
          const min = zoom.min();
          const max = zoom.max();
          const step = zoom.step() || 0.1;
          setZoomRange({ min, max, step });

          // 手動で調整しなくても近づきすぎ問題を緩和できるよう、初期値を少しだけ上げておく
          const initialZoom = Math.min(max, min + (max - min) * 0.2);
          setZoomLevel(initialZoom);
          if (initialZoom !== min) {
            await zoom.apply(initialZoom);
          }
        } else {
          setZoomRange(null);
        }
      } catch {
        setZoomRange(null);
      }
    } catch (err) {
      if (generationRef.current === generation) {
        setIsScanning(false);
        setError(
          err instanceof Error
            ? err.message
            : "カメラを起動できませんでした。カメラの利用を許可しているか確認してください。"
        );
      }
    }
  }, [elementId]);

  const toggleTorch = useCallback(async () => {
    const scanner = scannerRef.current;
    if (!scanner) return;
    try {
      const torch = scanner.getRunningTrackCameraCapabilities().torchFeature();
      if (!torch.isSupported()) return;
      const next = !torchOn;
      await torch.apply(next);
      setTorchOn(next);
    } catch {
      // ライト操作に失敗しても読み取り自体は継続できるため、エラー表示はしない
    }
  }, [torchOn]);

  const setZoom = useCallback(async (value: number) => {
    const scanner = scannerRef.current;
    if (!scanner) return;
    try {
      const zoom = scanner.getRunningTrackCameraCapabilities().zoomFeature();
      if (!zoom.isSupported()) return;
      await zoom.apply(value);
      setZoomLevel(value);
    } catch {
      // ズーム操作に失敗しても読み取り自体は継続できるため、エラー表示はしない
    }
  }, []);

  useEffect(() => {
    // play()中断のAbortErrorはアンマウント「後」に発生するため、解除を数秒遅らせて
    // 後始末が終わるまでハンドラを残しておく
    const release = suppressMediaAbortError();
    return () => {
      void stop();
      setTimeout(release, 3000);
    };
  }, [stop]);

  return {
    start,
    stop,
    isScanning,
    error,
    torchSupported,
    torchOn,
    toggleTorch,
    zoomRange,
    zoomLevel,
    setZoom,
  };
}
