import test from "node:test";
import assert from "node:assert/strict";
import { normalizeCategoryText } from "./normalize";

test("normalizeCategoryText: 前後の空白を除去する", () => {
  assert.equal(normalizeCategoryText("  歯磨き  "), "歯磨き");
});

test("normalizeCategoryText: 連続する空白を1つに整える", () => {
  assert.equal(normalizeCategoryText("歯磨き   用品"), "歯磨き 用品");
});

test("normalizeCategoryText: 英字の大文字小文字を統一する", () => {
  assert.equal(normalizeCategoryText("LED"), "led");
  assert.equal(normalizeCategoryText("Led"), "led");
});

test("normalizeCategoryText: 全角英数字を半角へ寄せる(NFKC)", () => {
  assert.equal(normalizeCategoryText("ＬＥＤ"), "led");
});

test("normalizeCategoryText: 空文字はそのまま空文字", () => {
  assert.equal(normalizeCategoryText(""), "");
  assert.equal(normalizeCategoryText("   "), "");
});

test("normalizeCategoryText: 歯磨きと歯みがきは別表記のまま(意味を変える正規化はしない)", () => {
  assert.equal(normalizeCategoryText("歯磨き"), "歯磨き");
  assert.equal(normalizeCategoryText("歯みがき"), "歯みがき");
  assert.notEqual(normalizeCategoryText("歯磨き"), normalizeCategoryText("歯みがき"));
});

test("normalizeCategoryText: カタカナはそのまま(ひらがな化しない)", () => {
  assert.equal(normalizeCategoryText("スポンジ"), "スポンジ");
});
