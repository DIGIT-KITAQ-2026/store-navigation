import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import type { Product } from "@/types/product";

/**
 * サーバーサイド専用のSupabaseクライアント。RLSをバイパスするService Role Keyを使うため、
 * API route等のサーバーコードからのみ呼び出すこと(クライアントコンポーネントに渡さない)。
 */
export function createSupabaseServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Supabaseの接続情報が設定されていません。.env.localにNEXT_PUBLIC_SUPABASE_URLとSUPABASE_SERVICE_ROLE_KEYを設定してください。"
    );
  }

  return createClient<Database>(url, serviceRoleKey);
}

/**
 * 商品IDから商品情報と棚位置(location_code)を取得する。
 * /navigate/[productId] のServer Componentから呼び出す想定。
 * 該当商品が無い、または棚位置が未設定の場合はnullを返す(呼び出し側でnotFound()する)。
 */
export async function getProductWithShelfLocation(productId: string): Promise<Product | null> {
  const supabase = createSupabaseServiceClient();

  const { data, error } = await supabase
    .from("products")
    .select("id, name, category, description, shelves(shelf_locations(location_code))")
    .eq("id", productId)
    .maybeSingle();

  if (error || !data) return null;

  const locationCode = data.shelves?.shelf_locations?.location_code;
  if (!locationCode) return null;

  return {
    id: data.id,
    name: data.name,
    category: data.category ?? "",
    shelfId: locationCode,
    shelfNumber: locationCode.replace(/^Shelf_/, ""),
    description: data.description ?? "",
  };
}

/**
 * 店舗名・店舗説明を取得する。単一デモ店舗のMVPスコープのため、最初の1件を返す。
 * 消費者画面共通ヘッダー(StoreHeader)・トップページのヒーローセクションから呼び出す想定。
 * 取得できない場合はnullを返す。
 */
export async function getStoreInfo(): Promise<{ name: string; description: string | null } | null> {
  try {
    const supabase = createSupabaseServiceClient();
    const { data, error } = await supabase
      .from("stores")
      .select("name, description")
      .limit(1)
      .maybeSingle();

    if (error || !data) return null;
    return { name: data.name, description: data.description };
  } catch {
    return null;
  }
}
