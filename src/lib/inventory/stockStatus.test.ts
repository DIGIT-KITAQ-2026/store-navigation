import test from "node:test";
import assert from "node:assert/strict";
import {
  resolveStockStatusKind,
  buildStockInfo,
  UNKNOWN_STOCK_INFO,
  formatCountedAtUtc,
  computeStockDiff,
  formatStockDiff,
  formatStockDiffWithUnit,
} from "./stockStatus";

test("resolveStockStatusKind: 1以上はavailable", () => {
  assert.equal(resolveStockStatusKind(1), "available");
  assert.equal(resolveStockStatusKind(30), "available");
});

test("resolveStockStatusKind: 0はoutOfStock", () => {
  assert.equal(resolveStockStatusKind(0), "outOfStock");
});

test("resolveStockStatusKind: nullはunknown(最新棚卸データなし)", () => {
  assert.equal(resolveStockStatusKind(null), "unknown");
});

test("buildStockInfo: 行がなければunknown固定値を返す", () => {
  assert.deepEqual(buildStockInfo(null), UNKNOWN_STOCK_INFO);
});

test("buildStockInfo: 実在庫・単位・棚卸日時を保持する", () => {
  const info = buildStockInfo({ actualStock: 30, unit: "本", countedAt: "2026-09-06T09:00:00.000Z" });
  assert.deepEqual(info, {
    kind: "available",
    actualStock: 30,
    unit: "本",
    countedAt: "2026-09-06T09:00:00.000Z",
  });
});

test("buildStockInfo: 実在庫0はoutOfStockとして保持する(削除・除外しない)", () => {
  const info = buildStockInfo({ actualStock: 0, unit: "本", countedAt: "2026-09-06T09:00:00.000Z" });
  assert.equal(info.kind, "outOfStock");
  assert.equal(info.actualStock, 0);
});

test("formatCountedAtUtc: UTC値をローカルタイムゾーンへ変換せずに整形する", () => {
  assert.equal(formatCountedAtUtc("2026-09-06T09:30:00.000Z"), "2026-09-06 09:30");
});

test("computeStockDiff: actual_stock - book_stock", () => {
  assert.equal(computeStockDiff({ actualStock: 30, bookStock: 30 }), 0);
  assert.equal(computeStockDiff({ actualStock: 35, bookStock: 30 }), 5);
  assert.equal(computeStockDiff({ actualStock: 0, bookStock: 10 }), -10);
});

test("computeStockDiff: どちらかがnullならnull", () => {
  assert.equal(computeStockDiff({ actualStock: null, bookStock: 30 }), null);
  assert.equal(computeStockDiff({ actualStock: 30, bookStock: null }), null);
});

test("formatStockDiff: 符号付き文字列(単位なし)", () => {
  assert.equal(formatStockDiff(5), "+5");
  assert.equal(formatStockDiff(0), "0");
  assert.equal(formatStockDiff(-10), "-10");
  assert.equal(formatStockDiff(null), "-");
});

test("formatStockDiffWithUnit: 符号付き文字列(単位あり)", () => {
  assert.equal(formatStockDiffWithUnit(5, "個"), "+5個");
  assert.equal(formatStockDiffWithUnit(0, "個"), "0個");
  assert.equal(formatStockDiffWithUnit(-10, "個"), "-10個");
  assert.equal(formatStockDiffWithUnit(null, "個"), "-");
  assert.equal(formatStockDiffWithUnit(3, null), "+3");
});
