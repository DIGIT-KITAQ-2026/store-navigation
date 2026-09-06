import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { requireAdminSession, adminAuthErrorResponse } from "@/lib/supabase/adminAuth";

interface RequestBody {
  productId: string;
}

// `barcode_lookup_cache`は意図的に削除しない。同じバーコードを将来再登録した際に
// 手直し済みの商品名・説明を再利用できるようにするためのキャッシュのため、
// productsのライフサイクルから独立させている。
export async function POST(request: Request) {
  const session = await requireAdminSession();
  if (!session.ok) return adminAuthErrorResponse(session);
  const { storeId } = session;

  const body = (await request.json().catch(() => null)) as RequestBody | null;

  if (!body?.productId) {
    return Response.json({ error: "productIdは必須です" }, { status: 400 });
  }

  let supabase;
  try {
    supabase = createSupabaseServiceClient();
  } catch (error) {
    console.error("[api/admin/product-deletion] Supabaseクライアントの初期化に失敗しました", error);
    return Response.json({ error: "サーバー設定が不足しています" }, { status: 500 });
  }

  const { data: product, error: fetchError } = await supabase
    .from("products")
    .select("id, store_id")
    .eq("id", body.productId)
    .maybeSingle();

  if (fetchError) {
    console.error("[api/admin/product-deletion] 削除対象商品の取得に失敗しました", fetchError);
    return Response.json({ error: "商品の削除に失敗しました" }, { status: 500 });
  }
  if (!product) {
    return Response.json({ error: "商品が見つかりません" }, { status: 404 });
  }
  if (product.store_id !== storeId) {
    return Response.json({ error: "他店舗の商品は削除できません" }, { status: 403 });
  }

  const { error } = await supabase.from("products").delete().eq("id", body.productId);

  if (error) {
    return Response.json({ error: "商品の削除に失敗しました: " + error.message }, { status: 400 });
  }

  return Response.json({ ok: true });
}
