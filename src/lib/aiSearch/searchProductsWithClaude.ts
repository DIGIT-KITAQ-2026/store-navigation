import spawn from "cross-spawn";

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

const MAX_STDOUT_BYTES = 10 * 1024 * 1024;
const CLI_TIMEOUT_MS = 30_000;

const SYSTEM_PROMPT = [
  "あなたはスーパー・コンビニの店内商品検索アシスタントです。",
  "ユーザーメッセージで渡された商品リスト(JSON配列)の中だけから、検索語に合う商品を選び、",
  "指定されたJSON Schemaに従ってstructured_outputのみを返してください。",
  "ファイルの読み書き、コマンド実行、Gitの状態、プロジェクトの設定など、",
  "ユーザーメッセージに含まれていない情報は一切参照・言及しないでください。",
].join("\n");

interface ClaudeCliResult {
  is_error: boolean;
  result: string;
  structured_output?: { matches?: ClaudeSearchMatch[] };
}

function buildUserPrompt(query: string, catalog: CatalogItem[]): string {
  return [`検索語: ${query}`, "", `商品リスト: ${JSON.stringify(catalog)}`].join("\n");
}

/**
 * `claude` CLIをサブプロセス実行し、標準出力を文字列で返す。
 * `cross-spawn`を使うのは、Windowsのnpmグローバルインストールでは`claude`の実体が
 * `.cmd`(バッチファイル)であり、`child_process.execFile`では`ENOENT`になるため
 * (`cross-spawn`はWindowsでの実行ファイル解決・引数エスケープを吸収するdrop-in代替)。
 */
function runClaudeCli(args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn("claude", args, { timeout: CLI_TIMEOUT_MS });

    let stdout = "";
    let stderr = "";
    let exceededMaxBuffer = false;

    child.stdout?.on("data", (chunk: Buffer) => {
      if (exceededMaxBuffer) return;
      stdout += chunk.toString("utf8");
      if (stdout.length > MAX_STDOUT_BYTES) {
        exceededMaxBuffer = true;
        child.kill();
      }
    });

    child.stderr?.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf8");
    });

    child.on("error", (error) => {
      reject(error);
    });

    child.on("close", (code) => {
      if (exceededMaxBuffer) {
        reject(new Error("claude CLIの出力がmaxBufferの上限を超えました"));
        return;
      }
      if (code !== 0) {
        reject(new Error(`claude CLIが終了コード${code}で終了しました: ${stderr || stdout}`));
        return;
      }
      resolve(stdout);
    });
  });
}

/**
 * Claude Code CLI(`claude`コマンド)をサーバーから直接呼び出し、自然文の検索語に合う商品を
 * 商品リストの中から選ばせる。Anthropic APIキーは使わず、この開発機/デプロイ先にログイン済みの
 * claudeサブスクリプション認証(`claude login` / `claude setup-token`)をそのまま利用する。
 *
 * `--system-prompt`でデフォルトのシステムプロンプト(cwd・環境情報・git status等を自動で
 * 含む)を独自の役割説明に置き換え、`--safe-mode`でCLAUDE.md等のカスタマイズを、
 * `--strict-mcp-config`でこのリポジトリの.mcp.jsonのMCPサーバー読み込みを無効化する。
 * これにより、渡した商品リスト以外の情報(リポジトリの状態など)が応答に混入しないようにする。
 * (`--bare`は同様の効果があるがOAuth/キーチェーン認証が使えなくなるため使用しない)
 */
export async function searchProductsWithClaude(
  query: string,
  catalog: CatalogItem[]
): Promise<ClaudeSearchMatch[]> {
  if (catalog.length === 0) return [];

  const userPrompt = buildUserPrompt(query, catalog);

  const stdout = await runClaudeCli([
    "--output-format",
    "json",
    "--tools",
    "",
    "--json-schema",
    JSON.stringify(RESULT_JSON_SCHEMA),
    "--system-prompt",
    SYSTEM_PROMPT,
    "--safe-mode",
    "--strict-mcp-config",
    "-p",
    userPrompt,
  ]);

  const parsed = JSON.parse(stdout) as ClaudeCliResult;

  if (parsed.is_error) {
    throw new Error(`claude CLIがエラーを返しました: ${parsed.result}`);
  }

  const validIds = new Set(catalog.map((item) => item.id));
  const matches = parsed.structured_output?.matches ?? [];

  return matches.filter((match) => validIds.has(match.productId));
}
