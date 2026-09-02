import type { FixtureFacing, FixtureType, StoreFixtureDefinition, Vector3Tuple } from "@/lib/store-navigation/types";

/**
 * Shelf_02〜08向けの「象徴的な商品形状」を売り場タイプ別に決定的に生成する。
 * すべて共有Geometry(単位Box/Cylinder/Sphere/Cone/Octahedron、中心原点・一辺/直径1)を前提に、
 * 個々のインスタンスはposition/scale/color(+必要な場合のみrotation)だけで見た目を変える。
 * Math.randomは使わず、配列の並びだけで配置を決めるため毎回同じ結果になる。
 *
 * 座標は「棚の陳列面(facing)を基準にした手前/横方向」で指定し、
 * fixture.facing・fixture.positionを使って初めてワールド座標へ変換する
 * (this.forward/lateralをローカル座標のまま混在させない)。
 * 現状のShelf_02〜08はすべてpositive-x/negative-x facingのため、forward→X・lateral→Zの
 * 対応が常に保たれる(z-facingが増えた場合はtoWorldOffsetの対応表を拡張すること)。
 */
export type ProductShapeKind = "box" | "cylinder" | "oval" | "cone3" | "cone4" | "crystal";

export interface ProductInstance {
  shape: ProductShapeKind;
  position: Vector3Tuple;
  /** 単位Geometry(辺の長さ/直径1)に対するスケール。半分がそのまま各軸の半径になる */
  scale: Vector3Tuple;
  color: string;
  /** 既定は無回転。魚の尾のように向きを変えたい場合のみ指定する(Euler、ラジアン) */
  rotation?: Vector3Tuple;
}

// フレーム(GENERIC_FIXTURE_SIZE = [2.4, 1.8, 3.2])のローカル原点はY=0が縦方向の中央になる。
// displayBoundsはプレイヤー移動用のcollisionBoundsとは別物で、商品配置がフレーム内へ収まっている
// ことを開発時に検証するためだけに使う(本番ビルドでは一切コストをかけない)
const DISPLAY_BOUNDS = { halfX: 1.15, halfZ: 1.55, minY: -0.95, maxY: 0.92 } as const;

/**
 * 売り場タイプ別の「ケース天面Y」など、CategoryFixtures.tsx(売り場本体)とFixtureProducts.ts
 * (商品配置)の両方が参照する共通レイアウト定数。数値の二重管理によるズレを防ぐため、
 * ケースの高さ・棚板Yはここを唯一の定義元とする
 */
export const FIXTURE_CASE_LAYOUT = {
  meat: { caseBottom: -0.9, caseTop: -0.15 },
  seafood: { caseBottom: -0.9, caseTop: -0.2 },
  deli: { caseBottom: -0.9, caseTop: -0.3 },
  "processed-food": { boardY: [0.5, 0.0, -0.5] as const },
  frozen: { caseBottom: -0.9, caseTop: -0.3 },
  beverage: { caseBottom: -0.9, caseTop: -0.5, stepTop: -0.15 },
  dairy: { boardY: [0.5, -0.35] as const },
} as const;

/** 棚の陳列面(通路側)がローカル+X/-Xのどちら向きかを1/-1で返す(forwardオフセットの符号と対応) */
export function frontSign(facing: FixtureFacing): 1 | -1 {
  return facing === "negative-x" ? -1 : 1;
}

// 棚板(BoxGeometryのY方向厚み0.06)の半分。商品の底面がちょうど棚板の上面に接するように使う
const BOARD_HALF_THICKNESS = 0.03;

interface ProductSpec {
  shape: ProductShapeKind;
  offsetY: number;
  /** 陳列面(通路側)へ向かう向きのオフセット。値が大きいほど棚の手前(通路側)に近づく */
  forward: number;
  /** 陳列面に沿った横方向のオフセット(棚の長手方向の並び) */
  lateral: number;
  scale: Vector3Tuple;
  color: string;
  rotation?: Vector3Tuple;
}

function lateralSpread(count: number, spacing: number): number[] {
  const start = -((count - 1) / 2) * spacing;
  return Array.from({ length: count }, (_, i) => start + i * spacing);
}

