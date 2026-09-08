"use client";

import { useEffect, useRef, type RefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Vector3 } from "three";
import { EYE_HEIGHT } from "@/lib/store-navigation/store-layout";
import type { MovementInput } from "@/lib/store-navigation/types";
import { moveWithinLayout, type RealisticLayout } from "@/lib/store-navigation/realistic-store-layout";
import { computeWalkAxes, shouldTrackWalkKeyDown } from "@/lib/store-navigation/keyboardMovement";

export const PREVIEW_LOCK_ID = "realistic-store-start";

// Deliberately independent of the legacy layout's collision bounds and navigation graph.
export default function PreviewController({ mobile, movement, onLockChange, onLockError, layout }: {
  mobile: boolean; movement: RefObject<MovementInput>;
  onLockChange: (locked: boolean) => void; onLockError: () => void;
  layout: RealisticLayout;
}) {
  const { camera, gl } = useThree();
  const keys = useRef(new Set<string>());
  const forward = useRef(new Vector3());
  const right = useRef(new Vector3());

  useEffect(() => {
    const element = gl.domElement;
    const pressed = keys.current;
    let drag: { id: number; x: number; y: number } | null = null;
    const clear = () => { pressed.clear(); drag = null; };
    const lockChange = () => { clear(); onLockChange(document.pointerLockElement === element); };
    const lockError = () => { clear(); onLockChange(false); onLockError(); };
    const start = (event: MouseEvent) => {
      if (mobile || !(event.target instanceof Element) || !event.target.closest(`#${PREVIEW_LOCK_ID}`)) return;
      if (document.pointerLockElement || !element.requestPointerLock) return;
      try { Promise.resolve(element.requestPointerLock()).catch(lockError); } catch { lockError(); }
    };
    const look = (dx: number, dy: number, sensitivity: number) => {
      camera.rotation.y -= Math.max(-60, Math.min(60, dx)) * sensitivity;
      camera.rotation.x = Math.max(-Math.PI * 85 / 180, Math.min(Math.PI * 85 / 180, camera.rotation.x - Math.max(-60, Math.min(60, dy)) * sensitivity));
    };
    const mouseMove = (e: MouseEvent) => { if (document.pointerLockElement === element) look(e.movementX, e.movementY, 0.0022); };
    const down = (e: PointerEvent) => {
      if (drag || document.pointerLockElement === element || (e.pointerType === "mouse" && e.button !== 0)) return;
      drag = { id: e.pointerId, x: e.clientX, y: e.clientY };
      try { element.setPointerCapture(e.pointerId); } catch { drag = null; }
    };
    const move = (e: PointerEvent) => {
      if (!drag || e.pointerId !== drag.id) return;
      look(e.clientX - drag.x, e.clientY - drag.y, e.pointerType === "touch" ? 0.0032 : 0.0022);
      drag.x = e.clientX; drag.y = e.clientY;
    };
    const up = (e: PointerEvent) => {
      if (drag?.id !== e.pointerId) return;
      drag = null;
      if (element.hasPointerCapture(e.pointerId)) element.releasePointerCapture(e.pointerId);
    };
    const keyDown = (e: KeyboardEvent) => {
      if (!shouldTrackWalkKeyDown(e, document.pointerLockElement === element)) return;
      e.preventDefault(); pressed.add(e.code);
    };
    const keyUp = (e: KeyboardEvent) => { pressed.delete(e.code); };
    const visibility = () => { if (document.hidden) clear(); };
    document.addEventListener("click", start);
    document.addEventListener("pointerlockchange", lockChange);
    document.addEventListener("pointerlockerror", lockError);
    document.addEventListener("mousemove", mouseMove);
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("keydown", keyDown); window.addEventListener("keyup", keyUp); window.addEventListener("blur", clear);
    element.addEventListener("pointerdown", down); element.addEventListener("pointermove", move);
    element.addEventListener("pointerup", up); element.addEventListener("pointercancel", up); element.addEventListener("lostpointercapture", up);
    return () => {
      clear();
      document.removeEventListener("click", start);
      document.removeEventListener("pointerlockchange", lockChange);
      document.removeEventListener("pointerlockerror", lockError);
      document.removeEventListener("mousemove", mouseMove);
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("keydown", keyDown); window.removeEventListener("keyup", keyUp); window.removeEventListener("blur", clear);
      element.removeEventListener("pointerdown", down); element.removeEventListener("pointermove", move);
      element.removeEventListener("pointerup", up); element.removeEventListener("pointercancel", up); element.removeEventListener("lostpointercapture", up);
      if (document.pointerLockElement === element) document.exitPointerLock();
      onLockChange(false);
    };
  }, [camera, gl, mobile, movement, onLockChange, onLockError]);

  useFrame((_, delta) => {
    if (document.hidden || (!mobile && document.pointerLockElement !== gl.domElement)) return;
    const { forward: f, right: r } = computeWalkAxes(keys.current, mobile, movement.current);
    if (!Number.isFinite(f) || !Number.isFinite(r)) return;
    camera.getWorldDirection(forward.current); forward.current.y = 0; forward.current.normalize();
    right.current.crossVectors(forward.current, camera.up).normalize();
    const step = 3.2 * Math.min(delta, 0.1) / Math.max(1, Math.hypot(f, r));
    const position = moveWithinLayout(layout, [camera.position.x, EYE_HEIGHT, camera.position.z],
      (forward.current.x * f + right.current.x * r) * step,
      (forward.current.z * f + right.current.z * r) * step);
    camera.position.set(position[0], EYE_HEIGHT, position[2]);
  });
  return null;
}
