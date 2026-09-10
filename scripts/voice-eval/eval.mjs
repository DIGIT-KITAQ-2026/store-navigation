/**
 * 文字起こしの正確さと、その結果で目的の商品にたどり着けるかを測る。
 *
 * 見るべきは文字誤り率より商品到達数。「唐揚げ」を「から揚げ」と書いても検索は通るので、
 * 文字誤り率だけ追うと実害のない誤りに引きずられる。
 *
 * 開発サーバー(npm run dev)を起動した状態で実行する。
 *   node eval.mjs clean | snr20 | snr10 | snr5
 */
import { readFileSync } from "node:fs";
import { readPcm, characterErrorRate } from "./wav.mjs";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const mode = process.argv[2] ?? "clean";
const manifest = JSON.parse(readFileSync("audio/manifest.json", "utf8"));

function pathFor(item) {
  if (mode === "clean") return item.file;
  const name = item.file.split("/").pop().replace(".wav", "");
  return `audio/noisy/${name}_${mode}.wav`;
}

let reached = 0;
let errorSum = 0;
const misses = [];

for (const item of manifest) {
  const transcribeResponse = await fetch(`${BASE_URL}/api/transcribe`, {
    method: "POST",
    headers: { "Content-Type": "application/octet-stream" },
    body: readPcm(pathFor(item)),
  });
  const text = (await transcribeResponse.json()).text ?? "";
  errorSum += characterErrorRate(item.text, text);

  const searchResponse = await fetch(`${BASE_URL}/api/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: text }),
  });
  const names = ((await searchResponse.json()).results ?? []).map((result) => result.product.name);

  if (names.some((name) => item.expect.includes(name))) reached++;
  else misses.push(`  「${item.text}」→「${text}」→ ${names.slice(0, 3).join(" / ") || "0件"}`);
}

const total = manifest.length;
console.log(`[${mode}] 商品到達 ${reached}/${total}  文字誤り率 ${((errorSum / total) * 100).toFixed(1)}%`);
for (const miss of misses) console.log(miss);
