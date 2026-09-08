"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useStoreFlow } from "@/lib/storeFlowState";

/**
 * 支店検索・商品検索を、店舗検索から順に辿って来た場合だけ表示する。
 *
 * これらの画面はURLを持つため、そのままではリロードやURLの直接入力で途中から始まってしまう
 * (商品検索のURLでリロードすると商品検索画面のままになる)。最初の画面は必ず店舗検索に
 * したいので、経由の記録が無い場合はトップへ送り返す。記録はページ再読み込みで消える。
 *
 * 送り返す間は何も描画しない(一瞬だけ途中の画面が見えるのを防ぐため)。
 */
export default function StoreFlowGuard({ children }: { children: ReactNode }) {
  const { hasVisitedTop } = useStoreFlow();
  const router = useRouter();

  useEffect(() => {
    if (!hasVisitedTop) router.replace("/");
  }, [hasVisitedTop, router]);

  if (!hasVisitedTop) return null;

  return <>{children}</>;
}
