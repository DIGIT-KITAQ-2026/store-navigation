"use client";

import { useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import type { Vector3Tuple } from "@/lib/store-navigation/types";

// 案内カラー(水色/青緑)。棚カテゴリ色とは独立し、目的地マーカーでは常にこの色を使う
const GUIDE_COLOR = "#0d9488";
const PIN_BASE_Y = 1.5;

interface DestinationMarkerProps {
  position: Vector3Tuple;
  reducedMotion: boolean;
}

/**
 * 現在選択中の目的地1件にのみ表示する床マーカー(リング+浮遊するピン)。
 * 呼び出し側が選択状態に応じてマウント/アンマウントを切り替える想定(常に表示はしない)
 */
export default function DestinationMarker({ position, reducedMotion }: DestinationMarkerProps) {
  const pinGroupRef = useRef<THREE.Group>(null);
  const ringMaterialRef = useRef<THREE.MeshStandardMaterial>(null);

  useFrame((state) => {
    const elapsed = state.clock.elapsedTime;
    const bobAmplitude = reducedMotion ? 0.02 : 0.12;
    if (pinGroupRef.current) {
      pinGroupRef.current.position.y = PIN_BASE_Y + Math.sin(elapsed * 1.6) * bobAmplitude;
    }
    if (ringMaterialRef.current) {
      const pulse = reducedMotion ? 0 : Math.sin(elapsed * 1.6) * 0.15;
      ringMaterialRef.current.emissiveIntensity = 0.35 + pulse;
    }
  });

  return (
    <group position={position}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <torusGeometry args={[0.85, 0.055, 8, 40]} />
        <meshStandardMaterial
          ref={ringMaterialRef}
          color={GUIDE_COLOR}
          emissive={GUIDE_COLOR}
          emissiveIntensity={0.35}
          roughness={0.6}
        />
      </mesh>

      <group ref={pinGroupRef} position={[0, PIN_BASE_Y, 0]}>
        <mesh position={[0, 0.22, 0]}>
          <sphereGeometry args={[0.22, 16, 14]} />
          <meshStandardMaterial color={GUIDE_COLOR} emissive={GUIDE_COLOR} emissiveIntensity={0.4} roughness={0.4} />
        </mesh>
        <mesh position={[0, -0.05, 0]} rotation={[Math.PI, 0, 0]}>
          <coneGeometry args={[0.22, 0.4, 16]} />
          <meshStandardMaterial color={GUIDE_COLOR} emissive={GUIDE_COLOR} emissiveIntensity={0.4} roughness={0.4} />
        </mesh>
      </group>
    </group>
  );
}
