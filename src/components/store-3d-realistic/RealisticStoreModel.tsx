"use client";

import { useEffect, useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import { extractRealisticLayout } from "@/lib/store-navigation/realistic-store-model-layout";
import type { RealisticLayout } from "@/lib/store-navigation/realistic-store-layout";

const MODEL_URL = "/models/smart-store/smart-store-retail-v05.glb";

export default function RealisticStoreModel({ onReady }: { onReady: (layout: RealisticLayout) => void }) {
  // Uncompressed local asset: disable both decoders, including the default remote Draco URL.
  const { scene } = useGLTF(MODEL_URL, false, false);
  const instance = useMemo(() => scene.clone(true), [scene]);
  const layout = useMemo(() => extractRealisticLayout(instance), [instance]);
  useEffect(() => { onReady(layout); }, [onReady, layout]);
  // Clone the hierarchy, retain cached shared geometry/materials and original Y-up coordinates.
  // The useGLTF cache owns these resources; do not dispose them on a route remount.
  return <primitive object={instance} position={[0, 0, 0]} rotation={[0, 0, 0]} scale={1} dispose={null} />;
}
