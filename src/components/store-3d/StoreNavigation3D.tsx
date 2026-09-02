"use client";

import { Component, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import type { ReactNode } from "react";
import dynamic from "next/dynamic";
import NavigationOverlay, { type CanvasStatus, type DemoPlaybackState } from "./NavigationOverlay";
import usePrefersReducedMotion from "@/lib/usePrefersReducedMotion";
import useMobileNavControls from "@/lib/useMobileNavControls";
import { findPath } from "@/lib/store-navigation/pathfinding";
import { ENTRANCE_NODE_ID, NAVIGATION_NODES, resolveDestination } from "@/lib/store-navigation/store-layout";
import type { MovementInput, NavigationViewMode } from "@/lib/store-navigation/types";

// Three.js/WebGLに触れる部分はここでのみdynamic import(ssr:false)し、SSRでは一切実行しない
const StoreSceneLazy = dynamic(() => import("./StoreScene"), {
  ssr: false,
  loading: () => <CanvasLoadingFallback />,
});

function CanvasLoadingFallback() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-surface">
      <div className="flex flex-col items-center gap-2 text-on-surface-variant">
        <span className="material-symbols-outlined animate-spin text-3xl text-teal-600">progress_activity</span>
        <p className="text-sm font-medium">3D店内を読み込んでいます…</p>
      </div>
    </div>
  );
}

function CanvasUnavailableFallback({ message }: { message: string }) {
  return (
    <div className="flex h-full w-full items-center justify-center bg-surface px-6">
      <div className="max-w-sm text-center">
        <span className="material-symbols-outlined text-4xl text-on-surface-variant">warning</span>
        <p className="mt-2 text-sm font-semibold text-on-surface">{message}</p>
        <p className="mt-1 text-xs text-on-surface-variant">
          対応ブラウザ(最新のChrome・Edge・Safariなど)でアクセスすると3D表示をご利用いただけます。
        </p>
      </div>
    </div>
  );
}

// WebGL対応状況は実行中に変わらない値だが、SSR/初回描画とその後の実チェックを安全に
// 一致させるためuseSyncExternalStoreを使う(subscribeは購読対象がないため何もしない)
function subscribeNever(): () => void {
  return () => {};
}

