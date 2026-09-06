import { findPath } from "./pathfinding";
import { computeAutoCameraStop } from "./cameraApproach";
import { EYE_HEIGHT, PLAYER_RADIUS } from "./store-layout";
import { REALISTIC_SHELF_IDS, type RealisticShelfId } from "./realistic-store-ids";
import type { CollisionBounds, NavigationNode, Vector3Tuple } from "./types";

export { EYE_HEIGHT };
export const REALISTIC_ENTRANCE: Vector3Tuple = [18, 0, 15];
export const REALISTIC_SPAWN: Vector3Tuple = [18, 0, 13.8];
export const REALISTIC_APPROACH_DISTANCE = 0.6;
export const WALK_MARGIN = PLAYER_RADIUS + 0.03;
export interface NamedBounds extends CollisionBounds { name: string }
export interface RealisticLayout {
  floor: CollisionBounds;
  obstacles: NamedBounds[];
  destinations: Record<RealisticShelfId, Vector3Tuple>;
  nodes: NavigationNode[];
}

/** Slab intersection with a conservative player-radius-expanded 2D box. */
export function segmentHitsBox(a: Vector3Tuple, b: Vector3Tuple, box: CollisionBounds, margin = WALK_MARGIN): boolean {
  let low = 0, high = 1;
  for (const [axis, min, max] of [[0, box.minX - margin, box.maxX + margin], [2, box.minZ - margin, box.maxZ + margin]] as const) {
    const delta = b[axis] - a[axis];
    if (Math.abs(delta) < 1e-10) { if (a[axis] < min || a[axis] > max) return false; }
    else {
      const t1 = (min - a[axis]) / delta, t2 = (max - a[axis]) / delta;
      low = Math.max(low, Math.min(t1, t2)); high = Math.min(high, Math.max(t1, t2));
      if (low > high) return false;
    }
  }
  return true;
}

export function isWalkable(layout: Pick<RealisticLayout, "floor" | "obstacles">, p: Vector3Tuple): boolean {
  const f = layout.floor;
  return p.every(Number.isFinite) && p[0] >= f.minX + WALK_MARGIN && p[0] <= f.maxX - WALK_MARGIN &&
    p[2] >= f.minZ + WALK_MARGIN && p[2] <= f.maxZ - WALK_MARGIN &&
    !layout.obstacles.some((box) => segmentHitsBox(p, p, box));
}

export function isSegmentWalkable(layout: Pick<RealisticLayout, "floor" | "obstacles">, a: Vector3Tuple, b: Vector3Tuple): boolean {
  return isWalkable(layout, a) && isWalkable(layout, b) && !layout.obstacles.some((box) => segmentHitsBox(a, b, box));
}

/** Same X-then-Z sliding resolution as FirstPersonController, with swept checks to prevent tunnelling. */
export function moveWithinLayout(layout: RealisticLayout, from: Vector3Tuple, dx: number, dz: number): Vector3Tuple {
  if (!Number.isFinite(dx) || !Number.isFinite(dz) || !isWalkable(layout, from)) return [...REALISTIC_SPAWN];
  const f = layout.floor;
  const next: Vector3Tuple = [...from];
  const x: Vector3Tuple = [Math.max(f.minX + WALK_MARGIN, Math.min(f.maxX - WALK_MARGIN, from[0] + dx)), from[1], from[2]];
  if (isSegmentWalkable(layout, from, x)) next[0] = x[0];
  const z: Vector3Tuple = [next[0], from[1], Math.max(f.minZ + WALK_MARGIN, Math.min(f.maxZ - WALK_MARGIN, from[2] + dz))];
  if (isSegmentWalkable(layout, next, z)) next[2] = z[2];
  return next;
}

export function simplifyRoute(path: Vector3Tuple[]): Vector3Tuple[] {
  return path.filter((p, i) => {
    if (i === 0 || i === path.length - 1) return true;
    const a = path[i - 1], b = path[i + 1];
    const cross = (p[0] - a[0]) * (b[2] - p[2]) - (p[2] - a[2]) * (b[0] - p[0]);
    const dot = (p[0] - a[0]) * (b[0] - p[0]) + (p[2] - a[2]) * (b[2] - p[2]);
    return Math.abs(cross) > 1e-8 || dot <= 0;
  });
}

