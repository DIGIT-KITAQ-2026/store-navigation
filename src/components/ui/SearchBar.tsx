"use client";

import type { FormEvent } from "react";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
}

export default function SearchBar({ value, onChange, onSubmit }: SearchBarProps) {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit();
  };

  return (
    <form
      onSubmit={handleSubmit}
      role="search"
      className="relative w-full"
      suppressHydrationWarning
    >
      <label htmlFor="product-search-input" className="sr-only">
        商品名や目的で検索
      </label>
      <span className="material-symbols-outlined pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant">
        search
      </span>
      <input
        id="product-search-input"
        name="q"
        type="text"
        inputMode="search"
        autoComplete="off"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="他に探したいものはありますか？"
        aria-label="商品名や目的で検索"
        className="h-14 w-full rounded-full border border-outline-variant bg-surface pl-12 pr-14 text-base text-on-surface shadow-sm placeholder:text-on-surface-variant/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 md:rounded-xl"
        suppressHydrationWarning
      />
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
