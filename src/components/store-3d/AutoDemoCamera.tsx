"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { getPathLength, samplePathAtDistance } from "@/lib/store-navigation/pathfinding";
import { computeAutoCameraStop, DEFAULT_APPROACH_DISTANCE } from "@/lib/store-navigation/cameraApproach";
import { COLLISION_BOUNDS_BY_ID, EYE_HEIGHT, PLAYER_RADIUS } from "@/lib/store-navigation/store-layout";
import type { StoreDestination, Vector3Tuple } from "@/lib/store-navigation/types";

const BASE_SPEED = 2.2; // units/sec
const REDUCED_SPEED = 1.3;
const LOOK_AHEAD_DISTANCE = 2.2;
const POSITION_DAMPING = 4.5;
const LOOK_DAMPING = 3.5;
const MAX_DELTA = 0.1;
const ARRIVAL_EPSILON = 1e-3;
const FALLBACK_POSITION: Vector3Tuple = [0, EYE_HEIGHT, 2];
const FALLBACK_LOOK_TARGET: Vector3Tuple = [0, EYE_HEIGHT, 10];
// 到着後に見上げる高さ。商品陳列が見える程度の位置(カテゴリサインだけを見上げすぎない)
const ARRIVED_LOOK_TARGET_Y = 1.2;
// 終点手前のこの割合からease-outを開始し、最後の1フレームで急に進まないようにする
const EASE_OUT_START_RATIO = 0.82;
const EASE_OUT_MIN_SPEED_FACTOR = 0.2;

function easeOutCubic(t: number): number {
  const inverse = 1 - t;
  return 1 - inverse * inverse * inverse;
}

interface AutoDemoCameraProps {
  path: Vector3Tuple[];
  destination: StoreDestination;
  isPlaying: boolean;
  restartSignal: number;
  reducedMotion: boolean;
  onArrive: () => void;
}

/**
 * 入口から目的地まで経路に沿ってカメラを自動移動させる。位置・注視点はdampで滑らかに補間し、
 * 経路が空/極端に短い場合は固定のフォールバックカメラ姿勢へ安全に切り替える
 */
export default function AutoDemoCamera({
  path,
  destination,
  isPlaying,
  restartSignal,
  reducedMotion,
  onArrive,
}: AutoDemoCameraProps) {
  const { camera } = useThree();
  const distanceRef = useRef(0);
  const arrivedRef = useRef(false);
  const initializedRef = useRef(false);
  const smoothedPosition = useRef(new THREE.Vector3(...FALLBACK_POSITION));
  const smoothedLookTarget = useRef(new THREE.Vector3(...FALLBACK_LOOK_TARGET));

  const totalLength = getPathLength(path);
  const hasPath = path.length >= 2 && totalLength > ARRIVAL_EPSILON;

  // 経路帯・案内矢印・目的地マーカー(navigationRoute用のpath)は変更せず、自動カメラの
  // 移動先だけ目的地手前のstopPositionへ差し替えたcameraRouteを別に用意する
  const { cameraRoute, cameraTotalLength } = useMemo(() => {
    if (!hasPath) return { cameraRoute: path, cameraTotalLength: totalLength };
    const collisionBounds = COLLISION_BOUNDS_BY_ID.get(destination.id);
    const { cameraRoute: route } = computeAutoCameraStop(
      path,
      destination.approachDistance ?? DEFAULT_APPROACH_DISTANCE,
      collisionBounds,
      PLAYER_RADIUS,
    );
    return { cameraRoute: route, cameraTotalLength: getPathLength(route) };
  }, [path, hasPath, totalLength, destination]);

  useEffect(() => {
    distanceRef.current = 0;
    arrivedRef.current = false;
    initializedRef.current = false;
  }, [restartSignal, path]);

  useFrame((_, delta) => {
    if (!hasPath) {
      camera.position.set(...FALLBACK_POSITION);
      camera.lookAt(...FALLBACK_LOOK_TARGET);
      if (!arrivedRef.current) {
        arrivedRef.current = true;
        onArrive();
      }
      return;
    }

    const clampedDelta = Math.min(delta, MAX_DELTA);
    const speed = reducedMotion ? REDUCED_SPEED : BASE_SPEED;

    if (isPlaying && !arrivedRef.current) {
      // 終点手前(EASE_OUT_START_RATIO以降)は速度を落とし、最後のフレームで急に前進しないようにする
      const progress = cameraTotalLength > ARRIVAL_EPSILON ? distanceRef.current / cameraTotalLength : 1;
      let speedFactor = 1;
      if (progress > EASE_OUT_START_RATIO) {
        const localT = Math.min(1, (progress - EASE_OUT_START_RATIO) / (1 - EASE_OUT_START_RATIO));
        speedFactor = THREE.MathUtils.lerp(1, EASE_OUT_MIN_SPEED_FACTOR, easeOutCubic(localT));
      }
      distanceRef.current = Math.min(cameraTotalLength, distanceRef.current + speed * speedFactor * clampedDelta);
    }

    const arrivedNow = distanceRef.current >= cameraTotalLength - ARRIVAL_EPSILON;
    const current = samplePathAtDistance(cameraRoute, distanceRef.current);
    const lookAhead = arrivedNow
      ? { position: destination.position }
      : samplePathAtDistance(cameraRoute, distanceRef.current + LOOK_AHEAD_DISTANCE);

    const lookTargetY = arrivedNow ? ARRIVED_LOOK_TARGET_Y : EYE_HEIGHT;

    if (!initializedRef.current) {
      smoothedPosition.current.set(current.position[0], EYE_HEIGHT, current.position[2]);
      smoothedLookTarget.current.set(lookAhead.position[0], lookTargetY, lookAhead.position[2]);
      initializedRef.current = true;
    } else {
      const positionLambda = reducedMotion ? POSITION_DAMPING * 0.6 : POSITION_DAMPING;
      const lookLambda = reducedMotion ? LOOK_DAMPING * 0.6 : LOOK_DAMPING;

      smoothedPosition.current.x = THREE.MathUtils.damp(
        smoothedPosition.current.x,
        current.position[0],
        positionLambda,
        clampedDelta,
      );
      smoothedPosition.current.z = THREE.MathUtils.damp(
        smoothedPosition.current.z,
        current.position[2],
        positionLambda,
        clampedDelta,
      );
      smoothedPosition.current.y = EYE_HEIGHT;

      smoothedLookTarget.current.x = THREE.MathUtils.damp(
        smoothedLookTarget.current.x,
        lookAhead.position[0],
        lookLambda,
        clampedDelta,
      );
      smoothedLookTarget.current.z = THREE.MathUtils.damp(
        smoothedLookTarget.current.z,
        lookAhead.position[2],
        lookLambda,
        clampedDelta,
      );
      smoothedLookTarget.current.y = THREE.MathUtils.damp(smoothedLookTarget.current.y, lookTargetY, lookLambda, clampedDelta);
    }

    camera.position.copy(smoothedPosition.current);
    camera.lookAt(smoothedLookTarget.current);

    if (arrivedNow && !arrivedRef.current) {
      arrivedRef.current = true;
      onArrive();
    }
  });

  return null;
}
