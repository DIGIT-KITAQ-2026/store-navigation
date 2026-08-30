"use client";

interface SearchSuggestionsProps {
  suggestions: string[];
  onSelect: (value: string) => void;
}

export default function SearchSuggestions({ suggestions, onSelect }: SearchSuggestionsProps) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium text-slate-500">検索例</p>
      <div className="flex flex-wrap gap-2" role="group" aria-label="検索例から選ぶ">
        {suggestions.map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            onClick={() => onSelect(suggestion)}
            aria-label={`「${suggestion}」で検索する`}
            className="rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 transition-colors hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-300"
          >
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  );
}
