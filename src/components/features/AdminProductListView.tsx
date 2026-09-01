"use client";

import { useMemo, useState } from "react";
import type { AdminProductListItem } from "@/lib/supabase/server";

interface AdminProductListViewProps {
  products: AdminProductListItem[];
}

export function AdminProductListView({ products }: AdminProductListViewProps) {
  const [query, setQuery] = useState("");

  const filteredProducts = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return products;

    return products.filter((product) =>
      [product.name, product.barcode, product.category ?? ""].some((field) =>
        field.toLowerCase().includes(keyword)
      )
    );
  }, [products, query]);

  return (
    <div className="flex flex-col gap-4">
      <input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="商品名・カテゴリ・バーコードで検索"
        className="h-11 rounded-admin border border-border bg-surface px-4 text-[15px] text-text-primary outline-none focus:border-primary"
      />

      <div className="overflow-x-auto rounded-admin border border-border">
        <table className="w-full min-w-[640px] border-collapse text-left text-[13px]">
          <thead>
            <tr className="border-b border-border bg-surface-alt text-text-secondary">
              <th className="px-4 py-2 font-semibold">商品名</th>
              <th className="px-4 py-2 font-semibold">カテゴリ</th>
              <th className="px-4 py-2 font-semibold">商品説明</th>
              <th className="px-4 py-2 font-semibold">棚位置</th>
              <th className="px-4 py-2 font-semibold">バーコード</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filteredProducts.map((product) => (
              <tr key={product.id} className="bg-surface hover:bg-surface-alt">
                <td className="px-4 py-2 font-medium text-text-primary">
                  {product.name}
                </td>
                <td className="px-4 py-2 text-text-secondary">
                  {product.category ?? "-"}
                </td>
                <td className="max-w-xs truncate px-4 py-2 text-text-secondary">
                  {product.description ?? "-"}
                </td>
                <td className="px-4 py-2 text-text-secondary">
                  {product.locationCode ?? "未配置"}
                </td>
                <td className="px-4 py-2 text-text-secondary">
                  {product.barcode}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredProducts.length === 0 && (
          <p className="px-4 py-6 text-center text-sm text-text-secondary">
            該当する商品がありません。
          </p>
        )}
      </div>
    </div>
  );
}
