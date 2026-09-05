"use client";

import { useState, type FormEvent } from "react";
import ImageSearchButton from "@/components/ui/ImageSearchButton";
import AttachedImageChip from "@/components/ui/AttachedImageChip";
import VoiceSearchButton from "@/components/ui/VoiceSearchButton";
import { useTranslations } from "@/lib/i18n/useTranslations";

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
  onVoiceResult: (text: string) => void;
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
  onVoiceResult,
}: SearchBarProps) {
  const t = useTranslations();
  const [voiceError, setVoiceError] = useState<string | null>(null);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit();
  };

  const handleVoiceResult = (text: string) => {
    setVoiceError(null);
    onVoiceResult(text);
  };

  const showAttachedChip = attachedFile !== null;

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit} role="search" className="relative w-full" suppressHydrationWarning>
        <label htmlFor="product-search-input" className="sr-only">
          {t.search.searchAgainPlaceholder}
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
          placeholder={showAttachedChip ? "" : t.search.searchAgainPlaceholder}
          aria-label={t.search.searchAgainPlaceholder}
          className={`h-14 w-full rounded-full border border-outline-variant bg-surface pl-20 pr-24 text-base text-on-surface shadow-sm placeholder:text-on-surface-variant/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 md:rounded-xl ${showAttachedChip ? "text-transparent caret-transparent" : ""}`}
          suppressHydrationWarning
        />
        {showAttachedChip && attachedFile && (
          <div className="pointer-events-none absolute inset-y-0 left-12 right-24 flex items-center overflow-hidden">
            <AttachedImageChip file={attachedFile} onRemove={isImageSearching ? undefined : onRemoveAttachedImage} />
          </div>
        )}
        <div className="absolute right-14 top-1/2 -translate-y-1/2">
          <VoiceSearchButton
            onResult={handleVoiceResult}
            disabled={isImageSearching}
            onError={setVoiceError}
          />
        </div>
        <button
          type="submit"
          aria-label={t.search.submitAriaLabel}
          className="absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-primary text-on-primary transition-[transform,background-color] duration-150 ease-out hover:bg-primary/90 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-primary/40 motion-reduce:transition-none motion-reduce:active:scale-100"
        >
          <span className="material-symbols-outlined text-[20px]">send</span>
        </button>
      </form>

      {voiceError && (
        <p role="alert" className="mt-2 text-center text-xs text-red-600">
          {voiceError}
        </p>
      )}
    </div>
  );
}
