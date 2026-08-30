export interface Product {
  id: string;
  name: string;
  category: string;
  shelfId: string;
  shelfNumber: string;
  keywords: string[];
  description: string;
}

export interface SearchResultItem {
  product: Product;
  matchReason: string;
}