/** 精肉: 白いトレー(box)+赤みの丸い商品(oval)を1セットとして、トレーごとに配置する */
function buildMeatSpecs(): ProductSpec[] {
  const { caseTop } = FIXTURE_CASE_LAYOUT.meat;
  const trayHeight = 0.1;
  const trayY = caseTop + trayHeight / 2;
  const bumpHeight = 0.14;
  const bumpY = caseTop + trayHeight + bumpHeight / 2;
  const laterals = lateralSpread(4, 0.55);
  const bumpColors = ["#c1543f", "#e0876f", "#b23f2e", "#d98a7a"];

  const trays = laterals.map<ProductSpec>((lateral) => ({
    shape: "box",
    offsetY: trayY,
    forward: 0.75,
    lateral,
    scale: [0.5, trayHeight, 0.5],
    color: "#ffffff",
  }));
  const bumps = laterals.map<ProductSpec>((lateral, index) => ({
    shape: "oval",
    offsetY: bumpY,
    forward: 0.75,
    lateral,
    scale: [0.3, bumpHeight, 0.38],
    color: bumpColors[index % bumpColors.length],
  }));
  return [...trays, ...bumps];
}

/** 鮮魚: 胴体(横長に潰したoval)+尾(cone3を横向きに回転)を1匹として並べる */
function buildSeafoodSpecs(): ProductSpec[] {
  const { caseTop } = FIXTURE_CASE_LAYOUT.seafood;
  const bodyScale: Vector3Tuple = [0.22, 0.14, 0.5];
  const bodyY = caseTop + bodyScale[1] / 2;
  const tailScale: Vector3Tuple = [0.12, 0.12, 0.22];
  const bodyColors = ["#5f8fbf", "#8fb8d6", "#c7dfe8", "#5f8fbf"];
  const tailColors = ["#3f6fa0", "#6f9cbd", "#a8cbdc", "#3f6fa0"];
  const laterals = lateralSpread(4, 0.65);

  // X軸回りに90°回転すると、cone3のローカルY(高さ)とZ(底面半径)がワールド上で入れ替わる。
  // 見かけ上の高さはtailScale[2]/2(=底面半径)、Z方向の張り出しはtailScale[1]/2(=高さ)になる
  const tailWorldHalfY = tailScale[2] / 2;
  const tailWorldHalfZ = tailScale[1] / 2;
  const tailY = caseTop + tailWorldHalfY;

  const bodies = laterals.map<ProductSpec>((lateral, index) => ({
    shape: "oval",
    offsetY: bodyY,
    forward: 0.55,
    lateral,
    scale: bodyScale,
    color: bodyColors[index % bodyColors.length],
  }));
  const tails = laterals.map<ProductSpec>((lateral, index) => {
    const side = lateral >= 0 ? 1 : -1;
    return {
      shape: "cone3",
      offsetY: tailY,
      forward: 0.55,
      lateral: lateral + side * (bodyScale[2] / 2 + tailWorldHalfZ),
      scale: tailScale,
      color: tailColors[index % tailColors.length],
      // 既定のcone(頂点+Y)をZ方向へ倒し、頂点が胴体から遠ざかる向き(外側)を向くようにする
      rotation: [side * (Math.PI / 2), 0, 0] as Vector3Tuple,
    };
  });
  const ice = lateralSpread(4, 0.85).map<ProductSpec>((lateral, index) => ({
    shape: "crystal",
    offsetY: caseTop + 0.08,
    forward: 0.1,
    lateral,
    scale: [0.14, 0.14, 0.14],
    color: index % 2 === 0 ? "#ffffff" : "#cfe9f2",
  }));
  return [...bodies, ...tails, ...ice];
}

