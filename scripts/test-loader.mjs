/**
 * `npm test`(node --test)専用のカスタムESM解決フック。
 *
 * このプロジェクトのソースはNext.js/tsconfigの`paths`(`@/* -> src/*`)と拡張子省略の
 * 相対importを前提にしており、これはNext.jsのバンドラーとtscの`moduleResolution: "bundler"`が
 * 解決してくれる。一方Node.jsの素のESM解決はどちらも理解しないため、`node --test`だけでは
 * 既存のソースを一切書き換えずにimportできない。このフックはテスト実行時に限定して
 * 「`@/`をsrc/へ読み替える」「拡張子省略の相対importに.ts/.tsxを補う」処理だけを行い、
 * ソース側の書き方(既存コード全体のimportスタイル)は変更しないで済むようにする。
 *
 * 使い方は package.json の "test" スクリプト経由(scripts/register-test-loader.mjsをNode起動時に
 * --importで読み込む)を参照。
 */
import { pathToFileURL, fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";

const projectRoot = path.resolve(import.meta.dirname, "..");
const srcRoot = path.join(projectRoot, "src");

function tryResolve(basePath) {
  for (const candidate of [basePath + ".ts", basePath + ".tsx", path.join(basePath, "index.ts")]) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) {
    const resolved = tryResolve(path.join(srcRoot, specifier.slice(2)));
    if (resolved) return nextResolve(pathToFileURL(resolved).href, context);
  } else if ((specifier.startsWith("./") || specifier.startsWith("../")) && !path.extname(specifier)) {
    const parentDir = path.dirname(fileURLToPath(context.parentURL));
    const resolved = tryResolve(path.join(parentDir, specifier));
    if (resolved) return nextResolve(pathToFileURL(resolved).href, context);
  }

  return nextResolve(specifier, context);
}
