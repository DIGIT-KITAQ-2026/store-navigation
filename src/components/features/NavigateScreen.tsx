"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import UnityViewer, { type UnityViewerHandle } from "@/components/features/UnityViewer";
import GuidePanel from "@/components/features/GuidePanel";
import type { Product } from "@/types/product";

interface NavigateScreenProps {
  product: Product;
}

export default function NavigateScreen({ product }: NavigateScreenProps) {
  const router = useRouter();
  const [guideMessage, setGuideMessage] = useState<string | null>(null);
  const unityViewerRef = useRef<UnityViewerHandle>(null);

  const handleStartGuide = () => {
    // Unity側の読み込みが完了していなくても、UnityViewer内部でpendingShelfIdとして
    // 保留され読み込み完了時に自動送信されるため、ここでは常に呼び出すだけでよい
    unityViewerRef.current?.startGuideByShelfId(product.shelfId);
    setGuideMessage(`3D店舗で${product.shelfId}への案内を開始します`);
  };

  const handleBackToSearch = () => {
    // ブラウザ履歴を戻ることで、/searchのSearchScreenが保持していた前回の検索結果
    // (useStateの内容)をそのまま復元する。直接アクセス等で履歴が無い場合のみ
    // /searchへ新規遷移する
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/search");
    }
  };

  return (
    <div className="relative flex min-h-dvh flex-col bg-surface md:h-[calc(100dvh-4rem)] md:min-h-0">
      {/* モバイル: ヘッダー直下の戻る導線行 */}
      <div className="flex items-center gap-3 px-4 py-3 md:hidden">
        <button
          type="button"
          onClick={handleBackToSearch}
          aria-label="検索結果に戻る"
          className="flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-surface-variant"
        >
          <span className="material-symbols-outlined text-on-surface-variant">arrow_back</span>
        </button>
        <h1 className="text-xl font-bold text-on-surface">検索結果に戻る</h1>
      </div>

      <div className="relative w-full md:min-h-0 md:flex-1">
        {/* モバイル: マップ内左上のラベル */}
        <div className="absolute left-3 top-3 z-10 flex items-center gap-1 rounded-full bg-surface/90 px-3 py-1 text-xs font-semibold text-on-surface-variant shadow-sm md:hidden">
          <span className="material-symbols-outlined text-[16px]">3d_rotation</span>
          3D店内マップ
        </div>

        {/* デスクトップ: マップに重ねる戻る導線とラベル */}
        <button
          type="button"
          onClick={handleBackToSearch}
          className="absolute left-6 top-4 z-10 hidden items-center gap-2 rounded-full border border-outline-variant bg-surface/80 px-4 py-2 text-sm font-medium text-on-surface-variant shadow-sm backdrop-blur-sm transition-colors hover:text-primary md:inline-flex"
        >
          <span className="material-symbols-outlined text-[20px]">arrow_back</span>
          検索結果に戻る
        </button>
        <div className="absolute right-6 top-4 z-10 hidden items-center gap-2 rounded-lg border border-outline-variant bg-surface/90 px-4 py-2 text-sm font-bold text-on-surface shadow-sm backdrop-blur-md md:flex">
          <span className="material-symbols-outlined text-primary">3d_rotation</span>
          3D店内マップ
        </div>

        <UnityViewer ref={unityViewerRef} />
      </div>

      <div className="p-4 md:absolute md:bottom-6 md:right-6 md:z-20 md:w-80 md:p-0">
        <GuidePanel product={product} guideMessage={guideMessage} onStartGuide={handleStartGuide} />
      </div>
    </div>
  );
}
