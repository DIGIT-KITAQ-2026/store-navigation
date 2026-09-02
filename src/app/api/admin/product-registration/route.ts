import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

interface RequestBody {
  mode: "create" | "update";
  shelfId: string;
  existingProductId?: string;
  barcode: string;
  name: string;
  category: string;
  description: string;
}

// 確定した商品名・説明をバーコード単位で記録しておき、同じバーコードが将来
// 再スキャンされたときに再利用できるようにする(`/api/admin/product-lookup`が参照する)。
// 失敗しても商品登録・更新自体は成功させたいので、エラーはログのみに留める。
async function upsertBarcodeLookupCache(
  supabase: SupabaseClient<Database>,
  barcode: string,
  name: string,
  description: string
): Promise<void> {
  const { error } = await supabase
    .from("barcode_lookup_cache")
    .upsert({ barcode, name, description, updated_at: new Date().toISOString() });

  if (error) {
    console.error("[api/admin/product-registration] バーコードキャッシュの更新に失敗しました", error);
  }
}

// 管理者ログイン画面がまだ無いため、暫定的にservice roleキー(サーバー側のみ)で
// 商品の登録・更新を行う。ログイン機能が完成したらセッション付きクライアント経由の
// RLSに置き換えることを検討する([[admin-login-sequencing]])。
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as RequestBody | null;

  if (
    !body ||
    (body.mode !== "create" && body.mode !== "update") ||
    !body.shelfId ||
    !body.barcode?.trim() ||
    !body.name?.trim() ||
    !body.description?.trim()
  ) {
    return Response.json({ error: "入力内容が不正です" }, { status: 400 });
  }

  let supabase;
  try {
    supabase = createSupabaseServiceClient();
  } catch (error) {
    console.error("[api/admin/product-registration] Supabaseクライアントの初期化に失敗しました", error);
    return Response.json({ error: "サーバー設定が不足しています" }, { status: 500 });
  }

  if (body.mode === "update") {
    if (!body.existingProductId) {
      return Response.json({ error: "更新対象の商品が指定されていません" }, { status: 400 });
    }

    const { error } = await supabase
      .from("products")
      .update({
        barcode: body.barcode.trim(),
        name: body.name.trim(),
        category: body.category,
        description: body.description.trim(),
      })
      .eq("id", body.existingProductId);

    if (error) {
      const message = error.code === "23505" ? "この商品バーコードは既に登録されています。" : error.message;
      return Response.json({ error: "商品の更新に失敗しました: " + message }, { status: 400 });
    }

    await upsertBarcodeLookupCache(supabase, body.barcode.trim(), body.name.trim(), body.description.trim());
    return Response.json({ ok: true });
  }

  const { data: store, error: storeError } = await supabase.from("stores").select("id").limit(1).single();
  if (storeError || !store) {
    return Response.json({ error: "店舗情報の取得に失敗しました" }, { status: 500 });
  }

  const { error: insertError } = await supabase.from("products").insert({
    store_id: store.id,
    shelf_id: body.shelfId,
    barcode: body.barcode.trim(),
    name: body.name.trim(),
    category: body.category,
    description: body.description.trim(),
  });

  if (insertError) {
    const message = insertError.code === "23505" ? "この商品バーコードは既に登録されています。" : insertError.message;
    return Response.json({ error: "商品の登録に失敗しました: " + message }, { status: 400 });
  }

  await upsertBarcodeLookupCache(supabase, body.barcode.trim(), body.name.trim(), body.description.trim());
  return Response.json({ ok: true });
}
