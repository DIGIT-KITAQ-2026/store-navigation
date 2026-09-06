"use client";

import { Suspense, useCallback, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import type { MovementInput, Vector3Tuple } from "@/lib/store-navigation/types";
import { EYE_HEIGHT, type RealisticLayout } from "@/lib/store-navigation/realistic-store-layout";
import { normalizeRealisticShelfId, REALISTIC_CATEGORIES, REALISTIC_SHELF_IDS } from "@/lib/store-navigation/realistic-store-ids";
import useMobileNavControls from "@/lib/useMobileNavControls";
import usePrefersReducedMotion from "@/lib/usePrefersReducedMotion";
import VirtualJoystick from "@/components/store-3d/VirtualJoystick";
import NavigationRoute from "@/components/store-3d/NavigationRoute";
import DestinationMarker from "@/components/store-3d/DestinationMarker";
import RealisticStoreModel from "./RealisticStoreModel";
import PreviewController, { PREVIEW_LOCK_ID } from "./PreviewController";
import RealisticAutoCamera, { type GuideCommand } from "./RealisticAutoCamera";

type Playback = "idle" | "playing" | "paused" | "arrived" | "blocked";
const statusText: Record<Playback, string> = { idle: "案内待機", playing: "案内中", paused: "一時停止中", arrived: "目的地手前に到着しました", blocked: "安全な経路への接続または操作の切り替えを確認できず停止しました。再試行するか「入口へ戻る」を選んでください。" };
const buttonClass = "rounded border bg-white px-3 py-2 disabled:opacity-40";

export default function RealisticStoreScene({ initialShelfId }: { initialShelfId?: string }) {
  const [layout, setLayout] = useState<RealisticLayout | null>(null);
  const [selected, setSelected] = useState(() => normalizeRealisticShelfId(initialShelfId));
  const [mode, setMode] = useState<"manual" | "auto">("manual");
  const [playback, setPlayback] = useState<Playback>("idle");
  const [locked, setLocked] = useState(false);
  const [lockFailed, setLockFailed] = useState(false);
  const [command, setCommand] = useState<GuideCommand | null>(null);
  const [path, setPath] = useState<Vector3Tuple[]>([]);
  const [switching, setSwitching] = useState(false);
  const movement = useRef<MovementInput>({ forward: 0, right: 0 });
  const { showsMobileControls, supportsPointerLock } = useMobileNavControls();
  const reducedMotion = usePrefersReducedMotion();
  const onReady = useCallback((value: RealisticLayout) => setLayout(value), []);
  const onLockError = useCallback(() => setLockFailed(true), []);
  const onArrive = useCallback(() => setPlayback("arrived"), []);
  const onBlocked = useCallback(() => setPlayback("blocked"), []);
  const changeControl = async (action: () => void) => {
    if (switching) return;
    movement.current.forward = 0; movement.current.right = 0;
    if (document.pointerLockElement?.closest("[data-realistic-store]")) {
      setSwitching(true);
      const unlocked = await new Promise<boolean>((resolve) => {
        const finish = (ok: boolean) => { clearTimeout(timer); document.removeEventListener("pointerlockchange", changed); resolve(ok); };
        const changed = () => { if (!document.pointerLockElement) finish(true); };
        const timer = window.setTimeout(() => finish(false), 2000);
        document.addEventListener("pointerlockchange", changed);
        try { document.exitPointerLock(); } catch { finish(false); }
      });
      setSwitching(false);
      if (!unlocked) { setPlayback("blocked"); return; }
    }
    setLocked(false); action();
  };
  const start = () => void changeControl(() => {
    if (mode !== "auto" || playback !== "paused") setCommand({ kind: "current" });
    setMode("auto");
    setPlayback("playing");
  });
  const resetToEntrance = (kind: "replay" | "entrance") => void changeControl(() => {
    setPlayback(kind === "replay" ? "playing" : "idle");
    setMode(kind === "replay" ? "auto" : "manual");
    setCommand({ kind });
  });
  return (
    <div data-realistic-store className="relative flex h-full w-full flex-col overflow-hidden">
      <div className="flex max-h-[45%] shrink-0 flex-wrap items-center gap-2 overflow-y-auto bg-white/95 p-3 text-sm">
        <label>目的地 <select value={selected ?? ""} disabled={!layout || switching}
          onChange={(event) => {
            setSelected(normalizeRealisticShelfId(event.target.value)); setCommand({ kind: "current" });
            if (playback !== "playing") setPlayback("idle");
          }}
          className="rounded border p-2">
          <option value="">選択してください</option>
          {REALISTIC_SHELF_IDS.map((id) => <option key={id} value={id}>{REALISTIC_CATEGORIES[id]} ({id})</option>)}
        </select></label>
        <button disabled={!layout || !selected || switching || playback === "playing"} onClick={start} className={buttonClass}>{playback === "paused" ? "再開" : "自動案内開始"}</button>
        <button disabled={playback !== "playing"} onClick={() => setPlayback("paused")} className={buttonClass}>一時停止</button>
        <button disabled={!layout || !selected || switching} onClick={() => resetToEntrance("replay")} className={buttonClass}>最初から再生</button>
        <button disabled={!layout || switching} onClick={() => resetToEntrance("entrance")} className={buttonClass}>入口へ戻る</button>
        {mode !== "manual" && <button onClick={() => { setPlayback("idle"); setMode("manual"); }} className={buttonClass}>手動操作へ</button>}
        {layout && mode === "manual" && !showsMobileControls && supportsPointerLock && !locked && <button id={PREVIEW_LOCK_ID} className="rounded bg-teal-700 px-3 py-2 text-white">手動操作開始</button>}
        <p role="status" className="w-full">
          {!selected ? "場所情報を確認できません。目的地を選択するか、検索画面へ戻ってください。" : `${REALISTIC_CATEGORIES[selected]}：${statusText[playback]}`}
        </p>
        <p className="w-full text-xs">{mode === "manual" ? (showsMobileControls ? "スティックで移動・画面をスワイプして見回す" : "WASD／矢印キーで移動・マウスで見回す・Escで解除") : "自動案内は現在位置から開始します。「最初から再生」を選ぶと入口から案内します。"}</p>
        {!showsMobileControls && (!supportsPointerLock || lockFailed) && <p className="w-full text-xs">視点の固定を利用できない場合は、画面のドラッグで見回せます。</p>}
      </div>
      <div className="relative min-h-0 flex-1">
        <Canvas dpr={[1, 1.5]} gl={{ antialias: true }}
          camera={{ position: [18, EYE_HEIGHT, 13.8], rotation: [0, 0, 0], fov: 60, near: 0.1, far: 100 }} style={{ touchAction: "none" }}
          fallback={<p role="alert" className="p-6">このブラウザでは3D表示を利用できません。</p>}>
          <color attach="background" args={["#e8e5dd"]} />
          <hemisphereLight args={["#fffaf0", "#d8e0e6", 0.9]} /><ambientLight intensity={0.35} />
          <directionalLight position={[18, 10, 4]} intensity={0.6} />
          <Suspense fallback={<Html center><p role="status" className="whitespace-nowrap rounded bg-white px-4 py-2">店舗と経路を準備しています…</p></Html>}>
            <RealisticStoreModel onReady={onReady} />
            {layout && <>
              {path.length > 1 && <NavigationRoute path={path} reducedMotion={reducedMotion} />}
              {selected && <DestinationMarker position={layout.destinations[selected]} reducedMotion={reducedMotion} />}
              {mode === "manual" && <PreviewController mobile={showsMobileControls} movement={movement}
                layout={layout} onLockChange={setLocked} onLockError={onLockError} />}
              <RealisticAutoCamera destination={selected} layout={layout} playing={mode === "auto" && playback === "playing"} command={command}
                reducedMotion={reducedMotion} onArrive={onArrive} onBlocked={onBlocked} onPath={setPath} />
            </>}
          </Suspense>
        </Canvas>
        {layout && mode === "manual" && showsMobileControls && <div className="absolute bottom-6 left-4"><VirtualJoystick inputRef={movement} ariaLabel="店舗内の視点を移動" /></div>}
      </div>
    </div>
  );
}
