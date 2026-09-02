"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { Html } from "@react-three/drei";
import { ENTRANCE_OPENING, STORE_FLOOR, WALL_HEIGHT, WALL_THICKNESS } from "@/lib/store-navigation/store-layout";

const FLOOR_COLOR = "#eef1f4";
const WALL_COLOR = "#f6f4ee";
const CEILING_PANEL_COLOR = "#fffaf0";
const ENTRANCE_ACCENT_COLOR = "#14b8a6";

interface BoxDescriptor {
  position: [number, number, number];
  size: [number, number, number];
}

/**
 * 店舗の床・外周壁・入口・天井照明パネルを配置する。すべて標準Geometry(Box/Plane/Circle)のみで
 * 構成し、外部アセットは使用しない。壁・パネルは1つのunit BoxGeometryをscaleで使い回す
 */
export default function StoreEnvironment() {
  const floorWidth = STORE_FLOOR.maxX - STORE_FLOOR.minX;
  const floorDepth = STORE_FLOOR.maxZ - STORE_FLOOR.minZ;
  const centerX = (STORE_FLOOR.minX + STORE_FLOOR.maxX) / 2;
  const centerZ = (STORE_FLOOR.minZ + STORE_FLOOR.maxZ) / 2;

  const unitBox = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);
  const wallMaterial = useMemo(() => new THREE.MeshStandardMaterial({ color: WALL_COLOR, roughness: 0.95 }), []);
  const panelMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: CEILING_PANEL_COLOR,
        emissive: CEILING_PANEL_COLOR,
        emissiveIntensity: 0.5,
        roughness: 0.6,
      }),
    [],
  );

  const walls = useMemo<BoxDescriptor[]>(() => {
    const frontLeftWidth = ENTRANCE_OPENING.minX - STORE_FLOOR.minX;
    const frontRightWidth = STORE_FLOOR.maxX - ENTRANCE_OPENING.maxX;
    const doorwayWidth = ENTRANCE_OPENING.maxX - ENTRANCE_OPENING.minX;
    const frontZ = STORE_FLOOR.minZ - WALL_THICKNESS / 2;

    return [
      {
        position: [centerX, WALL_HEIGHT / 2, STORE_FLOOR.maxZ + WALL_THICKNESS / 2],
        size: [floorWidth, WALL_HEIGHT, WALL_THICKNESS],
      },
      {
        position: [STORE_FLOOR.minX - WALL_THICKNESS / 2, WALL_HEIGHT / 2, centerZ],
        size: [WALL_THICKNESS, WALL_HEIGHT, floorDepth],
      },
      {
        position: [STORE_FLOOR.maxX + WALL_THICKNESS / 2, WALL_HEIGHT / 2, centerZ],
        size: [WALL_THICKNESS, WALL_HEIGHT, floorDepth],
      },
      {
        position: [(STORE_FLOOR.minX + ENTRANCE_OPENING.minX) / 2, WALL_HEIGHT / 2, frontZ],
        size: [frontLeftWidth, WALL_HEIGHT, WALL_THICKNESS],
      },
      {
        position: [(ENTRANCE_OPENING.maxX + STORE_FLOOR.maxX) / 2, WALL_HEIGHT / 2, frontZ],
        size: [frontRightWidth, WALL_HEIGHT, WALL_THICKNESS],
      },
      {
        // 入口上部の垂れ壁(ドア枠のように見せるための装飾)
        position: [0, WALL_HEIGHT - 0.4, frontZ],
        size: [doorwayWidth, 0.8, WALL_THICKNESS],
      },
    ];
  }, [centerX, centerZ, floorDepth, floorWidth]);

  const ceilingPanels = useMemo<BoxDescriptor[]>(() => {
    const panels: BoxDescriptor[] = [];
    // 店舗の奥行きに合わせてZ方向に等間隔で配置する(棚の行数が増減しても追従する)
    for (let z = 4; z <= STORE_FLOOR.maxZ - 3; z += 5) {
      panels.push({ position: [0, WALL_HEIGHT - 0.15, z], size: [2.4, 0.08, 1.6] });
      panels.push({ position: [-5.5, WALL_HEIGHT - 0.15, z], size: [1.6, 0.08, 1.6] });
      panels.push({ position: [5.5, WALL_HEIGHT - 0.15, z], size: [1.6, 0.08, 1.6] });
    }
    return panels;
  }, []);

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[centerX, 0, centerZ]}>
        <planeGeometry args={[floorWidth, floorDepth]} />
        <meshStandardMaterial color={FLOOR_COLOR} roughness={1} />
      </mesh>

      {walls.map((wall, index) => (
        <mesh
          key={`wall-${index}`}
          geometry={unitBox}
          material={wallMaterial}
          position={wall.position}
          scale={wall.size}
          dispose={null}
        />
      ))}

      {ceilingPanels.map((panel, index) => (
        <mesh
          key={`panel-${index}`}
          geometry={unitBox}
          material={panelMaterial}
          position={panel.position}
          scale={panel.size}
          dispose={null}
        />
      ))}

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, 1.1]}>
        <circleGeometry args={[1.3, 32]} />
        <meshStandardMaterial
          color={ENTRANCE_ACCENT_COLOR}
          emissive={ENTRANCE_ACCENT_COLOR}
          emissiveIntensity={0.25}
          roughness={0.8}
        />
      </mesh>

      <Html position={[0, 2.2, 1]} center pointerEvents="none">
        <div className="whitespace-nowrap rounded-full border border-teal-500/40 bg-white/95 px-3 py-1 text-xs font-bold text-teal-700 shadow-sm">
          入口
        </div>
      </Html>
    </group>
  );
}
