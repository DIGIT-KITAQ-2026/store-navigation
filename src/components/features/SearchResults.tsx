import type { SearchResultItem } from "@/types/product";
import ProductCard from "@/components/features/ProductCard";

interface SearchResultsProps {
  results: SearchResultItem[];
}

export default function SearchResults({ results }: SearchResultsProps) {
  return (
    <ul
      className="flex flex-col gap-4 md:grid md:grid-cols-2 md:gap-6 lg:grid-cols-3"
      aria-label="検索結果一覧"
    >
      {results.map((item) => (
        <li key={item.product.id}>
          <ProductCard item={item} />
        </li>
      ))}
    </ul>
  );
}
