import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import type { Product } from "@/types/product";
import { translateProduct } from "@/lib/translate/productTranslation";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/locales";
import { fetchLatestStockForStore, resolveLatestStock } from "@/lib/inventory/latestStock";
import { buildStockInfo } from "@/lib/inventory/stockStatus";

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
 * 該当商品自体が無い場合のみnullを返す(呼び出し側でnotFound()する)。products.shelf_idは
 * nullable(棚バーコードでの登録前の商品が存在し得る)なため、棚が未設定の場合はnullにはせず
 * shelfId/shelfNumberがnullのProductを返す(呼び出し側で「準備中」表示に出し分けるため)。
 * category_idが未設定の商品(新カテゴリ体系への移行前の旧商品)は、物理棚の再割り当てが
 * 済んでおらず案内先が実態と一致しないため、URL直打ち等の直接アクセスでも「見つからない」
 * 扱いにする(fetchStoreCatalog側の検索除外と同じ基準)。
 */
export async function getProductWithShelfLocation(
  productId: string,
  locale: Locale = DEFAULT_LOCALE
): Promise<Product | null> {
  const supabase = createSupabaseServiceClient();

  const { data, error } = await supabase
    .from("products")
    .select("id, name, category, category_id, description, store_id, shelves(shelf_locations(id, location_code))")
    .eq("id", productId)
    .maybeSingle();

  if (error || !data || !data.category_id) return null;

  const shelfLocation = data.shelves?.shelf_locations;
  const locationCode = shelfLocation?.location_code ?? null;

  const stockTarget = { productId: data.id, shelfLocationId: shelfLocation?.id ?? null };
  const stockMaps = await fetchLatestStockForStore(supabase, data.store_id, [stockTarget]);
  const stock = buildStockInfo(resolveLatestStock(stockTarget, stockMaps));

  const product: Product = {
    id: data.id,
    name: data.name,
    category: data.category ?? "",
    shelfId: locationCode,
    shelfNumber: locationCode ? locationCode.replace(/^Shelf_/, "") : null,
    description: data.description ?? "",
    stock,
  };

  return translateProduct(product, locale);
}

export interface AdminProductListItem {
  id: string;
  barcode: string;
  name: string;
  category: string | null;
  description: string | null;
  locationCode: string | null;
}

/**
 * 管理者用の商品一覧を取得する。単一デモ店舗のMVPスコープのため店舗を絞り込まず全件返す。
 * 棚が未配置の商品はlocationCodeがnullになる(呼び出し側で「未配置」等と表示する)。
 * /admin/products のServer Componentから呼び出す想定。
 *
 * category_idが未設定(100均カテゴリ導入前の旧スーパー想定データ)の商品は一覧に表示しない
 * (消費者向け検索・商品詳細と同じ扱い。src/lib/aiSearch/catalog.tsのfetchStoreCatalog()、
 * getProductWithShelfLocation()参照)。データの削除ではなく表示対象からの除外のみ。
 */
export async function getAdminProductList(): Promise<AdminProductListItem[]> {
  try {
    const supabase = createSupabaseServiceClient();
    const { data, error } = await supabase
      .from("products")
      .select("id, barcode, name, category, description, shelves(shelf_locations(location_code))")
      .not("category_id", "is", null)
      .order("name");

    if (error || !data) return [];

    return data.map((product) => ({
      id: product.id,
      barcode: product.barcode,
      name: product.name,
      category: product.category,
      description: product.description,
      locationCode: product.shelves?.shelf_locations?.location_code ?? null,
    }));
  } catch {
    return [];
  }
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
