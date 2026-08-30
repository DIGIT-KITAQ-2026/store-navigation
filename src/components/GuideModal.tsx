"use client";

import type { SearchResultItem } from "@/types/product";

interface GuideModalProps {
  item: SearchResultItem;
  guideMessage: string | null;
  onStartGuide: () => void;
  onClose: () => void;
}

export default function GuideModal({ item, guideMessage, onStartGuide, onClose }: GuideModalProps) {
  const { product } = item;

  return (
    <div
      role="presentation"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-0 sm:items-center sm:p-4"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="guide-modal-title"
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-md rounded-t-3xl bg-white p-6 shadow-xl sm:rounded-3xl"
      >
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-slate-200 sm:hidden" aria-hidden="true" />

        <h2 id="guide-modal-title" className="text-xl font-bold text-slate-900">
          {product.name}
        </h2>
        <p className="mt-1 text-sm text-slate-500">{product.category}</p>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-blue-600 px-3 py-1 text-sm font-semibold text-white">
            棚 {product.shelfNumber}
          </span>
          <span className="text-sm text-slate-500">棚ID: {product.shelfId}</span>
        </div>

        <p className="mt-4 rounded-xl bg-blue-50 px-4 py-3 text-base text-slate-800">
          {product.name}は{product.category}コーナーの棚{product.shelfNumber}にあります
        </p>

        {guideMessage !== null && (
          <p
            role="status"
            className="mt-3 rounded-xl bg-green-50 px-4 py-3 text-base font-medium text-green-800"
          >
            {guideMessage}
          </p>
        )}

        <div className="mt-6 flex flex-col gap-3 sm:flex-row-reverse">
          <button
            type="button"
            onClick={onStartGuide}
            className="w-full rounded-xl bg-blue-600 py-3 text-base font-semibold text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:ring-offset-2"
          >
            3D案内を開始
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl border border-slate-300 py-3 text-base font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-200"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}
