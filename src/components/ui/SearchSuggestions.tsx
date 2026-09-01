import Link from "next/link";

interface SearchSuggestionsProps {
  suggestions: string[];
}

export default function SearchSuggestions({ suggestions }: SearchSuggestionsProps) {
  return (
    <div className="grid grid-cols-2 gap-2 md:flex md:flex-wrap md:justify-center">
      {suggestions.map((suggestion) => (
        <Link
          key={suggestion}
          href={`/search?q=${encodeURIComponent(suggestion)}`}
          aria-label={`「${suggestion}」で検索する`}
          className="group flex min-h-[44px] w-full items-center justify-center rounded-full border border-outline-variant bg-surface px-4 py-2 text-center transition-colors hover:border-primary focus-visible:border-primary max-md:hover:bg-primary-container/30 max-md:focus-visible:bg-primary-container/30 md:min-h-0 md:w-auto md:px-6"
        >
          <span className="line-clamp-2 text-sm font-medium text-on-surface transition-colors group-hover:text-primary group-focus-visible:text-primary md:line-clamp-none md:whitespace-nowrap">
            {suggestion}
          </span>
        </Link>
      ))}
    </div>
  );
}
