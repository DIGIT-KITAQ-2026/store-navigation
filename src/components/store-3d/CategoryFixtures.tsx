"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { FIXTURE_CASE_LAYOUT, frontSign } from "./FixtureProducts";
import type { StoreFixtureDefinition } from "@/lib/store-navigation/types";

// 棚板(FixtureProducts.tsのBOARD_HALF_THICKNESS=0.03と対応する厚み0.06)
const BOARD_THICKNESS = 0.06;

interface CategoryFixtureBodyProps {
  fixture: StoreFixtureDefinition;
  frameWidth: number;
  frameHeight: number;
  frameDepth: number;
}

/**
 * Shelf_02〜08の売り場本体(ケース・棚)。fixture.typeに応じて構造を切り替え、
 * 「共通棚に商品を並べただけ」に見えないようにする。position/rotationはStoreFixtures.tsx側で
 * 既存のfixture.positionへ適用済みのため、ここでは常にローカル座標(フレーム中心が原点)で組み立てる。
 * 各カテゴリのケース天面/棚板Yは FixtureProducts.ts の FIXTURE_CASE_LAYOUT と共有し、
 * 商品の設置面とケース形状がズレないようにしている
 */
export default function CategoryFixtureBody({ fixture, frameWidth, frameHeight, frameDepth }: CategoryFixtureBodyProps) {
  switch (fixture.type) {
    case "meat":
      return <LowCase frameWidth={frameWidth} frameDepth={frameDepth} accentColor={fixture.color} layout={FIXTURE_CASE_LAYOUT.meat} caseColor="#f2ece0" facing={fixture.facing} />;
    case "seafood":
      return <SeafoodCase frameWidth={frameWidth} frameDepth={frameDepth} accentColor={fixture.color} />;
    case "deli":
      return <DeliTable frameWidth={frameWidth} frameDepth={frameDepth} accentColor={fixture.color} />;
    case "processed-food":
      return (
        <ProcessedFoodRack
          frameWidth={frameWidth}
          frameHeight={frameHeight}
          frameDepth={frameDepth}
          boardY={FIXTURE_CASE_LAYOUT["processed-food"].boardY}
          facing={fixture.facing}
        />
      );
    case "frozen":
      return <FrozenChest frameWidth={frameWidth} frameDepth={frameDepth} facing={fixture.facing} />;
    case "beverage":
      return <BeverageCase frameWidth={frameWidth} frameDepth={frameDepth} accentColor={fixture.color} facing={fixture.facing} />;
    case "dairy":
      return <ShelfCase frameWidth={frameWidth} frameHeight={frameHeight} frameDepth={frameDepth} boardY={FIXTURE_CASE_LAYOUT.dairy.boardY} caseColor="#eef6fb" boardColor="#d7e9f2" />;
    default:
      return null;
  }
}

/** 精肉・惣菜共通の「低いケース」土台。天面に商品を直接置くシンプルな構造(通路側から天面・正面が見える) */
function LowCase({
  frameWidth,
  frameDepth,
  accentColor,
  caseColor,
  layout,
  facing,
}: {
  frameWidth: number;
  frameDepth: number;
  accentColor: string;
  caseColor: string;
  layout: { caseBottom: number; caseTop: number };
  facing: StoreFixtureDefinition["facing"];
}) {
  const caseHeight = layout.caseTop - layout.caseBottom;
  const caseCenterY = layout.caseBottom + caseHeight / 2;
  const bodyGeometry = useMemo(() => new THREE.BoxGeometry(frameWidth - 0.2, caseHeight, frameDepth - 0.3), [frameWidth, caseHeight, frameDepth]);
  const bodyMaterial = useMemo(() => new THREE.MeshStandardMaterial({ color: caseColor, roughness: 0.85 }), [caseColor]);
  const trimGeometry = useMemo(() => new THREE.BoxGeometry(0.06, 0.16, frameDepth - 0.3), [frameDepth]);
  const trimMaterial = useMemo(() => new THREE.MeshStandardMaterial({ color: accentColor, roughness: 0.5 }), [accentColor]);

  const sign = frontSign(facing);
  const trimX = sign * ((frameWidth - 0.2) / 2 + 0.01);
  const trimY = layout.caseTop - 0.1;

  return (
    <group>
      <mesh geometry={bodyGeometry} material={bodyMaterial} position={[0, caseCenterY, 0]} dispose={null} />
      <mesh geometry={trimGeometry} material={trimMaterial} position={[trimX, trimY, 0]} dispose={null} />
    </group>
  );
}

