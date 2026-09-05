import StoreEntranceHero from "@/components/features/StoreEntranceHero";
import { getStoreInfo } from "@/lib/supabase/server";

const FALLBACK_STORE_NAME = "Smart Store Navi";

export default async function Home() {
  const storeInfo = await getStoreInfo();
  const storeName = storeInfo?.name ?? FALLBACK_STORE_NAME;

  return <StoreEntranceHero storeName={storeName} />;
}
