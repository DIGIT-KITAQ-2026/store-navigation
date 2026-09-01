"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, type PointerEvent as ReactPointerEvent } from "react";
import SearchSuggestions from "@/components/ui/SearchSuggestions";

type Offset = { x: number; y: number };

type StoreEntranceHeroProps = {
  storeName: string;
  storeDescription: string | null;
  suggestions: string[];
};

const MAX_TILT_DEG = 3;
const MAX_SHIFT_LAYER_A = 2;
const MAX_SHIFT_LAYER_B = 4;
const MAX_SHIFT_IMAGE = 4;
const MAX_SHIFT_FRAME = 7;
const MAX_SHIFT_SEARCH = 11;

const IMAGE_BASE_SCALE = 1.06;
const SCROLL_SCALE_MAX = 1.03;

const LAYER_A_Z = -50;
const LAYER_B_Z = -40;
const IMAGE_Z = -30;
const FRAME_Z = 8;

// 背面レイヤーの静止時オフセット(画像に対して少しずらして重なりを見せる)。スマホはPCより控えめ
const LAYER_A_BASE_OFFSET_DESKTOP: Offset = { x: -8, y: -8 };
const LAYER_A_BASE_OFFSET_MOBILE: Offset = { x: -5, y: -5 };
const LAYER_B_BASE_OFFSET_DESKTOP: Offset = { x: 10, y: 10 };
const LAYER_B_BASE_OFFSET_MOBILE: Offset = { x: 7, y: 7 };

const RESET_TRANSITION = "transform 400ms ease";
const WILL_CHANGE_RESET_DELAY_MS = 420;

const ZERO_OFFSET: Offset = { x: 0, y: 0 };

