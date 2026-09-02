export interface Product {
  id: string;
  name: string;
  category: string;
  /** 棚未登録の商品も存在するため、Supabaseにshelf_idが無い場合はnull */
  shelfId: string | null;
  shelfNumber: string | null;
  description: string;
}

export interface SearchResultItem {
  product: Product;
  matchReason: string;
}
