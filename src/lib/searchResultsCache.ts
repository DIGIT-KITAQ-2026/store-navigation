import type { SearchResultItem } from "@/types/product";

export interface CachedSearchEntry {
  results: SearchResultItem[];
  usedFallback: boolean;
}

const RESULT_CACHE_KEY = "search-results-cache";

/**
 * 検索結果画面(/search)に遷移する前に計算済みの結果をsessionStorageへ保存しておくためのキャッシュ。
 * /search側はこのキャッシュがあれば再検索せずに復元する(画像検索の結果表示・戻るナビゲーションで使用)。
 * DB/APIには影響しない、あくまでこのタブ内でのみ有効な一時保存。
 */
export function readCachedResults(rawQuery: string): CachedSearchEntry | null {
  if (typeof window === "undefined") return null;
  try {
    const cache = JSON.parse(window.sessionStorage.getItem(RESULT_CACHE_KEY) ?? "{}");
    return cache[rawQuery] ?? null;
  } catch {
    return null;
  }
}

export function writeCachedResults(rawQuery: string, entry: CachedSearchEntry): void {
  if (typeof window === "undefined") return;
  try {
    const cache = JSON.parse(window.sessionStorage.getItem(RESULT_CACHE_KEY) ?? "{}");
    cache[rawQuery] = entry;
    window.sessionStorage.setItem(RESULT_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // sessionStorageが使えない環境でも検索自体は問題なく動作するため何もしない
  }
}
