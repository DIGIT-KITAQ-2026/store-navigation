import type { SearchResultItem } from "@/types/product";
import ProductCard from "@/components/features/ProductCard";

interface SearchResultsProps {
  results: SearchResultItem[];
}

export default function SearchResults({ results }: SearchResultsProps) {
  return (
    <ul
      className="flex flex-col gap-5 md:grid md:grid-cols-2 md:gap-8 lg:grid-cols-3"
      aria-label="検索結果一覧"
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
