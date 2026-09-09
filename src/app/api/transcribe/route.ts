import { loadTranscriber, transcribeJapanese } from "@/lib/voice/transcribeAudio";
import { getInferenceBaseUrl } from "@/lib/aiInference/inferenceProxy";

/** 16kHzモノラルなので、この長さで約60秒ぶん。検索の入力としては十分 */
const MAX_SAMPLES = 16_000 * 60;

/**
 * 録音した音声を文字起こしする。
 *
 * ブラウザ側でAudioContextを使って16kHz・モノラルのPCMまで復号してから送る。
 * こうするとサーバーにwebm/opusのデコーダを持たせずに済み、送信量も16bit化で半分になる。
 * 本文はInt16のリトルエンディアン配列そのもの(application/octet-stream)。
 */
export async function POST(request: Request) {
  // 録音中にモデルの読み込みを先行させるためのウォームアップ要求(本文なし)。
  // AI_INFERENCE_BASE_URLが設定されている(=Vercel等、モデルをこのプロセスで持たない)場合は
  // ここでloadTranscriber()を呼ぶとVercel上でモデル読み込みを試みてしまうため何もしない
  // (推論サーバー側は常時稼働でモデルを保持し続けている前提のため、都度のウォームアップ自体が不要)
  if (request.headers.get("x-warmup") === "1") {
    if (!getInferenceBaseUrl()) {
      loadTranscriber().catch((error) => {
        console.error("[api/transcribe] モデルの事前読み込みに失敗しました", error);
      });
    }
    return Response.json({ ok: true });
  }

  const buffer = await request.arrayBuffer().catch(() => null);
  if (!buffer || buffer.byteLength < 2) {
    return Response.json({ error: "音声データが送信されていません" }, { status: 400 });
  }

  const samples = new Int16Array(buffer, 0, Math.floor(buffer.byteLength / 2));
  if (samples.length > MAX_SAMPLES) {
    return Response.json({ error: "録音が長すぎます(60秒まで)" }, { status: 413 });
  }

  const audio = new Float32Array(samples.length);
  for (let i = 0; i < samples.length; i++) audio[i] = samples[i] / 32768;

  try {
    const text = await transcribeJapanese(audio);
    return Response.json({ text });
  } catch (error) {
    console.error("[api/transcribe] 文字起こしに失敗しました", error);
    return Response.json({ error: "文字起こしに失敗しました" }, { status: 500 });
  }
}
