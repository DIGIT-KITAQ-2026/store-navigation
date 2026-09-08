import type { Locale } from "./locales";

/**
 * 棚卸しCSVの`unit`列(自由記述)の表示名。種類が少なく固定的なため、翻訳APIを呼ばず
 * この静的テーブルで多言語対応する(categoryLabels.tsと同じ方針)。
 * 一覧に無い単位(想定外の自由記述)は元の文字列(日本語)のまま表示する。
 */
const UNIT_LABELS: Record<string, Record<Locale, string>> = {
  個: { ja: "個", en: "pcs", zh: "个", ko: "개" },
  本: { ja: "本", en: "pcs", zh: "瓶", ko: "개" },
  枚: { ja: "枚", en: "pcs", zh: "张", ko: "장" },
  箱: { ja: "箱", en: "boxes", zh: "箱", ko: "박스" },
  袋: { ja: "袋", en: "bags", zh: "袋", ko: "봉지" },
  セット: { ja: "セット", en: "sets", zh: "套", ko: "세트" },
};

export function translateUnit(unit: string, locale: Locale): string {
  return UNIT_LABELS[unit]?.[locale] ?? unit;
}
