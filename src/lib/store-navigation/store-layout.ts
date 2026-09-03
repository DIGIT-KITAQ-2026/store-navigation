import type { CollisionBounds, NavigationNode, StoreDestination, StoreFixtureDefinition, Vector3Tuple } from "./types";

/** 入口ノードのid。経路は必ずここを始点として計算する */
export const ENTRANCE_NODE_ID = "entrance";

/** destinationId未指定・未登録時に安全にフォールバックする売り場id(Supabase/Unity側の棚IDと統一) */
export const DEFAULT_DESTINATION_ID = "Shelf_01";

/** 旧仕様・検索側で使われていたdestinationIdから正式な棚IDへの互換エイリアス */
const DESTINATION_ID_ALIASES: Readonly<Record<string, string>> = {
  produce: DEFAULT_DESTINATION_ID,
};

/** 一人称カメラの目線の高さ(床からの相対値) */
export const EYE_HEIGHT = 1.6;

/** 一人称プレイヤーの当たり判定半径(棚へのめり込み防止用) */
export const PLAYER_RADIUS = 0.35;

/** 店舗の床の範囲(この外側へは移動できない)。全8棚+青果売り場を収めるため奥行きを拡張している */
export const STORE_FLOOR = { minX: -9, maxX: 9, minZ: 0, maxZ: 29 } as const;

export const WALL_HEIGHT = 3.2;
export const WALL_THICKNESS = 0.3;

/** 正面壁のうち、入口として開口させる範囲 */
export const ENTRANCE_OPENING = { minX: -2, maxX: 2 } as const;

const GENERIC_FIXTURE_SIZE: Vector3Tuple = [2.4, 1.8, 3.2];
const GENERIC_FIXTURE_CENTER_Y = GENERIC_FIXTURE_SIZE[1] / 2;
const GENERIC_HALF_WIDTH = GENERIC_FIXTURE_SIZE[0] / 2;
const GENERIC_HALF_DEPTH = GENERIC_FIXTURE_SIZE[2] / 2;

function boundsFromCenter(x: number, z: number): CollisionBounds {
  return {
    minX: x - GENERIC_HALF_WIDTH,
    maxX: x + GENERIC_HALF_WIDTH,
    minZ: z - GENERIC_HALF_DEPTH,
    maxZ: z + GENERIC_HALF_DEPTH,
  };
}

// 行1(Z=8): 外周(精肉・鮮魚)+中央(惣菜・加工食品)
const ROW1_Z = 8;
// 行2(Z=17): 外周(冷凍食品・飲料)+中央(乳製品)
const ROW2_Z = 17;
const WALL_COLUMN_X = 7.5;
const CENTER_COLUMN_X = 3;
const WALL_APPROACH_OFFSET = 1.6; // 通路側approachノードの、棚中心からの奥まった距離
const WALL_DESTINATION_OFFSET = 0.9; // 通路側destinationノードの、棚正面からの距離
const CENTER_APPROACH_OFFSET = 0.5;
const CENTER_DESTINATION_OFFSET = 0.15;

/**
 * 青果(Shelf_01)を含む全8棚の設定。青果以外(Shelf_02〜08)はここから
 * StoreFixtures.tsxが共有Geometry/InstancedMeshで描画する。青果はProduceArea.tsxが
 * 専用の見た目を維持したまま描画するため、ここではposition/label/destination/衝突範囲のみ使う
 */
