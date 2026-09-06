"use client";

import { useRouter } from "next/navigation";
import RealisticStoreViewer from "@/components/store-3d-realistic/RealisticStoreViewer";
import GuidePanel from "@/components/features/GuidePanel";
import { normalizeRealisticShelfId, REALISTIC_CATEGORIES } from "@/lib/store-navigation/realistic-store-ids";
import { useTranslations } from "@/lib/i18n/useTranslations";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { translateCategory } from "@/lib/i18n/categoryLabels";
import type { Product } from "@/types/product";

export default function NavigateScreen({ product }: { product: Product }) {
  const router = useRouter();
  const t = useTranslations();
  const { locale } = useLocale();
  // Use the already fetched shelf ID. Never infer a destination for an unknown ID.
  const destination = normalizeRealisticShelfId(product.shelfId);
  const destinationLabel = destination ? translateCategory(REALISTIC_CATEGORIES[destination], locale) : null;
  const handleBackToSearch = () => {
    if (typeof window !== "undefined" && window.history.length > 1) router.back();
    else router.push("/search");
  };

  return (
    <div className="flex min-h-0 flex-col bg-surface text-[#122033] lg:h-[calc(100dvh-4rem)]">
      <header className="flex min-h-16 shrink-0 items-center gap-3 border-b border-[#122033]/10 bg-white px-4">
        <button type="button" onClick={handleBackToSearch} aria-label={t.navigate.backToSearch}
          className="flex min-h-11 min-w-11 items-center justify-center rounded-full hover:bg-teal-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700">
          <span aria-hidden="true" className="material-symbols-outlined">arrow_back</span>
        </button>
        <h1 className="text-lg font-bold">3Dストアナビ</h1>
        <span className="ml-auto text-sm text-slate-600">商品案内</span>
      </header>
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <div className="relative h-[calc(100svh-8rem)] min-h-[480px] min-w-0 flex-1 overflow-hidden lg:h-auto lg:min-h-0">
          {destination ? <RealisticStoreViewer initialShelfId={destination} /> : (
            <div className="flex h-full items-center justify-center bg-stone-100 p-6">
              <p role="status" className="max-w-sm rounded-2xl border border-slate-200 bg-white p-5 text-sm shadow-sm">{t.guide.pendingLocation}</p>
            </div>
          )}
        </div>
        <aside aria-label="商品情報" className="w-full shrink-0 p-4 lg:w-[320px] lg:overflow-y-auto lg:border-l lg:border-slate-200">
          <GuidePanel product={product} destinationLabel={destinationLabel} guideMessage={null} guideStarted={false} />
        </aside>
      </div>
    </div>
  );
}
