"use client";

import { useTranslations } from "@/lib/i18n/useTranslations";
import { STOCK_STATUS_SYMBOLS, type StockInfo } from "@/lib/inventory/stockStatus";

interface StockBadgeProps {
  stock: StockInfo;
  className?: string;
}

const ICONS = { available: "check_circle", outOfStock: "cancel", unknown: "help" } as const;

/**
 * 在庫状態バッジ(検索結果カード・商品案内画面で共通利用)。
 * DESIGN.md「配色ブレに関する注意」により消費者画面は`primary`系トークンのみで配色を統一する
 * (在庫ありなら`primary-container`、在庫なし・在庫情報なしは`surface-variant`で共通にし、
 * 色ではなくアイコン・記号・ラベル文言の違いだけで状態を区別する)。
 */
export default function StockBadge({ stock, className = "" }: StockBadgeProps) {
  const t = useTranslations();
  const label = {
    available: t.stock.availableLabel,
    outOfStock: t.stock.outOfStockLabel,
    unknown: t.stock.unknownLabel,
  }[stock.kind];
  const tone =
    stock.kind === "available"
      ? "bg-primary-container text-on-primary-container"
      : "bg-surface-variant text-on-surface-variant";

  return (
    <span
      className={`inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${tone} ${className}`}
    >
      <span className="material-symbols-outlined text-[16px]" aria-hidden>
        {ICONS[stock.kind]}
      </span>
      <span aria-hidden>{STOCK_STATUS_SYMBOLS[stock.kind]}</span>
      {label}
    </span>
  );
}
