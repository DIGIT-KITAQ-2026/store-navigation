import test from "node:test";
import assert from "node:assert/strict";
import { resolveStockStatusKind, buildStockInfo, UNKNOWN_STOCK_INFO, formatCountedAtUtc } from "./stockStatus";

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
