/**
 * 在庫状態の判定は必ずこの関数を経由する(検索結果・商品案内画面・3D目的地カード・
 * CSVプレビューのすべてで共通の判定基準にするため)。actual_stockはCSV取込時点で
 * 0以上の整数であることが検証済み(src/lib/inventory/csvFieldParsers.ts)なので、
 * ここでは「値があるかどうか」と「0かどうか」だけを見る。
 */
export type StockStatusKind = "available" | "outOfStock" | "unknown";

/** 色だけに依存しないための記号。ラベル文言と併用すること(記号単独では意味を伝えない)。 */
export const STOCK_STATUS_SYMBOLS: Record<StockStatusKind, string> = {
  available: "○",
  outOfStock: "×",
  unknown: "－",
};

/** 3D目的地カードなど、i18n辞書を経由しない箇所向けの日本語固定ラベル。 */
export const STOCK_STATUS_LABELS_JA: Record<StockStatusKind, string> = {
  available: "在庫あり",
  outOfStock: "在庫なし",
  unknown: "在庫情報なし",
};

/**
 * actualStockから在庫状態を判定する。actualStockが null(=最新棚卸データなし)ならunknown、
 * 0ならoutOfStock、それ以外(0より大きい)ならavailable。負数・非数値はCSV取込段階で
 * エラーとして弾かれるため、ここには渡ってこない前提。
 */
export function resolveStockStatusKind(actualStock: number | null): StockStatusKind {
  if (actualStock === null) return "unknown";
  if (actualStock === 0) return "outOfStock";
  return "available";
}

export interface StockInfo {
  kind: StockStatusKind;
  /** 最新棚卸の実在庫数。unknownの場合はnull */
  actualStock: number | null;
  /** 単位(例: "本")。未設定・unknownの場合はnull */
  unit: string | null;
  /** 最新棚卸日時のISO文字列。unknownの場合はnull */
  countedAt: string | null;
}

export const UNKNOWN_STOCK_INFO: StockInfo = {
  kind: "unknown",
  actualStock: null,
  unit: null,
  countedAt: null,
};

/**
 * counted_at(UTCのISO文字列)を"YYYY-MM-DD HH:mm"表示用に整形する。ブラウザのローカル
 * タイムゾーンには変換しない(保存値のタイムゾーン解釈が仕様上確認できていないため、
 * 推測で変換せず保存値のUTC表記のまま表示する)。
 */
export function formatCountedAtUtc(iso: string): string {
  const date = new Date(iso);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())} ${pad(
    date.getUTCHours()
  )}:${pad(date.getUTCMinutes())}`;
}

export function buildStockInfo(
  row: { actualStock: number; unit: string | null; countedAt: string } | null
): StockInfo {
  if (!row) return UNKNOWN_STOCK_INFO;
  return {
    kind: resolveStockStatusKind(row.actualStock),
    actualStock: row.actualStock,
    unit: row.unit,
    countedAt: row.countedAt,
  };
}
