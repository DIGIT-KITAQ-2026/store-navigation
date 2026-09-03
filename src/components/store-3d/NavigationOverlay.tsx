"use client";

import { useEffect, useState } from "react";
import VirtualJoystick from "./VirtualJoystick";
import type { MovementInput, NavigationViewMode } from "@/lib/store-navigation/types";

export type DemoPlaybackState = "idle" | "playing" | "paused" | "arrived";
export type CanvasStatus = "unsupported" | "ready" | "error";

/**
 * 「クリックして視点操作を開始」ボタンのid。FirstPersonController.tsxはこのidへの
 * クリックだけをdocument上でイベント委任により検知し、そのクリックの同期イベント内でのみ
 * requestPointerLock()を呼ぶ(モード切り替えの操作などで誤って呼ばれないようにするため)。
 * このボタン自体、スマホ(showsMobileControls)では描画しない
 */
export const POINTER_LOCK_TRIGGER_ID = "store-nav-pointer-lock-trigger";

interface NavigationOverlayProps {
  destinationLabel: string;
  mode: NavigationViewMode;
  onModeChange: (mode: NavigationViewMode) => void;
  demoState: DemoPlaybackState;
  onPlayOrRestart: () => void;
  onPause: () => void;
  onRestart: () => void;
  canvasStatus: CanvasStatus;
  isPointerLocked: boolean;
  showsMobileControls: boolean;
  movementInputRef: React.RefObject<MovementInput>;
}

function ModeButton({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`flex min-h-11 items-center gap-1.5 rounded-full border px-3 py-2 text-sm font-semibold shadow-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 ${
        active
          ? "border-teal-600 bg-teal-600 text-white"
          : "border-teal-200 bg-white text-teal-800 hover:border-teal-400"
      }`}
    >
      <span className="material-symbols-outlined text-[18px]">{icon}</span>
      {label}
      {active && <span className="material-symbols-outlined text-[16px]">check</span>}
    </button>
  );
}

const MOBILE_HINT_VISIBLE_MS = 2600;

/**
 * スマホの一人称モードへ切り替えた直後だけ中央へ大きく操作方法を表示し、数秒後にフェードアウトする。
 * PC向けの「クリックして視点操作を開始」相当の説明をスマホ向けに置き換えるためのもの
 */
