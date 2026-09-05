import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { runClaudeCli } from "./claudeCli";
import type { CatalogItem, ClaudeSearchMatch } from "./searchProductsWithClaude";
import { DEFAULT_LOCALE, LOCALE_LANGUAGE_NAMES, type Locale } from "@/lib/i18n/locales";

interface ClaudeCliResult {
  is_error: boolean;
  result: string;
}

/** Claudeがまれに```json ... ```で囲んで返した場合に備えて取り除く */
function stripCodeFence(text: string): string {
  const trimmed = text.trim();
  const match = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  return match ? match[1] : trimmed;
}

function buildPrompt(imagePath: string, catalog: CatalogItem[], locale: Locale): string {
  const lines = [
    "あなたはスーパー・コンビニの店内商品検索アシスタントです。",
    `以下の画像を見てください: ${imagePath}`,
    "この画像に写っている商品が、以下の商品リスト(JSON配列)の中に存在するかどうかを判定してください。",
    "画像から連想される用途(例: 飲み物が写っていれば飲料コーナーの商品)ではなく、",
    "画像に写っているものと実際に対応する商品だけを選んでください。",
    "商品リストに存在しない商品を作らないでください。該当する商品が無い場合は matches を空配列にしてください。",
    "",
    `商品リスト: ${JSON.stringify(catalog)}`,
    "",
  ];

  if (locale !== DEFAULT_LOCALE) {
    lines.push(
      `reasonフィールドの文章は${LOCALE_LANGUAGE_NAMES[locale]}で書いてください(商品リストの他のフィールドは翻訳しないこと)。`,
      ""
    );
  }

  lines.push(
    "以下の形式のJSONのみを出力してください。説明文やコードブロック(```)は一切付けないでください:",
    '{"matches":[{"productId":"...","reason":"..."}]}'
  );

  return lines.join("\n");
}

/**
 * アップロードされた画像(ローカル一時ファイル)をClaude Code CLIのReadツールで読ませ、
 * 商品リストの中から画像に対応する実在の商品だけを選ばせる。
 * imageBufferは呼び出し側が渡す一時ディレクトリ配下に書き出し、実行後に必ず削除する。
 */
export async function searchProductsWithClaudeVision(
  imageBuffer: Buffer,
  imageExtension: string,
  catalog: CatalogItem[],
  locale: Locale = DEFAULT_LOCALE
): Promise<ClaudeSearchMatch[]> {
  if (catalog.length === 0) return [];

  const workDir = await mkdtemp(path.join(tmpdir(), "store-nav-image-search-"));
  const imagePath = path.join(workDir, `upload${imageExtension}`);

  try {
    await writeFile(imagePath, imageBuffer);

    const prompt = buildPrompt(imagePath, catalog, locale);

    const { stdout } = await runClaudeCli(
      ["-p", prompt, "--output-format", "json", "--tools", "Read", "--add-dir", workDir],
      { timeout: 45_000 }
    );

    const parsed = JSON.parse(stdout) as ClaudeCliResult;

    if (parsed.is_error) {
      throw new Error(`claude CLIがエラーを返しました: ${parsed.result}`);
    }

    const answer = JSON.parse(stripCodeFence(parsed.result)) as { matches?: ClaudeSearchMatch[] };

    const validIds = new Set(catalog.map((item) => item.id));
    const matches = answer.matches ?? [];

    return matches.filter((match) => validIds.has(match.productId));
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
}