export const STORE_FIXTURES: readonly StoreFixtureDefinition[] = [
  {
    id: "Shelf_01",
    type: "produce",
    label: "青果",
    position: [5, 0, 26],
    rotation: [0, 0, 0],
    size: [4.4, 1.2, 2.8],
    color: "#7a9d5c",
    // 青果はProduceArea.tsxが専用の見た目で描画するため未使用(便宜上の既定値)
    facing: "negative-z",
    destinationNodeId: "Shelf_01",
    destinationPosition: [5, 0, 26],
    collisionBounds: { minX: 2.8, maxX: 7.2, minZ: 24.6, maxZ: 27.4 },
    // 青果はdestinationPositionが売り場中心と一致しており(ProduceArea.tsx参照)、共通の
    // 自動カメラ停止距離では停止位置がcollisionBounds内に入ってしまうため個別に広げる
    approachDistance: 2.2,
  },
  {
    id: "Shelf_02",
    type: "meat",
    label: "精肉",
    position: [-WALL_COLUMN_X, GENERIC_FIXTURE_CENTER_Y, ROW1_Z],
    rotation: [0, 0, 0],
    size: GENERIC_FIXTURE_SIZE,
    color: "#c1543f",
    facing: "positive-x",
    destinationNodeId: "Shelf_02",
    destinationPosition: [-WALL_COLUMN_X + GENERIC_HALF_WIDTH + WALL_DESTINATION_OFFSET, 0, ROW1_Z],
    collisionBounds: boundsFromCenter(-WALL_COLUMN_X, ROW1_Z),
  },
  {
    id: "Shelf_03",
    type: "seafood",
    label: "鮮魚",
    position: [WALL_COLUMN_X, GENERIC_FIXTURE_CENTER_Y, ROW1_Z],
    rotation: [0, 0, 0],
    size: GENERIC_FIXTURE_SIZE,
    color: "#3f7fc1",
    facing: "negative-x",
    destinationNodeId: "Shelf_03",
    destinationPosition: [WALL_COLUMN_X - GENERIC_HALF_WIDTH - WALL_DESTINATION_OFFSET, 0, ROW1_Z],
    collisionBounds: boundsFromCenter(WALL_COLUMN_X, ROW1_Z),
  },
  {
    id: "Shelf_04",
    type: "deli",
    label: "惣菜",
    position: [-CENTER_COLUMN_X, GENERIC_FIXTURE_CENTER_Y, ROW1_Z],
    rotation: [0, 0, 0],
    size: GENERIC_FIXTURE_SIZE,
    color: "#d98a3d",
    facing: "positive-x",
    destinationNodeId: "Shelf_04",
    destinationPosition: [-CENTER_COLUMN_X + GENERIC_HALF_WIDTH + CENTER_DESTINATION_OFFSET, 0, ROW1_Z],
    collisionBounds: boundsFromCenter(-CENTER_COLUMN_X, ROW1_Z),
  },
  {
    id: "Shelf_05",
    type: "processed-food",
    label: "加工食品",
    position: [CENTER_COLUMN_X, GENERIC_FIXTURE_CENTER_Y, ROW1_Z],
    rotation: [0, 0, 0],
    size: GENERIC_FIXTURE_SIZE,
    // ベージュは棚本体・背景と同化するため、テラコッタ寄りの深いアンバーへ変更(カテゴリサインの視認性のため)
    color: "#9c5b3c",
    facing: "negative-x",
    destinationNodeId: "Shelf_05",
    destinationPosition: [CENTER_COLUMN_X - GENERIC_HALF_WIDTH - CENTER_DESTINATION_OFFSET, 0, ROW1_Z],
    collisionBounds: boundsFromCenter(CENTER_COLUMN_X, ROW1_Z),
  },
  {
    id: "Shelf_06",
    type: "frozen",
    label: "冷凍食品",
    position: [-WALL_COLUMN_X, GENERIC_FIXTURE_CENTER_Y, ROW2_Z],
    rotation: [0, 0, 0],
    size: GENERIC_FIXTURE_SIZE,
    color: "#a8d8e8",
    facing: "positive-x",
    destinationNodeId: "Shelf_06",
    destinationPosition: [-WALL_COLUMN_X + GENERIC_HALF_WIDTH + WALL_DESTINATION_OFFSET, 0, ROW2_Z],
    collisionBounds: boundsFromCenter(-WALL_COLUMN_X, ROW2_Z),
  },
  {
    id: "Shelf_07",
    type: "beverage",
    label: "飲料",
    position: [WALL_COLUMN_X, GENERIC_FIXTURE_CENTER_Y, ROW2_Z],
    rotation: [0, 0, 0],
    size: GENERIC_FIXTURE_SIZE,
    color: "#4a90d9",
    facing: "negative-x",
    destinationNodeId: "Shelf_07",
    destinationPosition: [WALL_COLUMN_X - GENERIC_HALF_WIDTH - WALL_DESTINATION_OFFSET, 0, ROW2_Z],
    collisionBounds: boundsFromCenter(WALL_COLUMN_X, ROW2_Z),
  },
  {
    id: "Shelf_08",
    type: "dairy",
    label: "乳製品",
    position: [-CENTER_COLUMN_X, GENERIC_FIXTURE_CENTER_Y, ROW2_Z],
    rotation: [0, 0, 0],
    size: GENERIC_FIXTURE_SIZE,
    color: "#dcebf2",
    facing: "positive-x",
    destinationNodeId: "Shelf_08",
    destinationPosition: [-CENTER_COLUMN_X + GENERIC_HALF_WIDTH + CENTER_DESTINATION_OFFSET, 0, ROW2_Z],
    collisionBounds: boundsFromCenter(-CENTER_COLUMN_X, ROW2_Z),
  },
];

