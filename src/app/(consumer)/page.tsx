import Image from "next/image";
import SearchSuggestions from "@/components/ui/SearchSuggestions";
import { getStoreInfo } from "@/lib/supabase/server";

const SEARCH_SUGGESTIONS = ["牛乳", "朝食に必要なもの", "カレーの材料", "飲み物が欲しい"];
const FALLBACK_STORE_NAME = "Smart Store Navi";

export default async function Home() {
  const storeInfo = await getStoreInfo();
  const storeName = storeInfo?.name ?? FALLBACK_STORE_NAME;
  const storeDescription = storeInfo?.description ?? null;

  return (
    <div className="min-h-full bg-surface pb-32 md:pb-16">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-4 py-6 md:max-w-4xl md:py-16">
        {/* ヒーローセクション */}
        <section className="flex flex-col items-center gap-4 text-center">
          <div className="w-full max-w-5xl overflow-hidden rounded-2xl border border-outline-variant shadow-sm md:aspect-[21/9] md:rounded-[24px]">
            <Image
              src="/images/design-reference/store-hero-photo.jpg"
              alt={storeName}
              width={1024}
              height={576}
              className="h-auto max-h-64 w-full object-cover md:h-full md:max-h-none"
              priority
            />
          </div>
          <h1 className="text-2xl font-bold text-on-surface md:text-4xl">{storeName}</h1>
          {storeDescription && (
            <p className="text-sm leading-relaxed text-on-surface-variant md:text-lg">
              {storeDescription}
            </p>
          )}
        </section>

        {/* 検索セクション */}
        <section className="flex flex-col items-center gap-4 text-center">
          <div>
            <h2 className="flex items-center justify-center gap-2 text-lg font-bold text-on-surface md:text-3xl">
              <span className="material-symbols-outlined text-primary md:hidden">manage_search</span>
              商品で探す
            </h2>
            <p className="mt-1 text-xs text-on-surface-variant md:text-base">
              商品名や作りたいもの・目的から売り場を検索できます。
            </p>
          </div>
          <SearchSuggestions suggestions={SEARCH_SUGGESTIONS} />
        </section>
      </div>

      {/* 検索バー: モバイルは画面下部固定、デスクトップはページ内インライン */}
      <div className="fixed inset-x-0 bottom-6 z-40 px-4 md:static md:mx-auto md:mb-16 md:mt-8 md:w-full md:max-w-2xl md:px-0">
        <form
          method="GET"
          action="/search"
          role="search"
          className="relative mx-auto w-full max-w-2xl"
          suppressHydrationWarning
        >
          <label htmlFor="product-search-input" className="sr-only">
            商品名や欲しいものを入力
          </label>
          <span className="material-symbols-outlined pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant">
            search
          </span>
          <input
            id="product-search-input"
            name="q"
            type="text"
            inputMode="search"
            autoComplete="off"
            placeholder="商品名や欲しいものを入力"
            aria-label="商品名や欲しいものを入力"
            className="h-14 w-full rounded-full border border-outline-variant bg-surface pl-12 pr-16 text-base text-on-surface shadow-[0_8px_30px_rgb(0,0,0,0.12)] placeholder:text-on-surface-variant/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 md:shadow-md"
            suppressHydrationWarning
          />
          <button
            type="submit"
            aria-label="AI検索"
            className="absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-primary text-on-primary transition-colors hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            <span className="material-symbols-outlined text-[20px]">send</span>
          </button>
        </form>
      </div>
    </div>
  );
}
