"use client";

import { useRouter } from "next/navigation";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { LOCALES, LOCALE_LABELS } from "@/lib/i18n/locales";
import { useTranslations } from "@/lib/i18n/useTranslations";

/**
 * 表示言語の切り替え。切り替え後は`router.refresh()`でServer Component
 * (商品検索結果・商品案内など、サーバー側で翻訳済みデータを取得する画面)を
 * 選択後の言語のCookieを使って再取得させる。
 */
export default function LanguageSwitcher({ onSelect }: { onSelect?: () => void }) {
  const { locale, setLocale } = useLocale();
  const t = useTranslations();
  const router = useRouter();

  const handleSelect = (next: (typeof LOCALES)[number]) => {
    if (next !== locale) {
      setLocale(next);
      router.refresh();
    }
    onSelect?.();
  };

  return (
    <div className="flex flex-col gap-1 px-3 py-2">
      <p className="text-xs font-medium text-on-surface-variant">{t.storeHeader.language}</p>
      <div className="flex flex-wrap gap-1.5">
        {LOCALES.map((code) => (
          <button
            key={code}
            type="button"
            onClick={() => handleSelect(code)}
            aria-pressed={locale === code}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              locale === code
                ? "border-primary bg-primary-container text-on-primary-container"
                : "border-outline-variant text-on-surface-variant hover:bg-surface-variant"
            }`}
          >
            {LOCALE_LABELS[code]}
          </button>
        ))}
      </div>
    </div>
  );
}
