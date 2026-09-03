import Link from "next/link";
import type { Metadata } from "next";
import DestinationSwitcher from "./DestinationSwitcher";

export const metadata: Metadata = {
  title: "3Dストアナビ(デモ) | Smart Store Navi",
  description: "入口から青果売り場までのブラウザネイティブ3D店内ナビゲーションのデモ画面です。",
};

export default function Store3DDemoPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-surface">
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-outline-variant bg-white px-4 py-2">
        <div>
          <p className="text-xs font-medium text-on-surface-variant">Smart Store Navi</p>
          <h1 className="text-lg font-bold text-on-surface">3Dストアナビ(デモ)</h1>
        </div>
        <Link href="/" className="text-sm font-medium text-teal-700 hover:underline">
          トップへ戻る
        </Link>
      </header>

      {/*
        flex-1(flex-grow)によるmin-h-dvh経由の高さ解決は、Canvasまでの入れ子(このdiv→
        StoreNavigation3D→R3F Canvasの計測用div)が多く確定ピクセル高になりにくいため、
        NavigateScreen.tsxと同じ手法でヘッダー分(h-16=4rem)を引いたdvh基準の高さを直接指定する。
        画面が低いPCでもmin-h-[520px]を下限として3D領域が潰れないようにする
      */}
      <div className="relative min-h-[520px] h-[calc(100dvh-4rem)]">
        <DestinationSwitcher />
      </div>
    </div>
  );
}
