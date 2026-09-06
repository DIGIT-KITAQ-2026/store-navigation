import type { Locale } from "./locales";

/**
 * 商品カテゴリの表示名。種類が少なく固定的なため、翻訳APIを呼ばずこの静的テーブルで多言語対応する。
 * 一覧に無いカテゴリ(想定外の値)は元の文字列(日本語)のまま表示する。
 *
 * 青果〜乳製品の8種は旧来のUnity3D側ゾーン名(docs/データベース設計.md 3.2節、
 * products.categoryへ自由記述で保存されてきたもの)。食品〜キッチンの8種は
 * カテゴリDB(categoriesテーブル)導入後の正式カテゴリ名で、新規登録商品の
 * products.categoryにはこちらが保存される。3D側のゾーン名との不一致(例: Shelf_05は
 * DB上「衛生」・3D上「加工食品」)は本タスクでは解消しない(残課題、docs/データベース設計.md参照)。
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
  食品: { ja: "食品", en: "Food", zh: "食品", ko: "식품" },
  文具: { ja: "文具", en: "Stationery", zh: "文具", ko: "문구" },
  電気: { ja: "電気", en: "Electronics", zh: "电器", ko: "전자제품" },
  化粧: { ja: "化粧", en: "Cosmetics", zh: "化妆品", ko: "화장품" },
  衛生: { ja: "衛生", en: "Personal Care", zh: "卫生用品", ko: "위생용품" },
  トラベル: { ja: "トラベル", en: "Travel", zh: "旅行用品", ko: "여행용품" },
  掃除: { ja: "掃除", en: "Cleaning", zh: "清洁用品", ko: "청소용품" },
  キッチン: { ja: "キッチン", en: "Kitchen", zh: "厨房用品", ko: "주방용품" },
};

export function translateCategory(category: string, locale: Locale): string {
  return CATEGORY_LABELS[category]?.[locale] ?? category;
}
