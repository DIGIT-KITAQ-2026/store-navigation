"use client";

import { useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import StoreEnvironment from "./StoreEnvironment";
import StoreFixtures from "./StoreFixtures";
import ProduceArea from "./ProduceArea";
import NavigationRoute from "./NavigationRoute";
import FirstPersonController from "./FirstPersonController";
import AutoDemoCamera from "./AutoDemoCamera";
import {
  ENTRANCE_NODE_ID,
  EYE_HEIGHT,
  GENERIC_STORE_FIXTURES,
  NAVIGATION_NODES,
  PRODUCE_FIXTURE,
} from "@/lib/store-navigation/store-layout";
import { translateCategory } from "@/lib/i18n/categoryLabels";
import { dictionaries } from "@/lib/i18n/dictionaries";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/locales";
import type { MovementInput, NavigationViewMode, StoreDestination, Vector3Tuple } from "@/lib/store-navigation/types";

const BACKGROUND_COLOR = "#eef4f5";

const ENTRANCE_FALLBACK_POSITION: Vector3Tuple =
  NAVIGATION_NODES.find((node) => node.id === ENTRANCE_NODE_ID)?.position ?? [0, 0, 2];

interface StoreSceneProps {
  mode: NavigationViewMode;
  path: Vector3Tuple[];
  destination: StoreDestination;
  isPlaying: boolean;
  restartSignal: number;
  reducedMotion: boolean;
  /** 経路帯・案内矢印・目的地マーカーを表示するか。falseでも店舗・棚・商品・カテゴリサインは表示する */
  guideVisible: boolean;
  /** スマホ操作UI(仮想スティック・スワイプ視点操作)を使うか */
  showsMobileControls: boolean;
  /** 仮想スティックが書き込む共有ref。first-personモード中、FirstPersonControllerが毎フレーム読む */
  movementInputRef: React.RefObject<MovementInput>;
  onArrive: () => void;
  onLockChange: (locked: boolean) => void;
  onReady?: () => void;
  /** カテゴリサイン(棚上のラベル)・入口ラベルの表示言語。未指定時は日本語のまま(/store-3d-demo等) */
  locale?: Locale;
}

/**
 * Canvasと3Dシーン全体の組み立て。next/dynamic(ssr:false)経由でのみ読み込まれる想定
 */
export default function StoreScene({
  mode,
  path,
  destination,
  isPlaying,
  restartSignal,
  reducedMotion,
  guideVisible,
  showsMobileControls,
  movementInputRef,
  onArrive,
  onLockChange,
  onReady,
  locale = DEFAULT_LOCALE,
}: StoreSceneProps) {
  const spawnPosition = path[0] ?? ENTRANCE_FALLBACK_POSITION;
  // 目的地マーカーは各棚コンポーネント側でactiveDestinationId(fixture)/isActive(青果)の一致判定で
  // 表示を切り替えているため、guideVisible=falseの間はどの棚とも一致しないIDを渡して非表示にする
  const activeDestinationId = guideVisible ? destination.id : "";

  // カテゴリサイン(棚上のラベル)は固定8種の静的対応表(翻訳API呼び出し不要)でlocaleに合わせて置き換える
  const translatedFixtures = useMemo(
    () => GENERIC_STORE_FIXTURES.map((fixture) => ({ ...fixture, label: translateCategory(fixture.label, locale) })),
    [locale],
  );
  const translatedProduceLabel = translateCategory(PRODUCE_FIXTURE.label, locale);
  const entranceLabel = dictionaries[locale].navigate3d.entranceLabel;

  return (
    <Canvas
      dpr={[1, 1.5]}
      gl={{ antialias: true }}
      camera={{ position: [0, EYE_HEIGHT, -2], fov: 60, near: 0.1, far: 100 }}
      onCreated={() => onReady?.()}
      // 一人称モード中(3D操作中)だけ誤スクロールを防ぐ。自動デモ中は通常のページスクロールを妨げない
      style={mode === "first-person" ? { touchAction: "none", overscrollBehavior: "contain" } : undefined}
    >
      <color attach="background" args={[BACKGROUND_COLOR]} />
      <hemisphereLight args={["#ffffff", "#d8e0e6", 0.9]} />
      <ambientLight intensity={0.35} />
      <directionalLight position={[6, 10, 4]} intensity={0.6} />

      <StoreEnvironment entranceLabel={entranceLabel} />
      <StoreFixtures
        fixtures={translatedFixtures}
        activeDestinationId={activeDestinationId}
        reducedMotion={reducedMotion}
        showsMobileControls={showsMobileControls}
      />
      <ProduceArea
        position={PRODUCE_FIXTURE.position}
        label={translatedProduceLabel}
        isActive={activeDestinationId === PRODUCE_FIXTURE.id}
        reducedMotion={reducedMotion}
        showsMobileControls={showsMobileControls}
      />
      {guideVisible && <NavigationRoute path={path} reducedMotion={reducedMotion} />}

      {mode === "first-person" ? (
        <FirstPersonController
          spawnPosition={spawnPosition}
          onLockChange={onLockChange}
          showsMobileControls={showsMobileControls}
          movementInputRef={movementInputRef}
        />
      ) : (
        <AutoDemoCamera
          path={path}
          destination={destination}
          isPlaying={isPlaying}
          restartSignal={restartSignal}
          reducedMotion={reducedMotion}
          onArrive={onArrive}
        />
      )}
    </Canvas>
  );
}
