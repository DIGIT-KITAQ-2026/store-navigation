"use client";

import { Component, type ReactNode } from "react";
import dynamic from "next/dynamic";

const Scene = dynamic(() => import("./RealisticStoreScene"), {
  ssr: false,
  loading: () => <p role="status" className="p-6">3D表示を準備しています…</p>,
});

class ViewerBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (this.state.failed) {
      return (
        <div role="alert" className="flex h-full flex-col items-center justify-center gap-4 p-6">
          <p>店舗を表示できませんでした。通信状態とブラウザの3D対応をご確認ください。</p>
          <button className="rounded bg-teal-700 px-4 py-2 text-white" onClick={() => window.location.reload()}>再読み込み</button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function RealisticStoreViewer({ initialShelfId }: { initialShelfId?: string }) {
  return <ViewerBoundary><Scene key={initialShelfId ?? "unselected"} initialShelfId={initialShelfId} /></ViewerBoundary>;
}
