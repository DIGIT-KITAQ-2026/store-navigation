import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import NavigateScreen from "@/components/features/NavigateScreen";
import { getProductWithShelfLocation } from "@/lib/supabase/server";
import { DEFAULT_LOCALE, LOCALE_COOKIE_NAME, isLocale } from "@/lib/i18n/locales";

export default async function NavigatePage({
  params,
}: {
  params: Promise<{ productId: string }>;
}) {
  const { productId } = await params;
  const cookieStore = await cookies();
  const localeCookie = cookieStore.get(LOCALE_COOKIE_NAME)?.value;
  const locale = isLocale(localeCookie) ? localeCookie : DEFAULT_LOCALE;

  const product = await getProductWithShelfLocation(productId, locale);

  if (!product) notFound();

  return <NavigateScreen product={product} />;
}
