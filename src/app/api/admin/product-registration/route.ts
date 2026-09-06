import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { requireAdminSession, adminAuthErrorResponse } from "@/lib/supabase/adminAuth";
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

// 認証済みユーザー(profiles.store_id)をstore_idの正本として扱う。リクエスト本文からの
// store_id指定は受け付けず、棚・更新対象商品がこのstore_idに属することを都度確認する。
export async function POST(request: Request) {
  const session = await requireAdminSession();
  if (!session.ok) return adminAuthErrorResponse(session);
  const { storeId } = session;

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

    const { data: existingProduct, error: fetchError } = await supabase
      .from("products")
      .select("id, store_id")
      .eq("id", body.existingProductId)
      .maybeSingle();

    if (fetchError) {
      console.error("[api/admin/product-registration] 更新対象商品の取得に失敗しました", fetchError);
      return Response.json({ error: "商品の更新に失敗しました" }, { status: 500 });
    }
    if (!existingProduct) {
      return Response.json({ error: "更新対象の商品が見つかりません" }, { status: 404 });
    }
    if (existingProduct.store_id !== storeId) {
      return Response.json({ error: "他店舗の商品は更新できません" }, { status: 403 });
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
      if (error.code === "23505") {
        return Response.json({ error: "この商品バーコードは既に登録されています。" }, { status: 409 });
      }
      return Response.json({ error: "商品の更新に失敗しました: " + error.message }, { status: 400 });
    }

    await upsertBarcodeLookupCache(supabase, body.barcode.trim(), body.name.trim(), body.description.trim());
    return Response.json({ ok: true });
  }

  const { data: shelf, error: shelfError } = await supabase
    .from("shelves")
    .select("id, store_id")
    .eq("id", body.shelfId)
    .maybeSingle();

  if (shelfError) {
    console.error("[api/admin/product-registration] 棚情報の取得に失敗しました", shelfError);
    return Response.json({ error: "商品の登録に失敗しました" }, { status: 500 });
  }
  if (!shelf) {
    return Response.json({ error: "指定された棚が見つかりません" }, { status: 404 });
  }
  if (shelf.store_id !== storeId) {
    return Response.json({ error: "他店舗の棚には登録できません" }, { status: 403 });
  }

  const { error: insertError } = await supabase.from("products").insert({
    store_id: storeId,
    shelf_id: body.shelfId,
    barcode: body.barcode.trim(),
    name: body.name.trim(),
    category: body.category,
    description: body.description.trim(),
  });

  if (insertError) {
    if (insertError.code === "23505") {
      return Response.json({ error: "この商品バーコードは既に登録されています。" }, { status: 409 });
    }
    return Response.json({ error: "商品の登録に失敗しました: " + insertError.message }, { status: 400 });
  }

  await upsertBarcodeLookupCache(supabase, body.barcode.trim(), body.name.trim(), body.description.trim());
  return Response.json({ ok: true });
}
