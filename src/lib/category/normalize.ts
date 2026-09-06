/**
 * カテゴリ検索キーワードの正規化。DB(category_keywords.normalized_keyword、
 * migrationではlower(trim(keyword))で生成)と検索語の両方に同じ変換をかけて突き合わせる。
 *
 * NFKCは全角英数字・半角カタカナなど「安全な範囲」の全角/半角差だけを吸収し、
 * ひらがな⇔カタカナの変換は行わない。「歯磨き」と「歯みがき」のような意味の異なる表記を
 * 誤って統一しないため(fallbackSearch.tsのnormalizeSearchTextとは別目的の正規化)。
 */
export function normalizeCategoryText(rawText: string): string {
  return rawText.normalize("NFKC").trim().replace(/\s+/g, " ").toLowerCase();
}