/** 惣菜: 弁当箱(box)+おにぎり(cone3、既定の頂点上向きのまま使う)+揚げ物(oval)を混在させる */
function buildDeliSpecs(): ProductSpec[] {
  const { caseTop } = FIXTURE_CASE_LAYOUT.deli;
  const bentoScale: Vector3Tuple = [0.45, 0.12, 0.5];
  const bentoY = caseTop + bentoScale[1] / 2;
  const bentos = lateralSpread(3, 1.0).map<ProductSpec>((lateral) => ({
    shape: "box",
    offsetY: bentoY,
    forward: 0.75,
    lateral,
    scale: bentoScale,
    color: "#f5ead9",
  }));

  const onigiriScale: Vector3Tuple = [0.28, 0.22, 0.28];
  const onigiriY = caseTop + onigiriScale[1] / 2;
  const onigiri = lateralSpread(2, 1.0).map<ProductSpec>((lateral) => ({
    shape: "cone3",
    offsetY: onigiriY,
    forward: 0.35,
    lateral,
    scale: onigiriScale,
    color: "#efe6d4",
  }));

  const friedScale: Vector3Tuple = [0.22, 0.14, 0.26];
  const friedY = caseTop + friedScale[1] / 2;
  const fried = lateralSpread(3, 0.8).map<ProductSpec>((lateral, index) => ({
    shape: "oval",
    offsetY: friedY,
    forward: 0.02,
    lateral,
    scale: friedScale,
    color: index === 1 ? "#c98a2e" : "#d9a441",
  }));

  return [...bentos, ...onigiri, ...fried];
}

/** 加工食品: 缶(cylinder)・瓶(cylinder+cap)・箱(box)・乾麺(細長いbox)を3段の棚に振り分ける */
function buildProcessedFoodSpecs(): ProductSpec[] {
  const [upperY, midY, lowerY] = FIXTURE_CASE_LAYOUT["processed-food"].boardY;

  const canScale: Vector3Tuple = [0.24, 0.22, 0.24];
  const cans = lateralSpread(3, 0.7).map<ProductSpec>((lateral, index) => ({
    shape: "cylinder",
    offsetY: midY + BOARD_HALF_THICKNESS + canScale[1] / 2,
    forward: 0.8,
    lateral,
    scale: canScale,
    color: ["#c1543f", "#3f6b46", "#c9972a"][index % 3],
  }));

  const jarBodyScale: Vector3Tuple = [0.16, 0.34, 0.16];
  const jarCapScale: Vector3Tuple = [0.1, 0.06, 0.1];
  const jarLaterals = lateralSpread(2, 0.8);
  const jarBodyY = upperY + BOARD_HALF_THICKNESS + jarBodyScale[1] / 2;
  const jars = jarLaterals.flatMap<ProductSpec>((lateral) => [
    { shape: "cylinder", offsetY: jarBodyY, forward: 0.75, lateral, scale: jarBodyScale, color: "#b5651d" },
    {
      shape: "cylinder",
      offsetY: jarBodyY + jarBodyScale[1] / 2 + jarCapScale[1] / 2,
      forward: 0.75,
      lateral,
      scale: jarCapScale,
      color: "#3e2b1f",
    },
  ]);

  const boxScale: Vector3Tuple = [0.32, 0.4, 0.28];
  const boxes = lateralSpread(2, 0.9).map<ProductSpec>((lateral, index) => ({
    shape: "box",
    offsetY: lowerY + BOARD_HALF_THICKNESS + boxScale[1] / 2,
    forward: 0.75,
    lateral,
    scale: boxScale,
    color: index === 0 ? "#a94438" : "#3f6b46",
  }));

  const noodleScale: Vector3Tuple = [0.14, 0.42, 0.1];
  const noodles = lateralSpread(2, 0.9).map<ProductSpec>((lateral) => ({
    shape: "box",
    offsetY: lowerY + BOARD_HALF_THICKNESS + noodleScale[1] / 2,
    forward: 0.3,
    lateral,
    scale: noodleScale,
    color: "#d9a441",
  }));

  return [...cans, ...jars, ...boxes, ...noodles];
}

/** 冷凍食品: 平たいboxのパッケージを、縦置き・横置きを混ぜてケース天面に並べる */
function buildFrozenSpecs(): ProductSpec[] {
  const { caseTop } = FIXTURE_CASE_LAYOUT.frozen;
  const standingScale: Vector3Tuple = [0.28, 0.32, 0.22];
  const layingScale: Vector3Tuple = [0.36, 0.14, 0.3];
  const colors = ["#7fb8cc", "#a8d8e8", "#ffffff", "#cfe9f2", "#4fa3b8"];
  const laterals = lateralSpread(5, 0.55);

  return laterals.map<ProductSpec>((lateral, index) => {
    const standing = index % 2 === 0;
    const scale = standing ? standingScale : layingScale;
    return {
      shape: "box",
      offsetY: caseTop + scale[1] / 2,
      forward: standing ? 0.65 : 0.35,
      lateral,
      scale,
      color: colors[index % colors.length],
    };
  });
}

