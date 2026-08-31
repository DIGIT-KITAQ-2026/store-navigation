import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-4 bg-surface px-4 py-10 text-center">
      <h1 className="text-xl font-bold text-on-surface">商品が見つかりませんでした</h1>
      <p className="text-sm text-on-surface-variant">
        指定された商品は存在しないか、削除された可能性があります。
      </p>
      <Link
        href="/search"
        className="rounded-full bg-primary px-5 py-3 text-base font-semibold text-on-primary transition-colors hover:bg-primary/90"
      >
        検索結果に戻る
      </Link>
    </div>
  );
}
