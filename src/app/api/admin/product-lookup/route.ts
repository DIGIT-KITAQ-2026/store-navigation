import { createSupabaseServiceClient } from "@/lib/supabase/server";

interface YahooItemSearchResponse {
  hits?: { name?: string }[];
}

// 商品バーコード(JANコード)から商品名(・分かれば説明)を引く。
// 1. まず`barcode_lookup_cache`(過去に登録・確定した内容)を優先して参照する。
//    Yahoo!ショッピングの検索結果は梱包・販促情報混じりの不自然な名前になりがちなため、
//    一度スタッフが手直しした内容があればそちらを毎回使い回す。
// 2. キャッシュに無ければYahoo!ショッピング商品検索API(V3 itemSearch)にフォールバックする。
// appid未設定/該当なし/API障害時はすべて{ name: null }を返し、フロント側は
// エラー扱いせず手入力にフォールバックできるようにする(登録自体はブロックしない)。
export async function GET(request: Request) {
  const barcode = new URL(request.url).searchParams.get("barcode")?.trim();
  if (!barcode) {
    return Response.json({ error: "barcodeは必須です" }, { status: 400 });
  }

  try {
    const supabase = createSupabaseServiceClient();
    const { data: cached } = await supabase
      .from("barcode_lookup_cache")
      .select("name, description")
      .eq("barcode", barcode)
      .maybeSingle();

    if (cached) {
      return Response.json({ name: cached.name, description: cached.description, source: "cache" });
    }
  } catch (error) {
    console.error("[api/admin/product-lookup] キャッシュの参照に失敗しました", error);
    // キャッシュ参照に失敗してもYahoo検索にフォールバックして続行する
  }

  const appId = process.env.YAHOO_SHOPPING_APP_ID;
  if (!appId) {
    return Response.json({ name: null });
  }

  const url = new URL("https://shopping.yahooapis.jp/ShoppingWebService/V3/itemSearch");
  url.searchParams.set("appid", appId);
  url.searchParams.set("jan_code", barcode);
  url.searchParams.set("results", "1");

  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`[api/admin/product-lookup] Yahoo商品検索APIが${response.status}を返しました`);
      return Response.json({ name: null });
    }

    const data: YahooItemSearchResponse = await response.json();
    const name = data.hits?.[0]?.name ?? null;
    return Response.json({ name, source: "yahoo" });
  } catch (error) {
    console.error("[api/admin/product-lookup] Yahoo商品検索APIの呼び出しに失敗しました", error);
    return Response.json({ name: null });
  }
}
