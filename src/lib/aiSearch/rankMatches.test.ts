import test from "node:test";
import assert from "node:assert/strict";
import { rankMatches } from "./rankMatches";
import type { CatalogItem, ClaudeSearchMatch } from "./searchProductsWithClaude";

const catalog: CatalogItem[] = [
  { id: "brush", name: "歯ブラシ", category: "衛生", description: "歯磨きに使う" },
  { id: "paste", name: "歯磨き用品", category: "衛生", description: "" },
  { id: "nail", name: "ネイルケア用品", category: "美容", description: "" },
  { id: "battery", name: "単3乾電池", category: "電池", description: "防災用品" },
  { id: "sponge", name: "メラミンスポンジ", category: "掃除", description: "" },
];

const order = (query: string, ids: string[]) =>
  rankMatches(
    query,
    ids.map((productId): ClaudeSearchMatch => ({ productId, reason: "" })),
    catalog
  ).map((match) => match.productId);

test("rankMatches: 商品名が当たった商品を、説明文だけ当たった商品より前に出す", () => {
  // 「歯磨き」は歯ブラシの説明文にも当たるが、名前が当たる歯磨き用品が先
  assert.deepEqual(order("歯磨き", ["brush", "paste"]), ["paste", "brush"]);
});

test("rankMatches: 商品名が検索語そのものなら最優先", () => {
  assert.deepEqual(order("歯磨き用品", ["nail", "battery", "paste"]), ["paste", "nail", "battery"]);
});

test("rankMatches: 検索語が商品名を含む場合も名前の一致として扱う", () => {
  assert.deepEqual(order("歯ブラシはどこですか", ["paste", "brush"]), ["brush", "paste"]);
});

test("rankMatches: 同じ強さのものは元の順序を保つ", () => {
  // どれも名前が当たらないので、意味検索が決めた順序をそのまま残す
  assert.deepEqual(order("喉が渇いた", ["sponge", "battery", "nail"]), ["sponge", "battery", "nail"]);
});

test("rankMatches: 複数語で呼ばれても語ごとに見る(画像検索経由)", () => {
  assert.deepEqual(order("ネイル ケア", ["battery", "nail"]), ["nail", "battery"]);
});

test("rankMatches: カタカナとひらがなの違いは無視する", () => {
  assert.deepEqual(order("めらみんすぽんじ", ["battery", "sponge"]), ["sponge", "battery"]);
});

test("rankMatches: 検索語が空なら並べ替えない", () => {
  assert.deepEqual(order("   ", ["battery", "paste"]), ["battery", "paste"]);
});

test("rankMatches: カタログに無い商品が混ざっても落とさない", () => {
  assert.deepEqual(order("歯磨き", ["unknown", "paste"]), ["paste", "unknown"]);
});

test("rankMatches: 名前が当たらないものは、説明文と文字が重なる順に並べる", () => {
  // 「食器を洗いたい」は小皿の説明文と1文字も重ならず、キッチンスポンジとは重なる
  const kitchen: CatalogItem[] = [
    { id: "plate", name: "小皿", category: "キッチン", description: "取り分けや薬味用に使う小さめの平皿" },
    { id: "sponge", name: "キッチンスポンジ", category: "キッチン", description: "食器洗いに使う泡立ちの良いキッチンスポンジ" },
  ];
  const ranked = rankMatches(
    "食器を洗いたい",
    [
      { productId: "plate", reason: "" },
      { productId: "sponge", reason: "" },
    ],
    kitchen
  ).map((match) => match.productId);
  assert.deepEqual(ranked, ["sponge", "plate"]);
});

test("rankMatches: 重なりも同じなら元の順序を保つ", () => {
  // どちらも「喉が渇いた」と重ならないので、意味検索が決めた順序のまま
  assert.deepEqual(order("喉が渇いた", ["nail", "sponge"]), ["nail", "sponge"]);
});

test("rankMatches: 名前が当たる商品は、重なりが多いだけの商品より前に出す", () => {
  // brushの説明文は「歯磨きに使う」で重なるが、名前が当たるpasteが先
  assert.deepEqual(order("歯磨き", ["brush", "paste"]), ["paste", "brush"]);
});
