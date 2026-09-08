/**
 * 棚卸履歴一覧(/api/admin/inventory/history)のレスポンス1行分。
 * productNameはinventory_countsに保存されていないため、products.nameが解決できた場合のみ
 * 値を持つ(できない場合はnull。呼び出し側で「商品未登録」等と表示し、推測した名前を出さない)。
 */
export interface InventoryHistoryRow {
  id: string;
  countedAt: string;
  sku: string;
  janCode: string | null;
  unit: string | null;
  actualStock: number;
  bookStock: number | null;
  productId: string | null;
  productName: string | null;
  categoryCode: string | null;
  categoryName: string | null;
  shelfCode: string | null;
}