/** 鮮魚: 低いケース+氷を敷いたような白いレーン(奥側)+波を連想する薄い青の帯 */
function SeafoodCase({ frameWidth, frameDepth, accentColor }: { frameWidth: number; frameDepth: number; accentColor: string }) {
  const layout = FIXTURE_CASE_LAYOUT.seafood;
  const caseHeight = layout.caseTop - layout.caseBottom;
  const caseCenterY = layout.caseBottom + caseHeight / 2;
  const bodyGeometry = useMemo(() => new THREE.BoxGeometry(frameWidth - 0.2, caseHeight, frameDepth - 0.3), [frameWidth, caseHeight, frameDepth]);
  const bodyMaterial = useMemo(() => new THREE.MeshStandardMaterial({ color: "#eaf3f7", roughness: 0.8 }), []);
  const iceBedGeometry = useMemo(() => new THREE.BoxGeometry(frameWidth - 0.5, 0.06, frameDepth - 0.5), [frameWidth, frameDepth]);
  const iceBedMaterial = useMemo(() => new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.6 }), []);
  const waveGeometry = useMemo(() => new THREE.BoxGeometry(frameWidth - 0.2, 0.05, 0.08), [frameWidth]);
  const waveMaterial = useMemo(() => new THREE.MeshStandardMaterial({ color: accentColor, roughness: 0.5 }), [accentColor]);

  return (
    <group>
      <mesh geometry={bodyGeometry} material={bodyMaterial} position={[0, caseCenterY, 0]} dispose={null} />
      <mesh geometry={iceBedGeometry} material={iceBedMaterial} position={[0, layout.caseTop + 0.03, 0]} dispose={null} />
      <mesh geometry={waveGeometry} material={waveMaterial} position={[0, layout.caseTop - 0.02, -(frameDepth - 0.3) / 2 + 0.05]} dispose={null} />
    </group>
  );
}

/** 惣菜: 暖色の低いテーブル+浅い仕切り(2本)で区画を感じさせる */
function DeliTable({ frameWidth, frameDepth, accentColor }: { frameWidth: number; frameDepth: number; accentColor: string }) {
  const layout = FIXTURE_CASE_LAYOUT.deli;
  const caseHeight = layout.caseTop - layout.caseBottom;
  const caseCenterY = layout.caseBottom + caseHeight / 2;
  const bodyGeometry = useMemo(() => new THREE.BoxGeometry(frameWidth - 0.2, caseHeight, frameDepth - 0.3), [frameWidth, caseHeight, frameDepth]);
  const bodyMaterial = useMemo(() => new THREE.MeshStandardMaterial({ color: "#e8b98a", roughness: 0.85 }), []);
  const dividerGeometry = useMemo(() => new THREE.BoxGeometry(frameWidth - 0.24, 0.05, 0.05), [frameWidth]);
  const dividerMaterial = useMemo(() => new THREE.MeshStandardMaterial({ color: accentColor, roughness: 0.6 }), [accentColor]);

  return (
    <group>
      <mesh geometry={bodyGeometry} material={bodyMaterial} position={[0, caseCenterY, 0]} dispose={null} />
      <mesh geometry={dividerGeometry} material={dividerMaterial} position={[0, layout.caseTop + 0.02, -0.5]} dispose={null} />
      <mesh geometry={dividerGeometry} material={dividerMaterial} position={[0, layout.caseTop + 0.02, 0.5]} dispose={null} />
    </group>
  );
}

/** 加工食品・乳製品共通の「開いたケース+複数段の棚板」構造(段数はboardYの長さで決まる) */
function ShelfCase({
  frameWidth,
  frameHeight,
  frameDepth,
  boardY,
  caseColor,
  boardColor,
}: {
  frameWidth: number;
  frameHeight: number;
  frameDepth: number;
  boardY: readonly number[];
  caseColor: string;
  boardColor: string;
}) {
  const thickness = 0.1;
  const panelGeometry = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);
  const panelMaterial = useMemo(() => new THREE.MeshStandardMaterial({ color: caseColor, roughness: 0.85 }), [caseColor]);
  const boardGeometry = useMemo(() => new THREE.BoxGeometry(frameWidth - 0.16, BOARD_THICKNESS, frameDepth - 0.2), [frameWidth, frameDepth]);
  const boardMaterial = useMemo(() => new THREE.MeshStandardMaterial({ color: boardColor, roughness: 0.7 }), [boardColor]);

  const backX = -(frameWidth / 2 - thickness / 2);

  return (
    <group>
      <mesh geometry={panelGeometry} material={panelMaterial} position={[backX, 0, 0]} scale={[thickness, frameHeight, frameDepth]} dispose={null} />
      <mesh geometry={panelGeometry} material={panelMaterial} position={[0, 0, frameDepth / 2 - thickness / 2]} scale={[frameWidth, frameHeight, thickness]} dispose={null} />
      <mesh geometry={panelGeometry} material={panelMaterial} position={[0, 0, -(frameDepth / 2 - thickness / 2)]} scale={[frameWidth, frameHeight, thickness]} dispose={null} />
      <mesh geometry={panelGeometry} material={panelMaterial} position={[0, -(frameHeight / 2 - thickness / 2), 0]} scale={[frameWidth, thickness, frameDepth]} dispose={null} />
      {boardY.map((y, index) => (
        <mesh key={`board-${index}`} geometry={boardGeometry} material={boardMaterial} position={[0, y, 0]} dispose={null} />
      ))}
    </group>
  );
}

