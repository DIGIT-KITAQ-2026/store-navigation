"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Matrix4, Quaternion, Vector3 } from "three";
import { findPath, getPathLength, samplePathAtDistance } from "@/lib/store-navigation/pathfinding";
import { advanceRouteDistance, EYE_HEIGHT, getRealisticCameraRoute, isSegmentWalkable, isWalkable, simplifyRoute, REALISTIC_APPROACH_DISTANCE, REALISTIC_SPAWN, type RealisticLayout } from "@/lib/store-navigation/realistic-store-layout";
import type { RealisticShelfId } from "@/lib/store-navigation/realistic-store-ids";
import type { Vector3Tuple } from "@/lib/store-navigation/types";

export type GuideCommand = { kind: "current" | "replay" | "entrance" };

export default function RealisticAutoCamera({ destination, layout, playing, command, reducedMotion, onArrive, onBlocked, onPath }: {
  destination: RealisticShelfId | null; layout: RealisticLayout; playing: boolean; command: GuideCommand | null; reducedMotion: boolean;
  onArrive: () => void; onBlocked: () => void; onPath: (path: Vector3Tuple[]) => void;
}) {
  const { camera } = useThree();
  const distance = useRef(0);
  const finished = useRef(false);
  const activeRoute = useRef<Vector3Tuple[]>([]);
  const aim = useMemo(() => ({ matrix: new Matrix4(), rotation: new Quaternion(), target: new Vector3() }), []);
  useEffect(() => {
    if (!command) return;
    distance.current = 0; finished.current = false; activeRoute.current = [];
    if (command.kind === "replay" || command.kind === "entrance") {
      camera.position.set(REALISTIC_SPAWN[0], EYE_HEIGHT, REALISTIC_SPAWN[2]);
      camera.rotation.set(0, 0, 0, "YXZ");
    }
    if (command.kind === "entrance" || !destination) { onPath([]); return; }
    const current: Vector3Tuple = [camera.position.x, 0, camera.position.z];
    const goal = layout.destinations[destination];
    if (!isWalkable(layout, current)) { finished.current = true; onPath([]); onBlocked(); return; }
    if (Math.hypot(current[0] - goal[0], current[2] - goal[2]) <= REALISTIC_APPROACH_DISTANCE + 1e-6 && isSegmentWalkable(layout, current, goal)) {
      finished.current = true; onPath([current, goal]); onArrive(); return;
    }
    // Reuse the existing graph and BFS without mutating either. Connect only through a clear segment.
    const starts = layout.nodes.filter((n) => isSegmentWalkable(layout, current, n.position))
      .sort((a, b) => Math.hypot(a.position[0] - current[0], a.position[2] - current[2]) - Math.hypot(b.position[0] - current[0], b.position[2] - current[2]));
    let bestPath: Vector3Tuple[] = [];
    let bestLength = Infinity;
    for (const start of starts.slice(0, 4)) {
      const found = findPath(layout.nodes, start.id, destination);
      if (!found.length) continue;
      const path = simplifyRoute([current, ...found].filter((p, i, points) => i === 0 || Math.hypot(p[0] - points[i - 1][0], p[2] - points[i - 1][2]) > 1e-6));
      const route = getRealisticCameraRoute(layout, path);
      if (route.length < 2) continue;
      const length = getPathLength(path);
      if (length < bestLength) { bestLength = length; bestPath = path; activeRoute.current = route; }
    }
    if (bestPath.length) { onPath(bestPath); return; }
    finished.current = true; onPath([]); onBlocked();
  }, [camera, destination, layout, command, onArrive, onBlocked, onPath]);
  useFrame((_, delta) => {
    if (!playing || finished.current || document.hidden) return;
    const route = activeRoute.current;
    const length = getPathLength(route);
    if (route.length < 2 || !length) { finished.current = true; onBlocked(); return; }
    const nextDistance = advanceRouteDistance(route, distance.current, (reducedMotion ? 1.3 : 2.2) * Math.min(delta, 0.1));
    const next = samplePathAtDistance(route, nextDistance);
    // Exact path-following avoids the legacy damped camera's corner-cutting in narrow aisles.
    if (!isSegmentWalkable(layout, [camera.position.x, 0, camera.position.z], next.position)) {
      finished.current = true; onBlocked(); return;
    }
    distance.current = nextDistance;
    camera.position.set(next.position[0], EYE_HEIGHT, next.position[2]);
    const arrived = nextDistance >= length - 1e-6;
    const goal = arrived && destination ? layout.destinations[destination] : [next.position[0] + next.direction[0], 0, next.position[2] + next.direction[2]];
    aim.target.set(goal[0], EYE_HEIGHT, goal[2]);
    aim.matrix.lookAt(camera.position, aim.target, camera.up);
    aim.rotation.setFromRotationMatrix(aim.matrix);
    // Bound angular motion at startup and every corner; never overwrite the live pose with lookAt.
    const dt = Math.min(delta, 0.1);
    const angle = camera.quaternion.angleTo(aim.rotation);
    camera.quaternion.rotateTowards(aim.rotation, Math.min(angle * (1 - Math.exp(-5 * dt)), dt * (reducedMotion ? 1.5 : 3)));
    if (arrived) {
      finished.current = true; onArrive();
    }
  });
  return null;
}
