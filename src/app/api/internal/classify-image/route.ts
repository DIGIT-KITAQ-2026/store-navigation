import { classifyProductImageLocal } from "@/lib/aiSearch/clip/productClassifier";
import { requireInferenceSecret, inferenceUnauthorizedResponse } from "@/lib/aiInference/inferenceProxy";

interface RequestBody {
  imageBase64: string;
}

/**
 * 画像分類(Open Images V7で学習した分類器)を、このマシン上で実際に実行するための
 * 内部エンドポイント。Vercel等モデルを実行できない環境から、AI_INFERENCE_BASE_URL経由で
 * 呼び出される想定。このマシンでAI_INFERENCE_SHARED_SECRETが未設定の場合は、
 * 誰からのリクエストも拒否する。
 */
export async function POST(request: Request) {
  if (!requireInferenceSecret(request)) return inferenceUnauthorizedResponse();

  const body = (await request.json().catch(() => null)) as RequestBody | null;
  if (!body || typeof body.imageBase64 !== "string") {
    return Response.json({ error: "imageBase64(string)は必須です" }, { status: 400 });
  }

  try {
    const predictions = await classifyProductImageLocal(Buffer.from(body.imageBase64, "base64"));
    return Response.json(predictions);
  } catch (error) {
    console.error("[api/internal/classify-image] 画像分類に失敗しました", error);
    return Response.json({ error: "画像分類に失敗しました" }, { status: 500 });
  }
}
