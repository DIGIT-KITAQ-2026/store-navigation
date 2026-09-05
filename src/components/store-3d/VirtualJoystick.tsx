"use client";

import { useCallback, useEffect, useRef } from "react";
import type { MovementInput } from "@/lib/store-navigation/types";

const OUTER_SIZE = 104;
const KNOB_SIZE = 44;
const KNOB_TRAVEL_RADIUS = (OUTER_SIZE - KNOB_SIZE) / 2;
const DEAD_ZONE = 0.12;

interface VirtualJoystickProps {
  /** forward/rightへ書き込む共有ref。FirstPersonController側がuseFrame内で読み取る */
  inputRef: React.RefObject<MovementInput>;
  ariaLabel: string;
}

/**
 * スマホの一人称モード中だけ表示する左下の仮想スティック。Pointer Eventsで専用の
 * pointerIdのみを追跡し(他の指は無視)、入力値はReact stateを介さずuseRefへ直接書き込む。
 * 指を離す/pointercancel/lostpointercapture/window blur/アンマウントのいずれでも必ず0へ戻す
 */
export default function VirtualJoystick({ inputRef, ariaLabel }: VirtualJoystickProps) {
  const baseRef = useRef<HTMLDivElement | null>(null);
  const knobRef = useRef<HTMLDivElement | null>(null);
  const pointerIdRef = useRef<number | null>(null);
  const centerRef = useRef({ x: 0, y: 0 });

  const resetInput = useCallback(() => {
    inputRef.current.forward = 0;
    inputRef.current.right = 0;
    const knob = knobRef.current;
    if (knob) knob.style.transform = "translate(-50%, -50%)";
  }, [inputRef]);

  const applyPointerPosition = useCallback(
    (clientX: number, clientY: number) => {
      const dx = clientX - centerRef.current.x;
      const dy = clientY - centerRef.current.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const clampedDistance = Math.min(distance, KNOB_TRAVEL_RADIUS);
      const angle = Math.atan2(dy, dx);
      const knobX = distance > 0 ? Math.cos(angle) * clampedDistance : 0;
      const knobY = distance > 0 ? Math.sin(angle) * clampedDistance : 0;

      const knob = knobRef.current;
      if (knob) knob.style.transform = `translate(calc(-50% + ${knobX}px), calc(-50% + ${knobY}px))`;

      let normX = knobX / KNOB_TRAVEL_RADIUS;
      let normY = knobY / KNOB_TRAVEL_RADIUS;
      if (Math.sqrt(normX * normX + normY * normY) < DEAD_ZONE) {
        normX = 0;
        normY = 0;
      }

      // 画面上方向(-Y)へのドラッグ=前進、下方向(+Y)=後退
      inputRef.current.right = normX;
      inputRef.current.forward = -normY;
    },
    [inputRef],
  );

  // window blur・アンマウント時は必ず入力を0へ戻す
  useEffect(() => {
    window.addEventListener("blur", resetInput);
    return () => {
      window.removeEventListener("blur", resetInput);
      resetInput();
    };
  }, [resetInput]);

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (pointerIdRef.current !== null) return; // 他の指が既に操作中なら無視する
    const base = baseRef.current;
    if (!base) return;
    const rect = base.getBoundingClientRect();
    centerRef.current = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    pointerIdRef.current = event.pointerId;
    try {
      base.setPointerCapture(event.pointerId);
    } catch {
      // Safari等で失敗しても操作自体は継続できるため無視する
    }
    applyPointerPosition(event.clientX, event.clientY);
    event.preventDefault();
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (pointerIdRef.current !== event.pointerId) return;
    applyPointerPosition(event.clientX, event.clientY);
    event.preventDefault();
  };

  const endPointer = (event: React.PointerEvent<HTMLDivElement>) => {
    if (pointerIdRef.current !== event.pointerId) return;
    pointerIdRef.current = null;
    const base = baseRef.current;
    if (base) {
      try {
        base.releasePointerCapture(event.pointerId);
      } catch {
        // すでに解放済み等は無視する
      }
    }
    resetInput();
  };

  return (
    <div
      ref={baseRef}
      aria-label={ariaLabel}
      data-no-look-control="true"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endPointer}
      onPointerCancel={endPointer}
      onLostPointerCapture={endPointer}
      className="pointer-events-auto relative shrink-0 select-none overscroll-contain rounded-full border-2 border-teal-600/50 bg-white/70 shadow-md"
      style={{ width: OUTER_SIZE, height: OUTER_SIZE, touchAction: "none" }}
    >
      <div
        ref={knobRef}
        className="pointer-events-none absolute left-1/2 top-1/2 rounded-full border border-teal-700/60 bg-teal-500/85"
        style={{ width: KNOB_SIZE, height: KNOB_SIZE, transform: "translate(-50%, -50%)" }}
      />
    </div>
  );
}
