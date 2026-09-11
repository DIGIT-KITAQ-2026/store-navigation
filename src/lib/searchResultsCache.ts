import type { SearchResultItem } from "@/types/product";

export interface CachedSearchEntry {
  results: SearchResultItem[];
  usedFallback: boolean;
}

interface StoredEntry extends CachedSearchEntry {
  /** 保存した時刻(ミリ秒)。古くなった結果を返し続けないための判定に使う */
  savedAt?: number;
}

const RESULT_CACHE_KEY = "search-results-cache";

/**
 * キャッシュを使う上限時間。
 *
 * この保存は「画像検索の結果を/searchへ渡す」「戻ったときに再検索しない」ためのもので、
 * どちらも数秒で済む。長く残す必要はない一方、残っていると検索の改善が反映されない
 * (アプリを直したのに、開いたままのタブでは古い結果が出続ける。実際に起きた)。
 */
const MAX_AGE_MS = 10 * 60 * 1000;

function cacheKey(rawQuery: string, locale: string): string {
  return `${locale}:${rawQuery}`;
}

/**
 * 検索結果画面(/search)に遷移する前に計算済みの結果をsessionStorageへ保存しておくためのキャッシュ。
 * /search側はこのキャッシュがあれば再検索せずに復元する(画像検索の結果表示・戻るナビゲーションで使用)。
 * DB/APIには影響しない、あくまでこのタブ内でのみ有効な一時保存。
 *
 * キーにlocaleを含める: 商品名・説明は表示言語ごとに翻訳内容が異なるため、言語切り替え後に
 * 同じ検索語で再訪問した際、別言語のキャッシュ結果を誤って表示しないようにする。
 */
export function readCachedResults(rawQuery: string, locale: string): CachedSearchEntry | null {
  if (typeof window === "undefined") return null;
  try {
    const cache = JSON.parse(window.sessionStorage.getItem(RESULT_CACHE_KEY) ?? "{}");
    const entry: StoredEntry | undefined = cache[cacheKey(rawQuery, locale)];
    if (!entry) return null;
    // 時刻が無い(この変更より前に保存された)ものも古いものとして捨てる
    if (typeof entry.savedAt !== "number" || Date.now() - entry.savedAt > MAX_AGE_MS) return null;
    return { results: entry.results, usedFallback: entry.usedFallback };
  } catch {
    return null;
  }
}

export function writeCachedResults(rawQuery: string, locale: string, entry: CachedSearchEntry): void {
  if (typeof window === "undefined") return;
  try {
    const cache = JSON.parse(window.sessionStorage.getItem(RESULT_CACHE_KEY) ?? "{}");
    cache[cacheKey(rawQuery, locale)] = { ...entry, savedAt: Date.now() } satisfies StoredEntry;
    window.sessionStorage.setItem(RESULT_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // sessionStorageが使えない環境でも検索自体は問題なく動作するため何もしない
  }
}
