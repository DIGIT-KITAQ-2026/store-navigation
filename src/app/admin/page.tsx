import Link from "next/link";

const menuItems = [
  {
    href: "/admin/products/new",
    label: "商品を登録する",
    description: "棚バーコードと商品バーコードをスキャンして商品を登録します",
  },
  {
    href: "/admin/products/delete",
    label: "商品を削除する",
    description: "棚バーコードから登録済みの商品を選んで削除します",
  },
  {
    href: "/admin/products",
    label: "商品一覧を見る",
    description: "登録済みの商品を検索・確認します",
  },
];

export default function AdminDashboardPage() {
  return (
    <div className="flex min-h-dvh flex-1 flex-col bg-surface-alt">
      <header className="flex items-center justify-between border-b border-border bg-surface px-6 py-4">
        <div>
          <p className="text-xs leading-[1.4] text-text-secondary">
            店舗管理画面
          </p>
          <h1 className="text-lg leading-[1.4] font-bold text-text-primary">
            管理者メニュー
          </h1>
        </div>
        <Link
          href="/admin/login"
          className="flex h-11 items-center rounded-pill bg-surface-pill px-5 text-[15px] font-semibold text-primary"
        >
          ログアウト
        </Link>
      </header>

      <main className="flex flex-1 flex-col gap-4 px-6 py-8">
        <h2 className="text-lg leading-[1.4] font-bold text-text-primary">
          やること
        </h2>
        <ul className="flex flex-col gap-3">
          {menuItems.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="flex min-h-11 items-center justify-between gap-4 rounded-pill bg-surface-pill px-5 py-3 transition-transform active:scale-[0.97]"
              >
                <span className="flex flex-col">
                  <span className="text-[15px] font-semibold text-primary">
                    {item.label}
                  </span>
                  <span className="text-xs leading-[1.4] text-text-secondary">
                    {item.description}
                  </span>
                </span>
                <span aria-hidden className="text-lg text-primary">
                  ›
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