export default function StoreEntranceHero({ storeName, storeDescription, suggestions }: StoreEntranceHeroProps) {
  const sceneRef = useRef<HTMLDivElement>(null);
  const layerARef = useRef<HTMLDivElement>(null);
  const layerBRef = useRef<HTMLDivElement>(null);
  const imageLayerRef = useRef<HTMLDivElement>(null);
  const frameLayerRef = useRef<HTMLDivElement>(null);
  const searchLayerRef = useRef<HTMLDivElement>(null);

  const enabledRef = useRef(false);
  const visibleRef = useRef(false);
  const frameRef = useRef<number | null>(null);
  const willChangeTimeoutRef = useRef<number | null>(null);

  const layerAOffsetRef = useRef<Offset>({ x: 0, y: 0 });
  const layerBOffsetRef = useRef<Offset>({ x: 0, y: 0 });
  const layerABaseRef = useRef<Offset>(LAYER_A_BASE_OFFSET_MOBILE);
  const layerBBaseRef = useRef<Offset>(LAYER_B_BASE_OFFSET_MOBILE);
  const imageOffsetRef = useRef<Offset>({ x: 0, y: 0 });
  const frameOffsetRef = useRef<Offset>({ x: 0, y: 0 });
  const searchOffsetRef = useRef<Offset>({ x: 0, y: 0 });
  const scrollScaleRef = useRef(1);

  const dynamicLayerRefs = [layerARef, layerBRef, imageLayerRef, frameLayerRef, searchLayerRef];
  const allLayerRefs = [sceneRef, ...dynamicLayerRefs];

  const writeLayerATransform = useCallback(() => {
    const el = layerARef.current;
    if (!el) return;
    const { x, y } = layerAOffsetRef.current;
    const base = layerABaseRef.current;
    el.style.transform = `translateZ(${LAYER_A_Z}px) translate3d(${base.x + x}px, ${base.y + y}px, 0)`;
  }, []);

  const writeLayerBTransform = useCallback(() => {
    const el = layerBRef.current;
    if (!el) return;
    const { x, y } = layerBOffsetRef.current;
    const base = layerBBaseRef.current;
    el.style.transform = `translateZ(${LAYER_B_Z}px) translate3d(${base.x + x}px, ${base.y + y}px, 0)`;
  }, []);

  const writeImageTransform = useCallback(() => {
    const el = imageLayerRef.current;
    if (!el) return;
    const { x, y } = imageOffsetRef.current;
    const scale = IMAGE_BASE_SCALE * scrollScaleRef.current;
    el.style.transform = `translateZ(${IMAGE_Z}px) translate3d(${x}px, ${y}px, 0) scale(${scale.toFixed(4)})`;
  }, []);

  const writeFrameTransform = useCallback(() => {
    const el = frameLayerRef.current;
    if (!el) return;
    const { x, y } = frameOffsetRef.current;
    el.style.transform = `translateZ(${FRAME_Z}px) translate3d(${x}px, ${y}px, 0)`;
  }, []);

  const writeSearchTransform = useCallback(() => {
    const el = searchLayerRef.current;
    if (!el) return;
    const { x, y } = searchOffsetRef.current;
    el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
  }, []);

  const writeAllLayerTransforms = useCallback(() => {
    writeLayerATransform();
    writeLayerBTransform();
    writeImageTransform();
    writeFrameTransform();
    writeSearchTransform();
  }, [writeLayerATransform, writeLayerBTransform, writeImageTransform, writeFrameTransform, writeSearchTransform]);

  const resetLayers = useCallback(() => {
    const scene = sceneRef.current;
    if (scene) scene.style.transform = "rotateX(0deg) rotateY(0deg)";
    layerAOffsetRef.current = { ...ZERO_OFFSET };
    layerBOffsetRef.current = { ...ZERO_OFFSET };
    imageOffsetRef.current = { ...ZERO_OFFSET };
    frameOffsetRef.current = { ...ZERO_OFFSET };
    searchOffsetRef.current = { ...ZERO_OFFSET };
    writeAllLayerTransforms();
  }, [writeAllLayerTransforms]);

  useEffect(() => {
    const pointerQuery = window.matchMedia("(pointer: fine)");
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const breakpointQuery = window.matchMedia("(min-width: 768px)");

    const syncEnabled = () => {
      enabledRef.current = pointerQuery.matches && !motionQuery.matches;
      layerABaseRef.current = breakpointQuery.matches ? LAYER_A_BASE_OFFSET_DESKTOP : LAYER_A_BASE_OFFSET_MOBILE;
      layerBBaseRef.current = breakpointQuery.matches ? LAYER_B_BASE_OFFSET_DESKTOP : LAYER_B_BASE_OFFSET_MOBILE;
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
      allLayerRefs.forEach((ref) => {
        if (ref.current) ref.current.style.transition = "none";
      });
      resetLayers();
    };

    syncEnabled();
    pointerQuery.addEventListener("change", syncEnabled);
    motionQuery.addEventListener("change", syncEnabled);
    breakpointQuery.addEventListener("change", syncEnabled);

    return () => {
      pointerQuery.removeEventListener("change", syncEnabled);
      motionQuery.removeEventListener("change", syncEnabled);
      breakpointQuery.removeEventListener("change", syncEnabled);
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
      if (willChangeTimeoutRef.current !== null) {
        window.clearTimeout(willChangeTimeoutRef.current);
        willChangeTimeoutRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetLayers]);

  useEffect(() => {
    const sceneEl = sceneRef.current;
    if (!sceneEl || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      (entries) => {
        visibleRef.current = entries[0]?.isIntersecting ?? false;
      },
      { threshold: 0 },
    );
    observer.observe(sceneEl);

    let scrollFrame: number | null = null;
    const handleScroll = () => {
      if (!enabledRef.current || !visibleRef.current) return;
      if (scrollFrame !== null) return;
      scrollFrame = requestAnimationFrame(() => {
        scrollFrame = null;
        const rect = sceneEl.getBoundingClientRect();
        const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
        const progress = Math.min(1, Math.max(0, (viewportHeight - rect.top) / (viewportHeight + rect.height)));
        scrollScaleRef.current = 1 + progress * (SCROLL_SCALE_MAX - 1);
        writeImageTransform();
      });
    };

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", handleScroll);
      if (scrollFrame !== null) {
        cancelAnimationFrame(scrollFrame);
      }
    };
  }, [writeImageTransform]);

  const clearWillChangeReset = () => {
    if (willChangeTimeoutRef.current !== null) {
      window.clearTimeout(willChangeTimeoutRef.current);
      willChangeTimeoutRef.current = null;
    }
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!enabledRef.current || event.pointerType !== "mouse") return;
    const scene = sceneRef.current;
    if (!scene) return;

    const rect = scene.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const px = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    const py = Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height));

    if (frameRef.current !== null) return;
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = null;

      const tiltY = (px - 0.5) * 2 * MAX_TILT_DEG;
      const tiltX = (0.5 - py) * 2 * MAX_TILT_DEG;
      scene.style.transition = "none";
      scene.style.transform = `rotateX(${tiltX.toFixed(2)}deg) rotateY(${tiltY.toFixed(2)}deg)`;

      const nx = (px - 0.5) * 2;
      const ny = (py - 0.5) * 2;
      layerAOffsetRef.current = { x: nx * MAX_SHIFT_LAYER_A, y: ny * MAX_SHIFT_LAYER_A };
      layerBOffsetRef.current = { x: nx * MAX_SHIFT_LAYER_B, y: ny * MAX_SHIFT_LAYER_B };
      imageOffsetRef.current = { x: nx * MAX_SHIFT_IMAGE, y: ny * MAX_SHIFT_IMAGE };
      frameOffsetRef.current = { x: nx * MAX_SHIFT_FRAME, y: ny * MAX_SHIFT_FRAME };
      searchOffsetRef.current = { x: nx * MAX_SHIFT_SEARCH, y: ny * MAX_SHIFT_SEARCH };

      dynamicLayerRefs.forEach((ref) => {
        if (ref.current) ref.current.style.transition = "none";
      });
      writeAllLayerTransforms();
    });
  };

  const handlePointerEnter = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!enabledRef.current || event.pointerType !== "mouse") return;
    clearWillChangeReset();
    allLayerRefs.forEach((ref) => {
      if (ref.current) ref.current.style.willChange = "transform";
    });
  };

  const handlePointerLeave = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "mouse") return;
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }

    const transition = enabledRef.current ? RESET_TRANSITION : "none";
    allLayerRefs.forEach((ref) => {
      if (ref.current) ref.current.style.transition = transition;
    });

    resetLayers();

    clearWillChangeReset();
    willChangeTimeoutRef.current = window.setTimeout(() => {
      allLayerRefs.forEach((ref) => {
        if (ref.current) ref.current.style.willChange = "auto";
      });
      willChangeTimeoutRef.current = null;
    }, WILL_CHANGE_RESET_DELAY_MS);
  };

  return (
    <>
      <section className="flex flex-col items-center gap-4 text-center">
        <div
          ref={sceneRef}
          className="isolate relative aspect-[16/9] w-full max-w-5xl overflow-hidden rounded-2xl border border-outline-variant shadow-sm md:aspect-[21/9] md:rounded-[24px]"
          style={{
            perspective: "1100px",
            transformStyle: "preserve-3d",
            transform: "rotateX(0deg) rotateY(0deg)",
          }}
          onPointerMove={handlePointerMove}
          onPointerEnter={handlePointerEnter}
          onPointerLeave={handlePointerLeave}
        >
          {/* レイヤー1: 空間背景(白→淡い緑、静的) */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-gradient-to-b from-surface to-primary-container/40"
            style={{ transform: "translateZ(-60px)" }}
          />

          {/* 背面パネルA: 画像の最も後ろに配置する淡い緑の面(左上へずらす) */}
          <div
            ref={layerARef}
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 rounded-2xl bg-[rgba(18,183,106,0.12)] md:rounded-[24px]"
            style={{
              transform: `translateZ(${LAYER_A_Z}px) translate3d(${LAYER_A_BASE_OFFSET_MOBILE.x}px, ${LAYER_A_BASE_OFFSET_MOBILE.y}px, 0)`,
            }}
          />

          {/* 背面パネルB: 背面パネルAと画像の間に配置する白に近い薄緑の面(右下へずらす) */}
          <div
            ref={layerBRef}
            aria-hidden="true"
            className="pointer-events-none absolute inset-0.5 rounded-2xl border border-primary/20 bg-[rgba(209,250,223,0.55)] shadow-[0_8px_18px_rgba(16,24,40,0.08)] md:rounded-[24px] md:shadow-[0_12px_28px_rgba(16,24,40,0.12)]"
            style={{
              transform: `translateZ(${LAYER_B_Z}px) translate3d(${LAYER_B_BASE_OFFSET_MOBILE.x}px, ${LAYER_B_BASE_OFFSET_MOBILE.y}px, 0)`,
            }}
          />

          {/* レイヤー2: スーパー外観画像(最も奥、動きは最小) */}
          <div
            ref={imageLayerRef}
            className="absolute inset-1"
            style={{ transform: `translateZ(${IMAGE_Z}px) scale(${IMAGE_BASE_SCALE})` }}
          >
            <Image
              src="/images/design-reference/store-hero-generated.png"
              alt={storeName}
              width={1024}
              height={576}
              className="h-full w-full rounded-xl object-cover md:rounded-[20px]"
              priority
            />
          </div>

          {/* レイヤー3: 店舗入口フレーム(装飾のみ、操作不可) */}
          <div
            ref={frameLayerRef}
            aria-hidden="true"
            className="pointer-events-none absolute inset-2 rounded-2xl border border-white/50 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.35),inset_0_20px_36px_-24px_rgba(16,24,40,0.35)] md:inset-3 md:rounded-[20px]"
            style={{ transform: `translateZ(${FRAME_Z}px)` }}
          />
        </div>

        <h1 className="text-2xl font-bold text-on-surface md:text-4xl">{storeName}</h1>
        {storeDescription && (
          <p className="text-sm leading-relaxed text-on-surface-variant md:text-lg">{storeDescription}</p>
        )}
      </section>

      {/* 検索セクション */}
      <section className="flex flex-col items-center gap-4 text-center">
        <div>
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
        </div>
        <SearchSuggestions suggestions={suggestions} />
      </section>

      {/* レイヤー5: 検索体験(モバイルは画面下部固定、デスクトップはページ内インライン) */}
      <div
        ref={searchLayerRef}
        className="fixed inset-x-0 bottom-6 z-40 px-4 md:static md:mx-auto md:mb-16 md:mt-8 md:w-full md:max-w-2xl md:px-0"
      >
        <form
          method="GET"
          action="/search"
          role="search"
          className="relative mx-auto w-full max-w-2xl"
          suppressHydrationWarning
        >
          <label htmlFor="product-search-input" className="sr-only">
            商品名や欲しいものを入力
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
            placeholder="商品名や欲しいものを入力"
            aria-label="商品名や欲しいものを入力"
            className="h-14 w-full rounded-full border border-outline-variant bg-surface pl-12 pr-16 text-base text-on-surface shadow-[0_10px_30px_rgba(0,0,0,0.12),0_2px_8px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.7)] placeholder:text-on-surface-variant/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 md:shadow-[0_14px_36px_rgba(0,0,0,0.14),0_2px_10px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.7)]"
            suppressHydrationWarning
          />
          <button
            type="submit"
            aria-label="AI検索"
            className="absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-primary text-on-primary shadow-[0_4px_16px_rgba(18,183,106,0.35)] transition-[transform,box-shadow,background-color] duration-200 ease-out hover:-translate-y-[calc(50%+2px)] hover:scale-110 hover:bg-primary/90 hover:shadow-[0_8px_24px_rgba(18,183,106,0.45)] active:scale-95 active:shadow-[0_2px_8px_rgba(18,183,106,0.3)] focus:outline-none focus:ring-2 focus:ring-primary/40 motion-reduce:transition-none motion-reduce:hover:-translate-y-1/2 motion-reduce:hover:scale-100 motion-reduce:active:scale-100"
          >
            <span className="material-symbols-outlined text-[20px]">send</span>
          </button>
        </form>
      </div>
    </>
  );
}