/** 青果(Shelf_01)。ProduceArea.tsxが専用の見た目で描画するため、汎用描画の対象から除く */
export const PRODUCE_FIXTURE: StoreFixtureDefinition = STORE_FIXTURES[0];

/** Shelf_02〜08。StoreFixtures.tsxがこの配列をmapして共有Geometry/InstancedMeshで描画する */
export const GENERIC_STORE_FIXTURES: readonly StoreFixtureDefinition[] = STORE_FIXTURES.slice(1);

/** 第一人称の簡易AABB衝突判定の対象範囲(青果売り場を含む全棚) */
export const COLLISION_BOUNDS: readonly CollisionBounds[] = STORE_FIXTURES.map((fixture) => fixture.collisionBounds);

/** 棚idからcollisionBoundsを引くためのMap。自動案内カメラが停止位置の安全確認にのみ読み取りで使う */
export const COLLISION_BOUNDS_BY_ID: ReadonlyMap<string, CollisionBounds> = new Map(
  STORE_FIXTURES.map((fixture) => [fixture.id, fixture.collisionBounds]),
);

// 行の手前(棚が始まるZより手前)の通過ライン。壁側の棚へ向かう経路は、いったんこのZまで
// 手前に出てから横方向へ移動することで、中央の棚(惣菜・加工食品・乳製品)の内部を横断しない
const ROW1_FRONT_Z = 6.0; // 行1(Z=6.4〜9.6)より手前
const ROW2_FRONT_Z = 14.0; // 行1と行2の間(Z=9.6〜15.4)の中で、行2より手前

/**
 * 店内ナビゲーショングラフ。
 * entrance → 主通路(aisle-a〜e) → 各棚へのapproachノード → 各棚のdestinationノード
 * 通路は棚の内部を横断しないよう、collisionBoundsの外側にのみノードを置いている。
 * 壁側の棚(精肉・鮮魚・冷凍食品)は、中央の棚の手前を素通りする直線だと中央棚の内部を
 * 横断してしまうため、行の手前(ROW1_FRONT_Z/ROW2_FRONT_Z)を経由するbypassノードを挟む
 */
