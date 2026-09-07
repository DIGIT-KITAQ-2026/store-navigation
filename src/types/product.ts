import type { StockInfo } from "@/lib/inventory/stockStatus";

export interface Product {
  id: string;
  name: string;
  category: string;
  /** 棚未登録の商品も存在するため、Supabaseにshelf_idが無い場合はnull */
  shelfId: string | null;
  shelfNumber: string | null;
  description: string;
  /** 最新棚卸しから解決した在庫状態(src/lib/inventory/latestStock.ts参照) */
  stock: StockInfo;
}

export interface SearchResultItem {
  product: Product;
  matchReason: string;
}
