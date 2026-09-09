/**
 * Vercel(サーバーレス)ではCLIP/Whisperの大きいモデルや`claude` CLIサブプロセスを
 * 実行できないため、これらを常時稼働している別マシン(Cloudflare Tunnel等で公開)へ
 * 転送するためのプロキシ基盤。
 *
 * `AI_INFERENCE_BASE_URL`が未設定の場合は何もしない(= 呼び出し側は今まで通りローカルで
 * モデルを実行する)。このモジュール自体は挙動を変えない、あくまで各呼び出し側が
 * `getInferenceBaseUrl()`で分岐するためのヘルパーに過ぎない。
 *
 * 転送先のマシンには、この`/api/internal/*`エンドポイント群がそのまま公開されるため、
 * `AI_INFERENCE_SHARED_SECRET`が一致しないリクエストは`requireInferenceSecret()`で拒否する。
 * このシークレットは`.env.local`にのみ置き、リポジトリにはコミットしない。
 */

export function getInferenceBaseUrl(): string | null {
  const value = process.env.AI_INFERENCE_BASE_URL?.trim();
  return value ? value.replace(/\/+$/, "") : null;
}

function getSharedSecret(): string {
  return process.env.AI_INFERENCE_SHARED_SECRET?.trim() ?? "";
}

/**
 * 推論サーバー(`/api/internal/*`)へJSONでPOSTし、JSONで結果を受け取る共通処理。
 * `getInferenceBaseUrl()`がnullの場合は呼び出し側の責任(呼ぶ前に分岐すること)。
 */
export async function callInferenceServer<T>(path: string, body: unknown, timeoutMs = 120_000): Promise<T> {
  const baseUrl = getInferenceBaseUrl();
  if (!baseUrl) {
    throw new Error("AI_INFERENCE_BASE_URLが設定されていません");
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${baseUrl}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Inference-Secret": getSharedSecret(),
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(`推論サーバーがエラーを返しました(${response.status}): ${text}`);
    }

    return (await response.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * `/api/internal/*`側で呼び出し元を検証する。`AI_INFERENCE_SHARED_SECRET`が
 * このマシン側で未設定の場合は、誰からのリクエストも受け付けない(安全側に倒す)。
 */
export function requireInferenceSecret(request: Request): boolean {
  const expected = getSharedSecret();
  if (!expected) return false;
  return request.headers.get("X-Inference-Secret") === expected;
}

/** `/api/internal/*`ルートから共通で返す401相当のレスポンス。 */
export function inferenceUnauthorizedResponse(): Response {
  return Response.json({ error: "unauthorized" }, { status: 403 });
}
