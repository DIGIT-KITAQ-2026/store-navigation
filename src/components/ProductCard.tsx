import type { SearchResultItem } from "@/types/product";

interface ProductCardProps {
  item: SearchResultItem;
  onViewLocation: (item: SearchResultItem) => void;
}

export default function ProductCard({ item, onViewLocation }: ProductCardProps) {
  const { product, matchReason } = item;

  return (
    <li className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-lg font-bold text-slate-900">{product.name}</p>
          <p className="text-sm text-slate-500">{product.category}</p>
        </div>
        <span className="shrink-0 rounded-full bg-blue-600 px-3 py-1 text-sm font-semibold text-white">
          棚 {product.shelfNumber}
        </span>
      </div>

      <p className="text-sm text-slate-600">{product.description}</p>

      <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">{matchReason}</p>

      <button
        type="button"
        onClick={() => onViewLocation(item)}
        aria-label={`${product.name}の場所を見る`}
        className="mt-1 w-full rounded-xl bg-blue-600 py-3 text-base font-semibold text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:ring-offset-2"
      >
        場所を見る
      </button>
    </li>
  );
}
