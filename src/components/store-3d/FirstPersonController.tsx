"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { COLLISION_BOUNDS, EYE_HEIGHT, PLAYER_RADIUS, STORE_FLOOR } from "@/lib/store-navigation/store-layout";
import { POINTER_LOCK_TRIGGER_ID } from "./NavigationOverlay";
import type { MovementInput, Vector3Tuple } from "@/lib/store-navigation/types";

const MOVE_SPEED = 3.2; // units/sec
const MAX_DELTA = 0.1; // sec。タブ切り替え復帰直後などの巨大なdeltaを制限する
const MOUSE_SENSITIVITY = 0.0022;
const MAX_PITCH = (85 * Math.PI) / 180;

// スマホの1本指スワイプ視点操作。マウスよりわずかに高い感度にしつつ、
// 素早いフリックでも視点が飛びすぎないようpointermoveごとのdeltaへ上限を設ける
const TOUCH_LOOK_SENSITIVITY = 0.0032;
const MAX_TOUCH_POINTER_DELTA = 60; // px

function clampTouchDelta(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(-MAX_TOUCH_POINTER_DELTA, Math.min(MAX_TOUCH_POINTER_DELTA, value));
}

function sanitizeAxisInput(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(-1, Math.min(1, value));
}

interface KeyState {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
}

function createKeyState(): KeyState {
  return { forward: false, backward: false, left: false, right: false };
}

function isFormElement(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable;
}

function collidesWithShelf(x: number, z: number): boolean {
  return COLLISION_BOUNDS.some(
    (bounds) =>
      x > bounds.minX - PLAYER_RADIUS &&
      x < bounds.maxX + PLAYER_RADIUS &&
      z > bounds.minZ - PLAYER_RADIUS &&
      z < bounds.maxZ + PLAYER_RADIUS,
  );
}

function clampToStoreBounds(x: number, z: number): [number, number] {
  const clampedX = Math.min(STORE_FLOOR.maxX - PLAYER_RADIUS, Math.max(STORE_FLOOR.minX + PLAYER_RADIUS, x));
  const clampedZ = Math.min(STORE_FLOOR.maxZ - PLAYER_RADIUS, Math.max(STORE_FLOOR.minZ + PLAYER_RADIUS, z));
  return [clampedX, clampedZ];
}

interface FirstPersonControllerProps {
  spawnPosition: Vector3Tuple;
  onLockChange?: (locked: boolean) => void;
  /** スマホ操作UIを使うか。trueの間はPointer Lockを一切要求せず、常時操作可能な状態にする */
  showsMobileControls: boolean;
  /** 仮想スティックが書き込む共有ref(VirtualJoystick側)。forward/rightをそのまま毎フレーム読む */
  movementInputRef: React.RefObject<MovementInput>;
}

/**
 * 一人称操作。PCはWASD/矢印キー+ブラウザ標準のPointer Lock API
 * (gl.domElement.requestPointerLock/exitPointerLock)とmousemoveのmovementX/Yで視点操作する。
 * スマホはPointer Lockを要求せず、1本指スワイプ(Pointer Events)で視点操作、
 * 仮想スティック(movementInputRef経由)で移動する。X/Z方向を個別に判定する簡易AABB衝突判定は共通で使い、
 * 店舗外へは出られない
 */
