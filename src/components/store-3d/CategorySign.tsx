"use client";

import { useRef } from "react";
import { Html } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import type { Vector3Tuple } from "@/lib/store-navigation/types";

export interface CategorySignProps {
  label: string;
  color: string;
  position: Vector3Tuple;
  /** 現在の目的地のサインか。trueの間は常に表示し、距離によるフェード対象にしない */
  isDestination?: boolean;
  /**
   * スマホ判定。trueの場合のみ、目的地以外のサインをカメラからのXZ距離に応じてフェード/非表示にする。
   * falseの場合(PC)は従来通り常時フル表示のまま変更しない
   */
  dimNonDestinationByDistance?: boolean;
}

// この距離までは通常表示、DIM_FAR_DISTANCEを超えたら非表示。狭いスマホ画面でサインが
// 重なって読みにくくなるのを防ぐための簡易フェード(店舗全体の縮尺に対する経験値)
const DIM_NEAR_DISTANCE = 6;
const DIM_FAR_DISTANCE = 11;

/** カテゴリ色を暗く落とし、白文字でも明るい背景に負けない濃色サイン背景を作る(輝度で白/濃紺を切り替える処理はしない) */
function darkenColor(hex: string, factor = 0.55): string {
  const normalized = hex.replace("#", "");
  const r = Math.round(parseInt(normalized.substring(0, 2), 16) * factor);
  const g = Math.round(parseInt(normalized.substring(2, 4), 16) * factor);
  const b = Math.round(parseInt(normalized.substring(4, 6), 16) * factor);
  return `rgb(${r}, ${g}, ${b})`;
}

/**
 * 全カテゴリ(青果含む)で共通の小型カテゴリサイン。3D側に板(mesh)は一切持たず、
 * Html自身がカード状の濃色背景(カテゴリ色を暗く調整)を持つ最小構成の1枚だけで完結する。
 * 幅は文字量に応じて自動で決まり(固定の巨大幅にしない)、pointerEvents="none"を維持する。
 * dimNonDestinationByDistance=trueかつ非目的地の場合のみ、useFrame内でカメラ距離を見て
 * DOMのstyleを直接書き換えて表示/非表示を切り替える(Reactの再レンダーは発生させない)
 */
export default function CategorySign({
  label,
  color,
  position,
  isDestination = false,
  dimNonDestinationByDistance = false,
}: CategorySignProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const { camera } = useThree();

  useFrame(() => {
    if (!dimNonDestinationByDistance || isDestination) return;
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const dx = camera.position.x - position[0];
    const dz = camera.position.z - position[2];
    const distance = Math.sqrt(dx * dx + dz * dz);

    if (distance <= DIM_NEAR_DISTANCE) {
      wrapper.style.visibility = "visible";
      wrapper.style.opacity = "1";
    } else if (distance >= DIM_FAR_DISTANCE) {
      wrapper.style.visibility = "hidden";
      wrapper.style.opacity = "0";
    } else {
      const fade = (distance - DIM_NEAR_DISTANCE) / (DIM_FAR_DISTANCE - DIM_NEAR_DISTANCE);
      wrapper.style.visibility = "visible";
      wrapper.style.opacity = String(1 - fade);
    }
  });

  return (
    <Html center pointerEvents="none" position={position}>
      <div
        ref={wrapperRef}
        className="select-none whitespace-nowrap rounded-lg px-3 py-2 text-sm font-bold leading-none tracking-wide text-white"
        style={{ backgroundColor: darkenColor(color), border: "1px solid rgba(255,255,255,0.35)" }}
      >
        {label}
      </div>
    </Html>
  );
}
