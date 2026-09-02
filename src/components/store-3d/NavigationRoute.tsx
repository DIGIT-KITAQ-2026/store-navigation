"use client";

import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { resamplePathByInterval } from "@/lib/store-navigation/pathfinding";
import type { Vector3Tuple } from "@/lib/store-navigation/types";

const ROUTE_COLOR = "#14b8a6";
const ARROW_COLOR = "#0d9488";
const RIBBON_WIDTH = 0.42;
const RIBBON_HEIGHT = 0.045;
const RIBBON_Y = 0.03;
const ARROW_INTERVAL = 2.4;
const MAX_ARROWS = 16;
const MIN_SEGMENT_LENGTH = 1e-4;

interface NavigationRouteProps {
  path: Vector3Tuple[];
  reducedMotion: boolean;
}

interface RouteSegment {
  position: Vector3Tuple;
  yaw: number;
  length: number;
}

function yawFromDirection(direction: Vector3Tuple): number {
  return Math.atan2(direction[0], direction[2]);
}

/**
 * 経路を床面のリボン(区間ごとのBox)+曲がり角のジョイント(円盤)として表示し、
 * 経路上に一定間隔で進行方向を向いた矢印を配置する。経路が空/1点の場合は何も描画しない
 */
export default function NavigationRoute({ path, reducedMotion }: NavigationRouteProps) {
  const ribbonGeometry = useMemo(() => new THREE.BoxGeometry(RIBBON_WIDTH, RIBBON_HEIGHT, 1), []);
  const ribbonMaterial = useMemo(() => new THREE.MeshStandardMaterial({ color: ROUTE_COLOR, roughness: 0.75 }), []);
  const jointGeometry = useMemo(
    () => new THREE.CylinderGeometry(RIBBON_WIDTH / 2, RIBBON_WIDTH / 2, RIBBON_HEIGHT, 16),
    [],
  );
  const arrowGeometry = useMemo(() => new THREE.ConeGeometry(0.22, 0.5, 4), []);
  const arrowMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: ARROW_COLOR,
        emissive: ARROW_COLOR,
        emissiveIntensity: 0.35,
        roughness: 0.5,
      }),
    [],
  );

  const segments = useMemo<RouteSegment[]>(() => {
    const list: RouteSegment[] = [];
    for (let i = 1; i < path.length; i++) {
      const [ax, , az] = path[i - 1];
      const [bx, , bz] = path[i];
      const dx = bx - ax;
      const dz = bz - az;
      const length = Math.sqrt(dx * dx + dz * dz);
      if (length < MIN_SEGMENT_LENGTH) continue;
      list.push({
        position: [(ax + bx) / 2, RIBBON_Y, (az + bz) / 2],
        yaw: Math.atan2(dx, dz),
        length,
      });
    }
    return list;
  }, [path]);

  const arrows = useMemo(() => resamplePathByInterval(path, ARROW_INTERVAL, MAX_ARROWS), [path]);
  const arrowRefs = useRef<(THREE.Mesh | null)[]>([]);

  useFrame((state) => {
    const elapsed = state.clock.elapsedTime;
    const amplitude = reducedMotion ? 0.03 : 0.14;
    arrowRefs.current.forEach((mesh, index) => {
      if (!mesh) return;
      mesh.position.z = 0.1 + Math.sin(elapsed * 1.8 - index * 0.6) * amplitude;
    });
  });

  if (path.length < 2) return null;

  return (
    <group>
      {segments.map((segment, index) => (
        <mesh
          key={`segment-${index}`}
          geometry={ribbonGeometry}
          material={ribbonMaterial}
          position={segment.position}
          rotation={[0, segment.yaw, 0]}
          scale={[1, 1, segment.length]}
          dispose={null}
        />
      ))}

      {path.slice(1, -1).map((node, index) => (
        <mesh
          key={`joint-${index}`}
          geometry={jointGeometry}
          material={ribbonMaterial}
          position={[node[0], RIBBON_Y, node[2]]}
          dispose={null}
        />
      ))}

      {arrows.map((arrow, index) => (
        <group
          key={`arrow-${index}`}
          position={[arrow.position[0], RIBBON_Y + 0.02, arrow.position[2]]}
          rotation={[0, yawFromDirection(arrow.direction), 0]}
        >
          <mesh
            ref={(mesh) => {
              arrowRefs.current[index] = mesh;
            }}
            geometry={arrowGeometry}
            material={arrowMaterial}
            rotation={[Math.PI / 2, 0, 0]}
            dispose={null}
          />
        </group>
      ))}
    </group>
  );
}
