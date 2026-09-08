"use client";

import { useEffect, useId, useRef, useState, type RefObject } from "react";
import VirtualJoystick from "@/components/store-3d/VirtualJoystick";
import { REALISTIC_CATEGORIES, REALISTIC_SHELF_IDS, type RealisticShelfId } from "@/lib/store-navigation/realistic-store-ids";
import type { MovementInput } from "@/lib/store-navigation/types";
import { PREVIEW_LOCK_ID } from "./PreviewController";
import styles from "./RealisticStoreControls.module.css";
import { STOCK_STATUS_SYMBOLS, type StockInfo } from "@/lib/inventory/stockStatus";
import type { Dictionary } from "@/lib/i18n/dictionaries/ja";
import { format } from "@/lib/i18n/useTranslations";
import { translateCategory } from "@/lib/i18n/categoryLabels";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/locales";

export type Playback = "idle" | "playing" | "paused" | "arrived" | "blocked";
type Navigate3DRealisticDictionary = Dictionary["navigate3dRealistic"];
type StockDictionary = Dictionary["stock"];

const accents: Record<RealisticShelfId, string> = {
  Shelf_01: "#DEA569", Shelf_02: "#2D7776", Shelf_03: "#344B68", Shelf_04: "#9F5872",
  Shelf_05: "#2C7954", Shelf_06: "#786298", Shelf_07: "#75B4D7", Shelf_08: "#DFBF69",
};

function ManualHint({ mobile, t }: { mobile: boolean; t: Navigate3DRealisticDictionary }) {
  const [visible, setVisible] = useState(true);
  useEffect(() => { const timer = window.setTimeout(() => setVisible(false), 4000); return () => clearTimeout(timer); }, []);
  return visible ? <p className={styles.hint}>{mobile ? t.hintMobile : t.hintDesktop}</p> : null;
}

interface Props {
  selected: RealisticShelfId | null; mode: "manual" | "auto"; playback: Playback;
  ready: boolean; switching: boolean; mobile: boolean; locked: boolean; pointerLock: boolean;
  movement: RefObject<MovementInput>;
  /** 案内先商品の在庫状態。selectedが案内対象の売り場と異なる場合はnull(古い情報を出さないため)。 */
  stock?: StockInfo | null;
  /** UI文言。CanvasのSuspense/Suspenseの外側で解決したロケール辞書をpropsで渡す(Canvas境界をまたぐReact Contextに頼らない)。 */
  t: Navigate3DRealisticDictionary;
  stockLabels: StockDictionary;
  locale?: Locale;
  onSelect: (id: string) => void; onManual: () => void; onAuto: () => void;
  onStart: () => void; onPause: () => void; onReplay: () => void; onEntrance: () => void;
}

