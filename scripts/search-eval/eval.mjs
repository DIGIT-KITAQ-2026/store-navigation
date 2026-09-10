/**
 * 抽象的な言い回し(目的・状況)で、期待する商品にたどり着けるかを測る。
 *
 * 商品名そのもので検索する場合は文字列一致で確実に当たるので、ここでは測らない。
 * 測りたいのは意味検索の質。開発サーバー(npm run dev)を起動した状態で:
 *   node eval.mjs
 *
 * 期待商品は「現在Supabaseに登録され、かつcategory_idが付いている40件」から選んである。
 * 商品が増減したら cases.json を見直すこと。
 */
import { readFileSync } from "node:fs";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const cases = JSON.parse(readFileSync("cases.json", "utf8"));

let reached = 0;
let topHit = 0;
const misses = [];

for (const [query, expected] of cases) {
  const response = await fetch(`${BASE_URL}/api/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  const names = ((await response.json()).results ?? []).map((result) => result.product.name);

  if (names.some((name) => expected.includes(name))) reached++;
  if (names.length > 0 && expected.includes(names[0])) topHit++;
  else misses.push(`  「${query}」→ ${names.slice(0, 4).join(" / ") || "0件"}   期待: ${expected.join(" / ")}`);
}

console.log(`到達 ${reached}/${cases.length}  1位一致 ${topHit}/${cases.length}`);
for (const miss of misses) console.log(miss);
