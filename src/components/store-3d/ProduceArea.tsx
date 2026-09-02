"use client";

import { useMemo } from "react";
import * as THREE from "three";
import CategorySign from "./CategorySign";
import DestinationMarker from "./DestinationMarker";
import type { Vector3Tuple } from "@/lib/store-navigation/types";

// store-layout.tsのSTORE_FIXTURES[0](Shelf_01)のcolorと合わせる(青果のカテゴリ色)
const CATEGORY_COLOR = "#7a9d5c";
const CRATE_COLOR = "#c9a06a";
const SPHERE_COLORS = ["#7a9d5c", "#c1543f", "#d99a4e"] as const; // 緑・赤・橙(落ち着いた色)
const CYLINDER_COLOR = "#d4b95e"; // 黄

interface ProduceInstance {
  position: Vector3Tuple;
  color: string;
  scale: number;
}

const CRATE_LOCAL_POSITIONS: Vector3Tuple[] = [
  [-1.6, 0.25, -0.9],
  [1.6, 0.25, -0.9],
  [0, 0.25, 1.0],
];

// Math.randomは使わず、添字(index)から決定的に散らして毎回同じ配置にする
function buildSphereInstances(): ProduceInstance[] {
  const instances: ProduceInstance[] = [];
  let colorCursor = 0;
  for (const crate of CRATE_LOCAL_POSITIONS) {
    for (let i = 0; i < 7; i++) {
      const angle = i * 2.4;
      const radius = 0.14 + (i % 3) * 0.09;
      instances.push({
        position: [crate[0] + Math.cos(angle) * radius, crate[1] + 0.42 + (i % 2) * 0.05, crate[2] + Math.sin(angle) * radius * 0.7],
        color: SPHERE_COLORS[colorCursor % SPHERE_COLORS.length],
        scale: 0.85 + ((i * 7) % 5) * 0.05,
      });
      colorCursor++;
    }
  }
  return instances;
}

function buildCylinderInstances(): ProduceInstance[] {
  const instances: ProduceInstance[] = [];
  for (const crate of CRATE_LOCAL_POSITIONS) {
    for (let i = 0; i < 3; i++) {
      const angle = 1.1 + i * 2.1;
      const radius = 0.22;
      instances.push({
        position: [crate[0] + Math.cos(angle) * radius, crate[1] + 0.44, crate[2] + Math.sin(angle) * radius],
        color: CYLINDER_COLOR,
        scale: 1,
      });
    }
  }
  return instances;
}

const SPHERE_INSTANCES = buildSphereInstances();
const CYLINDER_INSTANCES = buildCylinderInstances();

const tempObject = new THREE.Object3D();
const tempColor = new THREE.Color();

function populateInstances(mesh: THREE.InstancedMesh | null, instances: ProduceInstance[]) {
  if (!mesh) return;
  instances.forEach((item, index) => {
    tempObject.position.set(item.position[0], item.position[1], item.position[2]);
    tempObject.scale.setScalar(item.scale);
    tempObject.updateMatrix();
    mesh.setMatrixAt(index, tempObject.matrix);
    tempColor.set(item.color);
    mesh.setColorAt(index, tempColor);
  });
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
}

interface ProduceAreaProps {
  position: Vector3Tuple;
  label: string;
  /** 現在選択中の目的地がShelf_01(青果)のときのみtrue。目的地マーカーの表示可否を制御する */
  isActive: boolean;
  reducedMotion: boolean;
  /** スマホ判定。trueかつ青果が目的地でない場合のみ、カテゴリサインをカメラ距離でフェードさせる */
  showsMobileControls: boolean;
}

/**
 * 青果売り場: 陳列台(クレート)+青果(標準GeometryのInstancedMesh)+サイン+目的地マーカー。
 * positionは常に青果売り場自体の固定座標(STORE_FIXTURESのShelf_01)を受け取る。
 * 他の棚が選択されているときも青果の見た目はここに固定表示され続け、目的地マーカーのみisActiveで切り替わる
 */
export default function ProduceArea({ position, label, isActive, reducedMotion, showsMobileControls }: ProduceAreaProps) {
  const crateGeometry = useMemo(() => new THREE.BoxGeometry(1.2, 0.5, 0.85), []);
  const crateMaterial = useMemo(() => new THREE.MeshStandardMaterial({ color: CRATE_COLOR, roughness: 0.9 }), []);

  return (
    <group position={position}>
      {CRATE_LOCAL_POSITIONS.map((cratePosition, index) => (
        <mesh
          key={`crate-${index}`}
          geometry={crateGeometry}
          material={crateMaterial}
          position={cratePosition}
          dispose={null}
        />
      ))}

      <instancedMesh
        args={[undefined, undefined, SPHERE_INSTANCES.length]}
        ref={(mesh) => populateInstances(mesh, SPHERE_INSTANCES)}
      >
        <sphereGeometry args={[0.15, 12, 10]} />
        <meshStandardMaterial roughness={0.65} />
      </instancedMesh>

      <instancedMesh
        args={[undefined, undefined, CYLINDER_INSTANCES.length]}
        ref={(mesh) => populateInstances(mesh, CYLINDER_INSTANCES)}
      >
        <cylinderGeometry args={[0.09, 0.11, 0.32, 8]} />
        <meshStandardMaterial roughness={0.6} />
      </instancedMesh>

      {/* 青果売り場のサイン: ほかのカテゴリと同じCategorySign(3D板を持たない小型カード)。
          売り場の高さ(store-layout.tsのShelf_01.size[1]=1.2)+StoreFixtures.tsxと同じ余白(0.2)の高さに置く */}
      <CategorySign
        label={label}
        color={CATEGORY_COLOR}
        position={[0, 1.4, 0.3]}
        isDestination={isActive}
        dimNonDestinationByDistance={showsMobileControls}
      />

      {/* 目的地マーカー: 青果が現在の選択先のときのみ表示する */}
      {isActive && <DestinationMarker position={[0, 0, 0]} reducedMotion={reducedMotion} />}
    </group>
  );
}
