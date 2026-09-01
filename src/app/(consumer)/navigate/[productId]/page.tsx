import { notFound } from "next/navigation";
import NavigateScreen from "@/components/features/NavigateScreen";
import { getProductWithShelfLocation } from "@/lib/supabase/server";

export default async function NavigatePage({
  params,
}: {
  params: Promise<{ productId: string }>;
}) {
  const { productId } = await params;
  const product = await getProductWithShelfLocation(productId);

  if (!product) notFound();

  return <NavigateScreen product={product} />;
}
