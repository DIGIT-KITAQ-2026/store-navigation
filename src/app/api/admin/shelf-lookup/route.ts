import { createSupabaseServiceClient } from "@/lib/supabase/server";

// 管理者ログイン画面がまだ無いため、暫定的にservice roleキー(サーバー側のみ)で
// 棚を検索する。ログイン機能が完成したらセッション付きクライアント経由のRLSに
// 置き換えることを検討する([[admin-login-sequencing]])。
export async function GET(request: Request) {
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

  const { data, error } = await supabase
    .from("shelves")
    .select("id, shelf_locations(location_code), products(id, name, barcode, description)")
    .eq("barcode", barcode)
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
