"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import SearchSuggestions from "@/components/ui/SearchSuggestions";
import ImageSearchButton from "@/components/ui/ImageSearchButton";
import AttachedImageChip from "@/components/ui/AttachedImageChip";
import VoiceSearchButton from "@/components/ui/VoiceSearchButton";
import { IMAGE_SEARCH_QUERY_LABEL, setPendingImageSearchFile } from "@/lib/pendingImageSearch";

type StoreEntranceHeroProps = {
  storeName: string;
  suggestions: string[];
};

export default function StoreEntranceHero({ storeName, suggestions }: StoreEntranceHeroProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const rootRef = useRef<HTMLElement>(null);
  const cardInnerRef = useRef<HTMLDivElement>(null);
  const touchStartYRef = useRef<number | null>(null);
  const touchStartAtTopRef = useRef(false);

  const openCard = () => setIsOpen(true);
  const toggleCard = () => setIsOpen((value) => !value);

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

  // Escapeキーで検索カードを閉じる
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // 下方向ホイールで開く、カード内が先頭のときのみ上方向ホイールで閉じる
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const handleWheel = (event: WheelEvent) => {
      if (!isOpen) {
        if (event.deltaY > 12) {
          event.preventDefault();
          setIsOpen(true);
        }
        return;
      }

      const inner = cardInnerRef.current;
      const atTop = !inner || inner.scrollTop <= 0;
      if (event.deltaY < -12 && atTop) {
        event.preventDefault();
        setIsOpen(false);
      }
    };

    root.addEventListener("wheel", handleWheel, { passive: false });
    return () => root.removeEventListener("wheel", handleWheel);
  }, [isOpen]);

  // スマホの上スワイプで開く、カード内が先頭のときのみ下スワイプで閉じる
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const handleTouchStart = (event: TouchEvent) => {
      touchStartYRef.current = event.touches[0]?.clientY ?? null;
      const inner = cardInnerRef.current;
      touchStartAtTopRef.current = !inner || inner.scrollTop <= 0;
    };

    const handleTouchEnd = (event: TouchEvent) => {
      const startY = touchStartYRef.current;
      touchStartYRef.current = null;
      if (startY == null) return;

      const endY = event.changedTouches[0]?.clientY ?? startY;
      const deltaY = startY - endY;

      if (!isOpen && deltaY > 40) {
        setIsOpen(true);
        return;
      }
      if (isOpen && deltaY < -40 && touchStartAtTopRef.current) {
        setIsOpen(false);
      }
    };

    root.addEventListener("touchstart", handleTouchStart, { passive: true });
    root.addEventListener("touchend", handleTouchEnd, { passive: true });
    return () => {
      root.removeEventListener("touchstart", handleTouchStart);
      root.removeEventListener("touchend", handleTouchEnd);
    };
  }, [isOpen]);

  return (
    <section
      ref={rootRef}
      className={`store-hero relative isolate h-[calc(100dvh-4rem)] w-full overflow-hidden${isOpen ? " is-expanded" : ""}`}
    >
      {/* 背景レイヤー: 店舗写真+オーバーレイ。カード展開中もDOMから外さない */}
      <div className="store-hero-bg pointer-events-none absolute inset-0 z-0" aria-hidden="true">
        <Image
          src="/images/design-reference/store-hero-generated.png"
          alt={storeName}
          fill
          priority
          sizes="100vw"
          className="store-hero-bg-image absolute inset-0 object-cover object-[58%_65%] md:object-[center_58%]"
        />
        <div className="store-hero-overlay-left absolute inset-0" />
        <div className="store-hero-overlay-bottom absolute inset-0" />
      </div>

      {/* ヒーローコンテンツレイヤー: スマホは中央寄せの縮小PC版にせず、
          添付のスマホ理想デザインに合わせて左揃え・画面下寄りの独立レイアウトにする */}
      <div className="store-hero-content pointer-events-none absolute inset-0 z-10 flex flex-col items-start justify-end gap-0 px-6 pb-[max(9dvh,calc(env(safe-area-inset-bottom)+2.75rem))] text-left md:items-start md:justify-center md:px-0 md:pb-[10vh] md:pl-[6%] md:pr-10 md:text-left">
        <div className="flex w-full max-w-[900px] flex-col items-start md:items-start">
          <div className="store-hero-copy-group flex flex-col items-start md:items-start">
            <h1 className="store-hero-title flex flex-col items-start font-bold tracking-tight md:items-start">
              <span className="store-hero-title-line store-hero-title-line-1">Smart Store</span>
              <span className="store-hero-title-line store-hero-title-line-2">Navi</span>
            </h1>
            <p className="store-hero-subcopy-wrap font-bold">
              <span className="store-hero-subcopy-text">もう、売り場で迷わない。</span>
            </p>
            <p className="store-hero-desc leading-relaxed">
              商品を検索すると、<br className="md:hidden" />売り場まで3Dでご案内します。
            </p>
          </div>

          <button
            type="button"
            onClick={openCard}
            aria-label="商品を探す(検索カードを開く)"
            aria-hidden={isOpen}
            tabIndex={isOpen ? -1 : undefined}
            className="store-hero-cta group pointer-events-auto flex flex-col items-center gap-2 rounded-lg px-2 py-2 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black/40"
          >
            <span className="text-sm font-semibold tracking-wide md:text-base">商品を探す</span>
            <span className="store-hero-cta-ring flex h-11 w-11 items-center justify-center rounded-full border border-white/70 transition-colors group-hover:border-[var(--color-hero-mint)]">
              <span
                aria-hidden="true"
                className="scroll-hint-arrow material-symbols-outlined text-[20px] text-white transition-colors group-hover:text-[var(--color-hero-mint)]"
              >
                keyboard_arrow_down
              </span>
            </span>
            <span aria-hidden="true" className="store-hero-cta-line" />
            <span aria-hidden="true" className="store-hero-cta-dot" />
          </button>
        </div>
      </div>

      {/* 検索カードレイヤー: 店舗写真・ヒーローコンテンツより前面。通常フローには置かず、下から前面へせり上げる */}
      <div
        className={`store-search-card absolute z-20 flex flex-col${isOpen ? " is-open" : ""}`}
        inert={!isOpen}
      >
        <div
          ref={cardInnerRef}
          className="store-search-card-inner flex h-full flex-col overflow-y-auto overscroll-contain"
        >
          <button
            type="button"
            onClick={toggleCard}
            aria-label={isOpen ? "検索カードを閉じる" : "検索カードを開く"}
            aria-expanded={isOpen}
            className="store-search-handle-btn"
          >
            <span aria-hidden="true" className="store-search-handle" />
          </button>

          <div className="store-search-card-content mx-auto flex w-full max-w-2xl flex-1 flex-col items-center gap-6 px-4 text-center md:max-w-4xl">
            <form
              method="GET"
              action="/search"
              role="search"
              onSubmit={handleSubmit}
              className="relative mx-auto w-full max-w-2xl"
              suppressHydrationWarning
            >
              <label htmlFor="product-search-input" className="sr-only">
                商品名や欲しいものを入力
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
                placeholder={showAttachedChip ? "" : "商品名や欲しいものを入力"}
                aria-label="商品名や欲しいものを入力"
                className={`h-14 w-full rounded-full border border-outline-variant bg-surface pl-20 pr-24 text-base text-on-surface shadow-[0_10px_30px_rgba(0,0,0,0.12),0_2px_8px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.7)] placeholder:text-on-surface-variant/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 md:shadow-[0_14px_36px_rgba(0,0,0,0.14),0_2px_10px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.7)] ${showAttachedChip ? "text-transparent caret-transparent" : ""}`}
                suppressHydrationWarning
              />
              {showAttachedChip && attachedFile && (
                <div className="pointer-events-none absolute inset-y-0 left-12 right-24 flex items-center overflow-hidden">
                  <AttachedImageChip file={attachedFile} onRemove={handleRemoveAttachedFile} />
                </div>
              )}
              <div className="absolute right-14 top-1/2 -translate-y-1/2">
                <VoiceSearchButton
                  onResult={handleVoiceResult}
                  onError={setVoiceError}
                />
              </div>
              <button
                type="submit"
                aria-label="AI検索"
                className="absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-primary text-on-primary shadow-[0_4px_16px_rgba(18,183,106,0.35)] transition-[transform,box-shadow,background-color] duration-200 ease-out hover:-translate-y-[calc(50%+2px)] hover:scale-110 hover:bg-primary/90 hover:shadow-[0_8px_24px_rgba(18,183,106,0.45)] active:scale-[0.98] active:shadow-[0_2px_8px_rgba(18,183,106,0.3)] focus:outline-none focus:ring-2 focus:ring-primary/40 motion-reduce:transition-none motion-reduce:hover:-translate-y-1/2 motion-reduce:hover:scale-100 motion-reduce:active:scale-100"
              >
                <span className="material-symbols-outlined text-[20px]">send</span>
              </button>
            </form>

            {showAttachedChip && (
              <p className="-mt-3 text-xs text-on-surface-variant">送信ボタンを押すと画像で検索します</p>
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
              <span>迷わない</span>
              <span className="text-primary">お買い物へ</span>
            </h2>
            <p className="mt-1 text-xs text-on-surface-variant md:text-base">
              商品名や目的を入力すると、売り場まで3Dでご案内します
            </p>
            <div className="w-full pb-[max(2rem,env(safe-area-inset-bottom))]">
              <SearchSuggestions suggestions={suggestions} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
