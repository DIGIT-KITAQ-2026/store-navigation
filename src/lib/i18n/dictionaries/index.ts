import ja from "./ja";
import en from "./en";
import zh from "./zh";
import ko from "./ko";
import type { Locale } from "../locales";

export const dictionaries: Record<Locale, typeof ja> = { ja, en, zh, ko };
