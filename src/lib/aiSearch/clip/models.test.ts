import test from "node:test";
import assert from "node:assert/strict";
import { textModelForQuery } from "./models";

test("textModelForQuery: かなを含めば表示言語に関わらず日本語モデル", () => {
  // 英語表示のまま日本語で検索されることは普通にある
  for (const locale of ["ja", "en", "zh", "ko"] as const) {
    assert.equal(textModelForQuery("喉が渇いた", locale).key, "japanese", locale);
    assert.equal(textModelForQuery("マスク", locale).key, "japanese", locale);
  }
});

test("textModelForQuery: ハングルは多言語モデル", () => {
  assert.equal(textModelForQuery("마스크", "ja").key, "multilingual");
});

test("textModelForQuery: 英語は表示言語に従う", () => {
  assert.equal(textModelForQuery("mask", "ja").key, "japanese");
  assert.equal(textModelForQuery("mask", "en").key, "multilingual");
});

test("textModelForQuery: 漢字だけは判別できないので表示言語に従う", () => {
  // 「緑茶」は日本語とも中国語とも取れる
  assert.equal(textModelForQuery("緑茶", "ja").key, "japanese");
  assert.equal(textModelForQuery("绿茶", "zh").key, "multilingual");
});
