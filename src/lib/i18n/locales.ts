export const LOCALES = ["ja", "en", "zh", "ko"] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "ja";

export const LOCALE_LABELS: Record<Locale, string> = {
  ja: "日本語",
  en: "English",
  zh: "中文(简体)",
  ko: "한국어",
};

export const LOCALE_COOKIE_NAME = "locale";

/** AI検索プロンプトで「この言語で答えて」と指示するための英語表記。 */
export const LOCALE_LANGUAGE_NAMES: Record<Locale, string> = {
  ja: "Japanese",
  en: "English",
  zh: "Simplified Chinese",
  ko: "Korean",
};

export function isLocale(value: string | undefined | null): value is Locale {
  return !!value && (LOCALES as readonly string[]).includes(value);
}
