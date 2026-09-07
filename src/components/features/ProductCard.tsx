"use client";

import Link from "next/link";
import type { SearchResultItem } from "@/types/product";
import { useTranslations, format } from "@/lib/i18n/useTranslations";
import StockBadge from "@/components/ui/StockBadge";

interface ProductCardProps {
  item: SearchResultItem;
}

export default function ProductCard({ item }: ProductCardProps) {
  const { product, matchReason } = item;
  const t = useTranslations();
  const { stock } = product;
  // 在庫なし・在庫情報なしでも商品案内は妨げない。ボタン文言だけ状態に応じて出し分ける
  // (棚へ案内する/売場で確認してもらう、のどちらの導線も同じ/navigate/[id]へ遷移する)。
  const actionLabel = stock.kind === "available" ? t.guide.actionNavigateToShelf : t.guide.actionCheckShelf;

  return (
    <Link
      href={`/navigate/${product.id}`}
      aria-label={format(t.productCard.placeAriaLabel, { name: product.name })}
      className="group relative flex flex-col gap-3 rounded-xl border border-outline-variant bg-surface p-5 shadow-sm transition-all hover:border-primary hover:shadow-md md:p-7"
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

      <div className="flex flex-wrap items-center gap-2">
        <StockBadge stock={stock} />
        {stock.kind !== "unknown" && (
          <span className="text-xs font-medium text-on-surface-variant">
            {format(t.stock.quantity, { count: stock.actualStock ?? 0, unit: stock.unit ?? "" })}
          </span>
        )}
      </div>

      <div className="mt-1 flex items-center gap-2 rounded-lg bg-primary-container/30 p-3">
        <span className="material-symbols-outlined text-[18px] text-primary">location_on</span>
        <p className="text-sm font-semibold text-primary">
          {format(t.productCard.shelf, { number: product.shelfNumber ?? "" })}
        </p>
      </div>

      <span className="mt-1 flex w-full items-center justify-center gap-1.5 rounded-full bg-primary py-3 text-sm font-semibold text-on-primary transition-colors group-hover:bg-primary/90 group-active:scale-[0.98] md:rounded-lg">
        <span className="material-symbols-outlined text-[18px]">map</span>
        {actionLabel}
      </span>
    </Link>
  );
}
