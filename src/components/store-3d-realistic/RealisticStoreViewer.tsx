"use client";

import { Component, type ReactNode } from "react";
import dynamic from "next/dynamic";
import type { StockInfo } from "@/lib/inventory/stockStatus";

const Scene = dynamic(() => import("./RealisticStoreScene"), {
  ssr: false,
  loading: () => <div className="flex h-full items-center justify-center bg-stone-100 p-4"><p role="status" className="rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm text-slate-700 shadow-sm">店舗を準備しています…</p></div>,
});

class ViewerBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (this.state.failed) {
      return (
        <div className="flex h-full items-center justify-center bg-stone-100 p-4">
          <div role="alert" className="max-w-sm rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-800 shadow-sm">
          <p>店舗を表示できませんでした。通信状態とブラウザをご確認ください。</p>
          <button className="mt-4 min-h-11 rounded-full bg-teal-700 px-5 py-2 font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700" onClick={() => window.location.reload()}>再読み込み</button>
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
}: {
  initialShelfId?: string;
  /** 案内先商品の在庫状態。目的地の売り場を切り替えても再取得しない(propsで渡された値をそのまま使う)。 */
  destinationStock?: StockInfo;
}) {
  return (
    <ViewerBoundary>
      <Scene key={initialShelfId ?? "unselected"} initialShelfId={initialShelfId} destinationStock={destinationStock} />
    </ViewerBoundary>
  );
}
