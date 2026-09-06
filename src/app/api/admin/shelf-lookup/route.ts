import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { requireAdminSession, adminAuthErrorResponse } from "@/lib/supabase/adminAuth";

export async function GET(request: Request) {
  const session = await requireAdminSession();
  if (!session.ok) return adminAuthErrorResponse(session);
  const { storeId } = session;

  const barcode = new URL(request.url).searchParams.get("barcode")?.trim();
  if (!barcode) {
    return Response.json({ error: "barcodeは必須です" }, { status: 400 });
  }

  let supabase;
  try {
    supabase = createSupabaseServiceClient();
  } catch (error) {
    console.error("[api/admin/shelf-lookup] Supabaseクライアントの初期化に失敗しました", error);
    return Response.json({ error: "サーバー設定が不足しています" }, { status: 500 });
  }

  // store_idで絞り込むことで、他店舗の棚バーコードと偶然一致した場合でも
  // 「見つからない」と同じ応答になり、他店舗の棚・商品情報を漏らさない
  const { data, error } = await supabase
    .from("shelves")
    .select("id, shelf_locations(location_code), products(id, name, barcode, description)")
    .eq("barcode", barcode)
    .eq("store_id", storeId)
    .maybeSingle();

  if (error) {
    return Response.json({ error: "棚の検索に失敗しました: " + error.message }, { status: 500 });
  }

  if (!data) {
    return Response.json({ shelf: null });
  }

  return Response.json({
    shelf: {
      id: data.id,
      locationCode: data.shelf_locations?.location_code ?? null,
      product: data.products
        ? {
            id: data.products.id,
            name: data.products.name,
            barcode: data.products.barcode,
            description: data.products.description ?? "",
          }
        : null,
    },
  });
}