/**
 * 加工食品: 「正面が閉じた巨大なBox」をやめ、左右の細い支柱+薄い背板(棚の高さまでのみ)+
 * 開いた3段の棚板+下部の低い台座で組み立てる小型ラック。支柱は棚の左右端(奥行き方向の前後2本ずつ計4本)
 * にのみ配置し、商品が並ぶ中央(通路側の視界)は塞がない。背板もフレーム全高ではなく棚の高さ分だけに
 * 抑え、上部のカテゴリサインまで大きな板が続かないようにする(色も温かい木色系にして背景と分離させる)
 */
function ProcessedFoodRack({
  frameWidth,
  frameHeight,
  frameDepth,
  boardY,
  facing,
}: {
  frameWidth: number;
  frameHeight: number;
  frameDepth: number;
  boardY: readonly number[];
  facing: StoreFixtureDefinition["facing"];
}) {
  const plinthColor = "#e3d2b4"; // 温かいクリーム色(台座・支柱・背板)
  const boardColor = "#c9975e"; // 明るい木色(棚板)
  const lipColor = "#a97c45"; // 棚板前端の縁(木色より少し濃い)

  const floorY = -frameHeight / 2;
  const plinthHeight = 0.15;
  const plinthY = floorY + plinthHeight / 2;
  const plinthGeometry = useMemo(() => new THREE.BoxGeometry(frameWidth - 0.3, plinthHeight, frameDepth - 0.3), [frameWidth, frameDepth]);
  const plinthMaterial = useMemo(() => new THREE.MeshStandardMaterial({ color: plinthColor, roughness: 0.85 }), []);

  // 支柱・背板は最上段の棚板より少し上まで(フレーム全高までは伸ばさない)
  const postTopY = boardY[0] + 0.25;
  const postHeight = postTopY - floorY;
  const postCenterY = floorY + postHeight / 2;
  const postSize = 0.08;
  const postGeometry = useMemo(() => new THREE.BoxGeometry(postSize, postHeight, postSize), [postHeight]);
  const postMaterial = useMemo(() => new THREE.MeshStandardMaterial({ color: plinthColor, roughness: 0.7 }), []);
  const postX = frameWidth / 2 - 0.1;
  const postZ = frameDepth / 2 - 0.3;
  const postPositions: [number, number][] = [
    [postX, postZ],
    [postX, -postZ],
    [-postX, postZ],
    [-postX, -postZ],
  ];

  // facingの手前側(通路側)の反対、つまりfrontSignと逆符号の側に背板を置く
  const sign = frontSign(facing);
  const backThickness = 0.06;
  const backGeometry = useMemo(() => new THREE.BoxGeometry(backThickness, postHeight, frameDepth - 0.4), [postHeight, frameDepth]);
  const backMaterial = useMemo(() => new THREE.MeshStandardMaterial({ color: plinthColor, roughness: 0.85 }), []);
  const backX = -sign * (frameWidth / 2 - 0.15);

  const boardGeometry = useMemo(() => new THREE.BoxGeometry(frameWidth - 0.16, BOARD_THICKNESS, frameDepth - 0.2), [frameWidth, frameDepth]);
  const boardMaterial = useMemo(() => new THREE.MeshStandardMaterial({ color: boardColor, roughness: 0.7 }), []);

  // 棚板の通路側(前面)にだけ薄い縁を付け、開いた棚であることを視覚的に強調する
  const lipGeometry = useMemo(() => new THREE.BoxGeometry(0.04, 0.06, frameDepth - 0.2), [frameDepth]);
  const lipMaterial = useMemo(() => new THREE.MeshStandardMaterial({ color: lipColor, roughness: 0.6 }), []);
  const lipX = sign * ((frameWidth - 0.16) / 2 + 0.01);

  return (
    <group>
      <mesh geometry={plinthGeometry} material={plinthMaterial} position={[0, plinthY, 0]} dispose={null} />
      <mesh geometry={backGeometry} material={backMaterial} position={[backX, postCenterY, 0]} dispose={null} />
      {postPositions.map(([x, z], index) => (
        <mesh key={`post-${index}`} geometry={postGeometry} material={postMaterial} position={[x, postCenterY, z]} dispose={null} />
      ))}
      {boardY.map((y, index) => (
        <group key={`board-${index}`}>
          <mesh geometry={boardGeometry} material={boardMaterial} position={[0, y, 0]} dispose={null} />
          <mesh geometry={lipGeometry} material={lipMaterial} position={[lipX, y + 0.045, 0]} dispose={null} />
        </group>
      ))}
    </group>
  );
}

