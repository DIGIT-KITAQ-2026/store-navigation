import { generateProductDescriptionLocal } from "@/lib/aiSearch/generateProductDescription";
import { requireInferenceSecret, inferenceUnauthorizedResponse } from "@/lib/aiInference/inferenceProxy";

/**
 * Vercel(サーバーレス)からプロキシされてくるAI商品説明文生成リクエストを受ける内部API。
 * `claude` CLIが使えるこのマシン上で直接実行する想定(Vercelには`claude`コマンドが無い)。
 * `X-Inference-Secret`ヘッダーの検証を、CLI実行より必ず先に行う。
 *
 * 受け付けるのは商品名(name)1つだけで、任意のclaude CLI引数を受け付けるようなことは
 * 意図的にしない(セキュリティ上、外部に公開するエンドポイントの用途を狭く保つため)。
 */
export async function POST(request: Request) {
  if (!requireInferenceSecret(request)) return inferenceUnauthorizedResponse();

  const body = (await request.json().catch(() => null)) as { name?: string } | null;
  if (!body || typeof body.name !== "string" || body.name.trim().length === 0) {
    return Response.json({ error: "nameは必須です" }, { status: 400 });
  }

  try {
    const description = await generateProductDescriptionLocal(body.name);
    return Response.json({ description });
  } catch (error) {
    console.error("[api/internal/generate-description] 説明文生成に失敗しました", error);
    return Response.json({ error: "説明文生成に失敗しました" }, { status: 500 });
  }
}
