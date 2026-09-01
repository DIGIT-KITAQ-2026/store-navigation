"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";

// 商品バーコード(JAN/EAN-13)を主対象としつつ、QRコードも読めるようにしておく
const SUPPORTED_FORMATS = [
  Html5QrcodeSupportedFormats.EAN_13,
  Html5QrcodeSupportedFormats.EAN_8,
  Html5QrcodeSupportedFormats.UPC_A,
  Html5QrcodeSupportedFormats.UPC_E,
  Html5QrcodeSupportedFormats.CODE_128,
  Html5QrcodeSupportedFormats.QR_CODE,
];

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

  useEffect(() => {
    onDetectedRef.current = onDetected;
  }, [onDetected]);

  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stop = useCallback(async () => {
    generationRef.current += 1;
    const scanner = scannerRef.current;
    scannerRef.current = null;
    setIsScanning(false);
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
      verbose: false,
    });

    try {
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 150 } },
        (decodedText) => onDetectedRef.current(decodedText),
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
      setIsScanning(true);
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

  useEffect(() => {
    return () => {
      void stop();
    };
  }, [stop]);

  return { start, stop, isScanning, error };
}
