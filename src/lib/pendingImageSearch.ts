export const IMAGE_SEARCH_QUERY_LABEL = "画像検索";

let pendingFile: File | null = null;

/**
 * ホーム画面(StoreEntranceHero)で画像検索を送信した際、実際の検索は/searchへ遷移した後に
 * 検索結果画面(SearchScreen)側で実行する。File自体はURLに乗せられないため、
 * 同一タブ内のクライアントサイド遷移(next/navigationのrouter.push、フルリロードではない)の間だけ
 * メモリ上に保持して受け渡す。フルリロード/直接アクセスでは保持されない(その場合はテキスト検索として扱われる)。
 */
export function setPendingImageSearchFile(file: File): void {
  pendingFile = file;
}

export function takePendingImageSearchFile(): File | null {
  const file = pendingFile;
  pendingFile = null;
  return file;
}
