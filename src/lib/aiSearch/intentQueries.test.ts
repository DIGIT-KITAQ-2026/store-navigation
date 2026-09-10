import test from "node:test";
import assert from "node:assert/strict";
import { expandIntentQuery } from "./intentQueries";

test("expandIntentQuery: 書き間違いに消しゴムを足す(表記ゆれを含む)", () => {
  for (const query of ["書き間違えた", "書きまちがえた", "書き損じた"]) {
    assert.match(expandIntentQuery(query), /消しゴム/, query);
  }
});

test("expandIntentQuery: 元の言い回しは残す(意味検索も従来どおり効かせるため)", () => {
  assert.equal(expandIntentQuery("書き間違えた"), "書き間違えた 消しゴム");
});

test("expandIntentQuery: 当てはまらない検索語はそのまま返す", () => {
  assert.equal(expandIntentQuery("歯ブラシ"), "歯ブラシ");
  assert.equal(expandIntentQuery("部屋を掃除したい"), "部屋を掃除したい");
  assert.equal(expandIntentQuery(""), "");
});

test("expandIntentQuery: 意味検索が届く言い回しは表に持たない", () => {
  // ruriが「喉が渇いた」で緑茶を1位にできるため、飲み物の対応付けは不要になった
  assert.equal(expandIntentQuery("喉が渇いた"), "喉が渇いた");
});

test("expandIntentQuery: 同じ語を二重に足さない", () => {
  assert.equal(expandIntentQuery("間違えて書き損じた").match(/消しゴム/g)?.length, 1);
});
