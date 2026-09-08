"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import LanguageSwitcher from "@/components/ui/LanguageSwitcher";
import { useTranslations } from "@/lib/i18n/useTranslations";
import { useStoreFlow } from "@/lib/storeFlowState";
import { findBranch, findChain } from "@/lib/stores/storeDirectory";

/**
 * 店舗を選ぶ前に出す名前。管理者画面のヘッダー(AdminHeader)と同じ表記に揃えている。
 */
const SERVICE_NAME = "Smart Store Navi";

/** URLから選択中の店舗・支店を読み取る(/stores/<店舗>/<支店>) */
function readSelectionFromPath(pathname: string): { chainId: string | null; branchId: string | null } | null {
  if (pathname === "/") return { chainId: null, branchId: null };

  const match = pathname.match(/^\/stores\/([^/]+)(?:\/([^/]+))?/);
  if (!match) return null;

  return { chainId: match[1], branchId: match[2] ?? null };
}

/**
 * 消費者画面のヘッダー。今どの店舗・支店を見ているかをタイトルに出す。
 *
 * 店舗を選ぶ前は「Smart Store Navi」、店舗を選んだら店舗名、支店まで選んだら
 * 「店舗名 支店名」になる。検索結果やナビ画面のようにURLに店舗が現れない画面では、
 * 直前に選んだものをそのまま出し続ける(共通レイアウトのStoreFlowProviderが覚えている)。
 */
export default function StoreHeader() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const t = useTranslations();
  const pathname = usePathname();
  const { selectedChainId, selectedBranchId, setSelection } = useStoreFlow();

  // URLに店舗が現れる画面でだけ選択を更新する。それ以外の画面では前の選択を保つ
  useEffect(() => {
    const fromPath = readSelectionFromPath(pathname);
    if (fromPath) setSelection(fromPath.chainId, fromPath.branchId);
  }, [pathname, setSelection]);

  const chain = selectedChainId ? findChain(selectedChainId) : null;
  const branch =
    selectedChainId && selectedBranchId ? findBranch(selectedChainId, selectedBranchId) : null;
  const title = chain ? [chain.name, branch?.name].filter(Boolean).join(" ") : SERVICE_NAME;

  return (
    <header className="sticky top-0 z-40 border-b border-outline-variant bg-surface shadow-sm">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-3 px-4 md:px-8">
        <Link href="/" className="flex min-w-0 flex-1 items-center gap-3">
          <Image
            src="/images/design-reference/logo.png"
            alt="ロゴ"
            width={40}
            height={40}
            className="h-8 w-8 shrink-0 object-contain md:h-10 md:w-10"
          />
          <p className="min-w-0 truncate text-xl font-bold text-on-surface">{title}</p>
        </Link>

        <div className="relative shrink-0">
          <button
            type="button"
            aria-label={t.storeHeader.menuOpen}
            aria-expanded={isMenuOpen}
            onClick={() => setIsMenuOpen((open) => !open)}
            className="flex h-10 w-10 items-center justify-center rounded-full text-on-surface hover:bg-surface-variant"
          >
            <span className="material-symbols-outlined" aria-hidden>
              menu
            </span>
          </button>

          {isMenuOpen && (
            <>
              <button
                type="button"
                aria-label={t.storeHeader.menuClose}
                onClick={() => setIsMenuOpen(false)}
                className="fixed inset-0 z-40 cursor-default"
              />
              <div className="absolute right-0 top-12 z-50 w-56 rounded-lg border border-outline-variant bg-surface p-2 shadow-lg">
                <LanguageSwitcher onSelect={() => setIsMenuOpen(false)} />
                <div className="my-1 border-t border-outline-variant" />
                <Link
                  href="/admin/login"
                  onClick={() => setIsMenuOpen(false)}
                  className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-on-surface hover:bg-surface-variant"
                >
                  <span className="material-symbols-outlined text-lg" aria-hidden>
                    code
                  </span>
                  {t.storeHeader.adminLogin}
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
