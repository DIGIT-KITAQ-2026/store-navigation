"use client";

import { Suspense, useCallback, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import type { MovementInput, Vector3Tuple } from "@/lib/store-navigation/types";
import { EYE_HEIGHT, type RealisticLayout } from "@/lib/store-navigation/realistic-store-layout";
import { normalizeRealisticShelfId } from "@/lib/store-navigation/realistic-store-ids";
import useMobileNavControls from "@/lib/useMobileNavControls";
import usePrefersReducedMotion from "@/lib/usePrefersReducedMotion";
import RealisticStoreControls, { type Playback } from "./RealisticStoreControls";
import NavigationRoute from "@/components/store-3d/NavigationRoute";
import DestinationMarker from "@/components/store-3d/DestinationMarker";
import RealisticStoreModel from "./RealisticStoreModel";
import PreviewController from "./PreviewController";
import RealisticAutoCamera, { type GuideCommand } from "./RealisticAutoCamera";

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
    <div data-realistic-store className="relative flex h-full w-full flex-col overflow-hidden" style={{ containerType: "inline-size", containerName: "store-view" }}>
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
        <RealisticStoreControls selected={selected} mode={mode} playback={playback} ready={!!layout} switching={switching}
          mobile={showsMobileControls} locked={locked} pointerLock={supportsPointerLock && !lockFailed} movement={movement}
          onSelect={(id) => {
            setSelected(normalizeRealisticShelfId(id)); setCommand({ kind: "current" });
            if (playback !== "playing") setPlayback("idle");
          }}
          onManual={() => { setPlayback("idle"); setMode("manual"); }}
          onAuto={() => { if (mode !== "auto") void changeControl(() => { setMode("auto"); setPlayback("idle"); }); }}
          onStart={start} onPause={() => setPlayback("paused")}
          onReplay={() => resetToEntrance("replay")} onEntrance={() => resetToEntrance("entrance")} />
      </div>
    </div>
  );
}
