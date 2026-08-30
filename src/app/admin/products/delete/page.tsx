import Link from "next/link";

export default function AdminProductDeletePage() {
  return (
    <div className="flex min-h-dvh flex-1 flex-col bg-surface-alt">
      <header className="flex items-center gap-3 border-b border-border bg-surface px-6 py-4">
        <Link
          href="/admin"
          aria-label="管理者メニューに戻る"
          className="flex h-11 w-11 items-center justify-center rounded-pill text-lg text-primary"
        >
          ‹
        </Link>
        <h1 className="text-lg leading-[1.4] font-bold text-text-primary">
          商品削除
        </h1>
      </header>

      <main className="flex flex-1 items-center justify-center px-6 py-8">
        <p className="text-[15px] leading-[1.6] text-text-secondary">
          準備中の画面です。
        </p>
      </main>
    </div>
  );
}
