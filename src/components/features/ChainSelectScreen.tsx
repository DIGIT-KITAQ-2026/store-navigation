"use client";

import { useCallback, useEffect } from "react";
import StoreSelectScreen, { type StoreSelectItem } from "./StoreSelectScreen";
import { searchChains } from "@/lib/stores/storeDirectory";
import { useTranslations } from "@/lib/i18n/useTranslations";
import { useStoreFlow } from "@/lib/storeFlowState";

/** 1段階目: 店舗(チェーン)を検索して選ぶ画面 */
export default function ChainSelectScreen() {
  const t = useTranslations();
  const { markVisitedTop } = useStoreFlow();

  // この画面を通ったことを記録する。以降の支店検索・商品検索はこの記録が無いと表示されない
  // (リロードすると記録が消えるため、必ず店舗検索から始まる)
  useEffect(() => {
    markVisitedTop();
  }, [markVisitedTop]);

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
