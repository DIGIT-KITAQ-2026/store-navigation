"use client";

import { useCallback } from "react";
import StoreSelectScreen, { type StoreSelectItem } from "./StoreSelectScreen";
import { findChain, searchBranches } from "@/lib/stores/storeDirectory";
import { format, useTranslations } from "@/lib/i18n/useTranslations";

interface BranchSelectScreenProps {
  chainId: string;
  chainName: string;
}

/** 2段階目: 選んだ店舗の支店を検索して選ぶ画面 */
export default function BranchSelectScreen({ chainId, chainName }: BranchSelectScreenProps) {
  const t = useTranslations();

  const filter = useCallback(
    (query: string): StoreSelectItem[] => {
      const chain = findChain(chainId);
      if (!chain) return [];
      return searchBranches(chain, query).map((branch) => ({
        id: branch.id,
        name: branch.name,
        description: branch.description,
        href: `/stores/${chain.id}/${branch.id}`,
      }));
    },
    [chainId]
  );

  return (
    <StoreSelectScreen
      heading={format(t.storeSelect.branchHeading, { chain: chainName })}
      description={t.storeSelect.branchDescription}
      placeholder={t.storeSelect.branchPlaceholder}
      emptyMessage={t.storeSelect.branchEmpty}
      imageAlt={chainName}
      ctaLabel={t.storeSelect.branchCta}
      openLabel={t.storeSelect.branchOpenCard}
      backHref="/"
      filter={filter}
    />
  );
}
