"use client";

import type { Product } from "@/types/product";
import { useTranslations, format } from "@/lib/i18n/useTranslations";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { translateUnit } from "@/lib/i18n/unitLabels";
import StockBadge from "@/components/ui/StockBadge";
import { formatCountedAtUtc } from "@/lib/inventory/stockStatus";

interface GuidePanelProps {
  product: Product;
  /** 案内先の売り場名(青果、加工食品など)。棚IDが未登録/未登録値の場合はnull */
  destinationLabel: string | null;
}

export default function GuidePanel({ product, destinationLabel }: GuidePanelProps) {
  const t = useTranslations();
  const { locale } = useLocale();
  const { stock } = product;

  return (
    <div className="w-full rounded-xl border border-outline-variant bg-surface p-5 shadow-xl">
      {product.category && (
        <p className="text-xs font-medium text-on-surface-variant">{product.category}</p>
      )}

      {/*
        商品名と棚IDバッジは横一列に並べない(狭い幅を取り合うと「カレールー(中辛)」のような
        商品名が1〜2文字ずつ縦に折り返されてしまうため)。商品名はカード横幅いっぱいで
        通常のワードラップ(word-break: normal相当)にまかせ、バッジは商品名の下に独立して置く
      */}
      <h2 className="mt-1 min-w-0 break-normal text-2xl font-bold leading-tight text-on-surface [overflow-wrap:normal]">
        {product.name}
      </h2>
      {destinationLabel !== null && (
        <span className="mt-2 inline-flex shrink-0 items-center gap-1.5 rounded-full bg-primary-container px-3 py-1 text-sm font-semibold text-on-primary-container">
          <span className="material-symbols-outlined text-[18px]">shelves</span>
          {format(t.guide.shelfId, { shelfId: product.shelfId ?? "" })}
        </span>
      )}

      <div className="mt-3 flex flex-col gap-1">
        <StockBadge stock={stock} />
        {stock.kind !== "unknown" && (
          <p className="text-sm text-on-surface-variant">
            {format(t.stock.quantity, {
              count: stock.actualStock ?? 0,
              unit: stock.unit ? translateUnit(stock.unit, locale) : "",
            })}
          </p>
        )}
        {stock.countedAt !== null && (
          <p className="text-xs text-on-surface-variant">
            {format(t.stock.lastCounted, { datetime: formatCountedAtUtc(stock.countedAt) })}
          </p>
        )}
      </div>

      {destinationLabel !== null ? (
        <div className="mt-4 flex items-start gap-3 rounded-lg bg-surface-variant/60 p-3">
          <span className="material-symbols-outlined mt-0.5 text-primary">directions_walk</span>
          <p className="text-sm leading-relaxed text-on-surface-variant">
            {format(t.guide.locationSentence, {
              name: product.name,
              category: destinationLabel,
              shelfNumber: product.shelfNumber ?? "",
            })}
          </p>
        </div>
      ) : (
        <div className="mt-4 flex items-start gap-3 rounded-lg bg-surface-variant/60 p-3">
          <span className="material-symbols-outlined mt-0.5 text-on-surface-variant">info</span>
          <p className="text-sm leading-relaxed text-on-surface-variant">{t.guide.pendingLocation}</p>
        </div>
      )}

      <p className="mt-3 text-sm text-on-surface-variant">{product.description}</p>
    </div>
  );
}