/** 冷凍食品: 横長のチェスト型ケース(扉付きを連想する上部の水色フチ)+雪の結晶を模した小さな多面体 */
function FrozenChest({ frameWidth, frameDepth, facing }: { frameWidth: number; frameDepth: number; facing: StoreFixtureDefinition["facing"] }) {
  const layout = FIXTURE_CASE_LAYOUT.frozen;
  const caseHeight = layout.caseTop - layout.caseBottom;
  const caseCenterY = layout.caseBottom + caseHeight / 2;
  const bodyGeometry = useMemo(() => new THREE.BoxGeometry(frameWidth - 0.2, caseHeight, frameDepth - 0.3), [frameWidth, caseHeight, frameDepth]);
  const bodyMaterial = useMemo(() => new THREE.MeshStandardMaterial({ color: "#eaf6fa", roughness: 0.8 }), []);
  const rimGeometry = useMemo(() => new THREE.BoxGeometry(frameWidth - 0.16, 0.05, frameDepth - 0.26), [frameWidth, frameDepth]);
  const rimMaterial = useMemo(() => new THREE.MeshStandardMaterial({ color: "#a8d8e8", roughness: 0.5 }), []);
  const crystalGeometry = useMemo(() => new THREE.OctahedronGeometry(0.5, 0), []);
  const crystalMaterial = useMemo(() => new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.4 }), []);

  const sign = frontSign(facing);
  const crystalX = sign * ((frameWidth - 0.2) / 2 + 0.03);

  return (
    <group>
      <mesh geometry={bodyGeometry} material={bodyMaterial} position={[0, caseCenterY, 0]} dispose={null} />
      <mesh geometry={rimGeometry} material={rimMaterial} position={[0, layout.caseTop - 0.02, 0]} dispose={null} />
      <mesh geometry={crystalGeometry} material={crystalMaterial} position={[crystalX, layout.caseTop - 0.35, -0.4]} scale={0.12} dispose={null} />
      <mesh geometry={crystalGeometry} material={crystalMaterial} position={[crystalX, layout.caseTop - 0.35, 0.5]} scale={0.1} dispose={null} />
    </group>
  );
}

/** 飲料: 低いケース(前列)+奥に一段高いステップ(後列)を組み合わせた段差構造。ボトル全体が通路側から見える */
function BeverageCase({
  frameWidth,
  frameDepth,
  accentColor,
  facing,
}: {
  frameWidth: number;
  frameDepth: number;
  accentColor: string;
  facing: StoreFixtureDefinition["facing"];
}) {
  const layout = FIXTURE_CASE_LAYOUT.beverage;
  const caseHeight = layout.caseTop - layout.caseBottom;
  const caseCenterY = layout.caseBottom + caseHeight / 2;
  const bodyGeometry = useMemo(() => new THREE.BoxGeometry(frameWidth - 0.2, caseHeight, frameDepth - 0.3), [frameWidth, caseHeight, frameDepth]);
  const bodyMaterial = useMemo(() => new THREE.MeshStandardMaterial({ color: "#eef6fb", roughness: 0.85 }), []);
  const trimGeometry = useMemo(() => new THREE.BoxGeometry(0.06, 0.12, frameDepth - 0.3), [frameDepth]);
  const trimMaterial = useMemo(() => new THREE.MeshStandardMaterial({ color: accentColor, roughness: 0.5 }), [accentColor]);

  const stepHeight = layout.stepTop - layout.caseTop;
  const stepDepth = frameWidth * 0.5;
  const stepGeometry = useMemo(() => new THREE.BoxGeometry(stepDepth, stepHeight, frameDepth - 0.3), [stepDepth, stepHeight, frameDepth]);
  const stepMaterial = useMemo(() => new THREE.MeshStandardMaterial({ color: "#dbeaf5", roughness: 0.8 }), []);

  const sign = frontSign(facing);
  const trimX = sign * ((frameWidth - 0.2) / 2 + 0.01);
  const stepX = -sign * 0.5;

  return (
    <group>
      <mesh geometry={bodyGeometry} material={bodyMaterial} position={[0, caseCenterY, 0]} dispose={null} />
      <mesh geometry={trimGeometry} material={trimMaterial} position={[trimX, layout.caseTop - 0.08, 0]} dispose={null} />
      <mesh geometry={stepGeometry} material={stepMaterial} position={[stepX, layout.caseTop + stepHeight / 2, 0]} dispose={null} />
    </group>
  );
}
