"use client";

import type { FormEvent } from "react";
import ImageSearchButton from "@/components/ui/ImageSearchButton";
import AttachedImageChip from "@/components/ui/AttachedImageChip";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  /** 画像添付メニューを開く向き。下に余白が無い(画面下端固定など)場合は"up"を指定する */
  imageMenuPosition?: "up" | "down";
  attachedFile: File | null;
  onSelectImage: (file: File) => void;
  onRemoveAttachedImage: () => void;
  isImageSearching: boolean;
}

export default function SearchBar({
  value,
  onChange,
  onSubmit,
  imageMenuPosition = "down",
  attachedFile,
  onSelectImage,
  onRemoveAttachedImage,
  isImageSearching,
}: SearchBarProps) {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit();
  };

  const showAttachedChip = attachedFile !== null;

  return (
    <form onSubmit={handleSubmit} role="search" className="relative w-full" suppressHydrationWarning>
      <label htmlFor="product-search-input" className="sr-only">
        商品名や目的で検索
      </label>
      <ImageSearchButton onSelectFile={onSelectImage} isSearching={isImageSearching} menuPosition={imageMenuPosition} />
      {!showAttachedChip && (
        <span className="material-symbols-outlined pointer-events-none absolute left-12 top-1/2 -translate-y-1/2 text-on-surface-variant">
          search
        </span>
      )}
      <input
        id="product-search-input"
        name="q"
        type="text"
        inputMode="search"
        autoComplete="off"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        readOnly={isImageSearching}
        placeholder={showAttachedChip ? "" : "他に探したいものはありますか？"}
        aria-label="商品名や目的で検索"
        className={`h-14 w-full rounded-full border border-outline-variant bg-surface pl-20 pr-14 text-base text-on-surface shadow-sm placeholder:text-on-surface-variant/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 md:rounded-xl ${showAttachedChip ? "text-transparent caret-transparent" : ""}`}
        suppressHydrationWarning
      />
      {showAttachedChip && attachedFile && (
        <div className="pointer-events-none absolute inset-y-0 left-12 right-14 flex items-center overflow-hidden">
          <AttachedImageChip file={attachedFile} onRemove={isImageSearching ? undefined : onRemoveAttachedImage} />
        </div>
      )}
      <button
        type="submit"
        aria-label="検索する"
        className="absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-primary text-on-primary transition-[transform,background-color] duration-150 ease-out hover:bg-primary/90 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-primary/40 motion-reduce:transition-none motion-reduce:active:scale-100"
      >
        <span className="material-symbols-outlined text-[20px]">send</span>
      </button>
    </form>
  );
}
