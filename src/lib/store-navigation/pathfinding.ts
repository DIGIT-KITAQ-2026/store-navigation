import type { NavigationNode, PathSample, Vector3Tuple } from "./types";

const MIN_SEGMENT_LENGTH = 1e-4;

function segmentLength(a: Vector3Tuple, b: Vector3Tuple): number {
  const dx = b[0] - a[0];
  const dz = b[2] - a[2];
  return Math.sqrt(dx * dx + dz * dz);
}

function segmentDirection(a: Vector3Tuple, b: Vector3Tuple): Vector3Tuple {
  const length = segmentLength(a, b);
  if (length < MIN_SEGMENT_LENGTH) return [0, 0, 1];
  return [(b[0] - a[0]) / length, 0, (b[2] - a[2]) / length];
}

/**
 * 隣接リストで表現されたナビゲーショングラフ上を、startIdからendIdまでBFSで探索する。
 * 入力の`nodes`は読み取りのみで変更しない。存在しないid・到達不能な場合は例外を投げず
 * 空配列を返す。循環グラフでもvisitedにより無限ループしない。
 */
export function findPath(nodes: readonly NavigationNode[], startId: string, endId: string): Vector3Tuple[] {
  const nodeMap = new Map(nodes.map((node) => [node.id, node]));
  const startNode = nodeMap.get(startId);
  const endNode = nodeMap.get(endId);
  if (!startNode || !endNode) return [];
  if (startId === endId) return [startNode.position];

  const visited = new Set<string>([startId]);
  const cameFrom = new Map<string, string>();
  const queue: string[] = [startId];
  let head = 0;

  while (head < queue.length) {
    const currentId = queue[head++];
    if (currentId === endId) break;

    const currentNode = nodeMap.get(currentId);
    if (!currentNode) continue;

    for (const neighborId of currentNode.neighbors) {
      if (visited.has(neighborId) || !nodeMap.has(neighborId)) continue;
      visited.add(neighborId);
      cameFrom.set(neighborId, currentId);
      queue.push(neighborId);
    }
  }

  if (!visited.has(endId)) return [];

  const orderedIds: string[] = [endId];
  let cursor = endId;
  while (cursor !== startId) {
    const previousId = cameFrom.get(cursor);
    if (!previousId) return [];
    orderedIds.push(previousId);
    cursor = previousId;
  }
  orderedIds.reverse();

  return orderedIds.map((id) => nodeMap.get(id)?.position ?? startNode.position);
}

/** 経路(座標配列)の全長。点が2つ未満なら0 */
export function getPathLength(path: readonly Vector3Tuple[]): number {
  let total = 0;
  for (let i = 1; i < path.length; i++) {
    total += segmentLength(path[i - 1], path[i]);
  }
  return total;
}

const FALLBACK_SAMPLE: PathSample = { position: [0, 0, 0], direction: [0, 0, 1] };

/**
 * 経路上で、始点からdistanceだけ進んだ位置と、その地点での進行方向を返す。
 * distanceは経路の範囲内にクランプする。経路が空/1点のみの場合も例外を投げず、
 * 安全なフォールバック値(または唯一の点)を返す。
 */
export function samplePathAtDistance(path: readonly Vector3Tuple[], distance: number): PathSample {
  if (path.length === 0) return FALLBACK_SAMPLE;
  if (path.length === 1) return { position: path[0], direction: FALLBACK_SAMPLE.direction };

  const clamped = Number.isFinite(distance) ? Math.max(0, distance) : 0;

  let remaining = clamped;
  for (let i = 1; i < path.length; i++) {
    const start = path[i - 1];
    const end = path[i];
    const length = segmentLength(start, end);

    if (remaining <= length || i === path.length - 1) {
      const t = length < MIN_SEGMENT_LENGTH ? 0 : Math.min(1, Math.max(0, remaining / length));
      const position: Vector3Tuple = [
        start[0] + (end[0] - start[0]) * t,
        start[1] + (end[1] - start[1]) * t,
        start[2] + (end[2] - start[2]) * t,
      ];
      return { position, direction: segmentDirection(start, end) };
    }

    remaining -= length;
  }

  const last = path[path.length - 1];
  return { position: last, direction: FALLBACK_SAMPLE.direction };
}

/**
 * 経路をinterval間隔でリサンプルし、各点の位置と進行方向を返す(矢印配置用)。
 * 生成数はmaxSamplesで上限を設ける。経路が短すぎる/空の場合は空配列を返す。
 */
export function resamplePathByInterval(
  path: readonly Vector3Tuple[],
  interval: number,
  maxSamples: number,
): PathSample[] {
  if (path.length < 2 || interval <= 0 || maxSamples <= 0) return [];

  const totalLength = getPathLength(path);
  if (totalLength < MIN_SEGMENT_LENGTH) return [];

  const samples: PathSample[] = [];
  // 入口ぎわ・目的地ぎわに矢印が寄りすぎないよう、半区間分ずらして開始する
  const startOffset = Math.min(interval / 2, totalLength / 2);

  for (let distance = startOffset; distance < totalLength && samples.length < maxSamples; distance += interval) {
    samples.push(samplePathAtDistance(path, distance));
  }

  return samples;
}
