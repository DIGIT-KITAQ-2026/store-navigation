import { cookies } from "next/headers";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { searchProductsWithClipVision } from "@/lib/aiSearch/searchProductsWithClipVision";
import type { ClaudeSearchMatch } from "@/lib/aiSearch/searchProductsWithClaude";
import { fetchStoreCatalog, mapMatchesToResults } from "@/lib/aiSearch/catalog";
import { translateProducts } from "@/lib/translate/productTranslation";
import { DEFAULT_LOCALE, LOCALE_COOKIE_NAME, isLocale } from "@/lib/i18n/locales";
import type { SearchResultItem } from "@/types/product";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8MB
const ALLOWED_MIME_TO_EXTENSION: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/heic": ".heic",
  "image/heif": ".heif",
};

export async function POST(request: Request) {
  const formData = await request.formData().catch(() => null);
  const image = formData?.get("image");

  if (!image || typeof image === "string") {
    return Response.json({ error: "画像が送信されていません" }, { status: 400 });
  }

  const extension = ALLOWED_MIME_TO_EXTENSION[image.type];
  if (!extension) {
    return Response.json({ error: "対応していない画像形式です" }, { status: 400 });
  }

  if (image.size > MAX_IMAGE_BYTES) {
    return Response.json({ error: "画像サイズが大きすぎます(8MBまで)" }, { status: 400 });
  }

  const cookieStore = await cookies();
  const localeCookie = cookieStore.get(LOCALE_COOKIE_NAME)?.value;
  const locale = isLocale(localeCookie) ? localeCookie : DEFAULT_LOCALE;

  let supabase;
  try {
    supabase = createSupabaseServiceClient();
  } catch (error) {
    console.error("[api/search-image] Supabaseクライアントの初期化に失敗しました", error);
    return Response.json({ error: "サーバー設定が不足しています" }, { status: 500 });
  }

  const catalogResult = await fetchStoreCatalog(supabase);
  if (!catalogResult) {
    return Response.json({ error: "店舗・商品情報の取得に失敗しました" }, { status: 500 });
  }
  const { catalog, locationCodeByProductId } = catalogResult;

  const imageBuffer = Buffer.from(await image.arrayBuffer());

  let matches: ClaudeSearchMatch[];
  try {
    matches = await searchProductsWithClipVision(imageBuffer, catalog, locale);
  } catch (error) {
    console.error("[api/search-image] 画像検索に失敗しました", error);
    return Response.json({ error: "画像検索に失敗しました。テキストで検索してください。" }, { status: 502 });
  }

  const results: SearchResultItem[] = mapMatchesToResults(matches, catalog, locationCodeByProductId);
  const translatedProducts = await translateProducts(
    results.map((result) => result.product),
    locale
  );
  const translatedResults: SearchResultItem[] = results.map((result, index) => ({
    ...result,
    product: translatedProducts[index],
  }));

  return Response.json({ results: translatedResults, usedFallback: false });
}
