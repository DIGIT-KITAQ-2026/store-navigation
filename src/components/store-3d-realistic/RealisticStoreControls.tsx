"use client";

import { useEffect, useId, useRef, useState, type RefObject } from "react";
import VirtualJoystick from "@/components/store-3d/VirtualJoystick";
import { REALISTIC_CATEGORIES, REALISTIC_SHELF_IDS, type RealisticShelfId } from "@/lib/store-navigation/realistic-store-ids";
import type { MovementInput } from "@/lib/store-navigation/types";
import { PREVIEW_LOCK_ID } from "./PreviewController";
import styles from "./RealisticStoreControls.module.css";

export type Playback = "idle" | "playing" | "paused" | "arrived" | "blocked";
const accents: Record<RealisticShelfId, string> = {
  Shelf_01: "#DEA569", Shelf_02: "#2D7776", Shelf_03: "#344B68", Shelf_04: "#9F5872",
  Shelf_05: "#2C7954", Shelf_06: "#786298", Shelf_07: "#75B4D7", Shelf_08: "#DFBF69",
};

function ManualHint({ mobile }: { mobile: boolean }) {
  const [visible, setVisible] = useState(true);
  useEffect(() => { const timer = window.setTimeout(() => setVisible(false), 4000); return () => clearTimeout(timer); }, []);
  return visible ? <p className={styles.hint}>{mobile ? "スティックで移動・画面スワイプで見回す" : "WASD / 矢印キーで移動・マウスで見回す・Escで解除"}</p> : null;
}

interface Props {
  selected: RealisticShelfId | null; mode: "manual" | "auto"; playback: Playback;
  ready: boolean; switching: boolean; mobile: boolean; locked: boolean; pointerLock: boolean;
  movement: RefObject<MovementInput>;
  onSelect: (id: string) => void; onManual: () => void; onAuto: () => void;
  onStart: () => void; onPause: () => void; onReplay: () => void; onEntrance: () => void;
}

export default function RealisticStoreControls(props: Props) {
  const { selected, mode, playback, ready, switching, mobile, locked, pointerLock, movement,
    onSelect, onManual, onAuto, onStart, onPause, onReplay, onEntrance } = props;
  const selectId = useId();
  const select = useRef<HTMLSelectElement>(null);
  const unavailable = !ready || switching;
  const category = selected ? REALISTIC_CATEGORIES[selected] : null;
  const status = !ready ? "店舗を準備しています" : !selected ? "売り場を選択してください" :
    playback === "playing" ? `${category}売り場へ案内中` : playback === "paused" ? "案内を一時停止しました" :
    playback === "arrived" ? "目的地に到着しました" : playback === "blocked" ? "現在位置から安全な経路を確認できません" : "案内を開始できます";
  const helper = playback === "blocked" ? "「入口へ戻る」を選んで、案内をやり直してください。" :
    !selected ? "場所情報を確認できません。売り場を選択するか、商品検索へ戻ってください。" : null;

  return <div className={styles.overlay}>
    <div className={styles.top}>
      <section aria-label="現在の目的地" className={styles.destination} style={{ borderLeftColor: selected ? accents[selected] : "#9ca3af" }}>
        <p className={styles.label}>目的地</p>
        <p className={styles.category}>{category ?? "未選択"}</p>
        <p className={styles.shelf}>{selected ?? "売り場を選択"}</p>
      </section>
      <div className={styles.modes} role="group" aria-label="操作モード">
        <button type="button" disabled={unavailable} aria-pressed={mode === "manual"} onClick={onManual}
          className={`${styles.button} ${mode === "manual" ? styles.primary : styles.secondary}`}>一人称で歩く</button>
        <button type="button" disabled={unavailable} aria-pressed={mode === "auto"} onClick={onAuto}
          className={`${styles.button} ${mode === "auto" ? styles.primary : styles.secondary}`}>自動案内</button>
      </div>
    </div>
    <div className={styles.middle}>
      {helper ? <p role="alert" className={styles.notice}>{helper}</p> : ready && mode === "manual" ? <>
        <ManualHint key={locked ? "locked" : "unlocked"} mobile={mobile} />
        {!mobile && !locked && pointerLock && <button type="button" id={PREVIEW_LOCK_ID} className={`${styles.button} ${styles.secondary} ${styles.lock}`}>視点操作を開始</button>}
      </> : null}
    </div>
    <div className={styles.bottom}>
      <div className={styles.joystick}>
        {ready && mobile && mode === "manual" && <VirtualJoystick inputRef={movement} ariaLabel="店舗内の視点を移動" />}
      </div>
      <div className={styles.selector}>
        <label htmlFor={selectId} className={styles.label}>売り場を選択</label>
        <select id={selectId} ref={select} value={selected ?? ""} disabled={unavailable} onChange={e => onSelect(e.target.value)}>
          <option value="" disabled>売り場を選択してください</option>
          {REALISTIC_SHELF_IDS.map(id => <option key={id} value={id}>{REALISTIC_CATEGORIES[id]}（{id}）</option>)}
        </select>
      </div>
      <div className={styles.actions}>
        <p role="status" aria-live="polite" aria-atomic="true" className={styles.status}>{status}</p>
        <div className={styles.buttons}>
          {playback === "blocked" ? <button type="button" disabled={unavailable} onClick={onEntrance} className={`${styles.button} ${styles.primary}`}>入口へ戻る</button> :
            playback === "arrived" ? <button type="button" onClick={() => select.current?.focus()} className={`${styles.button} ${styles.primary}`}>別の売り場を選ぶ</button> :
            playback === "playing" ? <button type="button" onClick={onPause} className={`${styles.button} ${styles.primary}`}>一時停止</button> :
            <button type="button" disabled={unavailable || !selected} onClick={onStart} className={`${styles.button} ${styles.primary}`}>{playback === "paused" ? "再開" : "案内を開始"}</button>}
          {(playback === "paused" || playback === "arrived") && <button type="button" disabled={unavailable} onClick={onReplay} className={`${styles.button} ${styles.secondary}`}>最初から再生</button>}
          {playback === "playing" && <button type="button" disabled={unavailable} onClick={onEntrance} className={`${styles.button} ${styles.secondary}`}>入口へ戻る</button>}
        </div>
      </div>
    </div>
  </div>;
}
