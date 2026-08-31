import StoreHeader from "@/components/ui/StoreHeader";
import { getStoreInfo } from "@/lib/supabase/server";

export default async function ConsumerLayout({ children }: { children: React.ReactNode }) {
  const storeInfo = await getStoreInfo();

  return (
    <div className="flex min-h-full flex-col">
      <StoreHeader storeName={storeInfo?.name ?? null} />
      <div className="flex-1">{children}</div>
    </div>
  );
}
