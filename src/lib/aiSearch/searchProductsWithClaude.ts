import { runClaudeCli } from "./claudeCli";
import { DEFAULT_LOCALE, LOCALE_LANGUAGE_NAMES, type Locale } from "@/lib/i18n/locales";

export interface CatalogItem {
  id: string;
  name: string;
  category: string | null;
  description: string | null;
}

export interface ClaudeSearchMatch {
  productId: string;
  reason: string;
}

interface ClaudeCliResult {
  is_error: boolean;
  result: string;
}

function buildPrompt(query: string, catalog: CatalogItem[], locale: Locale): string {
  const lines = [
    "あなたはスーパー・コンビニの店内商品検索アシスタントです。",
    "以下の商品リスト(JSON配列)の中から、ユーザーの検索語に合う商品をすべて選んでください。",
    "商品名の部分一致だけでなく、「カレーに使う調味料」「朝食に必要なもの」のような",
    "用途・目的を表す抽象的な検索語にも対応し、関連する商品を見つけてください。",
    "検索語が日本語以外の言語であっても、商品リスト自体は日本語のままなので、",
    "意味を理解したうえで関連する商品を見つけてください。",
    "該当する商品がない場合は matches を空配列にしてください。存在しないIDを作らないでください。",
    "",
    `検索語: ${query}`,
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

/** Claudeがまれに```json ... ```で囲んで返した場合に備えて取り除く */
function stripCodeFence(text: string): string {
  const trimmed = text.trim();
  const match = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  return match ? match[1] : trimmed;
}

/**
 * Claude Code CLI(`claude`コマンド)をサーバーから直接呼び出し、自然文の検索語に合う商品を
 * 商品リストの中から選ばせる。Anthropic APIキーは使わず、この開発機/デプロイ先にログイン済みの
 * claudeサブスクリプション認証(`claude login` / `claude setup-token`)をそのまま利用する。
 */
export async function searchProductsWithClaude(
  query: string,
  catalog: CatalogItem[],
  locale: Locale = DEFAULT_LOCALE
): Promise<ClaudeSearchMatch[]> {
  if (catalog.length === 0) return [];

  const prompt = buildPrompt(query, catalog, locale);

  const { stdout } = await runClaudeCli(["-p", prompt, "--output-format", "json", "--tools", ""], {
    timeout: 45_000,
  });

  const parsed = JSON.parse(stdout) as ClaudeCliResult;

  if (parsed.is_error) {
    throw new Error(`claude CLIがエラーを返しました: ${parsed.result}`);
  }

  const answer = JSON.parse(stripCodeFence(parsed.result)) as { matches?: ClaudeSearchMatch[] };

  const validIds = new Set(catalog.map((item) => item.id));
  const matches = answer.matches ?? [];

  return matches.filter((match) => validIds.has(match.productId));
}
