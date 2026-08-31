import Link from "next/link";

interface SearchSuggestionsProps {
  suggestions: string[];
}

export default function SearchSuggestions({ suggestions }: SearchSuggestionsProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 hide-scrollbar md:flex-wrap md:justify-center md:overflow-visible">
      {suggestions.map((suggestion) => (
        <Link
          key={suggestion}
          href={`/search?q=${encodeURIComponent(suggestion)}`}
          aria-label={`「${suggestion}」で検索する`}
          className="whitespace-nowrap rounded-full border border-outline-variant bg-surface px-4 py-2 text-sm font-medium text-on-surface transition-colors hover:border-primary hover:text-primary md:px-6"
        >
          {suggestion}
        </Link>
      ))}
    </div>
  );
}
