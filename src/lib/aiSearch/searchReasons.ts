import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/locales";

/**
 * 検索結果に添える「なぜこの商品が出たか」の文言。
 *
 * claude CLIで検索していたときは、プロンプトで「reasonはこの言語で書いて」と指示していた。
 * CLIP検索に切り替えてこの文言は自前のテンプレートで組み立てるようになったため、
 * 多言語対応(PR #24)を保つ目的でここに各言語の文面を持たせている。
 * 生成物ではなく定型文なので、AIに翻訳させるより確実で速い。
 */
interface ReasonTemplates {
  /** 意味検索で関連商品として見つかった */
  semantic: string;
  /** 画像から品目を判定して見つかった */
  image: string;
  /** 商品名が検索語に一致した */
  nameMatch: string;
  /** カテゴリーが検索語に一致した */
  categoryMatch: string;
  /** 商品説明が検索語に一致した */
  descriptionMatch: string;
}

const TEMPLATES: Record<Locale, ReasonTemplates> = {
  ja: {
    semantic: "「{query}」に関連する商品として「{name}」が見つかりました",
    image: "画像から「{label}」と判定し、該当する商品が見つかりました",
    nameMatch: "商品名「{name}」が検索語に一致しました",
    categoryMatch: "カテゴリー「{category}」が検索語に一致しました",
    descriptionMatch: "商品説明が検索語に一致しました",
  },
  en: {
    semantic: 'Found "{name}" as a product related to "{query}"',
    image: 'Identified "{label}" in the image and found a matching product',
    nameMatch: 'The product name "{name}" matches your search',
    categoryMatch: 'The category "{category}" matches your search',
    descriptionMatch: "The product description matches your search",
  },
  zh: {
    semantic: "找到了与“{query}”相关的商品“{name}”",
    image: "根据图片识别为“{label}”，找到了对应的商品",
    nameMatch: "商品名称“{name}”与搜索词一致",
    categoryMatch: "类别“{category}”与搜索词一致",
    descriptionMatch: "商品说明与搜索词一致",
  },
  ko: {
    // 韓国語は変数の直後に付く助詞が語尾で変わるため、助詞を変数の後ろに置かない書き方にしている
    semantic: "검색어 '{query}'와 관련된 상품입니다: '{name}'",
    image: "이미지 인식 결과 '{label}'에 해당하는 상품입니다",
    nameMatch: "상품명이 검색어와 일치합니다: '{name}'",
    categoryMatch: "카테고리가 검색어와 일치합니다: '{category}'",
    descriptionMatch: "상품 설명이 검색어와 일치합니다",
  },
};

/** "{key}"形式のプレースホルダーをvarsの値で置き換える */
function format(template: string, vars: Record<string, string>): string {
  return Object.entries(vars).reduce(
    (text, [key, value]) => text.replaceAll(`{${key}}`, value),
    template
  );
}

export function buildSearchReason(
  key: keyof ReasonTemplates,
  vars: Record<string, string>,
  locale: Locale = DEFAULT_LOCALE
): string {
  return format(TEMPLATES[locale][key], vars);
}
