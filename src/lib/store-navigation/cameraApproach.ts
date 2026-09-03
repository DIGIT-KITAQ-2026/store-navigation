import type { CollisionBounds, Vector3Tuple } from "./types";

/** 自動案内カメラの共通停止距離(ワールドユニット)。売り場ごとの上書きが無い場合に使う */
export const DEFAULT_APPROACH_DISTANCE = 1.6;

// 停止距離は基本的に最終セグメント長のこの割合を上限にし、前のセグメント側へ不自然に
// 戻りすぎないようにする。collisionBoundsとの重なりを避けるためだけに、この上限を
// SAFETY_MAX_RATIOまで段階的に緩める
const FINAL_SEGMENT_RATIO_CAP = 0.7;
const SAFETY_MAX_RATIO = 0.95;
const SAFETY_STEP = 0.1;
const SAFETY_MAX_ITERATIONS = 20;
const MIN_SEGMENT_LENGTH = 1e-4;

export interface AutoCameraStop {
  /** 自動カメラ移動専用の経路。最後の点だけstopPositionに置き換える(表示用のpathは別で変更しない) */
  cameraRoute: Vector3Tuple[];
  /** 目的地手前でカメラを停止させる座標 */
  stopPosition: Vector3Tuple;
}

function isWithinExpandedBounds(x: number, z: number, bounds: CollisionBounds, margin: number): boolean {
  return x > bounds.minX - margin && x < bounds.maxX + margin && z > bounds.minZ - margin && z < bounds.maxZ + margin;
}

/**
 * 自動案内カメラだけが使う「目的地手前の停止座標」を計算する。destination.positionや経路表示用の
 * pathそのものは変更しない。経路最後の2点から目的地への進入方向を求め、その手前へ戻した点を
 * cameraRouteの終点として返す。戻す距離は最終セグメント長で頭打ちにしつつ、それでも
 * collisionBounds(+安全マージン)に重なる場合だけ、同じ方向へ少しずつ追加で戻す(最大回数あり)
 */
export function computeAutoCameraStop(
  path: readonly Vector3Tuple[],
  approachDistance: number,
  collisionBounds: CollisionBounds | undefined,
  safetyMargin: number,
): AutoCameraStop {
  if (path.length < 2) {
    const only = path[0] ?? [0, 0, 0];
    return { cameraRoute: [...path], stopPosition: only };
  }

  const previousPoint = path[path.length - 2];
  const destinationPoint = path[path.length - 1];

  const dx = destinationPoint[0] - previousPoint[0];
  const dz = destinationPoint[2] - previousPoint[2];
  const finalSegmentLength = Math.sqrt(dx * dx + dz * dz);

  if (finalSegmentLength < MIN_SEGMENT_LENGTH) {
    return { cameraRoute: [...path], stopPosition: destinationPoint };
  }

  const dirX = dx / finalSegmentLength;
  const dirZ = dz / finalSegmentLength;

  const safeApproachDistance = Number.isFinite(approachDistance) ? Math.max(approachDistance, 0) : DEFAULT_APPROACH_DISTANCE;
  const maxDistance = finalSegmentLength * SAFETY_MAX_RATIO;
  let distance = Math.min(safeApproachDistance, finalSegmentLength * FINAL_SEGMENT_RATIO_CAP);

  let stopX = destinationPoint[0] - dirX * distance;
  let stopZ = destinationPoint[2] - dirZ * distance;

  if (collisionBounds) {
    let iterations = 0;
    while (
      isWithinExpandedBounds(stopX, stopZ, collisionBounds, safetyMargin) &&
      distance < maxDistance &&
      iterations < SAFETY_MAX_ITERATIONS
    ) {
      distance = Math.min(maxDistance, distance + SAFETY_STEP);
      stopX = destinationPoint[0] - dirX * distance;
      stopZ = destinationPoint[2] - dirZ * distance;
      iterations += 1;
    }
  }

  const stopPosition: Vector3Tuple = [stopX, destinationPoint[1], stopZ];
  const cameraRoute: Vector3Tuple[] = [...path.slice(0, -1), stopPosition];

  return { cameraRoute, stopPosition };
}
