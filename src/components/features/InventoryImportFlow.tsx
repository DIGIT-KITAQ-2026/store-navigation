"use client";

import { useState, type ChangeEvent } from "react";
import { REQUIRED_CSV_COLUMNS, OPTIONAL_CSV_COLUMNS } from "@/lib/inventory/csvSchema";
import { sanitizeForSpreadsheetDisplay } from "@/lib/inventory/csvInjection";
import { resolveStockStatusKind, STOCK_STATUS_SYMBOLS, STOCK_STATUS_LABELS_JA } from "@/lib/inventory/stockStatus";
import type { InventoryCsvValidationResult, InventoryCsvRowResult } from "@/lib/inventory/validateInventoryCsv";

type PreviewState = "idle" | "loading" | "success" | "error";
type ImportState = "idle" | "loading" | "success" | "error";

interface PreviewApiResponse extends Partial<InventoryCsvValidationResult> {
  error?: string;
}

const STATUS_LABELS: Record<InventoryCsvRowResult["status"], string> = {
  ok: "OK",
  warning: "要確認",
  error: "エラー",
};

const STATUS_BADGE_CLASSES: Record<InventoryCsvRowResult["status"], string> = {
  ok: "bg-green-50 text-green-700",
  warning: "bg-amber-50 text-amber-700",
  error: "bg-red-50 text-red-700",
};

const STOCK_BADGE_CLASSES: Record<ReturnType<typeof resolveStockStatusKind>, string> = {
  available: "bg-green-50 text-green-700",
  outOfStock: "bg-slate-100 text-slate-700",
  unknown: "bg-slate-100 text-slate-500",
};

