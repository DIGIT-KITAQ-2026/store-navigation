"use client";

import { useEffect, useState } from "react";
import { sanitizeForSpreadsheetDisplay } from "@/lib/inventory/csvInjection";
import {
  resolveStockStatusKind,
  STOCK_STATUS_SYMBOLS,
  STOCK_STATUS_LABELS_JA,
  computeStockDiff,
  formatStockDiffWithUnit,
  formatCountedAtUtc,
} from "@/lib/inventory/stockStatus";
import type { InventoryHistoryRow } from "@/lib/inventory/inventoryHistory";

const SHELF_CODES = [
  "Shelf_01",
  "Shelf_02",
  "Shelf_03",
  "Shelf_04",
  "Shelf_05",
  "Shelf_06",
  "Shelf_07",
  "Shelf_08",
] as const;

const PAGE_SIZE = 50;

type LoadState = "idle" | "loading" | "loadingMore" | "error";
type StockFilter = "all" | "available" | "outOfStock";

interface InventoryHistoryListProps {
  /** 値が変わるたびに一覧を先頭から再取得する(CSV確定取込成功直後のトリガー用)。 */
  refreshToken?: number;
}

const STOCK_BADGE_CLASSES: Record<ReturnType<typeof resolveStockStatusKind>, string> = {
  available: "bg-green-50 text-green-700",
  outOfStock: "bg-slate-100 text-slate-700",
  unknown: "bg-slate-100 text-slate-500",
};

