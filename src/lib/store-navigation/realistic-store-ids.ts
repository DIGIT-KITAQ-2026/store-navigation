/** GLB prototype mapping only. Never substitute the legacy store's category labels. */
export const REALISTIC_CATEGORIES = {
  Shelf_01: "食品", Shelf_02: "文具", Shelf_03: "電気", Shelf_04: "化粧",
  Shelf_05: "衛生", Shelf_06: "トラベル", Shelf_07: "掃除", Shelf_08: "キッチン",
} as const;
export type RealisticShelfId = keyof typeof REALISTIC_CATEGORIES;
export const REALISTIC_SHELF_IDS = Object.keys(REALISTIC_CATEGORIES) as RealisticShelfId[];

export function normalizeRealisticShelfId(value: unknown): RealisticShelfId | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return REALISTIC_SHELF_IDS.find((id) => id === trimmed) ?? null;
}

export function realisticStoreHref(shelfId: unknown): string | null {
  const id = normalizeRealisticShelfId(shelfId);
  return id ? `/store-3d-realistic-demo?shelfId=${encodeURIComponent(id)}` : null;
}
