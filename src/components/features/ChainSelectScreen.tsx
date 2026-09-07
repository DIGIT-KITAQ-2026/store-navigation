"use client";

import { useCallback } from "react";
import StoreSelectScreen, { type StoreSelectItem } from "./StoreSelectScreen";
import { searchChains } from "@/lib/stores/storeDirectory";
import { useTranslations } from "@/lib/i18n/useTranslations";

/** 1段階目: 店舗(チェーン)を検索して選ぶ画面 */
export default function ChainSelectScreen() {
  const t = useTranslations();

  const filter = useCallback(
    (query: string): StoreSelectItem[] =>
      searchChains(query).map((chain) => ({
        id: chain.id,
        name: chain.name,
        description: chain.description,
        href: `/stores/${chain.id}`,
      })),
    []
  );

  return (
    <StoreSelectScreen
      heading={t.storeSelect.chainHeading}
      description={t.storeSelect.chainDescription}
      placeholder={t.storeSelect.chainPlaceholder}
      emptyMessage={t.storeSelect.chainEmpty}
      imageAlt={t.storeSelect.chainHeading}
      ctaLabel={t.storeSelect.chainCta}
      openLabel={t.storeSelect.chainOpenCard}
      filter={filter}
    />
  );
}
