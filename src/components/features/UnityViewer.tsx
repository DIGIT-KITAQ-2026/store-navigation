"use client";

import { useImperativeHandle, useRef, useState } from "react";
import { postStartGuideMessage } from "@/lib/unityBridge";

const UNITY_BUILD_URL = "/unity/index.html";
const LOAD_TIMEOUT_MS = 8000;

export interface UnityViewerHandle {
  /**
   * 選択中商品の棚IDをUnity WebGLへpostMessageで送信する。
   * Unity側の読み込みがまだ完了していない場合は保留し、読み込み完了時に自動送信する
   * (pendingShelfId)。
   */
  startGuideByShelfId: (shelfId: string) => void;
}

interface UnityViewerProps {
  ref?: React.Ref<UnityViewerHandle>;
}

export default function UnityViewer({ ref }: UnityViewerProps) {
  const [status, setStatus] = useState<"loading" | "loaded" | "failed">("loading");
  const [reloadKey, setReloadKey] = useState(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const iframeElementRef = useRef<HTMLIFrameElement | null>(null);
  const pendingShelfIdRef = useRef<string | null>(null);

  const sendGuide = (shelfId: string) => {
    postStartGuideMessage(iframeElementRef.current?.contentWindow, shelfId);
  };

  useImperativeHandle(ref, () => ({
    startGuideByShelfId: (shelfId: string) => {
      if (status === "loaded") {
        sendGuide(shelfId);
      } else {
        // Unity側がまだ読み込み中/未読み込みのため保留し、handleLoadで読み込み完了を待って送信する
        pendingShelfIdRef.current = shelfId;
      }
    },
  }));

  const clearLoadTimeout = () => {
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  const startLoadTimeout = () => {
    clearLoadTimeout();
    timeoutRef.current = setTimeout(() => {
      setStatus((current) => (current === "loading" ? "failed" : current));
    }, LOAD_TIMEOUT_MS);
  };

  const handleIframeRef = (node: HTMLIFrameElement | null) => {
    iframeElementRef.current = node;
    if (node !== null) {
      startLoadTimeout();
    }
  };

  const handleLoad = () => {
    clearLoadTimeout();
    setStatus("loaded");

    if (pendingShelfIdRef.current !== null) {
      sendGuide(pendingShelfIdRef.current);
      pendingShelfIdRef.current = null;
    }
  };

  const handleRetry = () => {
    clearLoadTimeout();
    setStatus("loading");
    setReloadKey((key) => key + 1);
  };

  return (
    <div className="relative aspect-video w-full overflow-hidden bg-surface-variant md:aspect-auto md:h-full">
      <iframe
        key={reloadKey}
        ref={handleIframeRef}
        src={UNITY_BUILD_URL}
        title="3D店舗案内"
        allowFullScreen
        loading="eager"
        onLoad={handleLoad}
        className="block h-full w-full border-0"
      />

      {/* 読み込み完了時にUnity表示を隠さず、覆っているオーバーレイだけを自然にフェードアウトさせる */}
      <div
        role="status"
        aria-live="polite"
        aria-hidden={status !== "loading"}
        className={`pointer-events-none absolute inset-0 flex items-center justify-center bg-slate-900/80 px-4 text-center transition-opacity duration-300 ease-out motion-reduce:transition-none ${
          status === "loading" ? "opacity-100" : "opacity-0"
        }`}
      >
        <p className="text-sm font-medium text-white">3D店舗を読み込んでいます…</p>
      </div>

      {status === "failed" && (
        <div
          role="status"
          aria-live="polite"
          className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-900/90 px-4 text-center"
        >
          <p className="text-sm font-medium text-white">3D店舗を読み込めませんでした。</p>
          <button
            type="button"
            onClick={handleRetry}
            className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-on-primary transition-colors hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-white/60 focus:ring-offset-2 focus:ring-offset-slate-900"
          >
            再読み込み
          </button>
        </div>
      )}
    </div>
  );
}
