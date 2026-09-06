import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { GLTFLoader } from "three-stdlib";
import { extractRealisticLayout, REALISTIC_COLLIDER_NAMES } from "./realistic-store-model-layout";
import { normalizeRealisticShelfId, realisticStoreHref, REALISTIC_SHELF_IDS } from "./realistic-store-ids";
import { advanceRouteDistance, getRealisticCameraRoute, getRealisticRoute, isSegmentWalkable, isWalkable, moveWithinLayout, REALISTIC_SPAWN, segmentHitsBox, WALK_MARGIN } from "./realistic-store-layout";
import { findPath, getPathLength, samplePathAtDistance } from "./pathfinding";
import type { Vector3Tuple } from "./types";

// Validate the actual shipped asset, not a fabricated layout fixture.
const bytes = await readFile(new URL("../../../public/models/smart-store/smart-store-retail-v05.glb", import.meta.url));
const gltf = await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), "");
const layout = extractRealisticLayout(gltf.scene);

test("GLB floor, 32 shelf bodies and all required colliders are measured", () => {
  assert.deepEqual(layout.floor, { minX: 5, maxX: 25, minZ: -15, maxZ: 15 });
  assert.equal(layout.obstacles.length, 47);
  assert.equal(layout.obstacles.filter((b) => b.name.startsWith("Shelf_")).length, 32);
  assert.equal(new Set(layout.obstacles.map((b) => b.name)).size, REALISTIC_COLLIDER_NAMES.length);
  assert.ok(isWalkable(layout, REALISTIC_SPAWN));
});

test("all graph nodes are connected, in bounds, and edges are symmetric and clear", () => {
  const map = new Map(layout.nodes.map((n) => [n.id, n]));
  for (const n of layout.nodes) {
    assert.ok(isWalkable(layout, n.position), n.id);
    assert.ok(n.neighbors.length > 0, n.id);
    assert.ok(findPath(layout.nodes, "entrance", n.id).length > 0, n.id);
    for (const id of n.neighbors) {
      const other = map.get(id); assert.ok(other);
      assert.ok(other.neighbors.includes(n.id));
      assert.ok(isSegmentWalkable(layout, n.position, other.position), `${n.id} -> ${id}`);
    }
  }
});

const expected = [[18, 0, 8], [6.7, 0, 7], [11.6, 0, -1.8], [19.5, 0, -1], [19.5, 0, -9.8], [12, 0, -6.8], [6.7, 0, -4.8], [12, 0, -13.1]];
for (const [i, id] of REALISTIC_SHELF_IDS.entries()) {
  test(`${id}: actual destination, BFS, reverse path and clear route`, () => {
    layout.destinations[id].forEach((v, k) => assert.ok(Math.abs(v - expected[i][k]) < 1e-5));
    const path = getRealisticRoute(layout, id);
    assert.ok(path.length >= 2);
    assert.deepEqual(path[0], REALISTIC_SPAWN);
    assert.deepEqual(path.at(-1), layout.destinations[id]);
    assert.ok(findPath(layout.nodes, id, "entrance").length >= 2);
    path.forEach((p, k) => { assert.ok(isWalkable(layout, p)); if (k) assert.ok(isSegmentWalkable(layout, path[k - 1], p)); });
  });
  test(`${id}: auto camera follows corners and stops before destination at both speeds`, () => {
    const path = getRealisticRoute(layout, id);
    const route = getRealisticCameraRoute(layout, path);
    assert.ok(route.length >= 2);
    const stop = route.at(-1)!; const goal = layout.destinations[id];
    assert.ok(Math.hypot(stop[0] - goal[0], stop[2] - goal[2]) > 0.01);
    assert.ok(Math.hypot(stop[0] - goal[0], stop[2] - goal[2]) <= 0.60001);
    for (const speed of [2.2, 1.3]) {
      let distance = 0, previous: Vector3Tuple = route[0], frames = 0;
      const length = getPathLength(route);
      while (distance < length - 1e-6 && frames++ < 10000) {
        const next = advanceRouteDistance(route, distance, speed * 0.1);
        assert.ok(next > distance);
        const p = samplePathAtDistance(route, next).position;
        assert.ok(isSegmentWalkable(layout, previous, p), `${id} frame ${frames}`);
        assert.equal(advanceRouteDistance(route, next, 0), next); // pause
        previous = p; distance = next;
      }
      assert.ok(frames < 10000);
      assert.ok(Math.abs(distance - length) < 1e-6);
      assert.deepEqual(samplePathAtDistance(route, length + 100).position, stop);
    }
  });
}

test("manual X/Z sliding never crosses expanded obstacles or exterior, including large steps", () => {
  for (const node of layout.nodes) {
    for (const [dx, dz] of [[0.32, 0], [0, -0.32], [-0.32, 0.32], [100, 0], [-100, 0], [0, 100], [0, -100]]) {
      const p = moveWithinLayout(layout, node.position, dx, dz);
      assert.ok(isWalkable(layout, p));
      const corner: Vector3Tuple = [p[0], 0, node.position[2]];
      assert.ok(isSegmentWalkable(layout, node.position, corner));
      assert.ok(isSegmentWalkable(layout, corner, p));
    }
  }
  let p: Vector3Tuple = [...REALISTIC_SPAWN];
  for (let i = 0; i < 100; i++) p = moveWithinLayout(layout, p, 0, 0.32);
  assert.ok(p[2] <= 15 - WALK_MARGIN); // entrance stays visually open, movement remains inside
  assert.deepEqual(moveWithinLayout(layout, REALISTIC_SPAWN, NaN, Infinity), REALISTIC_SPAWN);
});

test("swept segment detects crossing even when both endpoints are outside", () => {
  assert.equal(segmentHitsBox([0, 0, 0], [10, 0, 0], { minX: 4, maxX: 6, minZ: -1, maxZ: 1 }), true);
  assert.equal(segmentHitsBox([0, 0, 3], [10, 0, 3], { minX: 4, maxX: 6, minZ: -1, maxZ: 1 }), false);
});

test("untrusted shelf IDs never fall back to a destination", () => {
  for (const value of [null, undefined, "", " ", "Shelf_00", "Shelf_09", "Shelf_5", "__proto__", "constructor", "Shelf_05&x=1", ["Shelf_05"], {}]) {
    assert.equal(normalizeRealisticShelfId(value), null);
    assert.equal(realisticStoreHref(value), null);
  }
  assert.equal(normalizeRealisticShelfId(" Shelf_05 "), "Shelf_05");
  assert.equal(realisticStoreHref(" Shelf_05 "), "/store-3d-realistic-demo?shelfId=Shelf_05");
});

test("product descendants cannot enlarge shelf collision boxes", () => {
  const copy = gltf.scene.clone(true);
  copy.traverse((o) => { if (o.userData.product_count) o.position.set(1000, -1000, 1000); });
  const actual = extractRealisticLayout(copy);
  assert.deepEqual(actual.obstacles, layout.obstacles);
});

test("missing collider/destination fails closed instead of publishing guessed geometry", () => {
  for (const name of ["Shelf_Hygiene_04", "Destination_Shelf_05"]) {
    const copy = gltf.scene.clone(true); const node = copy.getObjectByName(name)!; node.removeFromParent();
    assert.throws(() => extractRealisticLayout(copy), /Missing required layout object/);
  }
});
