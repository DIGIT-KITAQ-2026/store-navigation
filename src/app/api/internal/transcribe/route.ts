import { transcribeJapaneseLocal } from "@/lib/voice/transcribeAudio";
import { requireInferenceSecret, inferenceUnauthorizedResponse } from "@/lib/aiInference/inferenceProxy";

/**
 * Vercel(サーバーレス)からプロキシされてくる音声文字起こしリクエストを受ける内部API。
 * Whisperモデルを常時稼働しているこのマシン上で直接実行する想定。
 * `X-Inference-Secret`ヘッダーの検証を、モデル実行より必ず先に行う
 * (無駄な計算をさせない・誰でも叩けるエンドポイントにしないため)。
 */
export async function POST(request: Request) {
  if (!requireInferenceSecret(request)) return inferenceUnauthorizedResponse();

  const body = (await request.json().catch(() => null)) as { audio?: number[] } | null;
  if (!body || !Array.isArray(body.audio)) {
    return Response.json({ error: "audioは必須です" }, { status: 400 });
  }

  try {
    const text = await transcribeJapaneseLocal(Float32Array.from(body.audio));
    return Response.json({ text });
  } catch (error) {
    console.error("[api/internal/transcribe] 文字起こしに失敗しました", error);
    return Response.json({ error: "文字起こしに失敗しました" }, { status: 500 });
  }
}