/** actual_stock自体の在庫状態(この行が示す実地在庫の状態。行のok/warning/errorとは別軸)。 */
function StockStatusChip({ actualStock }: { actualStock: number | null }) {
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

/** actual_stock - book_stock。どちらかが未確定(null)の場合はnull(表示は"-")。 */
function computeStockDiff(row: InventoryCsvRowResult): number | null {
  if (row.parsed.actualStock === null || row.parsed.bookStock === null) return null;
  return row.parsed.actualStock - row.parsed.bookStock;
}

function formatDiff(diff: number | null): string {
  if (diff === null) return "-";
  return diff > 0 ? `+${diff}` : `${diff}`;
}

/**
 * 棚卸しCSVの取込フロー(選択→プレビュー→確定)。
 * プレビュー・確定のどちらも同じCSVテキストをサーバーへ送り、サーバー側で毎回再検証する
 * (このコンポーネントでの表示用チェックはあくまで補助で、正式な判定はAPI側の結果を使う)。
 */
export default function InventoryImportFlow() {
  const [fileName, setFileName] = useState<string | null>(null);
  // ファイルはバイト列のまま保持し、文字コード判定・デコードはサーバー側(decodeCsvBytes)で
  // 一元的に行う(プレビュー・確定のどちらも同じ元バイト列を送るため、二重デコードによる
  // 結果のズレが起きない)。
  const [csvFile, setCsvFile] = useState<File | null>(null);

  const [previewState, setPreviewState] = useState<PreviewState>("idle");
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewResult, setPreviewResult] = useState<InventoryCsvValidationResult | null>(null);

  const [importState, setImportState] = useState<ImportState>("idle");
  const [importError, setImportError] = useState<string | null>(null);
  const [importedCount, setImportedCount] = useState<number | null>(null);

  async function runPreview(file: File) {
    setPreviewState("loading");
    setPreviewError(null);
    setPreviewResult(null);
    setImportState("idle");
    setImportError(null);
    setImportedCount(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/admin/inventory/preview", {
        method: "POST",
        body: formData,
      });
      const body: PreviewApiResponse = await response.json();

      if (!response.ok || body.fileError || !body.summary || !body.rows) {
        setPreviewState("error");
        setPreviewError(body.fileError ?? body.error ?? "CSVの検証に失敗しました");
        return;
      }

      setPreviewResult({ summary: body.summary, rows: body.rows });
      setPreviewState("success");
    } catch {
      setPreviewState("error");
      setPreviewError("CSVの検証に失敗しました。通信状況を確認してください。");
    }
  }

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setFileName(file.name);
    setCsvFile(file);
    await runPreview(file);
  }

  async function handleConfirmImport() {
    if (!csvFile) return;
    setImportState("loading");
    setImportError(null);

    try {
      const formData = new FormData();
      formData.append("file", csvFile);
      const response = await fetch("/api/admin/inventory/import", {
        method: "POST",
        body: formData,
      });
      const body: { ok?: boolean; insertedCount?: number; error?: string } = await response.json();

      if (!response.ok || !body.ok) {
        setImportState("error");
        setImportError(body.error ?? "棚卸しデータの保存に失敗しました");
        return;
      }

      setImportedCount(body.insertedCount ?? 0);
      setImportState("success");
    } catch {
      setImportState("error");
      setImportError("棚卸しデータの保存に失敗しました。通信状況を確認してください。");
    }
  }

  const canConfirm =
    previewState === "success" &&
    !!previewResult &&
    previewResult.summary.totalRows > 0 &&
    previewResult.summary.errorRows === 0 &&
    importState !== "loading";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 rounded-xl border border-outline-variant bg-surface p-4">
        <p className="text-sm font-semibold text-on-surface">CSVの列仕様</p>
        <p className="text-xs text-on-surface-variant">
          1行目はヘッダー行(列名は英字固定・順不同)。必須列がすべて含まれている必要があります。
        </p>
        <div className="flex flex-wrap gap-1.5">
          {REQUIRED_CSV_COLUMNS.map((column) => (
            <span
              key={column}
              className="rounded-full bg-primary-container px-2.5 py-1 text-xs font-medium text-on-primary-container"
            >
              {column}
            </span>
          ))}
          {OPTIONAL_CSV_COLUMNS.map((column) => (
            <span
              key={column}
              className="rounded-full bg-surface-variant px-2.5 py-1 text-xs font-medium text-on-surface-variant"
            >
              {column}(任意)
            </span>
          ))}
        </div>
        <a
          href="/samples/inventory-count-sample.csv"
          download
          className="mt-1 inline-flex w-fit items-center gap-1.5 text-xs font-semibold text-primary"
        >
          <span className="material-symbols-outlined text-[16px]" aria-hidden>
            download
          </span>
          サンプルCSVをダウンロード
        </a>
      </div>

      <div className="flex flex-col gap-2 rounded-xl border border-outline-variant bg-surface p-4">
        <label htmlFor="inventory-csv" className="text-sm font-medium text-on-surface">
          棚卸しCSVファイル
        </label>
        <input
          id="inventory-csv"
          type="file"
          accept=".csv,text/csv"
          onChange={(event) => void handleFileChange(event)}
          className="text-sm text-on-surface file:mr-3 file:rounded-full file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-bold file:text-on-primary"
        />
        {fileName && <p className="text-xs text-on-surface-variant">選択中: {fileName}</p>}
      </div>

      {previewState === "loading" && (
        <p className="text-sm text-on-surface-variant">CSVを確認しています…</p>
      )}

      {previewState === "error" && previewError && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{previewError}</p>
      )}

      {previewState === "success" && previewResult && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-surface-variant px-3 py-1.5 text-xs font-semibold text-on-surface-variant">
              全{previewResult.summary.totalRows}行
            </span>
            <span className="rounded-full bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-700">
              OK {previewResult.summary.okRows}行
            </span>
            <span className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700">
              要確認 {previewResult.summary.warningRows}行
            </span>
            <span className="rounded-full bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700">
              エラー {previewResult.summary.errorRows}行
            </span>
          </div>

          {previewResult.summary.errorRows > 0 && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
              エラーのある行が含まれているため、このCSVは取り込めません。内容を修正して選び直してください。
            </p>
          )}

          {/* モバイル: カード一覧 */}
          <ul className="flex flex-col gap-2 md:hidden">
            {previewResult.rows.map((row) => (
              <li key={row.rowNumber} className="rounded-xl border border-outline-variant bg-surface p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-on-surface-variant">{row.rowNumber}行目</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_BADGE_CLASSES[row.status]}`}
                  >
                    {STATUS_LABELS[row.status]}
                  </span>
                </div>
                <p className="mt-1 break-words text-sm font-medium text-on-surface">
                  {sanitizeForSpreadsheetDisplay(row.raw.productName || "(商品名なし)")}
                </p>
                <p className="text-xs text-on-surface-variant">
                  sku: {sanitizeForSpreadsheetDisplay(row.raw.sku || "-")} ・ JAN:{" "}
                  {sanitizeForSpreadsheetDisplay(row.raw.janCode || "-")} ・ 棚: {row.raw.shelfCode || "-"} ・
                  カテゴリ: {row.raw.categoryCode || "-"}
                </p>
                <p className="mt-1 text-xs text-on-surface-variant">
                  実在庫: {row.raw.actualStock || "-"} ・ 帳簿在庫: {row.raw.bookStock || "-"} ・ 差異:{" "}
                  {formatDiff(computeStockDiff(row))} ・ 既存商品:{" "}
                  {row.resolved.productName
                    ? sanitizeForSpreadsheetDisplay(row.resolved.productName)
                    : "未登録"}
                </p>
                <div className="mt-1.5">
                  <StockStatusChip actualStock={row.parsed.actualStock} />
                </div>
                {row.messages.length > 0 && (
                  <ul className="mt-1.5 flex flex-col gap-0.5">
                    {row.messages.map((message, index) => (
                      <li key={index} className="text-xs text-on-surface-variant">
                        ・{message}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>

          {/* デスクトップ: テーブル */}
          <div className="hidden overflow-x-auto rounded-xl border border-outline-variant bg-surface md:block">
            <table className="w-full min-w-[1080px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-outline-variant bg-surface-variant text-on-surface-variant">
                  <th className="px-3 py-2 font-semibold">行</th>
                  <th className="px-3 py-2 font-semibold">状態</th>
                  <th className="px-3 py-2 font-semibold">sku</th>
                  <th className="px-3 py-2 font-semibold">JAN</th>
                  <th className="px-3 py-2 font-semibold">商品名</th>
                  <th className="px-3 py-2 font-semibold">棚</th>
                  <th className="px-3 py-2 font-semibold">カテゴリ</th>
                  <th className="px-3 py-2 font-semibold">実在庫</th>
                  <th className="px-3 py-2 font-semibold">帳簿在庫</th>
                  <th className="px-3 py-2 font-semibold">差異</th>
                  <th className="px-3 py-2 font-semibold">在庫状態</th>
                  <th className="px-3 py-2 font-semibold">既存商品</th>
                  <th className="px-3 py-2 font-semibold">理由</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {previewResult.rows.map((row) => (
                  <tr key={row.rowNumber} className="align-top hover:bg-surface-variant/60">
                    <td className="px-3 py-2 text-on-surface-variant">{row.rowNumber}</td>
                    <td className="px-3 py-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_BADGE_CLASSES[row.status]}`}
                      >
                        {STATUS_LABELS[row.status]}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-on-surface">
                      {sanitizeForSpreadsheetDisplay(row.raw.sku || "-")}
                    </td>
                    <td className="px-3 py-2 text-on-surface-variant">
                      {sanitizeForSpreadsheetDisplay(row.raw.janCode || "-")}
                    </td>
                    <td className="px-3 py-2 text-on-surface">
                      {sanitizeForSpreadsheetDisplay(row.raw.productName || "-")}
                    </td>
                    <td className="px-3 py-2 text-on-surface-variant">{row.raw.shelfCode || "-"}</td>
                    <td className="px-3 py-2 text-on-surface-variant">{row.raw.categoryCode || "-"}</td>
                    <td className="px-3 py-2 text-on-surface-variant">{row.raw.actualStock || "-"}</td>
                    <td className="px-3 py-2 text-on-surface-variant">{row.raw.bookStock || "-"}</td>
                    <td className="px-3 py-2 text-on-surface-variant">{formatDiff(computeStockDiff(row))}</td>
                    <td className="px-3 py-2">
                      <StockStatusChip actualStock={row.parsed.actualStock} />
                    </td>
                    <td className="px-3 py-2 text-on-surface-variant">
                      {row.resolved.productName
                        ? sanitizeForSpreadsheetDisplay(row.resolved.productName)
                        : "未登録"}
                    </td>
                    <td className="px-3 py-2 text-on-surface-variant">
                      {row.messages.length === 0 ? "-" : row.messages.join(" / ")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {importState !== "success" && (
            <button
              type="button"
              onClick={() => void handleConfirmImport()}
              disabled={!canConfirm}
              className="h-11 rounded-full bg-primary text-sm font-bold text-on-primary disabled:opacity-40"
            >
              {importState === "loading" ? "処理中…" : "確定して取り込む"}
            </button>
          )}

          {importState === "error" && importError && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{importError}</p>
          )}

          {importState === "success" && (
            <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
              {importedCount}件の棚卸しデータを保存しました。
            </p>
          )}
        </div>
      )}
    </div>
  );
}
