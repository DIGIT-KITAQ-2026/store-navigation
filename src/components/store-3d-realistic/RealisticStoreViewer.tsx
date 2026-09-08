"use client";

import { Component, Suspense, type ReactNode } from "react";
import dynamic from "next/dynamic";
import type { StockInfo } from "@/lib/inventory/stockStatus";
import { dictionaries } from "@/lib/i18n/dictionaries";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/locales";
import type { Dictionary } from "@/lib/i18n/dictionaries/ja";

const Scene = dynamic(() => import("./RealisticStoreScene"), { ssr: false });

function ViewerLoading({ t }: { t: Dictionary["navigate3dRealistic"] }) {
  return <div className="flex h-full items-center justify-center bg-stone-100 p-4"><p role="status" className="rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm text-slate-700 shadow-sm">{t.viewerLoading}</p></div>;
}

class ViewerBoundary extends Component<{ children: ReactNode; t: Dictionary["navigate3dRealistic"] }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (this.state.failed) {
      const { t } = this.props;
      return (
        <div className="flex h-full items-center justify-center bg-stone-100 p-4">
          <div role="alert" className="max-w-sm rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-800 shadow-sm">
          <p>{t.viewerError}</p>
          <button className="mt-4 min-h-11 rounded-full bg-teal-700 px-5 py-2 font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700" onClick={() => window.location.reload()}>{t.reload}</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function RealisticStoreViewer({
  initialShelfId,
  destinationStock,
  locale = DEFAULT_LOCALE,
}: {
  initialShelfId?: string;
  /** 案内先商品の在庫状態。目的地の売り場を切り替えても再取得しない(propsで渡された値をそのまま使う)。 */
  destinationStock?: StockInfo;
  /**
   * 表示言語。未指定時は日本語(`/store-3d-realistic-demo`のようにLocaleProviderが無い
   * 文脈からの利用を想定したデフォルト)。Canvas境界をまたぐReact Contextに頼らず、
   * ここで解決した辞書をpropsとしてSceneへバケツリレーする(既存の`src/components/store-3d/`と同じ設計)。
   */
  locale?: Locale;
}) {
  const dict = dictionaries[locale];
  return (
    <ViewerBoundary t={dict.navigate3dRealistic}>
      <Suspense fallback={<ViewerLoading t={dict.navigate3dRealistic} />}>
        <Scene key={initialShelfId ?? "unselected"} initialShelfId={initialShelfId} destinationStock={destinationStock}
          t={dict.navigate3dRealistic} stockLabels={dict.stock} locale={locale} />
      </Suspense>
    </ViewerBoundary>
  );
}