export const NAVIGATION_NODES: readonly NavigationNode[] = [
  { id: ENTRANCE_NODE_ID, position: [0, 0, 1.5], neighbors: ["aisle-a"] },
  {
    id: "aisle-a",
    position: [0, 0, 4],
    neighbors: [ENTRANCE_NODE_ID, "aisle-b", "Shelf_02-bypass", "Shelf_03-bypass"],
  },
  {
    id: "aisle-b",
    position: [0, 0, ROW1_Z],
    neighbors: ["aisle-a", "aisle-c", "Shelf_04-approach", "Shelf_05-approach"],
  },
  { id: "aisle-c", position: [0, 0, 12.5], neighbors: ["aisle-b", "aisle-d", "Shelf_06-bypass"] },
  {
    id: "aisle-d",
    position: [0, 0, ROW2_Z],
    neighbors: ["aisle-c", "aisle-e", "Shelf_07-approach", "Shelf_08-approach"],
  },
  { id: "aisle-e", position: [0, 0, 21], neighbors: ["aisle-d", "Shelf_01-approach"] },

  // 精肉(左壁・行1): 中央の惣菜棚を横断しないよう、行の手前でX方向へ移動してから棚へ向かう
  {
    id: "Shelf_02-bypass",
    position: [-WALL_COLUMN_X + GENERIC_HALF_WIDTH + WALL_APPROACH_OFFSET, 0, ROW1_FRONT_Z],
    neighbors: ["aisle-a", "Shelf_02-approach"],
  },
  {
    id: "Shelf_02-approach",
    position: [-WALL_COLUMN_X + GENERIC_HALF_WIDTH + WALL_APPROACH_OFFSET, 0, ROW1_Z],
    neighbors: ["Shelf_02-bypass", "Shelf_02"],
  },
  { id: "Shelf_02", position: STORE_FIXTURES[1].destinationPosition, neighbors: ["Shelf_02-approach"] },

  // 鮮魚(右壁・行1): 中央の加工食品棚を横断しないよう、行の手前でX方向へ移動してから棚へ向かう
  {
    id: "Shelf_03-bypass",
    position: [WALL_COLUMN_X - GENERIC_HALF_WIDTH - WALL_APPROACH_OFFSET, 0, ROW1_FRONT_Z],
    neighbors: ["aisle-a", "Shelf_03-approach"],
  },
  {
    id: "Shelf_03-approach",
    position: [WALL_COLUMN_X - GENERIC_HALF_WIDTH - WALL_APPROACH_OFFSET, 0, ROW1_Z],
    neighbors: ["Shelf_03-bypass", "Shelf_03"],
  },
  { id: "Shelf_03", position: STORE_FIXTURES[2].destinationPosition, neighbors: ["Shelf_03-approach"] },

  // 惣菜(中央左・行1): aisle-bから直接近づいても他の棚を横断しない
  {
    id: "Shelf_04-approach",
    position: [-CENTER_COLUMN_X + GENERIC_HALF_WIDTH + CENTER_APPROACH_OFFSET, 0, ROW1_Z],
    neighbors: ["aisle-b", "Shelf_04"],
  },
  { id: "Shelf_04", position: STORE_FIXTURES[3].destinationPosition, neighbors: ["Shelf_04-approach"] },

  // 加工食品(中央右・行1): aisle-bから直接近づいても他の棚を横断しない
  {
    id: "Shelf_05-approach",
    position: [CENTER_COLUMN_X - GENERIC_HALF_WIDTH - CENTER_APPROACH_OFFSET, 0, ROW1_Z],
    neighbors: ["aisle-b", "Shelf_05"],
  },
  { id: "Shelf_05", position: STORE_FIXTURES[4].destinationPosition, neighbors: ["Shelf_05-approach"] },

  // 冷凍食品(左壁・行2): 中央の乳製品棚を横断しないよう、行の手前でX方向へ移動してから棚へ向かう
  {
    id: "Shelf_06-bypass",
    position: [-WALL_COLUMN_X + GENERIC_HALF_WIDTH + WALL_APPROACH_OFFSET, 0, ROW2_FRONT_Z],
    neighbors: ["aisle-c", "Shelf_06-approach"],
  },
  {
    id: "Shelf_06-approach",
    position: [-WALL_COLUMN_X + GENERIC_HALF_WIDTH + WALL_APPROACH_OFFSET, 0, ROW2_Z],
    neighbors: ["Shelf_06-bypass", "Shelf_06"],
  },
  { id: "Shelf_06", position: STORE_FIXTURES[5].destinationPosition, neighbors: ["Shelf_06-approach"] },

  // 飲料(右壁・行2): 行2の右側には遮る棚がないため、aisle-dから直接近づいても横断しない
  {
    id: "Shelf_07-approach",
    position: [WALL_COLUMN_X - GENERIC_HALF_WIDTH - WALL_APPROACH_OFFSET, 0, ROW2_Z],
    neighbors: ["aisle-d", "Shelf_07"],
  },
  { id: "Shelf_07", position: STORE_FIXTURES[6].destinationPosition, neighbors: ["Shelf_07-approach"] },

  // 乳製品(中央・行2): aisle-dから直接近づいても他の棚を横断しない
  {
    id: "Shelf_08-approach",
    position: [-CENTER_COLUMN_X + GENERIC_HALF_WIDTH + CENTER_APPROACH_OFFSET, 0, ROW2_Z],
    neighbors: ["aisle-d", "Shelf_08"],
  },
  { id: "Shelf_08", position: STORE_FIXTURES[7].destinationPosition, neighbors: ["Shelf_08-approach"] },

  // 青果(奥)
  { id: "Shelf_01-approach", position: [2.5, 0, 23.5], neighbors: ["aisle-e", "Shelf_01"] },
  { id: "Shelf_01", position: PRODUCE_FIXTURE.destinationPosition, neighbors: ["Shelf_01-approach"] },
];

