import test from "node:test";
import assert from "node:assert/strict";
import { findMissingRequiredColumns, REQUIRED_CSV_COLUMNS } from "./csvSchema";

test("findMissingRequiredColumns: 全列揃っていれば空配列", () => {
  assert.deepEqual(findMissingRequiredColumns([...REQUIRED_CSV_COLUMNS, "jan_code"]), []);
});

test("findMissingRequiredColumns: 列順が違っても検出できる", () => {
  const shuffled = [...REQUIRED_CSV_COLUMNS].reverse();
  assert.deepEqual(findMissingRequiredColumns(shuffled), []);
});

test("findMissingRequiredColumns: 不足列を返す", () => {
  const withoutSku = REQUIRED_CSV_COLUMNS.filter((column) => column !== "sku");
  assert.deepEqual(findMissingRequiredColumns(withoutSku), ["sku"]);
});
