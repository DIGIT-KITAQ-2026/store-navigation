"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import LanguageSwitcher from "@/components/ui/LanguageSwitcher";
import { useTranslations } from "@/lib/i18n/useTranslations";

const FALLBACK_STORE_NAME = "Smart Store Navi";

interface StoreHeaderProps {
  storeName: string | null;
}

export default function StoreHeader({ storeName }: StoreHeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const t = useTranslations();

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
          <p className="min-w-0 truncate text-xl font-bold text-on-surface">
            {storeName ?? FALLBACK_STORE_NAME}
          </p>
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