/** 検索・Unity連携と共有する売り場一覧。idはSupabase/Unity側の棚IDとの互換のため`Shelf_0N`で統一する */
export const STORE_DESTINATIONS: readonly StoreDestination[] = STORE_FIXTURES.map((fixture) => ({
  id: fixture.id,
  label: fixture.label,
  nodeId: fixture.destinationNodeId,
  position: fixture.destinationPosition,
  approachDistance: fixture.approachDistance,
}));

/**
 * destinationIdから売り場を解決する。`produce`のような旧idは正式な棚ID(Shelf_01)へ正規化し、
 * 未指定・未登録のidの場合は例外を投げず既定の売り場(DEFAULT_DESTINATION_ID)へ安全にフォールバックする。
 * `/store-3d-demo`など「何かしら表示できればよい」場面向け。実商品の案内には{@link findKnownDestination}
 * を使うこと(こちらは不明なidをShelf_01へ誤案内してしまうため実商品ページでは使わない)。
 */
export function resolveDestination(destinationId?: string): StoreDestination {
  const normalizedId = destinationId ? (DESTINATION_ID_ALIASES[destinationId] ?? destinationId) : undefined;
  const requested = normalizedId
    ? STORE_DESTINATIONS.find((destination) => destination.id === normalizedId)
    : undefined;
  if (requested) return requested;

  const fallback = STORE_DESTINATIONS.find((destination) => destination.id === DEFAULT_DESTINATION_ID);
  return fallback ?? STORE_DESTINATIONS[0];
}

/**
 * Supabaseの商品データから取得した棚ID(location_code)が、登録済みの正式な棚ID
 * (Shelf_01〜Shelf_08)かどうかを判定する純粋関数。null/undefined/空文字列/前後空白を安全に
 * 処理し、一致するものが無ければnullを返す。{@link resolveDestination}と異なり不明なidを
 * Shelf_01へフォールバックしない(実商品ページで誤って青果へ案内しないため、呼び出し側で
 * nullを「案内先未登録」として出し分けることを意図している)。
 */
export function findKnownDestination(rawShelfId: string | null | undefined): StoreDestination | null {
  const trimmed = rawShelfId?.trim();
  if (!trimmed) return null;
  return STORE_DESTINATIONS.find((destination) => destination.id === trimmed) ?? null;
}