/** Generate an orthogonal 1 m candidate graph, admitting only verified clear points/edges. BFS itself is shared. */
export function buildRealisticGraph(input: Omit<RealisticLayout, "nodes">): RealisticLayout {
  const nodes: NavigationNode[] = [];
  const grid = new Map<string, NavigationNode>();
  for (let x = Math.ceil(input.floor.minX); x < input.floor.maxX; x++) {
    for (let z = Math.ceil(input.floor.minZ); z < input.floor.maxZ; z++) {
      const position: Vector3Tuple = [x, 0, z];
      if (!isWalkable(input, position)) continue;
      const node = { id: `walk:${x}:${z}`, position, neighbors: [] as string[] };
      nodes.push(node); grid.set(`${x}:${z}`, node);
    }
  }
  const connect = (a: NavigationNode, b: NavigationNode) => {
    if (isSegmentWalkable(input, a.position, b.position)) { a.neighbors.push(b.id); b.neighbors.push(a.id); }
  };
  for (const node of nodes) {
    const [x, , z] = node.position;
    for (const key of [`${x + 1}:${z}`, `${x}:${z + 1}`]) { const b = grid.get(key); if (b) connect(node, b); }
  }
  const anchors: [string, Vector3Tuple][] = [["entrance", REALISTIC_SPAWN], ...REALISTIC_SHELF_IDS.map((id): [string, Vector3Tuple] => [id, input.destinations[id]])];
  for (const [id, position] of anchors) {
    if (!isWalkable(input, position)) throw new Error(`Invalid navigation anchor: ${id}`);
    const node: NavigationNode = { id, position, neighbors: [] };
    const near = [...grid.values()].filter((n) => Math.hypot(n.position[0] - position[0], n.position[2] - position[2]) <= 2)
      .filter((n) => isSegmentWalkable(input, position, n.position))
      .sort((a, b) => Math.hypot(a.position[0] - position[0], a.position[2] - position[2]) - Math.hypot(b.position[0] - position[0], b.position[2] - position[2]));
    near.slice(0, 4).forEach((n) => connect(node, n)); nodes.push(node);
  }
  // Remove disconnected candidate pockets; never publish an unreachable destination.
  for (const id of REALISTIC_SHELF_IDS) if (findPath(nodes, "entrance", id).length < 2) throw new Error(`Unreachable destination: ${id}`);
  const reachable = nodes.filter((n) => findPath(nodes, "entrance", n.id).length > 0);
  const ids = new Set(reachable.map((n) => n.id));
  reachable.forEach((n) => { n.neighbors = n.neighbors.filter((id) => ids.has(id)); });
  return { ...input, nodes: reachable };
}

export function getRealisticRoute(layout: RealisticLayout, id: RealisticShelfId): Vector3Tuple[] {
  return simplifyRoute(findPath(layout.nodes, "entrance", id));
}

export function getRealisticCameraRoute(layout: RealisticLayout, path: Vector3Tuple[]): Vector3Tuple[] {
  const { cameraRoute } = computeAutoCameraStop(path, REALISTIC_APPROACH_DISTANCE, undefined, WALK_MARGIN);
  if (cameraRoute.length < 2 || cameraRoute.some((p, i) => !isWalkable(layout, p) || (i > 0 && !isSegmentWalkable(layout, cameraRoute[i - 1], p)))) return [];
  return cameraRoute;
}

/** Do not interpolate across a corner: stop at the next vertex before progressing along the next edge. */
export function advanceRouteDistance(path: Vector3Tuple[], distance: number, step: number): number {
  if (!Number.isFinite(step) || step <= 0) return distance;
  let end = 0;
  for (let i = 1; i < path.length; i++) {
    end += Math.hypot(path[i][0] - path[i - 1][0], path[i][2] - path[i - 1][2]);
    if (end > distance + 1e-8) return Math.min(end, distance + Math.max(0, step));
  }
  return end;
}
