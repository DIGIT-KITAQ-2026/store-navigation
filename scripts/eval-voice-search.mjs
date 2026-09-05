/**
 * 音声検索の精度を測る評価スクリプト。
 *
 *   npm run dev        # 別のターミナルで開発サーバーを起動しておく
 *   node scripts/eval-voice-search.mjs
 *
 * scripts/fixtures/voice-search/ の音声を /api/transcribe で文字起こしし、
 * その結果を /api/search に投げて、期待する商品にたどり着けたかを数える。
 * 「文字起こしが合っているか」ではなく「目的の商品に着けたか」で測るのは、
 * 「から揚げ」と「唐揚げ」のように表記が違っても検索が通れば利用者には成功だから。
 *
 * 自分の声を録音したwav(16kHz・モノラル・16bit)を同じフォルダに
 * <キー>_<話者>.wav の名前で置き、expected.json に追記すれば評価対象を増やせる。
 */
import { readFileSync, readdirSync } from "node:fs";
import { basename, join } from "node:path";

const FIXTURE_DIR = join(import.meta.dirname, "fixtures/voice-search");
const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";

const expected = JSON.parse(readFileSync(join(FIXTURE_DIR, "expected.json"), "utf8"));
const files = readdirSync(FIXTURE_DIR).filter((file) => file.endsWith(".wav")).sort();

/** WAVのdataチャンク(16bit PCM)をそのまま取り出す。APIが受け取る形式と同じ */
function readPcm(path) {
  const buffer = readFileSync(path);
  let offset = 12;
  while (offset < buffer.length) {
    const chunkId = buffer.toString("ascii", offset, offset + 4);
    const chunkSize = buffer.readUInt32LE(offset + 4);
    if (chunkId === "data") return buffer.subarray(offset + 8, offset + 8 + chunkSize);
    offset += 8 + chunkSize + (chunkSize % 2);
  }
  throw new Error(`dataチャンクが見つかりません: ${path}`);
}

let reached = 0;
let evaluated = 0;
let totalMs = 0;

for (const file of files) {
  const key = basename(file, ".wav").split("_")[0];
  const entry = expected[key];
  if (!entry) {
    console.log(`--  ${file} は expected.json に無いためスキップ`);
    continue;
  }

  const startedAt = Date.now();
  const transcribeResponse = await fetch(`${BASE_URL}/api/transcribe`, {
    method: "POST",
    headers: { "Content-Type": "application/octet-stream" },
    body: readPcm(join(FIXTURE_DIR, file)),
  });
  totalMs += Date.now() - startedAt;

  const transcribed = (await transcribeResponse.json()).text ?? "";

  const searchResponse = await fetch(`${BASE_URL}/api/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: transcribed }),
  });
  const names = ((await searchResponse.json()).results ?? []).map((result) => result.product.name);

  const ok =
    entry.expect.length === 0 ? names.length === 0 : names.some((name) => entry.expect.includes(name));
  evaluated += 1;
  if (ok) reached += 1;

  console.log(
    `${ok ? "OK " : "NG "} 「${entry.text}」→ 認識:「${transcribed}」→ ${names.join(" / ") || "(0件)"}`
  );
}

console.log(
  `\n音声から目的の商品にたどり着けた: ${reached}/${evaluated}(文字起こし平均 ${(totalMs / Math.max(evaluated, 1) / 1000).toFixed(1)}秒)`
);
