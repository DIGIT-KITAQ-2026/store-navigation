import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

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

const RESULT_JSON_SCHEMA = {
  type: "object",
  properties: {
    matches: {
      type: "array",
      items: {
        type: "object",
        properties: {
          productId: { type: "string" },
          reason: { type: "string" },
        },
        required: ["productId", "reason"],
      },
    },
  },
  required: ["matches"],
};

interface ClaudeCliResult {
  is_error: boolean;
  result: string;
  structured_output?: { matches?: ClaudeSearchMatch[] };
}

function buildPrompt(query: string, catalog: CatalogItem[]): string {
  return [
    "あなたはスーパー・コンビニの店内商品検索アシスタントです。",
    "以下の商品リスト(JSON配列)の中から、ユーザーの検索語に合う商品をすべて選んでください。",
    "商品名の部分一致だけでなく、「カレーに使う調味料」「朝食に必要なもの」のような",
    "用途・目的を表す抽象的な検索語にも対応し、関連する商品を見つけてください。",
    "該当する商品がない場合は matches を空配列にしてください。存在しないIDを作らないでください。",
    "",
    `検索語: ${query}`,
    "",
    `商品リスト: ${JSON.stringify(catalog)}`,
  ].join("\n");
}

/**
 * Claude Code CLI(`claude`コマンド)をサーバーから直接呼び出し、自然文の検索語に合う商品を
 * 商品リストの中から選ばせる。Anthropic APIキーは使わず、この開発機/デプロイ先にログイン済みの
 * claudeサブスクリプション認証(`claude login` / `claude setup-token`)をそのまま利用する。
 */
export async function searchProductsWithClaude(
  query: string,
  catalog: CatalogItem[]
): Promise<ClaudeSearchMatch[]> {
  if (catalog.length === 0) return [];

  const prompt = buildPrompt(query, catalog);

  const { stdout } = await execFileAsync(
    "claude",
    ["-p", prompt, "--output-format", "json", "--tools", "", "--json-schema", JSON.stringify(RESULT_JSON_SCHEMA)],
    { timeout: 30_000, maxBuffer: 10 * 1024 * 1024 }
  );

  const parsed = JSON.parse(stdout) as ClaudeCliResult;

  if (parsed.is_error) {
    throw new Error(`claude CLIがエラーを返しました: ${parsed.result}`);
  }

  const validIds = new Set(catalog.map((item) => item.id));
  const matches = parsed.structured_output?.matches ?? [];

  return matches.filter((match) => validIds.has(match.productId));
}
