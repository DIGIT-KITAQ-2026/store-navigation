"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import SearchSuggestions from "@/components/ui/SearchSuggestions";
import ImageSearchButton from "@/components/ui/ImageSearchButton";
import AttachedImageChip from "@/components/ui/AttachedImageChip";
import VoiceSearchButton from "@/components/ui/VoiceSearchButton";
import StoreHeroShell from "@/components/features/StoreHeroShell";
import { IMAGE_SEARCH_QUERY_LABEL, setPendingImageSearchFile } from "@/lib/pendingImageSearch";
import { useTranslations } from "@/lib/i18n/useTranslations";

type StoreEntranceHeroProps = {
  storeName: string;
};

/**
 * 3段階目(商品検索)の画面。背景・矢印ボタン・せり上がるカードはStoreHeroShellが持ち、
 * ここはカードの中身(検索欄・音声/画像検索・検索例)だけを組み立てる。
 */
export default function StoreEntranceHero({ storeName }: StoreEntranceHeroProps) {
  const router = useRouter();
  const t = useTranslations();
  const [query, setQuery] = useState("");
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [voiceError, setVoiceError] = useState<string | null>(null);

  const suggestions = useMemo(
    () => [t.hero.suggestion1, t.hero.suggestion2, t.hero.suggestion3, t.hero.suggestion4],
    [t]
  );

  const handleImageSelected = (file: File) => {
    setAttachedFile(file);
    setQuery("");
  };

  const handleRemoveAttachedFile = () => setAttachedFile(null);

  // 音声検索も、テキスト検索・画像検索と同じく先に検索結果画面へ遷移してから結果を表示する
  const handleVoiceResult = (text: string) => {
    setVoiceError(null);
    setAttachedFile(null);
    setQuery(text);
    router.push(`/search?q=${encodeURIComponent(text)}`);
  };

  // 画像検索は、テキスト検索(ネイティブGET送信で/search?q=...に遷移)と同じく、
  // まず検索結果画面へ遷移してから実際の検索を行う。Fileはメモリ上で結果画面へ受け渡す
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    if (attachedFile) {
      event.preventDefault();
      setPendingImageSearchFile(attachedFile);
      router.push(`/search?q=${encodeURIComponent(IMAGE_SEARCH_QUERY_LABEL)}`);
    }
    // 画像未添付の場合はネイティブのGET送信で/search?q=...に遷移させる
  };

  const showAttachedChip = attachedFile !== null;

  return (
    <StoreHeroShell imageAlt={storeName}>
      <form
        method="GET"
        action="/search"
        role="search"
        onSubmit={handleSubmit}
        className="relative mx-auto w-full max-w-2xl"
        suppressHydrationWarning
      >
        <label htmlFor="product-search-input" className="sr-only">
          {t.hero.searchPlaceholder}
        </label>

        <ImageSearchButton onSelectFile={handleImageSelected} isSearching={false} />

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
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={showAttachedChip ? "" : t.hero.searchPlaceholder}
          aria-label={t.hero.searchPlaceholder}
          className={`h-14 w-full rounded-full border border-outline-variant bg-surface pl-20 pr-24 text-base text-on-surface shadow-[0_10px_30px_rgba(0,0,0,0.12),0_2px_8px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.7)] placeholder:text-on-surface-variant/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 md:shadow-[0_14px_36px_rgba(0,0,0,0.14),0_2px_10px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.7)] ${showAttachedChip ? "text-transparent caret-transparent" : ""}`}
          suppressHydrationWarning
        />
        {showAttachedChip && attachedFile && (
          <div className="pointer-events-none absolute inset-y-0 left-12 right-24 flex items-center overflow-hidden">
            <AttachedImageChip file={attachedFile} onRemove={handleRemoveAttachedFile} />
          </div>
        )}
        <div className="absolute right-14 top-1/2 -translate-y-1/2">
          <VoiceSearchButton onResult={handleVoiceResult} onError={setVoiceError} />
        </div>
        <button
          type="submit"
          aria-label={t.hero.aiSearch}
          className="absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-primary text-on-primary shadow-[0_4px_16px_rgba(18,183,106,0.35)] transition-[transform,box-shadow,background-color] duration-200 ease-out hover:-translate-y-[calc(50%+2px)] hover:scale-110 hover:bg-primary/90 hover:shadow-[0_8px_24px_rgba(18,183,106,0.45)] active:scale-[0.98] active:shadow-[0_2px_8px_rgba(18,183,106,0.3)] focus:outline-none focus:ring-2 focus:ring-primary/40 motion-reduce:transition-none motion-reduce:hover:-translate-y-1/2 motion-reduce:hover:scale-100 motion-reduce:active:scale-100"
        >
          <span className="material-symbols-outlined text-[20px]">send</span>
        </button>
      </form>

      {showAttachedChip && (
        <p className="-mt-3 text-xs text-on-surface-variant">{t.hero.imageSearchHint}</p>
      )}

      {voiceError && (
        <p role="alert" className="-mt-3 text-xs text-red-600">
          {voiceError}
        </p>
      )}

      <h2 className="flex items-center justify-center gap-2 text-lg font-bold text-on-surface md:text-3xl">
        <span
          aria-hidden="true"
          className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-container md:hidden"
        >
          <span className="material-symbols-outlined text-[20px] text-primary">manage_search</span>
        </span>
        <span>{t.hero.headingLine1}</span>
        <span className="text-primary">{t.hero.headingLine2}</span>
      </h2>
      <p className="mt-1 text-xs text-on-surface-variant md:text-base">{t.hero.subDescription}</p>
      <div className="w-full pb-[max(2rem,env(safe-area-inset-bottom))]">
        <SearchSuggestions suggestions={suggestions} />
      </div>
    </StoreHeroShell>
  );
}
