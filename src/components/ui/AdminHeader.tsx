import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { AdminLogoutButton } from "@/components/ui/AdminLogoutButton";

type AdminNavKey = "menu" | "products" | "new" | "delete";

type AdminHeaderProps = {
  title: string;
  subtitle?: string;
  backHref?: string;
  showLogout?: boolean;
  /** 現在ページに対応するナビゲーションタブ(ハイライト表示用) */
  active?: AdminNavKey;
  rightSlot?: ReactNode;
};

const NAV_ITEMS: { key: AdminNavKey; href: string; label: string; icon: string }[] = [
  { key: "menu", href: "/admin", label: "メニュー", icon: "dashboard" },
  { key: "products", href: "/admin/products", label: "商品一覧", icon: "inventory_2" },
  { key: "new", href: "/admin/products/new", label: "商品登録", icon: "add_circle" },
  { key: "delete", href: "/admin/products/delete", label: "商品削除", icon: "remove_circle" },
];

/**
 * 管理者画面(/admin以下)共通のヘッダー。ブランド表示・「管理者画面」バッジ・主要導線への
 * ショートカットタブは全ページ共通でここにまとめ、各ページ側では重複実装しない。
 * ブランド+タブ部分のみsticky(常時表示)にし、ページ見出しは通常のフローに置く
 * (バーコードスキャン画面などでカメラ表示の縦スペースを圧迫しないため)。
 */
export function AdminHeader({ title, subtitle, backHref, showLogout, active, rightSlot }: AdminHeaderProps) {
  return (
    <>
      <header className="sticky top-0 z-40 border-b border-outline-variant bg-surface shadow-sm">
        <div className="flex items-center justify-between gap-3 px-4 py-2.5 md:px-8">
          <div className="flex min-w-0 items-center gap-2.5">
            {backHref && (
              <Link
                href={backHref}
                aria-label="戻る"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-on-surface transition-colors hover:bg-surface-variant"
              >
                <span className="material-symbols-outlined" aria-hidden>
                  arrow_back
                </span>
              </Link>
            )}

            <Link href="/admin" className="flex min-w-0 items-center gap-2">
              <Image
                src="/images/design-reference/logo.png"
                alt=""
                width={32}
                height={32}
                className="h-7 w-7 shrink-0 object-contain"
              />
              <span className="min-w-0 truncate text-base font-bold text-on-surface">Smart Store Navi</span>
            </Link>

            <span className="hidden shrink-0 rounded-full bg-primary-container px-2.5 py-1 text-xs font-semibold text-on-primary-container sm:inline-block">
              管理者画面
            </span>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {rightSlot}
            {showLogout && <AdminLogoutButton />}
          </div>
        </div>

        <nav
          aria-label="管理メニュー"
          className="hide-scrollbar flex items-center gap-1.5 overflow-x-auto border-t border-outline-variant px-3 py-2 md:px-8"
        >
          <Link
            href="/"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-on-surface-variant transition-colors hover:bg-surface-variant"
          >
            <span className="material-symbols-outlined text-[18px]" aria-hidden>
              storefront
            </span>
            顧客画面へ
          </Link>
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              aria-current={active === item.key ? "page" : undefined}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                active === item.key
                  ? "bg-primary text-on-primary"
                  : "text-on-surface-variant hover:bg-surface-variant"
              }`}
            >
              <span className="material-symbols-outlined text-[18px]" aria-hidden>
                {item.icon}
              </span>
              {item.label}
            </Link>
          ))}
        </nav>
      </header>

      <div className="border-b border-outline-variant bg-surface px-4 py-4 md:px-8">
        {subtitle && <p className="text-xs font-medium text-on-surface-variant">{subtitle}</p>}
        <h1 className="mt-0.5 text-xl font-bold text-on-surface md:text-2xl">{title}</h1>
      </div>
    </>
  );
}
