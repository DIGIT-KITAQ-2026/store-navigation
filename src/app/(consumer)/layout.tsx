import { cookies } from "next/headers";
import StoreHeader from "@/components/ui/StoreHeader";
import { getStoreInfo } from "@/lib/supabase/server";
import { LocaleProvider } from "@/lib/i18n/LocaleProvider";
import { DEFAULT_LOCALE, LOCALE_COOKIE_NAME, isLocale } from "@/lib/i18n/locales";

export default async function ConsumerLayout({ children }: { children: React.ReactNode }) {
  const storeInfo = await getStoreInfo();
  const cookieStore = await cookies();
  const localeCookie = cookieStore.get(LOCALE_COOKIE_NAME)?.value;
  const initialLocale = isLocale(localeCookie) ? localeCookie : DEFAULT_LOCALE;

  return (
    <LocaleProvider initialLocale={initialLocale}>
      <div className="flex min-h-full flex-col">
        <StoreHeader storeName={storeInfo?.name ?? null} />
        <div className="flex-1">{children}</div>
      </div>
    </LocaleProvider>
  );
}
