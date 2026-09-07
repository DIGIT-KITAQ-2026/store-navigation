import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { requireAdminSession, adminAuthErrorResponse } from "@/lib/supabase/adminAuth";
import { validateInventoryCsv } from "@/lib/inventory/validateInventoryCsv";
import { decodeCsvBytes } from "@/lib/inventory/decodeCsvBytes";

// 棚卸しCSVのプレビュー専用API。ここでは何もinventory_countsへ保存しない
// (確定保存は/api/admin/inventory/import側の役割)。
export async function POST(request: Request) {
  const session = await requireAdminSession();
  if (!session.ok) return adminAuthErrorResponse(session);
  const { storeId } = session;

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");
  if (!(file instanceof Blob)) {
    return Response.json({ error: "CSVファイルが指定されていません" }, { status: 400 });
  }

  const decoded = decodeCsvBytes(new Uint8Array(await file.arrayBuffer()));
  if (!decoded.ok) {
    return Response.json({ error: decoded.error }, { status: 400 });
  }

  let supabase;
  try {
    supabase = createSupabaseServiceClient();
  } catch (error) {
    console.error("[api/admin/inventory/preview] Supabaseクライアントの初期化に失敗しました", error);
    return Response.json({ error: "サーバー設定が不足しています" }, { status: 500 });
  }

  const { data: store, error: storeError } = await supabase
    .from("stores")
    .select("entry_qr_code")
    .eq("id", storeId)
    .maybeSingle();

  if (storeError || !store) {
    console.error("[api/admin/inventory/preview] 店舗情報の取得に失敗しました", storeError);
    return Response.json({ error: "店舗情報の取得に失敗しました" }, { status: 500 });
  }

  try {
    const result = await validateInventoryCsv(decoded.text, {
      supabase,
      storeId,
      storeEntryQrCode: store.entry_qr_code,
    });
    if (result.fileError) {
      return Response.json(result, { status: 400 });
    }
    return Response.json(result);
  } catch (error) {
    console.error("[api/admin/inventory/preview] CSVの検証に失敗しました", error);
    return Response.json({ error: "CSVの検証に失敗しました" }, { status: 500 });
  }
}
