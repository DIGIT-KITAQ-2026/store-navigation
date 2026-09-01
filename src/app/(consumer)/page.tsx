import StoreEntranceHero from "@/components/features/StoreEntranceHero";
import { getStoreInfo } from "@/lib/supabase/server";

const SEARCH_SUGGESTIONS = ["牛乳", "朝食に必要なもの", "カレーの材料", "飲み物が欲しい"];
const FALLBACK_STORE_NAME = "Smart Store Navi";

export default async function Home() {
  const storeInfo = await getStoreInfo();
  const storeName = storeInfo?.name ?? FALLBACK_STORE_NAME;

  return <StoreEntranceHero storeName={storeName} suggestions={SEARCH_SUGGESTIONS} />;
}
