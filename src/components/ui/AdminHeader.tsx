import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

type AdminHeaderProps = {
  title: string;
  subtitle?: string;
  backHref?: string;
  showLogout?: boolean;
  rightSlot?: ReactNode;
};

/**
 * 管理者画面(/admin以下)共通のヘッダー。1本の帯にOfficeアプリのタイトルバー風の
 * アイコン+アプリ名、画面タイトル、戻る/ログアウトボタンをまとめる(2段組みにしない)。
 */
export function AdminHeader({
  title,
  subtitle,
  backHref,
  showLogout,
  rightSlot,
}: AdminHeaderProps) {
  return (
    <header className="flex items-center justify-between gap-3 border-b border-border bg-surface px-4 py-2.5">
      <div className="flex items-center gap-3">
        {backHref && (
          <Link
            href={backHref}
            aria-label="戻る"
            className="flex h-9 w-9 items-center justify-center rounded-admin border border-border bg-surface text-lg text-primary transition-colors hover:bg-surface-highlight"
          >
            ‹
          </Link>
        )}

        <Image
          src="/images/design-reference/logo.png"
          alt=""
          width={24}
          height={24}
          className="h-6 w-6 rounded-admin object-contain"
        />

        <div className="flex flex-col">
          {subtitle && (
            <p className="text-[11px] leading-[1.3] text-text-secondary">
              {subtitle}
            </p>
          )}
          <h1 className="text-base leading-[1.3] font-bold text-text-primary">
            {title}
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {rightSlot}
        {showLogout && (
          <Link
            href="/"
            className="flex h-9 items-center rounded-admin border border-border bg-surface px-4 text-[13px] font-semibold text-primary transition-colors hover:bg-surface-highlight"
          >
            ログアウト
          </Link>
        )}
      </div>
    </header>
  );
}
