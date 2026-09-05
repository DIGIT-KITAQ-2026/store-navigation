"use client";

import type { SearchResultItem } from "@/types/product";
import ProductCard from "@/components/features/ProductCard";
import { useTranslations } from "@/lib/i18n/useTranslations";

interface SearchResultsProps {
  results: SearchResultItem[];
}

export default function SearchResults({ results }: SearchResultsProps) {
  const t = useTranslations();

  return (
    <ul
      className="flex flex-col gap-5 md:grid md:grid-cols-2 md:gap-8 lg:grid-cols-3"
      aria-label={t.search.resultsListAriaLabel}
    >
      {results.map((item, index) => (
        <li
          key={item.product.id}
          className="animate-fade-in-up"
          style={{ animationDelay: `${Math.min(index, 6) * 60}ms` }}
        >
          <ProductCard item={item} />
        </li>
      ))}
    </ul>
  );
}