function getWebglSupportSnapshot(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return !!(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

function getWebglSupportServerSnapshot(): boolean {
  return true;
}

interface CanvasErrorBoundaryProps {
  onError: () => void;
  fallback: ReactNode;
  children: ReactNode;
}
interface CanvasErrorBoundaryState {
  hasError: boolean;
}

/** Canvas生成・描画中の予期しない例外を捕まえ、ページ全体のクラッシュを防ぐ */
class CanvasErrorBoundary extends Component<CanvasErrorBoundaryProps, CanvasErrorBoundaryState> {
  state: CanvasErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch() {
    this.props.onError();
  }

  render() {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}

export type StoreNavigation3DProps = {
  destinationId?: string;
  initialMode?: NavigationViewMode;
  className?: string;
  /**
   * 経路帯・案内矢印・目的地マーカーを表示するか。未指定時はtrue(/store-3d-demoはこれまで通り
   * 最初から表示)。/navigate/[productId]では「3D案内を開始」が押されるまでfalseを渡す
   */
  guideVisible?: boolean;
};

/**
 * 店内3Dナビゲーションの最上位コンポーネント。destinationIdの解決・経路計算(lib/store-navigation)
 * と3D描画(StoreScene以下)を分離し、ここではモード・自動デモ再生状態などのUI状態のみを持つ
 */
export default function StoreNavigation3D({
  destinationId,
  initialMode,
  className,
  guideVisible = true,
}: StoreNavigation3DProps) {
  const destination = useMemo(() => resolveDestination(destinationId), [destinationId]);
  const path = useMemo(() => findPath(NAVIGATION_NODES, ENTRANCE_NODE_ID, destination.nodeId), [destination]);

  const [mode, setMode] = useState<NavigationViewMode>(initialMode ?? "first-person");
  const [demoState, setDemoState] = useState<DemoPlaybackState>("idle");
  const [restartSignal, setRestartSignal] = useState(0);
  const [isPointerLocked, setIsPointerLocked] = useState(false);
  const [hasSceneError, setHasSceneError] = useState(false);
  // PCのキーボードとスマホの仮想スティックを共通の移動値へ統合するための共有ref。
  // Canvas内(FirstPersonController)とCanvas外(NavigationOverlay配下のVirtualJoystick)の
  // 両方から参照するためuseFrame毎のReact state更新を避け、ここでuseRefとして保持する
  const movementInputRef = useRef<MovementInput>({ forward: 0, right: 0 });

  const reducedMotion = usePrefersReducedMotion();
  const { showsMobileControls } = useMobileNavControls();
  const webglSupported = useSyncExternalStore(subscribeNever, getWebglSupportSnapshot, getWebglSupportServerSnapshot);

  const canvasStatus: CanvasStatus = !webglSupported ? "unsupported" : hasSceneError ? "error" : "ready";

  // 呼び出し側(検索結果・デモページの目的地選択UIなど)からdestinationIdが変わったときの追従。
  // 初回マウント時は何もしない(initialModeで指定された挙動をそのまま尊重し、勝手に再生しない)。
  // 目的地が変わったときは経路(path)が再計算されるため、自動デモ側は新経路の入口位置へ戻すだけにし、
  // 自動再生はしない(ユーザーが改めて「再生」を押すまでidleのまま待つ)
  const isFirstDestinationRender = useRef(true);
  useEffect(() => {
    if (isFirstDestinationRender.current) {
      isFirstDestinationRender.current = false;
      return;
    }
    setRestartSignal((value) => value + 1);
    setDemoState("idle");
  }, [destination.id]);

  const handleModeChange = (nextMode: NavigationViewMode) => {
    setMode(nextMode);
    if (nextMode === "auto-demo") {
      // 自動デモへ切り替えるたびに入口から再生できる状態に戻す
      setRestartSignal((value) => value + 1);
      setDemoState("idle");
      // 一人称モードから離れる際、仮想スティックの入力が残ったまま自動デモへ移らないようにする
      movementInputRef.current.forward = 0;
      movementInputRef.current.right = 0;
    } else {
      setIsPointerLocked(false);
    }
  };

  const handlePlayOrRestart = () => {
    if (demoState === "arrived") {
      setRestartSignal((value) => value + 1);
    }
    setDemoState("playing");
  };

  const handlePause = () => setDemoState("paused");

  const handleRestart = () => {
    setRestartSignal((value) => value + 1);
    setDemoState("idle");
  };

  const handleArrive = () => setDemoState("arrived");

  return (
    <div className={`relative h-full w-full overflow-hidden bg-surface ${className ?? ""}`}>
      {canvasStatus === "unsupported" ? (
        <CanvasUnavailableFallback message="お使いの環境では3D表示をご利用いただけません。" />
      ) : (
        <CanvasErrorBoundary
          onError={() => setHasSceneError(true)}
          fallback={<CanvasUnavailableFallback message="3D表示の読み込み中に問題が発生しました。" />}
        >
          <StoreSceneLazy
            mode={mode}
            path={path}
            destination={destination}
            isPlaying={demoState === "playing"}
            restartSignal={restartSignal}
            reducedMotion={reducedMotion}
            guideVisible={guideVisible}
            showsMobileControls={showsMobileControls}
            movementInputRef={movementInputRef}
            onArrive={handleArrive}
            onLockChange={setIsPointerLocked}
          />
        </CanvasErrorBoundary>
      )}

      <NavigationOverlay
        destinationLabel={destination.label}
        mode={mode}
        onModeChange={handleModeChange}
        demoState={demoState}
        onPlayOrRestart={handlePlayOrRestart}
        onPause={handlePause}
        onRestart={handleRestart}
        canvasStatus={canvasStatus}
        isPointerLocked={isPointerLocked}
        showsMobileControls={showsMobileControls}
        movementInputRef={movementInputRef}
      />
    </div>
  );
}
