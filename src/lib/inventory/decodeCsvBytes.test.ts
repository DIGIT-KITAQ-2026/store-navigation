import test from "node:test";
import assert from "node:assert/strict";
import { decodeCsvBytes, CSV_ENCODING_ERROR_MESSAGE } from "./decodeCsvBytes";

const utf8 = (text: string) => new TextEncoder().encode(text);

test("decodeCsvBytes: UTF-8はそのままデコードできる", () => {
  const result = decodeCsvBytes(utf8("a,b\n1,2\n"));
  assert.deepEqual(result, { ok: true, text: "a,b\n1,2\n" });
});

test("decodeCsvBytes: UTF-8 BOM付きはBOMを除去してデコードする", () => {
  const withBom = new Uint8Array([0xef, 0xbb, 0xbf, ...utf8("a,b\n1,2\n")]);
  const result = decodeCsvBytes(withBom);
  assert.deepEqual(result, { ok: true, text: "a,b\n1,2\n" });
});

test("decodeCsvBytes: 日本語商品名を含むUTF-8", () => {
  const result = decodeCsvBytes(utf8("product_name,unit\n歯ブラシ(デモ),本\n"));
  assert.deepEqual(result, { ok: true, text: "product_name,unit\n歯ブラシ(デモ),本\n" });
});

test("decodeCsvBytes: CP932(Shift_JIS)は日本語商品名・単位を正しくデコードする", () => {
  // "DEMO-STORE-ENTRY-001,Shelf_05,SKU-0005,歯ブラシ(デモ),CAT_05,30,2026-09-06 09:00,本\n" のCP932バイト列
  const cp932Row = new Uint8Array([
    0x44, 0x45, 0x4d, 0x4f, 0x2d, 0x53, 0x54, 0x4f, 0x52, 0x45, 0x2d, 0x45, 0x4e, 0x54, 0x52, 0x59,
    0x2d, 0x30, 0x30, 0x31, 0x2c, 0x53, 0x68, 0x65, 0x6c, 0x66, 0x5f, 0x30, 0x35, 0x2c, 0x53, 0x4b,
    0x55, 0x2d, 0x30, 0x30, 0x30, 0x35, 0x2c, 0x8e, 0x95, 0x83, 0x75, 0x83, 0x89, 0x83, 0x56, 0x28,
    0x83, 0x66, 0x83, 0x82, 0x29, 0x2c, 0x43, 0x41, 0x54, 0x5f, 0x30, 0x35, 0x2c, 0x33, 0x30, 0x2c,
    0x32, 0x30, 0x32, 0x36, 0x2d, 0x30, 0x39, 0x2d, 0x30, 0x36, 0x20, 0x30, 0x39, 0x3a, 0x30, 0x30,
    0x2c, 0x96, 0x7b, 0x0a,
  ]);
  const result = decodeCsvBytes(cp932Row);
  assert.deepEqual(result, {
    ok: true,
    text: "DEMO-STORE-ENTRY-001,Shelf_05,SKU-0005,歯ブラシ(デモ),CAT_05,30,2026-09-06 09:00,本\n",
  });
});

test("decodeCsvBytes: 不正なバイト列(UTF-8としてもCP932としても不正)はエラーを返す", () => {
  // 0xffはUTF-8の先頭バイトとして不正、CP932としても未定義のバイト。
  const result = decodeCsvBytes(new Uint8Array([0xff, 0xfe, 0xff, 0xff]));
  assert.deepEqual(result, { ok: false, error: CSV_ENCODING_ERROR_MESSAGE });
});

test("decodeCsvBytes: 空ファイルは空文字列として扱う(エラーにしない)", () => {
  const result = decodeCsvBytes(new Uint8Array(0));
  assert.deepEqual(result, { ok: true, text: "" });
});

test("decodeCsvBytes: ヘッダーのみ(データ行なし)もデコードは成功する", () => {
  const result = decodeCsvBytes(utf8("store_code,shelf_code,sku\n"));
  assert.deepEqual(result, { ok: true, text: "store_code,shelf_code,sku\n" });
});

test("decodeCsvBytes: CRLF改行のUTF-8", () => {
  const result = decodeCsvBytes(utf8("a,b\r\n1,2\r\n"));
  assert.deepEqual(result, { ok: true, text: "a,b\r\n1,2\r\n" });
});

test("decodeCsvBytes: LF改行のUTF-8", () => {
  const result = decodeCsvBytes(utf8("a,b\n1,2\n"));
  assert.deepEqual(result, { ok: true, text: "a,b\n1,2\n" });
});
