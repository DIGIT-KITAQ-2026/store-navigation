"use client";

import { useImperativeHandle, useRef, useState } from "react";
import { postStartGuideMessage } from "@/lib/unityBridge";

const UNITY_BUILD_URL = "/unity/index.html";
const LOAD_TIMEOUT_MS = 8000;

export interface UnityViewerHandle {
  /** 選択中商品の棚IDをUnity WebGLへpostMessageで送信する */
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

  useImperativeHandle(ref, () => ({
    startGuideByShelfId: (shelfId: string) => {
      postStartGuideMessage(iframeElementRef.current?.contentWindow, shelfId);
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
  };

  const handleRetry = () => {
    clearLoadTimeout();
    setStatus("loading");
    setReloadKey((key) => key + 1);
  };

  return (
    <section className="flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-sm sm:p-5">
      <div>
        <h2 className="text-lg font-bold text-slate-900">3D店舗案内</h2>
        <p className="mt-1 text-sm text-slate-600">検索した商品の場所と案内ルートを確認できます</p>
      </div>

      <div className="relative w-full overflow-hidden rounded-xl border border-blue-100 bg-slate-100 aspect-video max-h-[320px] min-h-[280px] sm:max-h-[420px] sm:min-h-[420px] lg:max-h-[360px] lg:min-h-[360px]">
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

        {status === "loading" && (
          <div
            role="status"
            aria-live="polite"
            className="pointer-events-none absolute inset-0 flex items-center justify-center bg-slate-100/90 px-4 text-center"
          >
            <p className="text-sm font-medium text-slate-600">3D店舗を読み込んでいます…</p>
          </div>
        )}

        {status === "failed" && (
          <div
            role="status"
            aria-live="polite"
            className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-100/95 px-4 text-center"
          >
            <p className="text-sm font-medium text-slate-600">
              3D店舗を読み込めませんでした。商品検索は引き続き利用できます。
            </p>
            <button
              type="button"
              onClick={handleRetry}
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:ring-offset-2"
            >
              再読み込み
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