/** 飲料: 前列にボトル(円柱3パーツ)、奥の一段高いステップに缶と紙パックを置く */
function buildBeverageSpecs(): ProductSpec[] {
  const { caseTop, stepTop } = FIXTURE_CASE_LAYOUT.beverage;

  const bottleBodyScale: Vector3Tuple = [0.22, 0.5, 0.22];
  const bottleNeckScale: Vector3Tuple = [0.09, 0.14, 0.09];
  const bottleCapScale: Vector3Tuple = [0.11, 0.06, 0.11];
  const bottleColors = ["#4a90d9", "#7a9d5c", "#d98a3d"];
  const bottles = lateralSpread(3, 1.0).flatMap<ProductSpec>((lateral, index) => {
    const bodyY = caseTop + bottleBodyScale[1] / 2;
    const neckY = caseTop + bottleBodyScale[1] + bottleNeckScale[1] / 2;
    const capY = neckY + bottleNeckScale[1] / 2 + bottleCapScale[1] / 2;
    const color = bottleColors[index % bottleColors.length];
    return [
      { shape: "cylinder", offsetY: bodyY, forward: 0.75, lateral, scale: bottleBodyScale, color },
      { shape: "cylinder", offsetY: neckY, forward: 0.75, lateral, scale: bottleNeckScale, color },
      { shape: "cylinder", offsetY: capY, forward: 0.75, lateral, scale: bottleCapScale, color: "#ffffff" },
    ];
  });

  const canScale: Vector3Tuple = [0.2, 0.22, 0.2];
  const cans = lateralSpread(3, 0.8).map<ProductSpec>((lateral, index) => ({
    shape: "cylinder",
    offsetY: stepTop + canScale[1] / 2,
    forward: -0.45,
    lateral,
    scale: canScale,
    color: ["#c1543f", "#7a9d5c", "#4a90d9"][index % 3],
  }));

  const cartonScale: Vector3Tuple = [0.18, 0.3, 0.16];
  const cartons = lateralSpread(2, 2.2).map<ProductSpec>((lateral, index) => ({
    shape: "box",
    offsetY: stepTop + cartonScale[1] / 2,
    forward: -0.45,
    lateral,
    scale: cartonScale,
    color: index === 0 ? "#d98a3d" : "#c1543f",
  }));

  return [...bottles, ...cans, ...cartons];
}

/** 乳製品: 下段に牛乳パック(box+cone4の屋根)、上段にヨーグルト(cylinder+蓋)とチーズ(横倒しcone3)を置く */
function buildDairySpecs(): ProductSpec[] {
  const [upperY, lowerY] = FIXTURE_CASE_LAYOUT.dairy.boardY;

  const milkBoxScale: Vector3Tuple = [0.24, 0.42, 0.24];
  const milkRoofScale: Vector3Tuple = [0.24, 0.14, 0.24];
  const milkColors = ["#ffffff", "#dcebf2", "#f5d5e0"];
  const milkBoxY = lowerY + BOARD_HALF_THICKNESS + milkBoxScale[1] / 2;
  const milk = lateralSpread(3, 0.8).flatMap<ProductSpec>((lateral, index) => {
    const color = milkColors[index % milkColors.length];
    return [
      { shape: "box", offsetY: milkBoxY, forward: 0.8, lateral, scale: milkBoxScale, color },
      {
        shape: "cone4",
        offsetY: milkBoxY + milkBoxScale[1] / 2 + milkRoofScale[1] / 2,
        forward: 0.8,
        lateral,
        scale: milkRoofScale,
        color,
      },
    ];
  });

  const yogurtCupScale: Vector3Tuple = [0.16, 0.16, 0.16];
  const yogurtLidScale: Vector3Tuple = [0.19, 0.03, 0.19];
  const yogurtColors = ["#fdf6ec", "#dcebf2", "#f5d5e0"];
  const yogurtCupY = upperY + BOARD_HALF_THICKNESS + yogurtCupScale[1] / 2;
  const yogurt = lateralSpread(3, 0.55).flatMap<ProductSpec>((lateral, index) => [
    {
      shape: "cylinder",
      offsetY: yogurtCupY,
      forward: 0.75,
      lateral,
      scale: yogurtCupScale,
      color: yogurtColors[index % yogurtColors.length],
    },
    {
      shape: "cylinder",
      offsetY: yogurtCupY + yogurtCupScale[1] / 2 + yogurtLidScale[1] / 2,
      forward: 0.75,
      lateral,
      scale: yogurtLidScale,
      color: "#ffffff",
    },
  ]);

  // X軸回りに90°回転するため、実際の高さ(ワールドY方向)はcheeseScale[2]/2(回転前のZ)になる
  const cheeseScale: Vector3Tuple = [0.2, 0.14, 0.26];
  const cheeseWorldHalfY = cheeseScale[2] / 2;
  const cheeseY = upperY + BOARD_HALF_THICKNESS + cheeseWorldHalfY;
  const cheese = lateralSpread(2, 1.1).map<ProductSpec>((lateral, index) => ({
    shape: "cone3",
    offsetY: cheeseY,
    forward: 0.35,
    lateral,
    scale: cheeseScale,
    color: "#e8c34a",
    rotation: [(index === 0 ? 1 : -1) * (Math.PI / 2), 0, 0] as Vector3Tuple,
  }));

  return [...milk, ...yogurt, ...cheese];
}

