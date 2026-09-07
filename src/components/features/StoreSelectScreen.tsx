"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import StoreHeroShell from "@/components/features/StoreHeroShell";
import { useTranslations } from "@/lib/i18n/useTranslations";

export interface StoreSelectItem {
  id: string;
  name: string;
  description?: string;
  /** 選んだときの遷移先 */
  href: string;
}

interface StoreSelectScreenProps {
  /** 見出し(「店舗を選ぶ」「◯◯の支店を選ぶ」) */
  heading: string;
  /** 見出しの下の説明文 */
  description: string;
  /** 検索欄のプレースホルダー */
  placeholder: string;
  /** 絞り込みで0件になったときの文言 */
  emptyMessage: string;
  /** 背景写真の代替テキスト */
  imageAlt: string;
  /** 矢印ボタンの文言 */
  ctaLabel: string;
  /** 矢印ボタンの読み上げ文言 */
  openLabel: string;
  /** 表示する場合の「戻る」リンク先 */
  backHref?: string;
  /** 名前・説明への部分一致で絞り込む関数(呼び出し側の定義を使う) */
  filter: (query: string) => StoreSelectItem[];
}

/**
 * 店舗検索・支店検索の共通画面。商品検索と同じヒーロー(背景写真+矢印ボタン+せり上がる
 * カード)を使い、カードの中で絞り込んで選ぶ。
 *
 * 商品検索と違って候補が少なく即座に絞り込めるため、送信ボタンは持たず入力に応じて
 * その場で一覧を絞る(音声・画像検索は商品を探すための機能なのでここでは出さない)。
 */
export default function StoreSelectScreen({
  heading,
  description,
  placeholder,
  emptyMessage,
  imageAlt,
  ctaLabel,
  openLabel,
  backHref,
  filter,
}: StoreSelectScreenProps) {
  const t = useTranslations();
  const [query, setQuery] = useState("");
  const results = useMemo(() => filter(query), [filter, query]);

  return (
    <StoreHeroShell imageAlt={imageAlt} ctaLabel={ctaLabel} openLabel={openLabel}>
      <div role="search" className="relative mx-auto w-full max-w-2xl">
        <label htmlFor="store-select-input" className="sr-only">
          {placeholder}
        </label>
        <span className="material-symbols-outlined pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-on-surface-variant">
          search
        </span>
        <input
          id="store-select-input"
          type="text"
          inputMode="search"
          autoComplete="off"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={placeholder}
          aria-label={placeholder}
          className="h-14 w-full rounded-full border border-outline-variant bg-surface pl-14 pr-5 text-base text-on-surface shadow-[0_10px_30px_rgba(0,0,0,0.12),0_2px_8px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.7)] placeholder:text-on-surface-variant/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 md:shadow-[0_14px_36px_rgba(0,0,0,0.14),0_2px_10px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.7)]"
          suppressHydrationWarning
        />
      </div>

      <h2 className="flex items-center justify-center gap-2 text-lg font-bold text-on-surface md:text-3xl">
        <span
          aria-hidden="true"
          className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-container md:hidden"
        >
          <span className="material-symbols-outlined text-[20px] text-primary">storefront</span>
        </span>
        <span>{heading}</span>
      </h2>
      <p className="-mt-4 text-xs text-on-surface-variant md:text-base">{description}</p>

      {results.length === 0 ? (
        <p role="status" className="py-6 text-sm text-on-surface-variant">
          {emptyMessage}
        </p>
      ) : (
        <ul className="flex w-full max-w-2xl flex-col gap-3 text-left">
          {results.map((item) => (
            <li key={item.id}>
              <Link
                href={item.href}
                className="flex items-center gap-4 rounded-2xl border border-outline-variant bg-surface px-5 py-4 shadow-[0_4px_16px_rgba(0,0,0,0.06)] transition-colors hover:bg-surface-variant focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-container">
                  <span className="material-symbols-outlined text-[22px] text-primary">storefront</span>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-base font-bold text-on-surface">{item.name}</span>
                  {item.description && (
                    <span className="block truncate text-sm text-on-surface-variant">
                      {item.description}
                    </span>
                  )}
                </span>
                <span className="material-symbols-outlined text-on-surface-variant">chevron_right</span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <div className="w-full pb-[max(2rem,env(safe-area-inset-bottom))]">
        {backHref && (
          <Link
            href={backHref}
            className="mx-auto flex w-fit items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            {t.common.back}
          </Link>
        )}
      </div>
    </StoreHeroShell>
  );
}
