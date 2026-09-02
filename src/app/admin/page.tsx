import { AdminHeader } from "@/components/ui/AdminHeader";
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
      <AdminHeader
        subtitle="店舗管理画面"
        title="管理者メニュー"
        showLogout
      />

      <main className="flex flex-1 flex-col gap-4 px-6 py-8">
        <h2 className="text-lg leading-[1.4] font-bold text-text-primary">
          やること
        </h2>
        <ul className="flex flex-col rounded-admin border border-border divide-y divide-border overflow-hidden">
          {menuItems.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="flex min-h-11 items-center justify-between gap-4 bg-surface px-5 py-3 transition-colors hover:bg-surface-alt"
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
