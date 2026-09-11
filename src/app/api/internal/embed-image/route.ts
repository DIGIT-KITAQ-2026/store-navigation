import { embedImageLocal } from "@/lib/aiSearch/clip/models";
import { requireInferenceSecret, inferenceUnauthorizedResponse } from "@/lib/aiInference/inferenceProxy";

/**
 * 画像をベクトルにする処理を、このマシン上で実際に実行するための内部エンドポイント。
 *
 * 画像検索は英語ラベルとのゼロショット分類から、学習済みの線形分類器
 * (clip/model/oiv7ProductClassifier.json)へ変更した。分類器の計算自体は軽いので
 * 呼び出し側で行い、ここではCLIPの画像エンコーダだけを動かす。
 * そのため以前の /api/internal/classify-image はこのエンドポイントに置き換わっている。
 */
export async function POST(request: Request) {
  if (!requireInferenceSecret(request)) return inferenceUnauthorizedResponse();

  const body = (await request.json().catch(() => null)) as { imageBase64?: string } | null;
  if (!body || typeof body.imageBase64 !== "string") {
    return Response.json({ error: "imageBase64は必須です" }, { status: 400 });
  }

  try {
    const vector = await embedImageLocal(body.imageBase64);
    return Response.json(vector);
  } catch (error) {
    console.error("[api/internal/embed-image] 画像の埋め込みに失敗しました", error);
    return Response.json({ error: "画像の埋め込みに失敗しました" }, { status: 500 });
  }
}