export default function RealisticStoreControls(props: Props) {
  const { selected, mode, playback, ready, switching, mobile, locked, pointerLock, movement, stock, t, stockLabels,
    locale = DEFAULT_LOCALE, onSelect, onManual, onAuto, onStart, onPause, onReplay, onEntrance } = props;
  const selectId = useId();
  const select = useRef<HTMLSelectElement>(null);
  const unavailable = !ready || switching;
  const category = selected ? translateCategory(REALISTIC_CATEGORIES[selected], locale) : null;
  const status = !ready ? t.statusPreparing : !selected ? t.statusSelectPrompt :
    playback === "playing" ? format(t.statusGuiding, { category: category ?? "" }) : playback === "paused" ? t.statusPaused :
    playback === "arrived" ? t.statusArrived : playback === "blocked" ? t.statusBlocked : t.statusReady;
  const helper = playback === "blocked" ? t.helperBlocked :
    !selected ? t.helperNoSelection : null;
  const stockLabel = stock ? { available: stockLabels.availableLabel, outOfStock: stockLabels.outOfStockLabel, unknown: stockLabels.unknownLabel }[stock.kind] : null;

  return <div className={styles.overlay}>
    <div className={styles.top}>
      <section aria-label={t.destinationAriaLabel} className={styles.destination} style={{ borderLeftColor: selected ? accents[selected] : "#9ca3af" }}>
        <p className={styles.label}>{t.destinationLabel}</p>
        <p className={styles.category}>{category ?? t.categoryUnselected}</p>
        <p className={styles.shelf}>{selected ?? t.shelfPlaceholder}</p>
        {stock && (
          <p className={styles.stock} data-kind={stock.kind}>
            <span aria-hidden>{STOCK_STATUS_SYMBOLS[stock.kind]}</span>
            {stockLabel}
            {stock.kind !== "unknown" && ` ${stock.actualStock ?? 0}${stock.unit ?? ""}`}
          </p>
        )}
      </section>
      <div className={styles.modes} role="group" aria-label={t.modeGroupAriaLabel}>
        <button type="button" disabled={unavailable} aria-pressed={mode === "manual"} onClick={onManual}
          className={`${styles.button} ${mode === "manual" ? styles.primary : styles.secondary}`}>{t.modeManual}</button>
        <button type="button" disabled={unavailable} aria-pressed={mode === "auto"} onClick={onAuto}
          className={`${styles.button} ${mode === "auto" ? styles.primary : styles.secondary}`}>{t.modeAuto}</button>
      </div>
    </div>
    <div className={styles.middle}>
      {helper ? <p role="alert" className={styles.notice}>{helper}</p> : ready && mode === "manual" ? <>
        <ManualHint key={locked ? "locked" : "unlocked"} mobile={mobile} t={t} />
        {!mobile && !locked && pointerLock && <button type="button" id={PREVIEW_LOCK_ID} className={`${styles.button} ${styles.secondary} ${styles.lock}`}>{t.lockButton}</button>}
      </> : null}
    </div>
    <div className={styles.bottom}>
      <div className={styles.joystick}>
        {ready && mobile && mode === "manual" && <VirtualJoystick inputRef={movement} ariaLabel={t.joystickAriaLabel} />}
      </div>
      <div className={styles.selector}>
        <label htmlFor={selectId} className={styles.label}>{t.shelfSelectorLabel}</label>
        <select id={selectId} ref={select} value={selected ?? ""} disabled={unavailable} onChange={e => onSelect(e.target.value)}>
          <option value="" disabled>{t.statusSelectPrompt}</option>
          {REALISTIC_SHELF_IDS.map(id => <option key={id} value={id}>{translateCategory(REALISTIC_CATEGORIES[id], locale)}（{id}）</option>)}
        </select>
      </div>
      <div className={styles.actions}>
        <p role="status" aria-live="polite" aria-atomic="true" className={styles.status}>{status}</p>
        <div className={styles.buttons}>
          {playback === "blocked" ? <button type="button" disabled={unavailable} onClick={onEntrance} className={`${styles.button} ${styles.primary}`}>{t.backToEntrance}</button> :
            playback === "arrived" ? <button type="button" onClick={() => select.current?.focus()} className={`${styles.button} ${styles.primary}`}>{t.selectAnotherShelf}</button> :
            playback === "playing" ? <button type="button" onClick={onPause} className={`${styles.button} ${styles.primary}`}>{t.pauseButton}</button> :
            <button type="button" disabled={unavailable || !selected} onClick={onStart} className={`${styles.button} ${styles.primary}`}>{playback === "paused" ? t.resumeButton : t.startButton}</button>}
          {(playback === "paused" || playback === "arrived") && <button type="button" disabled={unavailable} onClick={onReplay} className={`${styles.button} ${styles.secondary}`}>{t.replayButton}</button>}
          {playback === "playing" && <button type="button" disabled={unavailable} onClick={onEntrance} className={`${styles.button} ${styles.secondary}`}>{t.backToEntrance}</button>}
        </div>
      </div>
    </div>
  </div>;
}
