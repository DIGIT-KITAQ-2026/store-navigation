"use client";

import { useMemo } from "react";
import * as THREE from "three";
import CategoryFixtureBody from "./CategoryFixtures";
import CategorySign from "./CategorySign";
import DestinationMarker from "./DestinationMarker";
import { buildFixtureProducts, type ProductInstance, type ProductShapeKind } from "./FixtureProducts";
import type { StoreFixtureDefinition, Vector3Tuple } from "@/lib/store-navigation/types";

// 日本語カテゴリサイン(CategorySign)を売り場本体の上端から少しだけ上に置くための余白
const SIGN_LOCAL_Y_MARGIN = 0.2;

const tempObject = new THREE.Object3D();
const tempColor = new THREE.Color();

/** InstancedMeshへ位置・スケール・回転(と任意で色)をまとめて書き込む。useFrame外の一度きりの反映で完結する */
function applyInstances(
  mesh: THREE.InstancedMesh | null,
  items: readonly { position: Vector3Tuple; scale?: Vector3Tuple; rotation?: Vector3Tuple; color?: string }[],
) {
  if (!mesh) return;
  items.forEach((item, index) => {
    tempObject.position.set(item.position[0], item.position[1], item.position[2]);
    if (item.scale) tempObject.scale.set(item.scale[0], item.scale[1], item.scale[2]);
    else tempObject.scale.set(1, 1, 1);
    if (item.rotation) tempObject.rotation.set(item.rotation[0], item.rotation[1], item.rotation[2]);
    else tempObject.rotation.set(0, 0, 0);
    tempObject.updateMatrix();
    mesh.setMatrixAt(index, tempObject.matrix);
    if (item.color) {
      tempColor.set(item.color);
      mesh.setColorAt(index, tempColor);
    }
  });
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
}

function byShape(products: readonly ProductInstance[], shape: ProductShapeKind): ProductInstance[] {
  return products.filter((product) => product.shape === shape);
}

interface StoreFixturesProps {
  fixtures: readonly StoreFixtureDefinition[];
  activeDestinationId: string;
  reducedMotion: boolean;
  /** スマホ判定。trueの場合のみ、目的地以外のカテゴリサインをカメラ距離でフェードさせる */
  showsMobileControls: boolean;
}

/**
 * Shelf_02〜08(青果以外)を設定配列から一括生成する。売り場本体はカテゴリごとに異なる構造
 * (CategoryFixtures.tsx)を使い、「共通の棚に箱を並べただけ」に見えないようにする。
 * カテゴリ表示は3D側に板(mesh)を持たないCategorySign(Htmlのみ)で行い、日本語サイン・
 * 目的地マーカーはカテゴリに依らず共通のフレーム(size)基準で配置する。
 * 商品の象徴的な形状(FixtureProducts.ts)は、形状の種類(box/cylinder/oval/cone3/cone4/crystal)
 * ごとに6本のInstancedMesh(setColorAt)へ集約する
 */
export default function StoreFixtures({ fixtures, activeDestinationId, reducedMotion, showsMobileControls }: StoreFixturesProps) {
  const [frameWidth, frameHeight, frameDepth] = fixtures[0]?.size ?? [2.4, 1.8, 3.2];

  // 日本語カテゴリサイン: 売り場本体(フレーム)の上端から少しだけ上、商品形状と同じ列(同じX/Z)に配置する
  const signLocalY = frameHeight / 2 + SIGN_LOCAL_Y_MARGIN;
  const signPositions = useMemo<Vector3Tuple[]>(
    () => fixtures.map((fixture) => [fixture.position[0], fixture.position[1] + signLocalY, fixture.position[2]]),
    [fixtures, signLocalY],
  );

  // 売り場タイプ別の象徴的な商品形状。形状の種類ごとにまとめてInstancedMesh化する
  const allProducts = useMemo(() => fixtures.flatMap((fixture) => buildFixtureProducts(fixture)), [fixtures]);
  const boxProducts = useMemo(() => byShape(allProducts, "box"), [allProducts]);
  const cylinderProducts = useMemo(() => byShape(allProducts, "cylinder"), [allProducts]);
  const ovalProducts = useMemo(() => byShape(allProducts, "oval"), [allProducts]);
  const cone3Products = useMemo(() => byShape(allProducts, "cone3"), [allProducts]);
  const cone4Products = useMemo(() => byShape(allProducts, "cone4"), [allProducts]);
  const crystalProducts = useMemo(() => byShape(allProducts, "crystal"), [allProducts]);

  const activeFixture = fixtures.find((fixture) => fixture.id === activeDestinationId);

  return (
    <group>
      {fixtures.map((fixture) => (
        <group key={fixture.id} position={fixture.position}>
          <CategoryFixtureBody fixture={fixture} frameWidth={frameWidth} frameHeight={frameHeight} frameDepth={frameDepth} />
        </group>
      ))}

      {/* 商品の簡易表現(売り場タイプ別。形状の種類ごとにInstancedMeshへ集約し、個別コンポーネントは作らない) */}
      {boxProducts.length > 0 && (
        <instancedMesh args={[undefined, undefined, boxProducts.length]} ref={(mesh) => applyInstances(mesh, boxProducts)}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial roughness={0.75} />
        </instancedMesh>
      )}
      {cylinderProducts.length > 0 && (
        <instancedMesh args={[undefined, undefined, cylinderProducts.length]} ref={(mesh) => applyInstances(mesh, cylinderProducts)}>
          <cylinderGeometry args={[0.5, 0.5, 1, 10]} />
          <meshStandardMaterial roughness={0.6} />
        </instancedMesh>
      )}
      {ovalProducts.length > 0 && (
        <instancedMesh args={[undefined, undefined, ovalProducts.length]} ref={(mesh) => applyInstances(mesh, ovalProducts)}>
          <sphereGeometry args={[0.5, 12, 8]} />
          <meshStandardMaterial roughness={0.55} />
        </instancedMesh>
      )}
      {cone3Products.length > 0 && (
        <instancedMesh args={[undefined, undefined, cone3Products.length]} ref={(mesh) => applyInstances(mesh, cone3Products)}>
          <coneGeometry args={[0.5, 1, 3]} />
          <meshStandardMaterial roughness={0.65} />
        </instancedMesh>
      )}
      {cone4Products.length > 0 && (
        <instancedMesh args={[undefined, undefined, cone4Products.length]} ref={(mesh) => applyInstances(mesh, cone4Products)}>
          <coneGeometry args={[0.5, 1, 4]} />
          <meshStandardMaterial roughness={0.65} />
        </instancedMesh>
      )}
      {crystalProducts.length > 0 && (
        <instancedMesh args={[undefined, undefined, crystalProducts.length]} ref={(mesh) => applyInstances(mesh, crystalProducts)}>
          <octahedronGeometry args={[0.5, 0]} />
          <meshStandardMaterial roughness={0.4} />
        </instancedMesh>
      )}

      {/* 日本語カテゴリサイン: 全カテゴリ共通のCategorySign(3D板を持たない小型カード、Html自身が濃色背景を持つ) */}
      {fixtures.map((fixture, index) => (
        <CategorySign
          key={fixture.id}
          label={fixture.label}
          color={fixture.color}
          position={signPositions[index]}
          isDestination={fixture.id === activeDestinationId}
          dimNonDestinationByDistance={showsMobileControls}
        />
      ))}

      {/* 目的地マーカー: 現在選択中の棚1件にのみ表示する */}
      {activeFixture && <DestinationMarker position={activeFixture.destinationPosition} reducedMotion={reducedMotion} />}
    </group>
  );
}