export default function FirstPersonController({
  spawnPosition,
  onLockChange,
  showsMobileControls,
  movementInputRef,
}: FirstPersonControllerProps) {
  const { camera, gl } = useThree();
  const keysRef = useRef<KeyState>(createKeyState());
  const yawRef = useRef(0);
  const pitchRef = useRef(0);
  const [pointerLockSupported] = useState(
    () =>
      typeof document !== "undefined" &&
      typeof gl.domElement.requestPointerLock === "function" &&
      typeof document.exitPointerLock === "function",
  );
  const isLockedRef = useRef(false);
  const touchLookPointerIdRef = useRef<number | null>(null);
  const touchLookLastPosRef = useRef({ x: 0, y: 0 });

  const forwardRef = useRef(new THREE.Vector3());
  const rightRef = useRef(new THREE.Vector3());

  const setLocked = (locked: boolean) => {
    isLockedRef.current = locked;
    onLockChange?.(locked);
  };

  // 開始直後の視線をspawnPositionでのlookAt相当(Z+方向)に合わせるため、
  // yaw/pitchの初期値をカメラの現在向きから計算しておく
  useEffect(() => {
    camera.position.set(spawnPosition[0], EYE_HEIGHT, spawnPosition[2]);
    camera.rotation.reorder("YXZ");
    camera.lookAt(spawnPosition[0], EYE_HEIGHT, spawnPosition[2] + 10);
    yawRef.current = camera.rotation.y;
    pitchRef.current = camera.rotation.x;
    // 初回マウント(=一人称モードに切り替えた瞬間)にのみ入口付近へスポーンさせる
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 「クリックして視点操作を開始」ボタンの明示的なclickイベント内だけでrequestPointerLock()を呼ぶ。
  // スマホではこのボタン自体を表示しない(NavigationOverlay側)が、念のためここでも二重に防ぐ
  useEffect(() => {
    if (!pointerLockSupported || showsMobileControls) return;

    const handleTriggerClick = (event: MouseEvent) => {
      if (showsMobileControls) return;
      if (isLockedRef.current) return;
      if (document.pointerLockElement) return;
      const target = event.target;
      if (!(target instanceof Element) || !target.closest(`#${POINTER_LOCK_TRIGGER_ID}`)) return;

      const result = gl.domElement.requestPointerLock() as unknown;
      if (result instanceof Promise) {
        result.catch(() => {
          setLocked(false);
        });
      }
    };

    document.addEventListener("click", handleTriggerClick);
    return () => document.removeEventListener("click", handleTriggerClick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pointerLockSupported, showsMobileControls, gl]);

  // pointerlockchange/pointerlockerrorでロック状態とキー状態を同期する
  useEffect(() => {
    if (!pointerLockSupported) return;

    const handlePointerLockChange = () => {
      const locked = document.pointerLockElement === gl.domElement;
      setLocked(locked);
      if (!locked) {
        keysRef.current = createKeyState();
      }
    };

    const handlePointerLockError = () => {
      setLocked(false);
      keysRef.current = createKeyState();
    };

    document.addEventListener("pointerlockchange", handlePointerLockChange);
    document.addEventListener("pointerlockerror", handlePointerLockError);
    return () => {
      document.removeEventListener("pointerlockchange", handlePointerLockChange);
      document.removeEventListener("pointerlockerror", handlePointerLockError);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pointerLockSupported, gl]);

  // Pointer Lock中だけmousemoveを見てyaw/pitchを更新する(毎フレームのReact state更新はしない)
  useEffect(() => {
    if (!pointerLockSupported) return;

    const handleMouseMove = (event: MouseEvent) => {
      if (document.pointerLockElement !== gl.domElement) return;
      yawRef.current -= event.movementX * MOUSE_SENSITIVITY;
      pitchRef.current = Math.min(
        MAX_PITCH,
        Math.max(-MAX_PITCH, pitchRef.current - event.movementY * MOUSE_SENSITIVITY),
      );
    };

    document.addEventListener("mousemove", handleMouseMove);
    return () => document.removeEventListener("mousemove", handleMouseMove);
  }, [pointerLockSupported, gl]);

  // スマホの1本指スワイプ視点操作。Pointer Eventsをcanvas要素(gl.domElement)にだけ
  // 登録するため、button/a/カード/仮想スティックなど別DOM上のUI要素のタップはそもそも
  // ここへ届かない(dreiのHtmlも別要素へportalされる)。pointerType==="touch"かつ
  // 追跡中の指が無い場合のみ新規に追跡を始め、1本指のみを対象にする。
  // touch-action/overscroll-behaviorはgl.domElementを直接書き換えず、StoreScene.tsx側で
  // Canvasのstyle propとして一人称モード中だけ適用する(hookの戻り値を直接変更しないため)
  useEffect(() => {
    if (!showsMobileControls) return;
    const element = gl.domElement;
    if (typeof window === "undefined" || typeof window.PointerEvent === "undefined") return;

    const endTouchLook = () => {
      touchLookPointerIdRef.current = null;
    };

    const handlePointerDown = (event: PointerEvent) => {
      if (event.pointerType !== "touch") return;
      if (touchLookPointerIdRef.current !== null) return;
      touchLookPointerIdRef.current = event.pointerId;
      touchLookLastPosRef.current = { x: event.clientX, y: event.clientY };
      try {
        element.setPointerCapture(event.pointerId);
      } catch {
        // Safari等で失敗しても操作自体は継続できるため無視する
      }
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (event.pointerType !== "touch") return;
      if (touchLookPointerIdRef.current !== event.pointerId) return;
      const last = touchLookLastPosRef.current;
      const dx = clampTouchDelta(event.clientX - last.x);
      const dy = clampTouchDelta(event.clientY - last.y);
      touchLookLastPosRef.current = { x: event.clientX, y: event.clientY };

      yawRef.current -= dx * TOUCH_LOOK_SENSITIVITY;
      pitchRef.current = Math.min(MAX_PITCH, Math.max(-MAX_PITCH, pitchRef.current - dy * TOUCH_LOOK_SENSITIVITY));
    };

    const handlePointerEnd = (event: PointerEvent) => {
      if (touchLookPointerIdRef.current !== event.pointerId) return;
      try {
        element.releasePointerCapture(event.pointerId);
      } catch {
        // すでに解放済みの場合は無視する
      }
      endTouchLook();
    };

    element.addEventListener("pointerdown", handlePointerDown);
    element.addEventListener("pointermove", handlePointerMove);
    element.addEventListener("pointerup", handlePointerEnd);
    element.addEventListener("pointercancel", handlePointerEnd);
    element.addEventListener("lostpointercapture", handlePointerEnd);

    return () => {
      element.removeEventListener("pointerdown", handlePointerDown);
      element.removeEventListener("pointermove", handlePointerMove);
      element.removeEventListener("pointerup", handlePointerEnd);
      element.removeEventListener("pointercancel", handlePointerEnd);
      element.removeEventListener("lostpointercapture", handlePointerEnd);
      endTouchLook();
    };
  }, [showsMobileControls, gl]);

  // 自動デモへ切り替える(=このコンポーネントがアンマウントされる)際、
  // ロックが残っていれば安全に解除する
  useEffect(() => {
    return () => {
      if (
        typeof document !== "undefined" &&
        typeof document.exitPointerLock === "function" &&
        document.pointerLockElement === gl.domElement
      ) {
        document.exitPointerLock();
      }
    };
  }, [gl]);

  useEffect(() => {
    const resetKeys = () => {
      keysRef.current = createKeyState();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isLockedRef.current || isFormElement(event.target)) return;
      switch (event.code) {
        case "KeyW":
        case "ArrowUp":
          keysRef.current.forward = true;
          event.preventDefault();
          break;
        case "KeyS":
        case "ArrowDown":
          keysRef.current.backward = true;
          event.preventDefault();
          break;
        case "KeyA":
        case "ArrowLeft":
          keysRef.current.left = true;
          event.preventDefault();
          break;
        case "KeyD":
        case "ArrowRight":
          keysRef.current.right = true;
          event.preventDefault();
          break;
        default:
          break;
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      switch (event.code) {
        case "KeyW":
        case "ArrowUp":
          keysRef.current.forward = false;
          break;
        case "KeyS":
        case "ArrowDown":
          keysRef.current.backward = false;
          break;
        case "KeyA":
        case "ArrowLeft":
          keysRef.current.left = false;
          break;
        case "KeyD":
        case "ArrowRight":
          keysRef.current.right = false;
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", resetKeys);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", resetKeys);
    };
  }, []);

  useFrame((_, delta) => {
    // PCはPointer Lock中のみ、スマホはこのコンポーネントがマウントされている(=一人称モード中)
    // 常時アクティブにする(Pointer Lockという概念自体が無いため)
    const active = isLockedRef.current || showsMobileControls;
    if (!active) return;

    camera.rotation.set(pitchRef.current, yawRef.current, 0, "YXZ");
    camera.position.setY(EYE_HEIGHT);

    // PCのキーボード入力とスマホの仮想スティック入力(movementInputRef)を共通のforward/right値へ統合する
    const keys = keysRef.current;
    const joystick = movementInputRef.current;
    const forwardInput = sanitizeAxisInput((keys.forward ? 1 : 0) - (keys.backward ? 1 : 0) + joystick.forward);
    const rightInput = sanitizeAxisInput((keys.right ? 1 : 0) - (keys.left ? 1 : 0) + joystick.right);
    if (forwardInput === 0 && rightInput === 0) return;

    const clampedDelta = Math.min(delta, MAX_DELTA);

    const forward = forwardRef.current;
    camera.getWorldDirection(forward);
    forward.y = 0;
    if (forward.lengthSq() < 1e-8) return;
    forward.normalize();

    const right = rightRef.current;
    right.crossVectors(forward, camera.up).normalize();

    let moveX = forward.x * forwardInput + right.x * rightInput;
    let moveZ = forward.z * forwardInput + right.z * rightInput;
    const moveLengthSq = moveX * moveX + moveZ * moveZ;
    if (moveLengthSq > 1) {
      const moveLength = Math.sqrt(moveLengthSq);
      moveX /= moveLength;
      moveZ /= moveLength;
    }

    const step = MOVE_SPEED * clampedDelta;
    const currentX = camera.position.x;
    const currentZ = camera.position.z;

    const candidateX = currentX + moveX * step;
    if (!collidesWithShelf(candidateX, currentZ)) {
      camera.position.setX(clampToStoreBounds(candidateX, currentZ)[0]);
    }

    const candidateZ = currentZ + moveZ * step;
    if (!collidesWithShelf(camera.position.x, candidateZ)) {
      camera.position.setZ(clampToStoreBounds(camera.position.x, candidateZ)[1]);
    }
  });

  return null;
}
