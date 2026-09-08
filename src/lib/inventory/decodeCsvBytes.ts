const UTF8_BOM = [0xef, 0xbb, 0xbf];

function stripUtf8Bom(bytes: Uint8Array): Uint8Array {
  if (
    bytes.length >= UTF8_BOM.length &&
    UTF8_BOM.every((byte, index) => bytes[index] === byte)
  ) {
    return bytes.subarray(UTF8_BOM.length);
  }
  return bytes;
}

export type DecodeCsvBytesResult = { ok: true; text: string } | { ok: false; error: string };

export const CSV_ENCODING_ERROR_MESSAGE =
  "文字コードを判定できませんでした。UTF-8またはShift_JISのCSVを使用してください。";

/**
 * 棚卸しCSVのバイト列を文字列へデコードする。対応入力: UTF-8(BOM付き含む)・CP932(Shift_JIS)。
 * UTF-8として妥当ならUTF-8を優先し、UTF-8として不正な場合だけCP932として解釈する
 * (両方とも不正な場合はエラーを返し、呼び出し側は取込を中断すること)。
 * 文字化けした文字列を後処理で置換・推測することはしない(`fatal: true`でデコード自体を
 * 失敗させ、成功したデコード結果だけを返す)。
 *
 * Node/ブラウザ標準のTextDecoderは"shift_jis"ラベルをCP932相当(WHATWG Encoding Standardの
 * Shift_JISデコーダ、Windows-31J互換)として扱うため、外部の文字コード変換ライブラリは
 * 追加していない。
 */
export function decodeCsvBytes(bytes: Uint8Array): DecodeCsvBytesResult {
  if (bytes.length === 0) return { ok: true, text: "" };

  const withoutBom = stripUtf8Bom(bytes);

  try {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(withoutBom);
    return { ok: true, text };
  } catch {
    // UTF-8として不正な場合のみCP932(Shift_JIS)を試す。BOMはUTF-8固有の概念のため、
    // ここではBOM除去前の元のバイト列をそのままデコードする。
  }

  try {
    const text = new TextDecoder("shift_jis", { fatal: true }).decode(bytes);
    return { ok: true, text };
  } catch {
    return { ok: false, error: CSV_ENCODING_ERROR_MESSAGE };
  }
}
