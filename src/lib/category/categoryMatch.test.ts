import test from "node:test";
import assert from "node:assert/strict";
import { findMatchingCategories, matchProductsByCategory } from "./categoryMatch";
import type { CategoryKeywordIndexEntry } from "./fetchCategories";
import type { CatalogItem } from "@/lib/aiSearch/searchProductsWithClaude";

// supabase/migrations/20260906090000_categories_and_inventory.sqlの初期データの一部を模した
// テスト用索引(「スポンジ」が掃除・キッチンの両方に登録されている点、
// 「歯磨き」「歯みがき」が別キーワードとして登録されている点が本題)
const INDEX: CategoryKeywordIndexEntry[] = [
  { categoryId: "cat-hygiene", categoryCode: "CAT_05", categoryName: "衛生", normalizedKeyword: "衛生" },
  { categoryId: "cat-hygiene", categoryCode: "CAT_05", categoryName: "衛生", normalizedKeyword: "歯磨き" },
  { categoryId: "cat-hygiene", categoryCode: "CAT_05", categoryName: "衛生", normalizedKeyword: "歯みがき" },
  { categoryId: "cat-stationery", categoryCode: "CAT_02", categoryName: "文具", normalizedKeyword: "ノート" },
  { categoryId: "cat-electric", categoryCode: "CAT_03", categoryName: "電気", normalizedKeyword: "充電ケーブル" },
  { categoryId: "cat-cleaning", categoryCode: "CAT_07", categoryName: "掃除", normalizedKeyword: "スポンジ" },
  { categoryId: "cat-kitchen", categoryCode: "CAT_08", categoryName: "キッチン", normalizedKeyword: "スポンジ" },
  { categoryId: "cat-test-short", categoryCode: "CAT_TEST", categoryName: "テスト", normalizedKeyword: "水" },
];

function categoryIds(query: string): string[] {
  return findMatchingCategories(query, INDEX)
    .map((match) => match.categoryId)
    .sort();
}

test("findMatchingCategories: 歯磨き → 衛生", () => {
  assert.deepEqual(categoryIds("歯磨き"), ["cat-hygiene"]);
});

test("findMatchingCategories: 歯みがき → 衛生(歯磨きとは別キーワードのまま一致)", () => {
  assert.deepEqual(categoryIds("歯みがき"), ["cat-hygiene"]);
});

test("findMatchingCategories: ノート → 文具", () => {
  assert.deepEqual(categoryIds("ノート"), ["cat-stationery"]);
});

test("findMatchingCategories: 充電ケーブル → 電気", () => {
  assert.deepEqual(categoryIds("充電ケーブル"), ["cat-electric"]);
});

test("findMatchingCategories: スポンジ → 掃除とキッチンの両方", () => {
  assert.deepEqual(categoryIds("スポンジ"), ["cat-cleaning", "cat-kitchen"]);
});

test("findMatchingCategories: 未知の検索語は存在しないカテゴリを捏造しない", () => {
  assert.deepEqual(categoryIds("宇宙船の部品"), []);
});

test("findMatchingCategories: 文中にキーワードが含まれる場合も検出する", () => {
  assert.deepEqual(categoryIds("歯磨き用品はどこ"), ["cat-hygiene"]);
});

test("findMatchingCategories: 短すぎるキーワードは部分一致で誤検出しない(完全一致は可)", () => {
  assert.deepEqual(categoryIds("香水"), []); // "水"(1文字)が部分一致で誤検出されない
  assert.deepEqual(categoryIds("水"), ["cat-test-short"]); // 完全一致は文字数に関わらず一致する
});

test("findMatchingCategories: 空文字はカテゴリを返さない", () => {
  assert.deepEqual(categoryIds(""), []);
  assert.deepEqual(categoryIds("   "), []);
});

const CATALOG: CatalogItem[] = [
  { id: "prod-sponge-kitchen", name: "キッチンスポンジ", category: null, description: null },
  { id: "prod-sponge-cleaning", name: "お風呂用スポンジ", category: null, description: null },
  { id: "prod-toothbrush", name: "歯ブラシ", category: null, description: null },
  { id: "prod-unrelated", name: "醤油", category: null, description: null },
];

const CATEGORY_ID_BY_PRODUCT_ID = new Map([
  ["prod-sponge-kitchen", "cat-kitchen"],
  ["prod-sponge-cleaning", "cat-cleaning"],
  ["prod-toothbrush", "cat-hygiene"],
]);

test("matchProductsByCategory: スポンジ検索は掃除・キッチン両カテゴリの商品を候補に含める", () => {
  const results = matchProductsByCategory("スポンジ", CATALOG, CATEGORY_ID_BY_PRODUCT_ID, INDEX, "ja");
  assert.deepEqual(
    results.map((r) => r.productId).sort(),
    ["prod-sponge-cleaning", "prod-sponge-kitchen"]
  );
  assert.match(results[0].reason, /キッチン|掃除/);
});

test("matchProductsByCategory: 歯磨き検索は衛生カテゴリの商品のみ", () => {
  const results = matchProductsByCategory("歯磨き", CATALOG, CATEGORY_ID_BY_PRODUCT_ID, INDEX, "ja");
  assert.deepEqual(
    results.map((r) => r.productId),
    ["prod-toothbrush"]
  );
});

test("matchProductsByCategory: カテゴリ未設定の商品(prod-unrelated)は一致しても含まれない", () => {
  const results = matchProductsByCategory("醤油", CATALOG, CATEGORY_ID_BY_PRODUCT_ID, INDEX, "ja");
  assert.deepEqual(results, []);
});

test("matchProductsByCategory: 未知語は空配列(既存検索へフォールバックする前提)", () => {
  const results = matchProductsByCategory("存在しない検索語", CATALOG, CATEGORY_ID_BY_PRODUCT_ID, INDEX, "ja");
  assert.deepEqual(results, []);
});
