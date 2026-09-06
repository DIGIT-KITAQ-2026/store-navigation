/**
 * 棚卸しCSVの列仕様。列名は英字固定(docs/棚卸しCSV仕様.md参照)。
 * 列の並び順は問わない(ヘッダー行の列名で位置を特定する)。
 */
export const REQUIRED_CSV_COLUMNS = [
  "store_code",
  "shelf_code",
  "sku",
  "product_name",
  "category_code",
  "actual_stock",
  "counted_at",
] as const;

export const OPTIONAL_CSV_COLUMNS = ["jan_code", "book_stock", "unit", "cost_price", "selling_price"] as const;

export type RequiredCsvColumn = (typeof REQUIRED_CSV_COLUMNS)[number];
export type OptionalCsvColumn = (typeof OPTIONAL_CSV_COLUMNS)[number];
export type CsvColumn = RequiredCsvColumn | OptionalCsvColumn;

export const ALL_CSV_COLUMNS: readonly CsvColumn[] = [...REQUIRED_CSV_COLUMNS, ...OPTIONAL_CSV_COLUMNS];

/** ヘッダー行に不足している必須列を返す(無ければ空配列)。 */
export function findMissingRequiredColumns(header: readonly string[]): RequiredCsvColumn[] {
  const headerSet = new Set(header.map((column) => column.trim()));
  return REQUIRED_CSV_COLUMNS.filter((column) => !headerSet.has(column));
}
