import type { SearchResultItem } from "@/types/product";
import ProductCard from "@/components/ProductCard";

interface SearchResultsProps {
  results: SearchResultItem[];
  onViewLocation: (item: SearchResultItem) => void;
}

export default function SearchResults({ results, onViewLocation }: SearchResultsProps) {
  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-label="検索結果一覧">
      {results.map((item) => (
        <ProductCard key={item.product.id} item={item} onViewLocation={onViewLocation} />
      ))}
    </ul>
  );
}
