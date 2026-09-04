"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-on-surface-variant">
          登録済み商品 <span className="font-semibold text-on-surface">{products.length}</span> 件
        </p>
        <Link
          href="/admin/products/new"
          className="flex h-11 shrink-0 items-center gap-1.5 rounded-full bg-primary px-4 text-sm font-bold text-on-primary transition-colors hover:bg-primary/90"
        >
          <span className="material-symbols-outlined text-[18px]" aria-hidden>
            add_circle
          </span>
          新規登録
        </Link>
      </div>

      <div className="relative">
        <span className="material-symbols-outlined pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant">
          search
        </span>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="商品名・カテゴリ・バーコードで検索"
          className="h-11 w-full rounded-full border border-outline-variant bg-surface pl-11 pr-4 text-sm text-on-surface outline-none focus:border-primary"
        />
      </div>

      {filteredProducts.length === 0 ? (
        <div
          role="status"
          className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-outline-variant bg-surface px-6 py-10 text-center"
        >
          <span className="material-symbols-outlined text-3xl text-on-surface-variant" aria-hidden>
            inventory_2
          </span>
          <p className="text-sm font-medium text-on-surface-variant">
            {products.length === 0
              ? "登録済みの商品がありません。「新規登録」から商品を登録してください。"
              : "該当する商品がありません。検索条件を変えてお試しください。"}
          </p>
        </div>
      ) : (
        <>
          {/* モバイル: カード一覧(固定幅テーブルの横はみ出しを避ける) */}
          <ul className="flex flex-col gap-3 md:hidden">
            {filteredProducts.map((product) => (
              <li
                key={product.id}
                className="rounded-xl border border-outline-variant bg-surface p-4 shadow-sm"
              >
                <p className="break-words text-base font-semibold text-on-surface">{product.name}</p>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary-container px-2.5 py-1 text-xs font-semibold text-on-primary-container">
                    <span className="material-symbols-outlined text-[14px]" aria-hidden>
                      shelves
                    </span>
                    {product.locationCode ?? "未配置"}
                  </span>
                  {product.category && (
                    <span className="inline-flex items-center rounded-full bg-surface-variant px-2.5 py-1 text-xs font-medium text-on-surface-variant">
                      {product.category}
                    </span>
                  )}
                </div>
                {product.description && (
                  <p className="mt-2 line-clamp-2 text-sm text-on-surface-variant">{product.description}</p>
                )}
                <p className="mt-2 text-xs text-on-surface-variant">バーコード: {product.barcode}</p>
              </li>
            ))}
          </ul>

          {/* デスクトップ: テーブル */}
          <div className="hidden overflow-x-auto rounded-xl border border-outline-variant bg-surface shadow-sm md:block">
            <table className="w-full min-w-[640px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-outline-variant bg-surface-variant text-on-surface-variant">
                  <th className="px-4 py-2.5 font-semibold">商品名</th>
                  <th className="px-4 py-2.5 font-semibold">カテゴリ</th>
                  <th className="px-4 py-2.5 font-semibold">商品説明</th>
                  <th className="px-4 py-2.5 font-semibold">棚位置</th>
                  <th className="px-4 py-2.5 font-semibold">バーコード</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {filteredProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-surface-variant/60">
                    <td className="px-4 py-2.5 font-medium text-on-surface">{product.name}</td>
                    <td className="px-4 py-2.5 text-on-surface-variant">{product.category ?? "-"}</td>
                    <td className="max-w-xs truncate px-4 py-2.5 text-on-surface-variant">
                      {product.description ?? "-"}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="inline-flex items-center gap-1 rounded-full bg-primary-container px-2.5 py-1 text-xs font-semibold text-on-primary-container">
                        <span className="material-symbols-outlined text-[14px]" aria-hidden>
                          shelves
                        </span>
                        {product.locationCode ?? "未配置"}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-on-surface-variant">{product.barcode}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
