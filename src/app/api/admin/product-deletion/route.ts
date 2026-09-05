import { createSupabaseServiceClient } from "@/lib/supabase/server";

interface RequestBody {
  productId: string;
}

// 管理者ログイン画面がまだ無いため、暫定的にservice roleキー(サーバー側のみ)で
// 商品の削除を行う。ログイン機能が完成したらセッション付きクライアント経由の
// RLSに置き換えることを検討する([[admin-login-sequencing]])。
//
// `barcode_lookup_cache`は意図的に削除しない。同じバーコードを将来再登録した際に
// 手直し済みの商品名・説明を再利用できるようにするためのキャッシュのため、
// productsのライフサイクルから独立させている。
export async function POST(request: Request) {
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

  const { error } = await supabase.from("products").delete().eq("id", body.productId);

  if (error) {
    return Response.json({ error: "商品の削除に失敗しました: " + error.message }, { status: 400 });
  }

  return Response.json({ ok: true });
}
