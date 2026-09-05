/**
 * 画像検索の精度を測る評価スクリプト。
 *
 *   npm run dev        # 別のターミナルで開発サーバーを起動しておく
 *   node scripts/eval-image-search.mjs
 *
 * scripts/fixtures/image-search/ の画像を /api/search-image に順番に投げ、
 * expected.json に書いた期待結果と突き合わせて正解数を表示する。
 * 自分で撮った商品写真を同じフォルダに置き、expected.json に追記すれば評価対象を増やせる。
 */
import { readFileSync, readdirSync } from "node:fs";
import { basename, extname, join } from "node:path";

const FIXTURE_DIR = join(import.meta.dirname, "fixtures/image-search");
const ENDPOINT = process.env.BASE_URL ?? "http://localhost:3000";
const MIME_BY_EXTENSION = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp" };

const expected = JSON.parse(readFileSync(join(FIXTURE_DIR, "expected.json"), "utf8"));
const files = readdirSync(FIXTURE_DIR).filter((file) => MIME_BY_EXTENSION[extname(file).toLowerCase()]);

let matched = 0;
let rejected = 0;
let productCount = 0;
let nonProductCount = 0;

for (const file of files) {
  const key = basename(file, extname(file));
  const expectedNames = expected[key];
  if (!expectedNames) {
    console.log(`--  ${key.padEnd(10)} expected.json に期待結果がないためスキップ`);
    continue;
  }

  const formData = new FormData();
  const blob = new Blob([readFileSync(join(FIXTURE_DIR, file))], { type: MIME_BY_EXTENSION[extname(file).toLowerCase()] });
  formData.append("image", blob, file);

  const response = await fetch(`${ENDPOINT}/api/search-image`, { method: "POST", body: formData });
  if (!response.ok) {
    console.log(`NG  ${key.padEnd(10)} APIがステータス${response.status}を返しました`);
    continue;
  }
  const names = ((await response.json()).results ?? []).map((result) => result.product.name);

  const ok = expectedNames.length === 0 ? names.length === 0 : expectedNames.includes(names[0]);
  if (expectedNames.length === 0) {
    nonProductCount += 1;
    if (ok) rejected += 1;
  } else {
    productCount += 1;
    if (ok) matched += 1;
  }

  console.log(
    `${ok ? "OK " : "NG "} ${key.padEnd(10)} 期待:${(expectedNames[0] ?? "該当なし").padEnd(18)} 結果:${names.join(" / ") || "(0件)"}`
  );
}

console.log(
  `\n商品画像の第1候補一致 ${matched}/${productCount} / 非商品画像を正しく0件にできた ${rejected}/${nonProductCount} / 合計 ${matched + rejected}/${productCount + nonProductCount}`
);
