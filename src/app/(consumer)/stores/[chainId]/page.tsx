import { notFound } from "next/navigation";
import BranchSelectScreen from "@/components/features/BranchSelectScreen";
import { findChain } from "@/lib/stores/storeDirectory";

/** 2段階目: 選んだ店舗の支店を選ぶ。選ぶと商品検索へ進む */
export default async function BranchSelectPage({
  params,
}: {
  params: Promise<{ chainId: string }>;
}) {
  const { chainId } = await params;
  const chain = findChain(chainId);
  if (!chain) notFound();

  return <BranchSelectScreen chainId={chain.id} chainName={chain.name} />;
}
