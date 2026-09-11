import test from "node:test";
import assert from "node:assert/strict";
import { matchesAlias, PRODUCT_ALIASES } from "./productAliases";

test("matchesAlias: ひらがな表記で商品に当たる", () => {
  assert.ok(matchesAlias("歯ブラシ", "はぶらし"));
  assert.ok(matchesAlias("化粧水", "けしょうすい"));
  assert.ok(matchesAlias("付箋セット", "ふせん"));
  assert.ok(matchesAlias("小皿", "こざら"));
});

test("matchesAlias: 通称で商品に当たる", () => {
  assert.ok(matchesAlias("ポテトスナック", "ポテチ"));
  assert.ok(matchesAlias("保存容器", "タッパー"));
  assert.ok(matchesAlias("粘着クリーナー", "コロコロ"));
  assert.ok(matchesAlias("携帯用ボトル", "水筒"));
});

test("matchesAlias: 別名を含む長い検索語にも当たる", () => {
  assert.ok(matchesAlias("不織布マスク", "マスクはどこ"));
  assert.ok(matchesAlias("食品用ラップ", "ラップが欲しい"));
});

test("matchesAlias: 無関係な検索語には当たらない", () => {
  assert.equal(matchesAlias("歯ブラシ", "にんじん"), false);
  assert.equal(matchesAlias("緑茶", "自動車のタイヤ"), false);
  assert.equal(matchesAlias("小皿", ""), false);
});

test("matchesAlias: 表に無い商品はfalse", () => {
  assert.equal(matchesAlias("存在しない商品", "なにか"), false);
});

test("PRODUCT_ALIASES: 別名が1文字だけの商品を作らない", () => {
  // 1文字の別名しか持たない商品は、無関係な検索語に当たりやすく実用にならない
  for (const [name, aliases] of Object.entries(PRODUCT_ALIASES)) {
    assert.ok(aliases.some((a) => a.length >= 2), `${name} に2文字以上の別名が無い`);
  }
});
