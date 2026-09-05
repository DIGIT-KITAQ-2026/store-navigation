"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import StoreNavigation3D from "@/components/store-3d/StoreNavigation3D";
import GuidePanel from "@/components/features/GuidePanel";
import { findKnownDestination } from "@/lib/store-navigation/store-layout";
import { useTranslations, format } from "@/lib/i18n/useTranslations";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { translateCategory } from "@/lib/i18n/categoryLabels";
import type { Product } from "@/types/product";

interface NavigateScreenProps {
  product: Product;
}

export default function NavigateScreen({ product }: NavigateScreenProps) {
  const router = useRouter();
  const t = useTranslations();
  const { locale } = useLocale();
  const [guideMessage, setGuideMessage] = useState<string | null>(null);
  // 「3D案内を開始」が押されたか(経路・矢印・目的地マーカーをStoreNavigation3D側に表示するか)。
  // 商品ページを開いた直後は常にfalseで、3D店舗自体は見えるが案内表示は出さない
  const [guideStarted, setGuideStarted] = useState(false);

  // Supabaseから取得済みのshelfIdを、登録済みの正式な棚id(Shelf_01〜08)としてだけ扱う。
  // 棚未登録・未登録値の場合はnullとなり、3D案内自体を出さない(resolveDestination()の
  // Shelf_01フォールバックには乗せない。実商品を誤って青果へ案内してしまうため)
  const destination = findKnownDestination(product.shelfId);
  const destinationLabel = destination ? translateCategory(destination.label, locale) : null;

  // 商品(=棚ID)が変わったら、以前の商品ページで案内開始済みだった状態を持ち越さない。
  // useEffectではなくレンダー中にstateを調整するReact推奨パターンを使う
  // (https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes)
  const guideResetKey = `${product.id}:${destination?.id ?? ""}`;
  const [lastGuideResetKey, setLastGuideResetKey] = useState(guideResetKey);
  if (guideResetKey !== lastGuideResetKey) {
    setLastGuideResetKey(guideResetKey);
    setGuideStarted(false);
    setGuideMessage(null);
  }

  const handleStartGuide = () => {
    if (!destination || !destinationLabel) return;
    setGuideStarted(true);
    setGuideMessage(format(t.guide.guideMessage, { label: destinationLabel }));
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
      <div className="flex items-center gap-3 px-4 py-3">
        <button
          type="button"
          onClick={handleBackToSearch}
          aria-label={t.navigate.backToSearch}
          className="flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-surface-variant"
        >
          <span className="material-symbols-outlined text-on-surface-variant">arrow_back</span>
        </button>
        <h1 className="text-xl font-bold text-on-surface">{t.navigate.backToSearch}</h1>
      </div>

      <div className="flex flex-1 flex-col md:min-h-0 md:flex-row">
        {/*
          StoreNavigation3D自体が目的地ラベル・モード切替などの重ねUIを内部で持つため、
          このラッパーには重複するオーバーレイ(戻るボタン等)を置かない。
          モバイルはaspect-videoだけに頼ると縦幅が狭すぎる(操作しにくい)ため、
          min-height + 100dvh基準の高さで最低限の3D操作領域を確保する。
          PCはmd:flex-1でサイドパネル分を除いた残り幅いっぱいに表示する(高さは変更しない)
        */}
        <div className="relative min-h-[280px] h-[52dvh] max-h-[520px] w-full shrink-0 overflow-hidden md:h-full md:max-h-none md:min-h-0 md:aspect-auto md:min-w-0 md:flex-1">
          {destination ? (
            <StoreNavigation3D
              destinationId={destination.id}
              initialMode="auto-demo"
              guideVisible={guideStarted}
              className="h-full w-full"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-surface-variant/40 px-6 text-center">
              <p className="text-sm font-medium text-on-surface-variant">{t.guide.pendingLocation}</p>
            </div>
          )}
        </div>

        <div className="animate-fade-in-up w-full shrink-0 p-4 md:h-full md:w-[380px] md:overflow-y-auto md:border-l md:border-outline-variant md:p-6">
          <GuidePanel
            product={product}
            destinationLabel={destinationLabel}
            guideMessage={guideMessage}
            guideStarted={guideStarted}
            onStartGuide={handleStartGuide}
          />
        </div>
      </div>
    </div>
  );
}
