// 棚バーコードの採番規則(docs/データベース設計.md 3.3節)から、スキャンした番号だけで
// どのUnityゾーン・何本目の棚かを判定する。DB照会なしでその場に表示するための軽量な変換。
// 490(JAN日本国コード) + 9(棚固定) + ゾーン番号2桁 + 枝番2桁 + 0000(予備) + チェックデジット

const ZONE_NAMES: Record<string, string> = {
  "01": "青果",
  "02": "精肉",
  "03": "鮮魚",
  "04": "惣菜",
  "05": "加工食品",
  "06": "冷凍食品",
  "07": "飲料",
  "08": "乳製品",
};

export interface ParsedShelfBarcode {
  locationCode: string;
  zoneName: string;
  branch: string;
}

export function parseShelfBarcode(barcode: string): ParsedShelfBarcode | null {
  if (!/^4909\d{9}$/.test(barcode)) return null;

  const zoneNumber = barcode.slice(4, 6);
  const branch = barcode.slice(6, 8);
  const zoneName = ZONE_NAMES[zoneNumber];
  if (!zoneName) return null;

  return {
    locationCode: `Shelf_${zoneNumber}`,
    zoneName,
    branch,
  };
}
