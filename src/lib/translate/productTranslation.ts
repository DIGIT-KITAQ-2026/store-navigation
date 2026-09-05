import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { translateTexts } from "./googleTranslate";
import { translateCategory } from "@/lib/i18n/categoryLabels";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/locales";

export interface TranslatableProduct {
  id: string;
  name: string;
  description: string;
  category?: string | null;
}

/**
 * 商品説明文・カテゴリをlocaleへ翻訳する。日本語(デフォルトロケール)はそのまま返す。
 * 商品名は翻訳せず、常に元の日本語表示のままにする(店頭の実際の商品名と一致させるため)。
 * 説明文は`product_translations`のキャッシュを優先し、無ければGoogle翻訳APIを呼んで
 * 結果を保存してから返す。翻訳に失敗した場合は日本語の原文にフォールバックする
 * (検索・商品案内自体は翻訳が無くても機能を止めないため)。
 * カテゴリは種類が固定8種のため、APIを呼ばず静的な対応表(categoryLabels.ts)で変換する。
 */
export async function translateProduct<T extends TranslatableProduct>(
  product: T,
  locale: Locale
): Promise<T> {
  if (locale === DEFAULT_LOCALE) return product;

  const withTranslatedCategory = product.category
    ? { ...product, category: translateCategory(product.category, locale) }
    : product;

  try {
    const supabase = createSupabaseServiceClient();

    const { data: cached } = await supabase
      .from("product_translations")
      .select("description")
      .eq("product_id", product.id)
      .eq("locale", locale)
      .maybeSingle();

    if (cached) {
      return { ...withTranslatedCategory, description: cached.description };
    }

    const translated = await translateTexts([product.description], locale);
    if (!translated || translated.length < 1) return withTranslatedCategory;

    const [description] = translated;

    await supabase.from("product_translations").upsert({ product_id: product.id, locale, description });

    return { ...withTranslatedCategory, description };
  } catch (error) {
    console.error("[productTranslation] 商品の翻訳に失敗しました", error);
    return withTranslatedCategory;
  }
}

/** 複数商品をまとめて翻訳する(並列実行)。 */
export async function translateProducts<T extends TranslatableProduct>(
  products: T[],
  locale: Locale
): Promise<T[]> {
  if (locale === DEFAULT_LOCALE) return products;
  return Promise.all(products.map((product) => translateProduct(product, locale)));
}
