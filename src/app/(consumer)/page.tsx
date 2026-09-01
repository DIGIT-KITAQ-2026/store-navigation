import StoreEntranceHero from "@/components/features/StoreEntranceHero";
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
        <StoreEntranceHero
          storeName={storeName}
          storeDescription={storeDescription}
          suggestions={SEARCH_SUGGESTIONS}
        />
      </div>
    </div>
  );
}
