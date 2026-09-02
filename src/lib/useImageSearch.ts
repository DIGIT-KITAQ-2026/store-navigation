"use client";

import { useState } from "react";
import type { SearchResultItem } from "@/types/product";

export interface ImageSearchOutcome {
  results: SearchResultItem[];
  usedFallback: boolean;
}

/**
 * 画像を/api/search-imageへ送信して結果を取得するだけの実行部分。
 * 画面遷移・キャッシュ書き込みは呼び出し側(SearchScreen/StoreEntranceHero)の責務とする。
 */
export function useImageSearch() {
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = async (file: File): Promise<ImageSearchOutcome | null> => {
    setError(null);
    setIsSearching(true);

    try {
      const formData = new FormData();
      formData.append("image", file);

      const response = await fetch("/api/search-image", { method: "POST", body: formData });
      const data: { results?: SearchResultItem[]; error?: string } = await response.json();

      if (!response.ok) {
        setError(data.error ?? "画像検索に失敗しました");
        return null;
      }

      return { results: data.results ?? [], usedFallback: false };
    } catch {
      setError("画像検索に失敗しました。通信状況を確認してください。");
      return null;
    } finally {
      setIsSearching(false);
    }
  };

  return { isSearching, error, search };
}
