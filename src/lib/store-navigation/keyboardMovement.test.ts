import assert from "node:assert/strict";
import test from "node:test";
import { computeWalkAxes, isTypingTarget, isWalkKeyCode, shouldTrackWalkKeyDown } from "./keyboardMovement";

const noMovement = { forward: 0, right: 0 };
const target = (tagName: string, isContentEditable = false) => ({ tagName, isContentEditable }) as unknown as EventTarget;

test("KeyWで前進", () => {
  assert.deepEqual(computeWalkAxes(new Set(["KeyW"]), false, noMovement), { forward: 1, right: 0 });
});

test("KeyAで左移動", () => {
  assert.deepEqual(computeWalkAxes(new Set(["KeyA"]), false, noMovement), { forward: 0, right: -1 });
});

test("KeySで後退", () => {
  assert.deepEqual(computeWalkAxes(new Set(["KeyS"]), false, noMovement), { forward: -1, right: 0 });
});

test("KeyDで右移動", () => {
  assert.deepEqual(computeWalkAxes(new Set(["KeyD"]), false, noMovement), { forward: 0, right: 1 });
});

test("矢印キーもWASDと同じ軸を動かす", () => {
  assert.deepEqual(computeWalkAxes(new Set(["ArrowUp"]), false, noMovement), { forward: 1, right: 0 });
  assert.deepEqual(computeWalkAxes(new Set(["ArrowDown"]), false, noMovement), { forward: -1, right: 0 });
  assert.deepEqual(computeWalkAxes(new Set(["ArrowLeft"]), false, noMovement), { forward: 0, right: -1 });
  assert.deepEqual(computeWalkAxes(new Set(["ArrowRight"]), false, noMovement), { forward: 0, right: 1 });
});

test("keyupで解除: Setから消えたキーは移動に反映されない", () => {
  const pressed = new Set(["KeyW"]);
  pressed.delete("KeyW"); // keyupハンドラ相当
  assert.deepEqual(computeWalkAxes(pressed, false, noMovement), { forward: 0, right: 0 });
});

test("windowのblur/documentのhidden解除相当: 空集合なら移動しない", () => {
  assert.deepEqual(computeWalkAxes(new Set(), false, noMovement), { forward: 0, right: 0 });
});

test("スマートフォンの仮想スティック入力は歩行キーと加算される", () => {
  assert.deepEqual(computeWalkAxes(new Set(["KeyW"]), true, { forward: 0.5, right: -0.2 }), { forward: 1.5, right: -0.2 });
  assert.deepEqual(computeWalkAxes(new Set(), true, { forward: 0.5, right: -0.2 }), { forward: 0.5, right: -0.2 });
});

test("PCモードでは仮想スティック値を無視する", () => {
  assert.deepEqual(computeWalkAxes(new Set(["KeyW"]), false, { forward: 0.5, right: -0.2 }), { forward: 1, right: 0 });
});

test("isWalkKeyCode: WASDと矢印キーのみ歩行キー扱いする", () => {
  for (const code of ["KeyW", "KeyA", "KeyS", "KeyD", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"]) {
    assert.equal(isWalkKeyCode(code), true, code);
  }
  for (const code of ["KeyE", "Space", "Escape", "ShiftLeft", ""]) {
    assert.equal(isWalkKeyCode(code), false, code);
  }
});

test("isTypingTarget: input/textarea/select/contenteditable編集中を検出する", () => {
  assert.equal(isTypingTarget(target("INPUT")), true);
  assert.equal(isTypingTarget(target("TEXTAREA")), true);
  assert.equal(isTypingTarget(target("SELECT")), true);
  assert.equal(isTypingTarget(target("DIV", true)), true);
  assert.equal(isTypingTarget(target("DIV")), false);
  assert.equal(isTypingTarget(target("CANVAS")), false);
  assert.equal(isTypingTarget(null), false);
});

test("shouldTrackWalkKeyDown: Pointer Lock中かつ歩行キーのみ許可する", () => {
  const event = { code: "KeyW", target: target("CANVAS") };
  assert.equal(shouldTrackWalkKeyDown(event, true), true);
  assert.equal(shouldTrackWalkKeyDown(event, false), false); // Pointer Lock未取得
  assert.equal(shouldTrackWalkKeyDown({ code: "KeyE", target: target("CANVAS") }, true), false); // 対象外キー
});

test("shouldTrackWalkKeyDown: inputにフォーカス中は移動しない", () => {
  assert.equal(shouldTrackWalkKeyDown({ code: "KeyW", target: target("INPUT") }, true), false);
});

test("shouldTrackWalkKeyDown: textareaにフォーカス中は移動しない", () => {
  assert.equal(shouldTrackWalkKeyDown({ code: "KeyA", target: target("TEXTAREA") }, true), false);
});

test("shouldTrackWalkKeyDown: contenteditable編集中は移動しない", () => {
  assert.equal(shouldTrackWalkKeyDown({ code: "KeyS", target: target("DIV", true) }, true), false);
});

test("shouldTrackWalkKeyDown: 日本語入力のcomposition中は誤動作しない", () => {
  assert.equal(shouldTrackWalkKeyDown({ code: "KeyD", target: target("CANVAS"), isComposing: true }, true), false);
  assert.equal(shouldTrackWalkKeyDown({ code: "KeyD", target: target("CANVAS"), isComposing: false }, true), true);
});
