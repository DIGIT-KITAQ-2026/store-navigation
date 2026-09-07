"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { suppressMediaAbortError } from "@/lib/barcode/suppressMediaAbortError";
import { useTranslations } from "@/lib/i18n/useTranslations";

interface CameraCaptureProps {
  /** 撮影した写真を渡す。呼び出し側で画像検索を実行する */
  onCapture: (file: File) => void;
  /** 「×」やEscapeで閉じられたとき */
  onClose: () => void;
}

/** 撮影した写真の書き出し設定。検索に使うだけなので、解像度より軽さを優先する */
const OUTPUT_MIME = "image/jpeg";
const OUTPUT_QUALITY = 0.85;

type FacingMode = "environment" | "user";

/**
 * 指定した向きのカメラを開く。
 *
 * exactは「その向きが無ければ失敗」なので、切り替えが確実に効く。ただし向きを指定できない
 * 端末(PCの内蔵カメラ等)では最初から失敗してしまうため、idealと無指定へ順に緩めていく。
 */
async function openCamera(facingMode: FacingMode): Promise<MediaStream> {
  const attempts: MediaStreamConstraints[] = [
    { video: { facingMode: { exact: facingMode } }, audio: false },
    { video: { facingMode: { ideal: facingMode } }, audio: false },
    { video: true, audio: false },
  ];

  let lastError: unknown;
  for (const constraints of attempts) {
    try {
      return await navigator.mediaDevices.getUserMedia(constraints);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

/**
 * 画面全体を覆う撮影画面。カメラ映像を表示し、シャッターを押すとJPEGのFileにして返す。
 *
 * 以前は`<input type="file" capture="environment">`でOS側のカメラを呼び出していたが、
 * `capture`はモバイルでしか効かず、PCのブラウザでは無視されてファイル選択画面が開いてしまう。
 * getUserMediaで自前に撮影画面を持つことで、PCでもスマホでもカメラが起動するようにした。
 *
 * 背面カメラを優先しつつ、無い端末(PCなど)では既定のカメラにフォールバックする。
 *
 * 描画はbody直下へのポータル。呼び出し元の「+」ボタンは`-translate-y-1/2`が掛かった要素の中に
 * あり、transformを持つ祖先は`position: fixed`の基準になってしまう。そのまま描画すると
 * 全画面のはずの撮影画面がボタンの大きさに閉じ込められる(実測: 36pxの黒い箱になった)。
 */
export default function CameraCapture({ onCapture, onClose }: CameraCaptureProps) {
  const t = useTranslations();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  // スマホの内外カメラ切り替え。商品を写す用途なので背面から始める
  const [facingMode, setFacingMode] = useState<FacingMode>("environment");
  // カメラが1つしか無い端末では切り替えボタンを出さない
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);
  // ポータル先のdocumentはサーバー描画時には存在しないため、マウント後に描画する
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsMounted(true);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // 閉じる処理は開いている間変わらないため、初回マウント時にだけ登録する
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // facingModeが変わるたびに、今のカメラを止めて指定された向きで開き直す
  useEffect(() => {
    // 閉じる瞬間にplay()が中断されると出るAbortErrorを、この画面が開いている間だけ抑制する
    const releaseSuppressor = suppressMediaAbortError();

    // Strict Modeの二重実行や連続タップで、停止済みのカメラを使ったり二重起動したりしないための目印
    let isCurrent = true;

    const start = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError(t.camera.unsupported);
        return;
      }

      try {
        const stream = await openCamera(facingMode);

        if (!isCurrent) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
        setError(null);
        setIsReady(true);

        // 端末の名前や台数は許可が下りるまで分からないため、開けてから数える
        const devices = await navigator.mediaDevices.enumerateDevices().catch(() => []);
        if (isCurrent) {
          setHasMultipleCameras(
            devices.filter((device) => device.kind === "videoinput").length > 1
          );
        }
      } catch {
        if (isCurrent) setError(t.camera.permissionDenied);
      }
    };

    void start();

    return () => {
      isCurrent = false;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      releaseSuppressor();
    };
    // 翻訳辞書は言語切り替え時にしか変わらず、カメラを開き直す理由にはならない
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facingMode]);

  const handleSwitchCamera = () => {
    setIsReady(false);
    setFacingMode((current) => (current === "environment" ? "user" : "environment"));
  };

  const handleShutter = () => {
    const video = videoRef.current;
    if (!video || !isReady) return;

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    if (!context) {
      setError(t.camera.captureFailed);
      return;
    }
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setError(t.camera.captureFailed);
          return;
        }
        const fileName = `camera-${Date.now()}.jpg`;
        onCapture(new File([blob], fileName, { type: OUTPUT_MIME }));
      },
      OUTPUT_MIME,
      OUTPUT_QUALITY
    );
  };

  if (!isMounted) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t.camera.title}
      className="fixed inset-0 z-50 flex flex-col bg-black"
    >
      <div className="flex items-center justify-between px-4 py-3">
        <span className="text-sm font-medium text-white">{t.camera.title}</span>
        <button
          type="button"
          onClick={onClose}
          aria-label={t.camera.close}
          className="flex h-10 w-10 items-center justify-center rounded-full text-white transition-colors hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-white/40"
        >
          <span className="material-symbols-outlined text-[24px]">close</span>
        </button>
      </div>

      <div className="relative flex flex-1 items-center justify-center overflow-hidden">
        {error ? (
          <p role="alert" className="px-8 text-center text-sm text-white">
            {error}
          </p>
        ) : (
          <>
            <video
              ref={videoRef}
              playsInline
              muted
              className={`h-full w-full object-contain${
                facingMode === "user" ? " -scale-x-100" : ""
              }`}
            />
            {!isReady && (
              <p role="status" className="absolute text-sm text-white/80">
                {t.camera.starting}
              </p>
            )}
          </>
        )}
      </div>

      <div className="relative flex items-center justify-center pb-10 pt-6">
        {hasMultipleCameras && (
          <button
            type="button"
            onClick={handleSwitchCamera}
            aria-label={t.camera.switchCamera}
            className="absolute right-8 flex h-12 w-12 items-center justify-center rounded-full bg-white/15 text-white transition-colors hover:bg-white/25 focus:outline-none focus:ring-2 focus:ring-white/40"
          >
            <span className="material-symbols-outlined text-[24px]">cameraswitch</span>
          </button>
        )}
        <button
          type="button"
          onClick={handleShutter}
          disabled={!isReady || error !== null}
          aria-label={t.camera.shutter}
          className="flex h-18 w-18 items-center justify-center rounded-full border-4 border-white/70 transition-transform active:scale-95 disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-white/40"
        >
          <span className="h-14 w-14 rounded-full bg-white" />
        </button>
      </div>
    </div>,
    document.body
  );
}
