import test from "node:test";
import assert from "node:assert/strict";
import { sanitizeForSpreadsheetDisplay } from "./csvInjection";

test("sanitizeForSpreadsheetDisplay: =+-@で始まる場合は先頭にシングルクォートを付ける", () => {
  assert.equal(sanitizeForSpreadsheetDisplay("=cmd|'/c calc'!A1"), "'=cmd|'/c calc'!A1");
  assert.equal(sanitizeForSpreadsheetDisplay("+1"), "'+1");
  assert.equal(sanitizeForSpreadsheetDisplay("-1"), "'-1");
  assert.equal(sanitizeForSpreadsheetDisplay("@SUM(A1)"), "'@SUM(A1)");
});

test("sanitizeForSpreadsheetDisplay: 通常の商品名は変更しない", () => {
  assert.equal(sanitizeForSpreadsheetDisplay("歯ブラシ"), "歯ブラシ");
  assert.equal(sanitizeForSpreadsheetDisplay(""), "");
});
