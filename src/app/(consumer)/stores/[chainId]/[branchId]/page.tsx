import { notFound } from "next/navigation";
import StoreEntranceHero from "@/components/features/StoreEntranceHero";
import { findBranch, findChain } from "@/lib/stores/storeDirectory";

/** 3段階目: 選んだ支店で商品を検索する(従来のトップ画面と同じ内容) */
export default async function ProductSearchPage({
  params,
}: {
  params: Promise<{ chainId: string; branchId: string }>;
}) {
  const { chainId, branchId } = await params;
  const chain = findChain(chainId);
  const branch = findBranch(chainId, branchId);
  if (!chain || !branch) notFound();

  return <StoreEntranceHero storeName={`${chain.name} ${branch.name}`} />;
}
