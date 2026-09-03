/** 3D空間上の座標を表すタプル(x, y, z)。THREE.Vector3を直接lib層に持ち込まないための型 */
export type Vector3Tuple = [number, number, number];

/** 店内ナビゲーショングラフのノード(通路の分岐点・目的地など) */
export interface NavigationNode {
  id: string;
  position: Vector3Tuple;
  /** 隣接ノードのid。双方向に歩けるノード間は互いのidを持たせる */
  neighbors: string[];
}

/** 検索結果などから指定される「売り場」。将来的にSupabaseの棚データへ置き換える想定 */
export interface StoreDestination {
  id: string;
  label: string;
  /** ナビゲーショングラフ上でこの売り場に対応するノードid */
  nodeId: string;
  position: Vector3Tuple;
  /**
   * 自動案内カメラが目的地手前で停止する際の基準距離(ワールドユニット)。未指定時は
   * lib/store-navigation/cameraApproach.tsのDEFAULT_APPROACH_DISTANCEを使う。
   * destination.position自体はマーカー・経路表示用のため変更しない
   */
  approachDistance?: number;
}

/** 経路上の1点と、そこでの進行方向(正規化はしない生のベクトル) */
export interface PathSample {
  position: Vector3Tuple;
  direction: Vector3Tuple;
}

export type NavigationViewMode = "first-person" | "auto-demo";

/**
 * PCのキーボード入力とスマホの仮想スティック入力を統合する共通移動値。
 * forward: 前進(+1)〜後退(-1)、right: 右移動(+1)〜左移動(-1)。いずれも-1〜1に収める
 */
export interface MovementInput {
  forward: number;
  right: number;
}

/** 第一人称衝突判定用の軸並行境界(AABB)。X/Z軸を個別に判定するため回転は考慮しない */
export interface CollisionBounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

/**
 * 売り場の種類。商品の簡易表現(FixtureProducts)を売り場ごとに出し分けるためのキー。
 * Shelf_01〜08の正式なカテゴリ対応はstore-layout.tsのSTORE_FIXTURESが唯一の定義元
 */
export type FixtureType =
  | "produce"
  | "meat"
  | "seafood"
  | "deli"
  | "processed-food"
  | "frozen"
  | "beverage"
  | "dairy";

/**
 * 棚の陳列面(通路側)がローカル座標のどちら向きかを表す。
 * 例えば"positive-x"は、棚のローカルX正方向が通路側であることを意味する
 */
export type FixtureFacing = "positive-x" | "negative-x" | "positive-z" | "negative-z";

/**
 * 棚(売り場)1つ分の設定。この配列をmapして描画・衝突判定・ナビゲーショングラフを生成し、
 * Shelf_01〜Shelf_08をJSXへ個別記述しない
 */
export interface StoreFixtureDefinition {
  id: string;
  type: FixtureType;
  label: string;
  position: Vector3Tuple;
  rotation: Vector3Tuple;
  size: Vector3Tuple;
  color: string;
  /** 陳列面(通路側)の向き。商品形状はこの向きの手前側へ配置する */
  facing: FixtureFacing;
  /** ナビゲーショングラフ上でこの棚に対応するdestinationノードid(通常はidと同じ) */
  destinationNodeId: string;
  /** 目的地マーカーを表示する、棚手前の通路側の座標 */
  destinationPosition: Vector3Tuple;
  collisionBounds: CollisionBounds;
  /**
   * 自動案内カメラ専用の停止距離の上書き。共通デフォルトでは棚の奥行き等の都合で
   * 接触してしまう売り場だけ設定する(StoreDestination.approachDistanceへ引き継がれる)
   */
  approachDistance?: number;
}
