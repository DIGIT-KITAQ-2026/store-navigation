"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

interface StoreFlowState {
  /** ヒーローのせり上がるカードが開いているか */
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  /** この読み込みで店舗検索(トップ)を経由したか */
  hasVisitedTop: boolean;
  markVisitedTop: () => void;
}

const StoreFlowContext = createContext<StoreFlowState | null>(null);

/**
 * 店舗検索 → 支店検索 → 商品検索の進行状態を、画面をまたいで保持する。
 *
 * 消費者画面の共通レイアウトに置くこのProviderは画面遷移では作り直されないが、
 * ページの再読み込み(リロード・URLの直接入力)では作り直される。この性質を使って
 * 次の2つを実現している。
 *
 * - カードの開閉(isOpen): 店舗を選んでもカードが閉じず、中身だけ切り替わる
 * - トップ経由の記録(hasVisitedTop): リロードすると記録が消えるため、
 *   支店検索・商品検索のURLを開き直しても店舗検索からやり直しになる
 */
export function StoreFlowProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [hasVisitedTop, setHasVisitedTop] = useState(false);

  const markVisitedTop = useCallback(() => setHasVisitedTop(true), []);

  // setIsOpen/markVisitedTopは同一性が保たれる。valueを毎回作り直すと
  // 参照先のuseEffectが開閉のたびに登録し直しになるためまとめて固定する
  const value = useMemo(
    () => ({ isOpen, setIsOpen, hasVisitedTop, markVisitedTop }),
    [isOpen, hasVisitedTop, markVisitedTop]
  );

  return <StoreFlowContext.Provider value={value}>{children}</StoreFlowContext.Provider>;
}

export function useStoreFlow(): StoreFlowState {
  const context = useContext(StoreFlowContext);
  if (!context) {
    throw new Error("useStoreFlowはStoreFlowProviderの内側で使ってください");
  }
  return context;
}
