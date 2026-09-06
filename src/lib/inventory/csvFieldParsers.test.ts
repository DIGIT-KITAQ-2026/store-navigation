import test from "node:test";
import assert from "node:assert/strict";
import { parseNonNegativeInteger, parseNonNegativeNumber, parseCountedAt } from "./csvFieldParsers";

test("parseNonNegativeInteger: 正の整数", () => {
  assert.equal(parseNonNegativeInteger("10"), 10);
  assert.equal(parseNonNegativeInteger("0"), 0);
});

test("parseNonNegativeInteger: 負数・小数・空文字・非数値はnull", () => {
  assert.equal(parseNonNegativeInteger("-1"), null);
  assert.equal(parseNonNegativeInteger("1.5"), null);
  assert.equal(parseNonNegativeInteger(""), null);
  assert.equal(parseNonNegativeInteger("abc"), null);
});

test("parseNonNegativeNumber: 整数・小数の0以上", () => {
  assert.equal(parseNonNegativeNumber("10"), 10);
  assert.equal(parseNonNegativeNumber("10.5"), 10.5);
  assert.equal(parseNonNegativeNumber("0"), 0);
});

test("parseNonNegativeNumber: 負数・空文字・非数値はnull", () => {
  assert.equal(parseNonNegativeNumber("-0.1"), null);
  assert.equal(parseNonNegativeNumber(""), null);
  assert.equal(parseNonNegativeNumber("¥100"), null);
});

test("parseCountedAt: 日付のみ", () => {
  assert.equal(parseCountedAt("2026-09-06"), new Date(Date.UTC(2026, 8, 6)).toISOString());
});

test("parseCountedAt: 日時(分まで)", () => {
  assert.equal(parseCountedAt("2026-09-06 09:30"), new Date(Date.UTC(2026, 8, 6, 9, 30)).toISOString());
});

test("parseCountedAt: 日時(T区切り・秒まで)", () => {
  assert.equal(
    parseCountedAt("2026-09-06T09:30:15"),
    new Date(Date.UTC(2026, 8, 6, 9, 30, 15)).toISOString()
  );
});

test("parseCountedAt: 存在しない日付はnull", () => {
  assert.equal(parseCountedAt("2026-02-30"), null);
});

test("parseCountedAt: 形式が違う・空文字はnull", () => {
  assert.equal(parseCountedAt("2026/09/06"), null);
  assert.equal(parseCountedAt(""), null);
  assert.equal(parseCountedAt("not-a-date"), null);
});
