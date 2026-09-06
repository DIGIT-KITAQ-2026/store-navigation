import Link from "next/link";
import type { Metadata } from "next";
import RealisticStoreViewer from "@/components/store-3d-realistic/RealisticStoreViewer";

export const metadata: Metadata = {
  title: "3Dストアナビ | Smart Store Navi",
  robots: { index: false, follow: false },
};

export default async function RealisticStoreDemoPage({ searchParams }: {
  searchParams: Promise<{ shelfId?: string | string[] }>;
}) {
  const { shelfId } = await searchParams;
  const initialShelfId = typeof shelfId === "string" ? shelfId : shelfId ? "" : undefined;
  return (
    <main className="flex h-dvh min-h-0 flex-col overflow-hidden bg-stone-100 text-[#122033]">
      <header className="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-[#122033]/10 bg-white px-4 md:h-20 md:px-6">
        <div><p className="text-xs font-semibold text-teal-800">Smart Store Navi</p><h1 className="text-lg font-bold md:text-2xl">3Dストアナビ</h1></div>
        <Link href="/search" className="flex min-h-11 shrink-0 items-center rounded-full border border-teal-700/20 px-4 text-sm font-semibold text-teal-800 hover:bg-teal-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700">商品検索へ</Link>
      </header>
      <div className="relative min-h-0 flex-1">
        <RealisticStoreViewer initialShelfId={initialShelfId} />
      </div>
    </main>
  );
}
