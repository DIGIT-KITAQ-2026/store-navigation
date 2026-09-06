import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { requireAdminSession, adminAuthErrorResponse } from "@/lib/supabase/adminAuth";
import { getActiveCategories } from "@/lib/category/fetchCategories";

// 読み取り専用のカテゴリ一覧(is_active=trueのみ、display_order順)。
// 商品登録画面のカテゴリ選択で使う。変更系のAPIは今回作らない(categoriesはservice role経由の
// サーバーコードのみが読み書きし、匿名ユーザーが直接編集できるポリシーは設けていない)。
export async function GET() {
  const session = await requireAdminSession();
  if (!session.ok) return adminAuthErrorResponse(session);

  try {
    const supabase = createSupabaseServiceClient();
    const categories = await getActiveCategories(supabase);
    return Response.json({
      categories: categories.map((category) => ({
        id: category.id,
        code: category.code,
        name: category.name,
      })),
    });
  } catch (error) {
    console.error("[api/admin/categories] カテゴリ一覧の取得に失敗しました", error);
    return Response.json({ error: "カテゴリ一覧の取得に失敗しました" }, { status: 500 });
  }
}
