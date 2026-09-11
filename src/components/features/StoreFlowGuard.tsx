"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useStoreFlow } from "@/lib/storeFlowState";

/**
 * 支店検索・商品検索・ナビを、店舗検索から順に辿って来た場合だけ表示する。
 *
 * **この4つの画面すべてに付けること。** 1つでも付け忘れると、その画面のURLから
 * 始められてしまう(実際、/search に付け忘れていたため、ブラウザが
 * 「/search?q=マイクロファイバークロス」を復元すると検索結果から始まっていた)。
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
