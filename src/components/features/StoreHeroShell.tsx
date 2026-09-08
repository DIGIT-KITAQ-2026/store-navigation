"use client";

import Image from "next/image";
import { useEffect, useRef, type ReactNode } from "react";
import { useTranslations } from "@/lib/i18n/useTranslations";
import { useStoreFlow } from "@/lib/storeFlowState";

interface StoreHeroShellProps {
  /** 背景写真の代替テキスト */
  imageAlt: string;
  /** 矢印ボタンの文言。段階に応じて「店舗を探す」「支店を探す」等にする。既定は商品検索 */
  ctaLabel?: string;
  /** 矢印ボタンの読み上げ文言。既定は商品検索 */
  openLabel?: string;
  /** せり上がるカードの中身 */
  children: ReactNode;
}

/**
 * 店舗写真の上に「探す」ボタンを置き、押すと下からカードがせり上がる共通のヒーロー。
 *
 * 店舗検索・支店検索・商品検索の3段階で同じ見た目・同じ操作にするために切り出した。
 * 各段階の違いはカードの中身(children)だけで、背景・見出し・矢印ボタン・開閉操作
 * (クリック / ホイール / スワイプ / Escape)はここが持つ。
 */
export default function StoreHeroShell({ imageAlt, ctaLabel, openLabel, children }: StoreHeroShellProps) {
  const t = useTranslations();
  // 開閉状態は消費者画面の共通レイアウトが持つ。店舗→支店→商品と画面が変わっても
  // カードが閉じずに中身だけ切り替わるようにするため(StoreFlowProvider参照)
  const { isOpen, setIsOpen } = useStoreFlow();
  const rootRef = useRef<HTMLElement>(null);
  const cardInnerRef = useRef<HTMLDivElement>(null);
  const touchStartYRef = useRef<number | null>(null);
  const touchStartAtTopRef = useRef(false);

  const [descriptionLine1, descriptionLine2] = t.hero.description.split("\n");

  const ctaText = ctaLabel ?? t.hero.searchButton;
  const openText = openLabel ?? t.hero.openCard;

  const openCard = () => setIsOpen(true);
  const toggleCard = () => setIsOpen(!isOpen);

  // Escapeキーで検索カードを閉じる
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, setIsOpen]);

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
  }, [isOpen, setIsOpen]);

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
  }, [isOpen, setIsOpen]);

  return (
    <section
      ref={rootRef}
      className={`store-hero relative isolate h-[calc(100dvh-4rem)] w-full overflow-hidden${isOpen ? " is-expanded" : ""}`}
    >
      {/* 背景レイヤー: 店舗写真+オーバーレイ。カード展開中もDOMから外さない */}
      <div className="store-hero-bg pointer-events-none absolute inset-0 z-0" aria-hidden="true">
        <Image
          src="/images/design-reference/store-hero-realistic-navigation.png"
          alt={imageAlt}
          fill
          priority
          sizes="100vw"
          className="store-hero-bg-image absolute inset-0 object-cover object-[82%_50%] md:object-[64%_55%]"
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
              <span className="store-hero-subcopy-text">{t.hero.tagline}</span>
            </p>
            <p className="store-hero-desc leading-relaxed">
              {descriptionLine1}
              {/* mdでは改行を挟まず1文として続けて読めるように、間に半角スペースを入れる */}
              <span className="hidden md:inline"> </span>
              <br className="md:hidden" />
              {descriptionLine2}
            </p>
          </div>

          <button
            type="button"
            onClick={openCard}
            aria-label={openText}
            aria-hidden={isOpen}
            tabIndex={isOpen ? -1 : undefined}
            className="store-hero-cta group pointer-events-auto flex flex-col items-center gap-2 rounded-lg px-2 py-2 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black/40"
          >
            <span className="text-sm font-semibold tracking-wide md:text-base">{ctaText}</span>
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
            aria-label={isOpen ? t.hero.closeCard : openText}
            aria-expanded={isOpen}
            className="store-search-handle-btn"
          >
            <span aria-hidden="true" className="store-search-handle" />
          </button>

          <div className="store-search-card-content mx-auto flex w-full max-w-2xl flex-1 flex-col items-center gap-6 px-4 pb-[max(2rem,env(safe-area-inset-bottom))] pt-6 text-center md:max-w-4xl md:pt-10">
            {children}
          </div>
        </div>
      </div>
    </section>
  );
}