const PRODUCT_SPECS_BY_TYPE: Partial<Record<FixtureType, ProductSpec[]>> = {
  meat: buildMeatSpecs(),
  seafood: buildSeafoodSpecs(),
  deli: buildDeliSpecs(),
  "processed-food": buildProcessedFoodSpecs(),
  frozen: buildFrozenSpecs(),
  beverage: buildBeverageSpecs(),
  dairy: buildDairySpecs(),
};

/** forward(陳列面手前方向)・lateral(陳列面に沿った横方向)を、facingに応じたワールドXZオフセットへ変換する */
function toWorldOffset(facing: FixtureFacing, forward: number, lateral: number): [number, number] {
  switch (facing) {
    case "positive-x":
      return [forward, lateral];
    case "negative-x":
      return [-forward, lateral];
    case "positive-z":
      return [lateral, forward];
    case "negative-z":
      return [lateral, -forward];
    default:
      return [forward, lateral];
  }
}

const isDev = process.env.NODE_ENV !== "production";

/** 開発時のみ、商品インスタンスがフレームのdisplayBounds内へ収まっているかを検証する(本番は無効) */
function assertWithinDisplayBounds(fixtureId: string, instance: ProductInstance): void {
  if (!isDev) return;
  const [localX, worldY, localZ] = instance.position;
  const maxScale = Math.max(...instance.scale);
  const y = worldY; // buildFixtureProductsが返すのはワールドYだが、フレーム中心Y分は呼び出し側でオフセット済みなのでここではローカル相当として粗くチェックする
  if (Math.abs(localX) + maxScale / 2 > DISPLAY_BOUNDS.halfX + 0.3) {
    console.warn(`[FixtureProducts] ${fixtureId}: X方向がdisplayBoundsを超えている可能性があります`, instance);
  }
  if (Math.abs(localZ) + maxScale / 2 > DISPLAY_BOUNDS.halfZ + 0.3) {
    console.warn(`[FixtureProducts] ${fixtureId}: Z方向がdisplayBoundsを超えている可能性があります`, instance);
  }
  void y;
}

/**
 * 指定した棚(青果以外)の商品インスタンス一覧をワールド座標で返す。
 * 未対応のtype(produce等)は空配列を返す(呼び出し側で個別に描画するため)
 */
export function buildFixtureProducts(fixture: StoreFixtureDefinition): ProductInstance[] {
  const specs = PRODUCT_SPECS_BY_TYPE[fixture.type];
  if (!specs) return [];

  return specs.map((spec) => {
    const [dx, dz] = toWorldOffset(fixture.facing, spec.forward, spec.lateral);
    const instance: ProductInstance = {
      shape: spec.shape,
      color: spec.color,
      scale: spec.scale,
      rotation: spec.rotation,
      position: [fixture.position[0] + dx, fixture.position[1] + spec.offsetY, fixture.position[2] + dz],
    };
    assertWithinDisplayBounds(fixture.id, { ...instance, position: [dx, spec.offsetY, dz] });
    return instance;
  });
}
