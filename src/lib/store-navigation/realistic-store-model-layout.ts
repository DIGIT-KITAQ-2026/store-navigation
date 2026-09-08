import { Box3, Mesh, Vector3, type Object3D } from "three";
import { buildRealisticGraph, type NamedBounds, type RealisticLayout } from "./realistic-store-layout";
import { REALISTIC_SHELF_IDS, type RealisticShelfId } from "./realistic-store-ids";
import type { Vector3Tuple } from "./types";

const categories = ["Food", "Stationery", "Electrical", "Beauty", "Hygiene", "Travel", "Cleaning", "Kitchen"];
export const REALISTIC_COLLIDER_NAMES = [
  ...categories.flatMap((cat) => [1, 2, 3, 4].map((i) => `Shelf_${cat}_0${i}`)),
  "Back_Interior_Wall", "Side_Interior_Wall", "Side_Interior_Wall001",
  "Store_FrontWall_Left", "Store_FrontWall_Center", "Store_FrontWall_Right",
  "Checkout_Counter_1", "Checkout_Counter_2", "Checkout_Top_1", "Checkout_Top_2", "Checkout_Connecting_Storage",
  "Promo_Entry", "Promo_Entry_Top", "Promo_Central", "Promo_Central_Top",
];

function ownBox(object: Object3D): Box3 {
  const box = new Box3();
  // GLTFLoader splits the shared shelf into four material primitives. Products are sibling nodes and excluded.
  const parts = object instanceof Mesh ? [object] : object.children.filter((child) => child instanceof Mesh && /^Navi_Shelf_Module_4Tier(?:_\d+)?$/.test(child.name));
  for (const part of parts) {
    if (!(part instanceof Mesh)) continue;
    part.geometry.computeBoundingBox();
    if (part.geometry.boundingBox) box.union(part.geometry.boundingBox.clone().applyMatrix4(part.matrixWorld));
  }
  if (box.isEmpty() || ![...box.min.toArray(), ...box.max.toArray()].every(Number.isFinite)) throw new Error(`Invalid collider geometry: ${object.name}`);
  return box;
}

export function extractRealisticLayout(scene: Object3D): RealisticLayout {
  scene.updateWorldMatrix(true, true);
  const required = (name: string) => {
    const object = scene.getObjectByName(name);
    if (!object) throw new Error(`Missing required layout object: ${name}`);
    return object;
  };
  const floorBox = ownBox(required("Floor_20m_x_30m"));
  const floor = { minX: floorBox.min.x, maxX: floorBox.max.x, minZ: floorBox.min.z, maxZ: floorBox.max.z };
  const obstacles: NamedBounds[] = REALISTIC_COLLIDER_NAMES.map((name) => {
    const box = ownBox(required(name));
    return { name, minX: box.min.x, maxX: box.max.x, minZ: box.min.z, maxZ: box.max.z };
  });
  const destinations = Object.fromEntries(REALISTIC_SHELF_IDS.map((id) => {
    const position = required(`Destination_${id}`).getWorldPosition(new Vector3());
    if (Math.abs(position.y) > 0.01) throw new Error(`Destination is not on the floor: ${id}`);
    return [id, position.toArray()];
  })) as Record<RealisticShelfId, Vector3Tuple>;
  return buildRealisticGraph({ floor, obstacles, destinations });
}
