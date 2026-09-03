// Unity側の3D店内マップに固定で存在する8棚と、location_codeとの対応表。
// (docs/データベース設計.md 3.2節「Unity側の棚カテゴリ対応表」と同じ内容)
export const ZONE_LABELS = {
  Shelf_01: "青果",
  Shelf_02: "精肉",
  Shelf_03: "鮮魚",
  Shelf_04: "惣菜",
  Shelf_05: "加工食品",
  Shelf_06: "冷凍食品",
  Shelf_07: "飲料",
  Shelf_08: "乳製品",
} as const;

export type LocationCode = keyof typeof ZONE_LABELS;

export const ZONE_CODES = Object.keys(ZONE_LABELS) as LocationCode[];

export function isLocationCode(value: string): value is LocationCode {
  return value in ZONE_LABELS;
}
