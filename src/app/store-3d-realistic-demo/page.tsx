import Link from "next/link";
import type { Metadata } from "next";
import RealisticStoreViewer from "@/components/store-3d-realistic/RealisticStoreViewer";

export const metadata: Metadata = {
  title: "GLB店舗の表示検証 | Smart Store Navi",
  robots: { index: false, follow: false },
};

export default async function RealisticStoreDemoPage({ searchParams }: {
  searchParams: Promise<{ shelfId?: string | string[] }>;
}) {
  const { shelfId } = await searchParams;
  const initialShelfId = typeof shelfId === "string" ? shelfId : shelfId ? "" : undefined;
  return (
    <main className="min-h-dvh bg-stone-100 text-stone-800">
      <header className="flex min-h-16 items-center justify-between gap-4 border-b bg-white px-4 py-3">
        <h1 className="font-bold">GLB店舗の表示検証</h1>
        <Link href="/store-3d-demo" className="text-sm text-teal-700 underline">既存の3Dデモへ</Link>
        <Link href="/search" className="text-sm text-teal-700 underline">商品検索へ</Link>
      </header>
      <p className="px-4 py-2 text-sm" id="realistic-store-notice">
        新店舗の案内検証です。棚・壁・レジ・平台の単純な境界で移動を制限します。旧店舗とはカテゴリ配置が異なります。
      </p>
      <div className="relative h-[calc(100dvh-8rem)] min-h-[420px]" aria-describedby="realistic-store-notice">
        <RealisticStoreViewer initialShelfId={initialShelfId} />
      </div>
    </main>
  );
}