function MobileFirstPersonHint() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => setVisible(false), MOBILE_HINT_VISIBLE_MS);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div
      className={`pointer-events-none flex flex-1 items-center justify-center transition-opacity duration-500 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
    >
      <div className="max-w-[220px] rounded-xl border border-outline-variant bg-white/95 px-4 py-3 text-center shadow-md">
        <p className="text-sm font-bold text-teal-700">左のスティックで移動</p>
        <p className="mt-1 text-xs text-on-surface-variant">画面をスワイプして見回す</p>
      </div>
    </div>
  );
}

/**
 * 3D画面の上に重ねる最小限のHTML UI。Canvas領域外(このコンポーネント自体)は
 * pointer-events-noneにし、各カード/ボタン単位でのみpointer-events-autoにして
 * 一人称モードでのクリック(PCのPointer Lock開始・スマホのスワイプ視点操作)を妨げないようにする
 */
export default function NavigationOverlay({
  destinationLabel,
  mode,
  onModeChange,
  demoState,
  onPlayOrRestart,
  onPause,
  onRestart,
  canvasStatus,
  isPointerLocked,
  showsMobileControls,
  movementInputRef,
}: NavigationOverlayProps) {
  const controlsAvailable = canvasStatus !== "unsupported" && canvasStatus !== "error";
  const isMobileFirstPerson = mode === "first-person" && controlsAvailable && showsMobileControls;
  const isPcFirstPerson = mode === "first-person" && controlsAvailable && !showsMobileControls;
  // Pointer Lock API自体に対応していないブラウザでは、押しても何も起きないボタンを
  // 表示し続けないよう案内文を切り替える(実際にlock()を呼ぶかどうかはFirstPersonController側で判断する)
  const pointerLockSupported = typeof document !== "undefined" && "pointerLockElement" in document;

  const demoStatusText =
    demoState === "arrived" ? "到着" : demoState === "playing" ? "再生中" : demoState === "paused" ? "一時停止" : "開始前";

  return (
    <div
      className="pointer-events-none absolute inset-0 flex flex-col justify-between gap-2 px-3 md:px-4"
      style={{
        paddingTop: "max(0.75rem, env(safe-area-inset-top))",
        paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))",
        paddingLeft: "max(0.75rem, env(safe-area-inset-left))",
        paddingRight: "max(0.75rem, env(safe-area-inset-right))",
      }}
    >
      <div className="pointer-events-auto flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
        <div className="flex items-center gap-2 self-start rounded-xl border border-outline-variant bg-white/95 px-3 py-1.5 shadow-sm sm:py-2">
          <span className="material-symbols-outlined text-teal-600">storefront</span>
          <div>
            <p className="text-[11px] font-medium leading-tight text-on-surface-variant">目的地</p>
            <p className="text-sm font-bold leading-tight text-on-surface">{destinationLabel}</p>
          </div>
        </div>

        {controlsAvailable && (
          <div className="flex flex-wrap gap-2">
            <ModeButton
              active={mode === "first-person"}
              icon="directions_walk"
              label="一人称で歩く"
              onClick={() => onModeChange("first-person")}
            />
            <ModeButton
              active={mode === "auto-demo"}
              icon="videocam"
              label="自動デモ"
              onClick={() => onModeChange("auto-demo")}
            />
          </div>
        )}
      </div>

      {isMobileFirstPerson && <MobileFirstPersonHint />}

      {isPcFirstPerson && !isPointerLocked && (
        <div className="pointer-events-none flex flex-1 items-center justify-center">
          {pointerLockSupported ? (
            <button
              type="button"
              id={POINTER_LOCK_TRIGGER_ID}
              className="pointer-events-auto max-w-xs rounded-xl border border-outline-variant bg-white/95 px-4 py-3 text-center text-sm text-on-surface shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2"
            >
              <p className="font-bold text-teal-700">クリックして視点操作を開始</p>
              <p className="mt-1 text-xs text-on-surface-variant">WASDまたは矢印キーで移動、マウスで視点操作、Escキーで終了します。</p>
            </button>
          ) : (
            <div className="pointer-events-auto max-w-xs rounded-xl border border-outline-variant bg-white/95 px-4 py-3 text-center text-sm text-on-surface shadow-md">
              <p className="font-bold text-on-surface-variant">
                この環境では第一人称のマウス操作を利用できません。自動デモをご利用ください。
              </p>
            </div>
          )}
        </div>
      )}

      <div className="pointer-events-auto flex flex-wrap items-end justify-between gap-2">
        <div className="flex items-end gap-2">
          {mode === "auto-demo" && controlsAvailable && (
            <p role="status" className="rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-teal-800 shadow-sm">
              デモ: {demoStatusText}
            </p>
          )}
          {isPcFirstPerson && isPointerLocked && (
            <p className="rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-on-surface-variant shadow-sm">
              Escキーで視点操作を終了
            </p>
          )}
          {isMobileFirstPerson && <VirtualJoystick inputRef={movementInputRef} />}
        </div>

        {mode === "auto-demo" && controlsAvailable && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onRestart}
              aria-label="最初から再スタート"
              title="最初から"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-outline-variant bg-white/95 text-on-surface-variant shadow-sm transition-colors hover:text-teal-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2"
            >
              <span className="material-symbols-outlined">replay</span>
            </button>

            {demoState === "playing" ? (
              <button
                type="button"
                onClick={onPause}
                aria-pressed="true"
                className="flex min-h-11 items-center gap-1.5 rounded-full bg-teal-600 px-4 py-2 text-sm font-bold text-white shadow-sm transition-colors hover:bg-teal-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2"
              >
                <span className="material-symbols-outlined text-[18px]">pause</span>
                一時停止
              </button>
            ) : (
              <button
                type="button"
                onClick={onPlayOrRestart}
                aria-pressed="false"
                className="flex min-h-11 items-center gap-1.5 rounded-full bg-teal-600 px-4 py-2 text-sm font-bold text-white shadow-sm transition-colors hover:bg-teal-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2"
              >
                <span className="material-symbols-outlined text-[18px]">play_arrow</span>
                {demoState === "arrived" ? "もう一度再生" : "再生"}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
