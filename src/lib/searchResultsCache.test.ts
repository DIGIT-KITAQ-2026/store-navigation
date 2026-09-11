import test from "node:test";
import assert from "node:assert/strict";
import { readCachedResults, writeCachedResults } from "./searchResultsCache";
import type { SearchResultItem } from "@/types/product";

/** sessionStorageの最小限の代用。このモジュールはwindow.sessionStorageしか使わない */
function installSessionStorage() {
  const store = new Map<string, string>();
  (globalThis as unknown as { window: unknown }).window = {
    sessionStorage: {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
    },
  };
}

const entry = { results: [] as SearchResultItem[], usedFallback: false };

test("searchResultsCache: 保存した結果を読み戻せる", () => {
  installSessionStorage();
  writeCachedResults("喉が渇いた", "ja", entry);
  assert.deepEqual(readCachedResults("喉が渇いた", "ja"), entry);
});

test("searchResultsCache: 言語が違えば別のキャッシュとして扱う", () => {
  installSessionStorage();
  writeCachedResults("喉が渇いた", "ja", entry);
  assert.equal(readCachedResults("喉が渇いた", "en"), null);
});

test("searchResultsCache: 古くなった結果は返さない", () => {
  installSessionStorage();
  const realNow = Date.now;
  try {
    writeCachedResults("喉が渇いた", "ja", entry);
    Date.now = () => realNow() + 11 * 60 * 1000; // 11分後
    assert.equal(readCachedResults("喉が渇いた", "ja"), null);
  } finally {
    Date.now = realNow;
  }
});

test("searchResultsCache: 時刻を持たない古い保存も捨てる", () => {
  installSessionStorage();
  const w = (globalThis as unknown as { window: { sessionStorage: Storage } }).window;
  w.sessionStorage.setItem(
    "search-results-cache",
    JSON.stringify({ "ja:喉が渇いた": { results: [], usedFallback: false } })
  );
  assert.equal(readCachedResults("喉が渇いた", "ja"), null);
});
