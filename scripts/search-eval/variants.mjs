/**
 * 表記ゆれで同じ商品にたどり着けるかを測る。
 * 商品名そのもの以外の言い方(ひらがな・別漢字・略称・通称)でも当たってほしい。
 *   node variants.mjs          … 失敗したものだけ表示
 *   node variants.mjs --all    … 全件表示
 */
import { readFileSync } from "node:fs";
const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const cases = JSON.parse(readFileSync("variants.json", "utf8"));
const showAll = process.argv.includes("--all");

let hit = 0, total = 0;
const misses = [];
for (const [expected, variants] of cases) {
  for (const variant of variants) {
    total++;
    const response = await fetch(`${BASE_URL}/api/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: variant }),
    });
    const names = ((await response.json()).results ?? []).map((r) => r.product.name);
    const ok = names.includes(expected);
    if (ok) hit++;
    else misses.push(`  「${variant}」→ ${names.slice(0, 3).join(" / ") || "0件"}   期待: ${expected}`);
    if (showAll) console.log(`  ${ok ? "○" : "×"} 「${variant}」→ ${names.slice(0, 2).join(" / ") || "0件"}`);
  }
}
console.log(`\n到達 ${hit}/${total}`);
if (!showAll) for (const m of misses) console.log(m);
