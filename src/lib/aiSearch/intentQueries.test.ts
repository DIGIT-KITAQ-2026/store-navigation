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

test("expandIntentQuery: 喉の渇きは漢字の違いを問わず緑茶を足す", () => {
  // かな漢字変換は「かわいた」を「乾いた」にすることが多く、こちらは意味検索が届かない
  for (const query of ["喉が渇いた", "喉が乾いた", "のどがかわいた", "ノドが乾いた"]) {
    assert.match(expandIntentQuery(query), /緑茶/, query);
  }
});

test("expandIntentQuery: 飲み物を指す言い回しにも緑茶を足す", () => {
  for (const query of ["水が飲みたい", "飲み物はどこ", "ドリンク", "水分補給したい"]) {
    assert.match(expandIntentQuery(query), /緑茶/, query);
  }
});

test("expandIntentQuery: 温かい飲み物にはスープも足す", () => {
  const expanded = expandIntentQuery("温かいものが飲みたい");
  assert.match(expanded, /緑茶/);
  assert.match(expanded, /インスタントスープ/);
});

test("expandIntentQuery: 同じ語を二重に足さない", () => {
  assert.equal(expandIntentQuery("間違えて書き損じた").match(/消しゴム/g)?.length, 1);
});
