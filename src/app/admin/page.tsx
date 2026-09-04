import { AdminHeader } from "@/components/ui/AdminHeader";
import Link from "next/link";

const menuItems = [
  {
    href: "/admin/products/new",
    label: "商品を登録する",
    description: "棚バーコードと商品バーコードをスキャンして商品を登録します",
    icon: "add_circle",
  },
  {
    href: "/admin/products/delete",
    label: "商品を削除する",
    description: "棚バーコードから登録済みの商品を選んで削除します",
    icon: "remove_circle",
  },
  {
    href: "/admin/products",
    label: "商品一覧を見る",
    description: "登録済みの商品を検索・確認します",
    icon: "inventory_2",
  },
];

export default function AdminDashboardPage() {
  return (
    <div className="flex flex-1 flex-col">
      <AdminHeader subtitle="店舗管理画面" title="管理者メニュー" active="menu" showLogout />

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 py-8 md:px-8">
        <h2 className="text-lg font-bold text-on-surface">やること</h2>
        <ul className="flex flex-col gap-3">
          {menuItems.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="group flex items-center gap-4 rounded-xl border border-outline-variant bg-surface p-5 shadow-sm transition-all hover:border-primary hover:shadow-md"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-container text-on-primary-container">
                  <span className="material-symbols-outlined" aria-hidden>
                    {item.icon}
                  </span>
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="text-base font-semibold text-on-surface">{item.label}</span>
                  <span className="text-sm text-on-surface-variant">{item.description}</span>
                </span>
                <span
                  aria-hidden
                  className="material-symbols-outlined shrink-0 text-on-surface-variant transition-colors group-hover:text-primary"
                >
                  chevron_right
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
