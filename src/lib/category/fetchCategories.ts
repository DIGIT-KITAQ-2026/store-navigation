import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

export interface CategoryRecord {
  id: string;
  code: string;
  name: string;
  displayOrder: number;
}

export interface CategoryKeywordIndexEntry {
  categoryId: string;
  categoryCode: string;
  categoryName: string;
  normalizedKeyword: string;
}

/**
 * 有効なカテゴリ(is_active = true)をdisplay_order順に取得する。
 * 管理者用カテゴリ一覧API・消費者検索のカテゴリ紐付けの両方から共通で使う。
 * 呼び出し側で失敗を判断できるよう、エラーはそのまま投げる(握りつぶさない)。
 */
export async function getActiveCategories(
  supabase: SupabaseClient<Database>
): Promise<CategoryRecord[]> {
  const { data, error } = await supabase
    .from("categories")
    .select("id, code, name, display_order")
    .eq("is_active", true)
    .order("display_order");

  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id,
    code: row.code,
    name: row.name,
    displayOrder: row.display_order,
  }));
}

/**
 * 検索語とカテゴリの紐付けに使うキーワード索引を取得する(有効カテゴリのみ)。
 * カテゴリDBの障害(テーブル未適用・接続エラー等)で商品検索全体を止めないよう、
 * ここで失敗を吸収して空配列を返す(呼び出し側=検索APIは追加のtry/catch無しで安全に呼べる)。
 */
export async function fetchCategoryKeywordIndex(
  supabase: SupabaseClient<Database>
): Promise<CategoryKeywordIndexEntry[]> {
  try {
    const categories = await getActiveCategories(supabase);
    if (categories.length === 0) return [];

    const categoryById = new Map(categories.map((category) => [category.id, category]));

    const { data, error } = await supabase
      .from("category_keywords")
      .select("category_id, normalized_keyword")
      .in("category_id", categories.map((category) => category.id));

    if (error) throw error;

    return (data ?? []).flatMap((row) => {
      const category = categoryById.get(row.category_id);
      if (!category) return [];
      return [
        {
          categoryId: category.id,
          categoryCode: category.code,
          categoryName: category.name,
          normalizedKeyword: row.normalized_keyword,
        },
      ];
    });
  } catch (error) {
    console.error("[category] キーワード索引の取得に失敗したため、カテゴリ検索なしで継続します", error);
    return [];
  }
}
