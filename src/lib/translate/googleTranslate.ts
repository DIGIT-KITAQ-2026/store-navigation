interface GoogleTranslateResponse {
  data?: {
    translations?: { translatedText?: string }[];
  };
  error?: { message?: string };
}

/**
 * Google Cloud Translation API(v2)で複数文字列をまとめて翻訳する。
 * 呼び出し元1回につきAPIリクエスト1回で済むよう、texts配列をまとめて渡す。
 * GOOGLE_TRANSLATE_API_KEY未設定/API障害時はnullを返し、呼び出し元は翻訳前のテキストに
 * フォールバックできるようにする(消費者向け画面が翻訳エラーで壊れないようにするため)。
 */
export async function translateTexts(
  texts: string[],
  targetLocale: string,
  sourceLocale = "ja"
): Promise<string[] | null> {
  const apiKey = process.env.GOOGLE_TRANSLATE_API_KEY;
  if (!apiKey || texts.length === 0) return null;

  try {
    const response = await fetch(
      `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          q: texts,
          source: sourceLocale,
          target: targetLocale,
          format: "text",
        }),
      }
    );

    const body: GoogleTranslateResponse = await response.json();

    if (!response.ok || !body.data?.translations) {
      console.error("[googleTranslate] 翻訳APIがエラーを返しました", body.error ?? response.status);
      return null;
    }

    return body.data.translations.map((t) => t.translatedText ?? "");
  } catch (error) {
    console.error("[googleTranslate] 翻訳APIの呼び出しに失敗しました", error);
    return null;
  }
}
