/**
 * 店舗(チェーン)と支店の一覧。
 *
 * 商品検索の前に「店舗 → 支店 → 商品」の順で絞り込むための定義。
 * 現在のSupabaseは単一デモ店舗のスコープ(`stores`テーブルに1件)で、チェーンと支店を
 * 分ける構造を持たないため、この段階の情報はアプリ内のこのファイルで持っている。
 * 将来DBへ移す場合も、参照しているのは下のヘルパー関数だけなので差し替えで済む。
 *
 * 支店を選んだ先の商品検索は、引き続きSupabaseの単一デモ店舗を対象にしている
 * (支店ごとに商品を出し分けるにはDB側に支店の概念が必要)。
 */

export interface StoreBranch {
  /** URLに使う識別子 */
  id: string;
  name: string;
  /** 支店一覧に添える補足(所在地など) */
  description?: string;
}

export interface StoreChain {
  /** URLに使う識別子 */
  id: string;
  name: string;
  description?: string;
  branches: StoreBranch[];
}

export const STORE_CHAINS: StoreChain[] = [
  {
    id: "blue-ocean",
    name: "ブルーオーシャン",
    description: "実演用デモ店舗",
    branches: [
      {
        id: "dig-it",
        name: "DIG IT店",
        description: "実演用デモ店舗",
      },
    ],
  },
];

export function findChain(chainId: string): StoreChain | null {
  return STORE_CHAINS.find((chain) => chain.id === chainId) ?? null;
}

export function findBranch(chainId: string, branchId: string): StoreBranch | null {
  return findChain(chainId)?.branches.find((branch) => branch.id === branchId) ?? null;
}

/** 表記ゆれを吸収して突き合わせる(商品検索の`normalizeSearchText`と同じ考え方) */
function normalize(text: string): string {
  return text
    .normalize("NFKC")
    .replace(/[ァ-ヶ]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0x60))
    .replace(/\s+/g, "")
    .toLowerCase();
}

function matches(query: string, ...fields: (string | undefined)[]): boolean {
  const normalizedQuery = normalize(query);
  if (normalizedQuery.length === 0) return true;
  return fields.some((field) => field && normalize(field).includes(normalizedQuery));
}

/** 店舗名・説明への部分一致で絞り込む。空文字なら全件返す */
export function searchChains(query: string): StoreChain[] {
  return STORE_CHAINS.filter((chain) => matches(query, chain.name, chain.description));
}

/** 支店名・説明への部分一致で絞り込む。空文字なら全件返す */
export function searchBranches(chain: StoreChain, query: string): StoreBranch[] {
  return chain.branches.filter((branch) => matches(query, branch.name, branch.description));
}
