"use client";

import { useLocale } from "./LocaleProvider";
import { dictionaries } from "./dictionaries";

/** 現在のロケールの辞書を返す。`t.hero.tagline`のようにネストしたキーで参照する。 */
export function useTranslations() {
  const { locale } = useLocale();
  return dictionaries[locale];
}

/** "{key}"形式のプレースホルダーをvarsの値で置き換える。 */
export function format(template: string, vars: Record<string, string | number>): string {
  return Object.entries(vars).reduce(
    (text, [key, value]) => text.replaceAll(`{${key}}`, String(value)),
    template
  );
}
