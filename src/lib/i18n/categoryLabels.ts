import type { Locale } from "./locales";

/**
 * 商品カテゴリ(docs/データベース設計.md 3.2節のUnity8ゾーンに対応する固定8種)の表示名。
 * 種類が少なく固定的なため、翻訳APIを呼ばずこの静的テーブルで多言語対応する。
 * 一覧に無いカテゴリ(想定外の値)は元の文字列(日本語)のまま表示する。
 */
const CATEGORY_LABELS: Record<string, Record<Locale, string>> = {
  青果: { ja: "青果", en: "Produce", zh: "蔬果", ko: "청과" },
  精肉: { ja: "精肉", en: "Meat", zh: "肉类", ko: "정육" },
  鮮魚: { ja: "鮮魚", en: "Seafood", zh: "鲜鱼", ko: "생선" },
  惣菜: { ja: "惣菜", en: "Deli", zh: "熟食", ko: "반찬" },
  加工食品: { ja: "加工食品", en: "Grocery", zh: "加工食品", ko: "가공식품" },
  冷凍食品: { ja: "冷凍食品", en: "Frozen Foods", zh: "冷冻食品", ko: "냉동식품" },
  飲料: { ja: "飲料", en: "Beverages", zh: "饮料", ko: "음료" },
  乳製品: { ja: "乳製品", en: "Dairy", zh: "乳制品", ko: "유제품" },
};

export function translateCategory(category: string, locale: Locale): string {
  return CATEGORY_LABELS[category]?.[locale] ?? category;
}
