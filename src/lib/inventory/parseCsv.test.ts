import test from "node:test";
import assert from "node:assert/strict";
import { parseCsv } from "./parseCsv";

test("parseCsv: 単純なカンマ区切り", () => {
  const result = parseCsv("a,b,c\n1,2,3\n");
  assert.deepEqual(result, [
    ["a", "b", "c"],
    ["1", "2", "3"],
  ]);
});

test("parseCsv: CRLF改行", () => {
  const result = parseCsv("a,b\r\n1,2\r\n");
  assert.deepEqual(result, [
    ["a", "b"],
    ["1", "2"],
  ]);
});

test("parseCsv: 末尾に改行が無くても最後の行を読む", () => {
  const result = parseCsv("a,b\n1,2");
  assert.deepEqual(result, [
    ["a", "b"],
    ["1", "2"],
  ]);
});

test("parseCsv: ダブルクォートで囲んだカンマ・改行を1フィールドとして扱う", () => {
  const result = parseCsv('a,b\n"1,000","line1\nline2"\n');
  assert.deepEqual(result, [
    ["a", "b"],
    ["1,000", "line1\nline2"],
  ]);
});

test("parseCsv: ダブルクォートのエスケープ(\"\")", () => {
  const result = parseCsv('a\n"say ""hi"""\n');
  assert.deepEqual(result, [["a"], ['say "hi"']]);
});

test("parseCsv: 空文字列は行を返さない", () => {
  assert.deepEqual(parseCsv(""), []);
});

test("parseCsv: 空白のみの行は無視する", () => {
  const result = parseCsv("a,b\n1,2\n\n");
  assert.deepEqual(result, [
    ["a", "b"],
    ["1", "2"],
  ]);
});
