import type { MovementInput } from "./types";

/** 一人称歩行で使う移動キーの物理位置。event.codeで判定するため、キー配列やIME変換の影響を受けない */
export const WALK_KEY_CODES: ReadonlySet<string> = new Set([
  "KeyW", "KeyA", "KeyS", "KeyD",
  "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight",
]);

export function isWalkKeyCode(code: string): boolean {
  return WALK_KEY_CODES.has(code);
}

/** DOM(HTMLElement)に依存せずNode環境でもテストできるよう、tagName/isContentEditableのみを見る */
interface TypingTargetLike {
  tagName?: string;
  isContentEditable?: boolean;
}

/** input/textarea/select/contenteditable編集中は、歩行キーとして奪わない */
export function isTypingTarget(target: EventTarget | null): boolean {
  const el = target as TypingTargetLike | null;
  if (!el) return false;
  return el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable === true;
}

export interface WalkKeyDownEvent {
  code: string;
  isComposing?: boolean;
  target: EventTarget | null;
}

/** Pointer Lock中でも、IME変換中やフォーム要素編集中のキー入力は歩行に反映しない */
export function shouldTrackWalkKeyDown(event: WalkKeyDownEvent, locked: boolean): boolean {
  return locked && isWalkKeyCode(event.code) && !event.isComposing && !isTypingTarget(event.target);
}

export function computeWalkAxes(pressed: ReadonlySet<string>, mobile: boolean, movement: MovementInput): MovementInput {
  const forward = Number(pressed.has("KeyW") || pressed.has("ArrowUp")) - Number(pressed.has("KeyS") || pressed.has("ArrowDown")) + (mobile ? movement.forward : 0);
  const right = Number(pressed.has("KeyD") || pressed.has("ArrowRight")) - Number(pressed.has("KeyA") || pressed.has("ArrowLeft")) + (mobile ? movement.right : 0);
  return { forward, right };
}
