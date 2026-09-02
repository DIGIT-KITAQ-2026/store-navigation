"use client";

import { useSyncExternalStore } from "react";

export interface MobileNavControls {
  /** 実行環境がタッチ入力に対応しているか(navigator.maxTouchPoints基準。静的な値) */
  isTouchDevice: boolean;
  /**
   * モバイル向け操作UI(仮想スティック・スワイプ視点操作)を表示するか。
   * pointer:coarseまたはhover:noneを主判定にする(画面幅・UA文字列は使わない)ことで、
   * タッチ対応PC(マウスが主入力でpointer:fine/hover:hover)ではPC操作を消さない
   */
  showsMobileControls: boolean;
  /** ブラウザがPointer Lock APIに対応しているか(静的な値) */
  supportsPointerLock: boolean;
}

const MOBILE_CONTROLS_QUERY = "(pointer: coarse), (hover: none)";

function subscribeToMobileControlsQuery(onChange: () => void): () => void {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return () => {};
  const query = window.matchMedia(MOBILE_CONTROLS_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function getShowsMobileControlsSnapshot(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia(MOBILE_CONTROLS_QUERY).matches;
}

function getShowsMobileControlsServerSnapshot(): boolean {
  return false;
}

// maxTouchPoints/Pointer Lock対応状況は実行中に変わらない値だが、SSR/初回描画とその後の
// 実チェックを安全に一致させるためuseSyncExternalStoreを使う(subscribeは何もしない)
function subscribeNever(): () => void {
  return () => {};
}

function getIsTouchDeviceSnapshot(): boolean {
  return typeof navigator !== "undefined" && navigator.maxTouchPoints > 0;
}

function getIsTouchDeviceServerSnapshot(): boolean {
  return false;
}

function getSupportsPointerLockSnapshot(): boolean {
  return (
    typeof document !== "undefined" &&
    typeof document.body?.requestPointerLock === "function" &&
    typeof document.exitPointerLock === "function"
  );
}

function getSupportsPointerLockServerSnapshot(): boolean {
  return false;
}

/**
 * ユーザーエージェント文字列や画面幅に依存せず、pointer:coarse/hover:none(主判定)と
 * maxTouchPoints・Pointer Lock対応状況からモバイル操作UIの表示可否を判定する。
 * SSR/初回描画では常に安全な既定値(false=PC相当)を返し、hydration後にmatchMediaの
 * 実値へ更新する(Hydration mismatchを起こさない)
 */
export default function useMobileNavControls(): MobileNavControls {
  const showsMobileControls = useSyncExternalStore(
    subscribeToMobileControlsQuery,
    getShowsMobileControlsSnapshot,
    getShowsMobileControlsServerSnapshot,
  );
  const isTouchDevice = useSyncExternalStore(subscribeNever, getIsTouchDeviceSnapshot, getIsTouchDeviceServerSnapshot);
  const supportsPointerLock = useSyncExternalStore(
    subscribeNever,
    getSupportsPointerLockSnapshot,
    getSupportsPointerLockServerSnapshot,
  );

  return { isTouchDevice, showsMobileControls, supportsPointerLock };
}