function StockStatusChip({ actualStock }: { actualStock: number }) {
  const kind = resolveStockStatusKind(actualStock);
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${STOCK_BADGE_CLASSES[kind]}`}
    >
      <span aria-hidden>{STOCK_STATUS_SYMBOLS[kind]}</span>
      {STOCK_STATUS_LABELS_JA[kind]}
    </span>
  );
}

function locationLabel(row: InventoryHistoryRow): string {
  const category = row.categoryName;
  const shelf = row.shelfCode;
  if (category && shelf) return `${category} / ${shelf}`;
  if (category) return category;
  if (shelf) return shelf;
  return "-";
}

/** unitはCSVの自由入力値のため、表示前にCSV数式インジェクション対策を適用する。 */
function safeUnit(unit: string | null): string {
  return unit ? sanitizeForSpreadsheetDisplay(unit) : "";
}

function matchesQuery(row: InventoryHistoryRow, query: string): boolean {
  if (!query) return true;
  const haystack = [row.productName ?? "", row.sku, row.janCode ?? ""].join(" ").toLowerCase();
  return haystack.includes(query.toLowerCase());
}

export default function InventoryHistoryList({ refreshToken = 0 }: InventoryHistoryListProps) {
  const [rows, setRows] = useState<InventoryHistoryRow[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  const [shelfFilter, setShelfFilter] = useState<string>("");
  const [stockFilter, setStockFilter] = useState<StockFilter>("all");
  const [query, setQuery] = useState("");
  const [diffOnly, setDiffOnly] = useState(false);

  async function fetchPage(offset: number, append: boolean) {
    setLoadState(append ? "loadingMore" : "loading");
    setErrorMessage(null);

    try {
      const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(offset) });
      if (shelfFilter) params.set("shelf", shelfFilter);
      if (stockFilter !== "all") params.set("stock", stockFilter);

      const response = await fetch(`/api/admin/inventory/history?${params.toString()}`);
      const body: { rows?: InventoryHistoryRow[]; hasMore?: boolean; error?: string } = await response.json();

      if (!response.ok || !body.rows) {
        setLoadState("error");
        setErrorMessage("棚卸結果を取得できませんでした。");
        return;
      }

      const fetchedRows = body.rows;
      setRows((prev) => (append ? [...prev, ...fetchedRows] : fetchedRows));
      setHasMore(body.hasMore ?? false);
      setLoadState("idle");
    } catch {
      setLoadState("error");
      setErrorMessage("棚卸結果を取得できませんでした。");
    }
  }

  useEffect(() => {
    // shelfFilter/stockFilter/refreshTokenが変わるたびに先頭から取り直す
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchPage(0, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shelfFilter, stockFilter, refreshToken]);

  const filteredRows = rows.filter((row) => {
    if (!matchesQuery(row, query)) return false;
    if (diffOnly) {
      const diff = computeStockDiff({ actualStock: row.actualStock, bookStock: row.bookStock });
      if (diff === null || diff === 0) return false;
    }
    return true;
  });

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-outline-variant bg-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-on-surface">最近の棚卸結果</p>
      </div>

      <div className="flex flex-col gap-2 md:flex-row md:flex-wrap md:items-center">
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="商品名・SKU・JANコードで絞り込み(表示中の一覧内)"
          className="h-11 min-w-0 flex-1 rounded-full border border-outline-variant bg-surface px-4 text-sm text-on-surface outline-none focus:border-primary md:min-w-[220px]"
        />
        <select
          value={shelfFilter}
          onChange={(event) => setShelfFilter(event.target.value)}
          className="h-11 rounded-full border border-outline-variant bg-surface px-4 text-sm text-on-surface outline-none focus:border-primary"
        >
          <option value="">すべての棚</option>
          {SHELF_CODES.map((code) => (
            <option key={code} value={code}>
              {code}
            </option>
          ))}
        </select>
        <select
          value={stockFilter}
          onChange={(event) => setStockFilter(event.target.value as StockFilter)}
          className="h-11 rounded-full border border-outline-variant bg-surface px-4 text-sm text-on-surface outline-none focus:border-primary"
        >
          <option value="all">在庫状態: すべて</option>
          <option value="available">在庫あり ○</option>
          <option value="outOfStock">在庫なし ×</option>
        </select>
        <label className="flex h-11 items-center gap-2 rounded-full border border-outline-variant bg-surface px-4 text-sm text-on-surface">
          <input
            type="checkbox"
            checked={diffOnly}
            onChange={(event) => setDiffOnly(event.target.checked)}
            className="h-4 w-4"
          />
          差異ありのみ
        </label>
      </div>

      {loadState === "loading" && rows.length === 0 && (
        <p className="text-sm text-on-surface-variant">棚卸結果を読み込んでいます…</p>
      )}

      {loadState === "error" && (
        <div className="flex flex-col items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          <p>{errorMessage ?? "棚卸結果を取得できませんでした。"}</p>
          <button
            type="button"
            onClick={() => void fetchPage(0, false)}
            className="flex h-11 items-center rounded-full bg-red-100 px-4 text-sm font-semibold text-red-700"
          >
            再試行
          </button>
        </div>
      )}

      {loadState !== "loading" && loadState !== "error" && rows.length === 0 && (
        <div
          role="status"
          className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-outline-variant px-6 py-10 text-center"
        >
          <span className="material-symbols-outlined text-3xl text-on-surface-variant" aria-hidden>
            fact_check
          </span>
          <p className="text-sm font-medium text-on-surface-variant">
            棚卸結果はまだありません。
            <br />
            棚卸CSVを取り込むと、結果がここに表示されます。
          </p>
        </div>
      )}

      {rows.length > 0 && filteredRows.length === 0 && loadState !== "error" && (
        <p className="rounded-lg bg-surface-variant px-3 py-2 text-sm text-on-surface-variant">
          絞り込み条件に一致する棚卸結果がありません。
        </p>
      )}

      {filteredRows.length > 0 && (
        <>
          {/* モバイル: カード一覧 */}
          <ul className="flex flex-col gap-2 md:hidden">
            {filteredRows.map((row) => {
              const diff = computeStockDiff({ actualStock: row.actualStock, bookStock: row.bookStock });
              return (
                <li key={row.id} className="rounded-xl border border-outline-variant bg-surface p-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="break-words text-sm font-semibold text-on-surface">
                      {row.productName ? sanitizeForSpreadsheetDisplay(row.productName) : "(商品未登録)"}
                    </p>
                    <StockStatusChip actualStock={row.actualStock} />
                  </div>
                  <p className="mt-1 text-xs text-on-surface-variant">{locationLabel(row)}</p>
                  <p className="mt-1 text-sm text-on-surface">
                    実在庫: {row.actualStock}
                    {safeUnit(row.unit)} ・ 帳簿在庫:{" "}
                    {row.bookStock !== null ? `${row.bookStock}${safeUnit(row.unit)}` : "-"}
                    ・ 差異: {formatStockDiffWithUnit(diff, safeUnit(row.unit))}
                  </p>
                  <details className="mt-1.5">
                    <summary className="min-h-[44px] cursor-pointer py-1 text-xs text-on-surface-variant">
                      詳細(SKU・JAN・棚卸日時)
                    </summary>
                    <p className="mt-1 text-xs text-on-surface-variant">
                      SKU: {sanitizeForSpreadsheetDisplay(row.sku)} ・ JAN:{" "}
                      {row.janCode ? sanitizeForSpreadsheetDisplay(row.janCode) : "-"}
                    </p>
                    <p className="text-xs text-on-surface-variant">棚卸日時: {formatCountedAtUtc(row.countedAt)}</p>
                    {row.productId === null && (
                      <p className="mt-1 text-xs font-medium text-amber-700">警告: 商品未登録のまま保存された行</p>
                    )}
                  </details>
                </li>
              );
            })}
          </ul>

          {/* デスクトップ: テーブル */}
          <div className="hidden overflow-x-auto rounded-xl border border-outline-variant md:block">
            <table className="w-full min-w-[1080px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-outline-variant bg-surface-variant text-on-surface-variant">
                  <th className="px-3 py-2 font-semibold">棚卸日時</th>
                  <th className="px-3 py-2 font-semibold">商品名</th>
                  <th className="px-3 py-2 font-semibold">SKU</th>
                  <th className="px-3 py-2 font-semibold">JAN</th>
                  <th className="px-3 py-2 font-semibold">カテゴリ / 棚</th>
                  <th className="px-3 py-2 font-semibold">実在庫</th>
                  <th className="px-3 py-2 font-semibold">帳簿在庫</th>
                  <th className="px-3 py-2 font-semibold">差異</th>
                  <th className="px-3 py-2 font-semibold">在庫状態</th>
                  <th className="px-3 py-2 font-semibold">取込時の状態</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {filteredRows.map((row) => {
                  const diff = computeStockDiff({ actualStock: row.actualStock, bookStock: row.bookStock });
                  return (
                    <tr key={row.id} className="align-top hover:bg-surface-variant/60">
                      <td className="px-3 py-2 text-on-surface-variant">{formatCountedAtUtc(row.countedAt)}</td>
                      <td className="px-3 py-2 text-on-surface">
                        {row.productName ? sanitizeForSpreadsheetDisplay(row.productName) : "(商品未登録)"}
                      </td>
                      <td className="px-3 py-2 text-on-surface-variant">{sanitizeForSpreadsheetDisplay(row.sku)}</td>
                      <td className="px-3 py-2 text-on-surface-variant">
                        {row.janCode ? sanitizeForSpreadsheetDisplay(row.janCode) : "-"}
                      </td>
                      <td className="px-3 py-2 text-on-surface-variant">{locationLabel(row)}</td>
                      <td className="px-3 py-2 text-on-surface-variant">
                        {row.actualStock}
                        {safeUnit(row.unit)}
                      </td>
                      <td className="px-3 py-2 text-on-surface-variant">
                        {row.bookStock !== null ? `${row.bookStock}${safeUnit(row.unit)}` : "-"}
                      </td>
                      <td className="px-3 py-2 text-on-surface-variant">
                        {formatStockDiffWithUnit(diff, safeUnit(row.unit))}
                      </td>
                      <td className="px-3 py-2">
                        <StockStatusChip actualStock={row.actualStock} />
                      </td>
                      <td className="px-3 py-2 text-on-surface-variant">
                        {row.productId === null ? "警告: 商品未登録" : "OK"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {hasMore && (
        <button
          type="button"
          onClick={() => void fetchPage(rows.length, true)}
          disabled={loadState === "loadingMore"}
          className="h-11 self-center rounded-full bg-surface-variant px-6 text-sm font-semibold text-on-surface-variant disabled:opacity-60"
        >
          {loadState === "loadingMore" ? "読み込み中…" : "さらに表示"}
        </button>
      )}
    </div>
  );
}
