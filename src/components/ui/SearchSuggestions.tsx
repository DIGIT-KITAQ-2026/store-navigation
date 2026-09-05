"use client";

import Link from "next/link";
import { useTranslations, format } from "@/lib/i18n/useTranslations";

interface SearchSuggestionsProps {
  suggestions: string[];
}

export default function SearchSuggestions({ suggestions }: SearchSuggestionsProps) {
  const t = useTranslations();

  return (
    <div className="hide-scrollbar -mx-4 flex w-[calc(100%+2rem)] gap-2 overflow-x-auto px-4 md:mx-0 md:w-full md:flex-wrap md:justify-center md:overflow-visible md:px-0">
      {suggestions.map((suggestion) => (
        <Link
          key={suggestion}
          href={`/search?q=${encodeURIComponent(suggestion)}`}
          aria-label={format(t.search.suggestionAriaLabel, { suggestion })}
          className="group flex min-h-[44px] shrink-0 items-center justify-center rounded-full border border-outline-variant bg-surface px-4 py-2 text-center transition-colors hover:border-primary focus-visible:border-primary active:scale-[0.97] max-md:hover:bg-primary-container/30 max-md:focus-visible:bg-primary-container/30 md:min-h-0 md:px-6"
        >
          <span className="whitespace-nowrap text-sm font-medium text-on-surface transition-colors group-hover:text-primary group-focus-visible:text-primary">
            {suggestion}
          </span>
        </Link>
      ))}
    </div>
  );
}
