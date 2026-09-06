import test from "node:test";
import assert from "node:assert/strict";
import { mergeSearchMatches } from "./mergeSearchMatches";
import type { ClaudeSearchMatch } from "@/lib/aiSearch/searchProductsWithClaude";

function match(productId: string, reason = "reason"): ClaudeSearchMatch {
  return { productId, reason };
}

test("mergeSearchMatches: productIdで重複を除去する", () => {
  const result = mergeSearchMatches([match("p1", "category")], [match("p1", "semantic"), match("p2", "semantic")]);
  assert.deepEqual(result, [match("p1", "category"), match("p2", "semantic")]);
});

test("mergeSearchMatches: 先に渡したリストの理由を優先する", () => {
  const result = mergeSearchMatches([match("p1", "first")], [match("p1", "second")]);
  assert.deepEqual(result, [match("p1", "first")]);
});

test("mergeSearchMatches: 空リストのみでも空配列を返す", () => {
  assert.deepEqual(mergeSearchMatches([], []), []);
});

test("mergeSearchMatches: 3つ以上のリストも統合できる", () => {
  const result = mergeSearchMatches([match("p1")], [match("p2")], [match("p1"), match("p3")]);
  assert.deepEqual(
    result.map((m) => m.productId),
    ["p1", "p2", "p3"]
  );
});
