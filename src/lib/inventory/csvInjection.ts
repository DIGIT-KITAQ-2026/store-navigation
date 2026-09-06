const DANGEROUS_LEADING_CHARS = new Set(["=", "+", "-", "@"]);

/**
 * CSV数式インジェクション対策。「=」「+」「-」「@」で始まるセルをスプレッドシートで開いても
 * 数式として評価されないよう、先頭にシングルクォートを付けて無害化する。
 * 保存する値そのものは書き換えない(商品名を不必要に破壊しないため)。プレビュー表示や、
 * 将来CSVとして書き出す場合など「表示・エクスポート時」にのみ適用する想定の純粋関数。
 */
export function sanitizeForSpreadsheetDisplay(value: string): string {
  if (value.length === 0) return value;
  return DANGEROUS_LEADING_CHARS.has(value[0]) ? `'${value}` : value;
}
