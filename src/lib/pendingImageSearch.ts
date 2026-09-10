export const IMAGE_SEARCH_QUERY_LABEL = "画像検索";

let pendingFile: File | null = null;
/** どのファイルで既に検索を始めたか。同じ画像で二重に検索しないための目印 */
let startedFile: File | null = null;

/**
 * ホーム画面(StoreEntranceHero)で画像検索を送信した際、実際の検索は/searchへ遷移した後に
 * 検索結果画面(SearchScreen)側で実行する。File自体はURLに乗せられないため、
 * 同一タブ内のクライアントサイド遷移(next/navigationのrouter.push、フルリロードではない)の間だけ
 * メモリ上に保持して受け渡す。フルリロード/直接アクセスでは保持されない(その場合はテキスト検索として扱われる)。
 */
export function setPendingImageSearchFile(file: File): void {
  pendingFile = file;
  startedFile = null;
}

/**
 * 受け取った画像を返す。読み取っても消さない。
 *
 * 以前は読み取り時に消していたが、開発時のStrict Modeでコンポーネントが作り直されると
 * 2回目の読み取りでnullになり、URLの ?q=画像検索 を検索語として通常検索してしまい
 * 「該当する商品が見つかりませんでした」になっていた。
 * 破棄は検索が終わってからclearPendingImageSearchFileで行う。
 */
export function peekPendingImageSearchFile(): File | null {
  return pendingFile;
}

/**
 * この画像で検索を始めてよいか。最初の1回だけtrueを返す。
 * コンポーネントが作り直されても二重に検索しないよう、状態はモジュール側に持つ。
 */
export function claimPendingImageSearch(file: File): boolean {
  if (startedFile === file) return false;
  startedFile = file;
  return true;
}

/** 受け渡しを終える。検索が完了した時点で呼ぶ */
export function clearPendingImageSearchFile(): void {
  pendingFile = null;
  startedFile = null;
}
