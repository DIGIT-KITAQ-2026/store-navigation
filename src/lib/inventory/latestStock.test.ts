import test from "node:test";
import assert from "node:assert/strict";
import { resolveLatestStock, type LatestStockMaps } from "./latestStock";

const row = (actualStock: number, countedAt = "2026-09-06T09:00:00.000Z") => ({
  actualStock,
  unit: "本",
  countedAt,
});

test("resolveLatestStock: product_id一致を最優先で使う", () => {
  const maps: LatestStockMaps = {
    byProductId: new Map([["product-1", row(30)]]),
    byShelfLocationId: new Map([["shelf-loc-5", row(999)]]),
  };
  const result = resolveLatestStock({ productId: "product-1", shelfLocationId: "shelf-loc-5" }, maps);
  assert.deepEqual(result, row(30));
});

test("resolveLatestStock: product_id一致が無ければ同じ棚のフォールバックを使う", () => {
  const maps: LatestStockMaps = {
    byProductId: new Map(),
    byShelfLocationId: new Map([["shelf-loc-5", row(30)]]),
  };
  const result = resolveLatestStock({ productId: "product-1", shelfLocationId: "shelf-loc-5" }, maps);
  assert.deepEqual(result, row(30));
});

test("resolveLatestStock: どちらも無ければnull(在庫情報なし)", () => {
  const maps: LatestStockMaps = { byProductId: new Map(), byShelfLocationId: new Map() };
  const result = resolveLatestStock({ productId: "product-1", shelfLocationId: "shelf-loc-5" }, maps);
  assert.equal(result, null);
});

test("resolveLatestStock: productId/shelfLocationIdがどちらもnullならnull", () => {
  const maps: LatestStockMaps = {
    byProductId: new Map([["product-1", row(30)]]),
    byShelfLocationId: new Map([["shelf-loc-5", row(30)]]),
  };
  const result = resolveLatestStock({ productId: null, shelfLocationId: null }, maps);
  assert.equal(result, null);
});
