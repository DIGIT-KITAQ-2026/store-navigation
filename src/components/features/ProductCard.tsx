import Link from "next/link";
import type { SearchResultItem } from "@/types/product";

interface ProductCardProps {
  item: SearchResultItem;
}

export default function ProductCard({ item }: ProductCardProps) {
  const { product, matchReason } = item;

  return (
    <Link
      href={`/navigate/${product.id}`}
      aria-label={`${product.name}の場所を見る`}
      className="group relative flex flex-col gap-2 rounded-xl border border-outline-variant bg-surface p-4 shadow-sm transition-all hover:border-primary hover:shadow-md md:p-6"
    >
      {product.category && (
        <span className="hidden w-fit items-center gap-1.5 rounded-md bg-primary-container/30 px-2.5 py-1 text-xs font-semibold text-primary md:inline-flex">
          <span className="material-symbols-outlined text-[16px]">local_mall</span>
          {product.category}
        </span>
      )}

      <p className="text-lg font-bold text-on-surface">{product.name}</p>
      <p className="text-sm text-on-surface-variant">{product.description}</p>

      <p className="rounded-lg bg-surface-variant px-3 py-2 text-sm text-on-surface">
        {matchReason}
      </p>

      <div className="mt-1 flex items-center gap-2 rounded-lg bg-primary-container/30 p-3">
        <span className="material-symbols-outlined text-[18px] text-primary">location_on</span>
        <p className="text-sm font-semibold text-primary">棚 {product.shelfNumber}</p>
      </div>

      <span className="mt-1 flex w-full items-center justify-center gap-1.5 rounded-full bg-primary py-3 text-sm font-semibold text-on-primary transition-colors group-hover:bg-primary/90 md:rounded-lg">
        <span className="material-symbols-outlined text-[18px]">map</span>
        場所を見る
      </span>
    </Link>
  );
}
