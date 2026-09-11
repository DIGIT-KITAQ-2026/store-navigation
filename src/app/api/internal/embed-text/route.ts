import { embedTextsLocal, type TextModel } from "@/lib/aiSearch/clip/models";
import { requireInferenceSecret, inferenceUnauthorizedResponse } from "@/lib/aiInference/inferenceProxy";

interface RequestBody {
  texts: string[];
  model: TextModel;
}

/**
 * テキスト埋め込みを、このマシン上で実際に実行するための内部エンドポイント。
 * Vercel等モデルを実行できない環境から、AI_INFERENCE_BASE_URL経由で呼び出される想定。
 * このマシンでAI_INFERENCE_SHARED_SECRETが未設定の場合は、誰からのリクエストも拒否する。
 */
export async function POST(request: Request) {
  if (!requireInferenceSecret(request)) return inferenceUnauthorizedResponse();

  const body = (await request.json().catch(() => null)) as RequestBody | null;
  if (!body || !Array.isArray(body.texts) || typeof body.model?.id !== "string") {
    return Response.json({ error: "texts(string[])・model(TextModel)は必須です" }, { status: 400 });
  }

  try {
    const vectors = await embedTextsLocal(body.texts, body.model);
    return Response.json(vectors);
  } catch (error) {
    console.error("[api/internal/embed-text] テキスト埋め込みに失敗しました", error);
    return Response.json({ error: "テキスト埋め込みに失敗しました" }, { status: 500 });
  }
}
