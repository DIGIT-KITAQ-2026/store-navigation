import { runClaudeCli } from "./claudeCli";

interface ClaudeCliResult {
  is_error: boolean;
  result: string;
}

function buildPrompt(name: string): string {
  return [
    "あなたはスーパーの商品説明文を書くコピーライターです。",
    "以下の商品名について、店内商品検索に使う説明文を日本語で一文だけ書いてください。",
    "商品の用途や特徴が伝わるようにし、誇張した宣伝文句や絵文字は使わないでください。",
    "出力は説明文の本文一文のみとし、前置き・見出し・箇条書き・引用符・改行は付けないでください。",
    "",
    `商品名: ${name}`,
  ].join("\n");
}

/**
 * プロンプトで「一文だけ」と指示していても、稀に複数文・注意書き付きで返ってくることがあるため、
 * 念のため最初の1文だけを取り出す(先頭行かつ最初の句点まで)。
 */
function takeFirstSentence(text: string): string {
  const firstLine = text.split("\n").find((line) => line.trim().length > 0) ?? text;
  const periodIndex = firstLine.indexOf("。");
  return periodIndex === -1 ? firstLine.trim() : firstLine.slice(0, periodIndex + 1).trim();
}

/**
 * 商品名から、検索用の商品説明を一文だけAIに生成させる。
 * `searchProductsWithClaude`と同じくclaude CLIをサブプロセス実行する方式を使う。
 */
export async function generateProductDescription(name: string): Promise<string> {
  const prompt = buildPrompt(name);

  const { stdout } = await runClaudeCli(["-p", prompt, "--output-format", "json", "--tools", ""], {
    timeout: 30_000,
  });

  const parsed = JSON.parse(stdout) as ClaudeCliResult;

  if (parsed.is_error) {
    throw new Error(`claude CLIがエラーを返しました: ${parsed.result}`);
  }

  return takeFirstSentence(parsed.result);
}
