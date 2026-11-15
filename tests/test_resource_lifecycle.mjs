import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { join } from "node:path";
import { readFileSync } from "node:fs";
import { disposeObject3DResources, disposeResourcesIfUnreferenced } from "../assets/three-resource-lifecycle.js";

const dependencyRoot = process.env.ASTROSPACE_THREE_ROOT;
assert.ok(dependencyRoot, "ASTROSPACE_THREE_ROOT must point to the temporary CI install");
const require = createRequire(join(dependencyRoot, "astrospace-lifecycle-test.cjs"));
const THREE = require("three");
assert.equal(THREE.REVISION, "170");

function trackDispose(resource) {
  let count = 0;
  resource.addEventListener("dispose", () => count++);
  return () => count;
}

const scene = new THREE.Scene();
const world = new THREE.Group();
scene.add(world);
const firstChunk = new THREE.Group();
const secondChunk = new THREE.Group();
world.add(firstChunk, secondChunk);

const sharedTexture = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1);
const sharedGeometry = new THREE.BoxGeometry(1, 1, 1);
const sharedMaterial = new THREE.MeshStandardMaterial({ map: sharedTexture });
const uniqueTexture = new THREE.DataTexture(new Uint8Array([32, 64, 128, 255]), 1, 1);
const uniqueGeometry = new THREE.SphereGeometry(1, 8, 8);
const uniqueMaterial = new THREE.MeshStandardMaterial({ map: uniqueTexture });
const sharedCounts = [sharedGeometry, sharedMaterial, sharedTexture].map(trackDispose);
const uniqueCounts = [uniqueGeometry, uniqueMaterial, uniqueTexture].map(trackDispose);

firstChunk.add(new THREE.Mesh(sharedGeometry, sharedMaterial));
firstChunk.add(new THREE.Mesh(uniqueGeometry, uniqueMaterial));
secondChunk.add(new THREE.Mesh(sharedGeometry, sharedMaterial));

const firstResult = disposeObject3DResources(firstChunk);
assert.equal(firstResult.geometries, 1, "only the unique chunk geometry is released");
assert.equal(firstResult.materials, 1, "only the unique chunk material is released");
assert.equal(firstResult.textures, 1, "only the unique chunk texture is released");
assert.deepEqual(uniqueCounts.map(read => read()), [1, 1, 1], "unique resources dispose exactly once");
assert.deepEqual(sharedCounts.map(read => read()), [0, 0, 0],
  "geometry/material/texture shared by the second chunk must remain alive");
assert.equal(firstChunk.parent, null, "disposed chunk is detached from the world");
assert.equal(firstChunk.children.length, 0, "disposed chunk releases its object tree");

disposeObject3DResources(firstChunk);
assert.deepEqual(uniqueCounts.map(read => read()), [1, 1, 1], "disposal is idempotent");

// Terrain LOD may replace chunk geometries one at a time. Shared geometry is
// retained until the last referencing chunk has switched to its replacement.
const lodSharedGeometry = new THREE.PlaneGeometry(4, 4);
const lodA = new THREE.Mesh(lodSharedGeometry, new THREE.MeshBasicMaterial());
const lodB = new THREE.Mesh(lodSharedGeometry, new THREE.MeshBasicMaterial());
world.add(lodA, lodB);
const lodCount = trackDispose(lodSharedGeometry);
lodA.geometry = new THREE.PlaneGeometry(2, 2);
disposeResourcesIfUnreferenced([lodSharedGeometry], scene);
assert.equal(lodCount(), 0, "shared terrain geometry stays alive while chunk B references it");
lodB.geometry = new THREE.PlaneGeometry(1, 1);
disposeResourcesIfUnreferenced([lodSharedGeometry], scene);
assert.equal(lodCount(), 1, "shared terrain geometry is released after the final reference moves");

// World disposal also deduplicates resources shared internally by multiple chunks.
const wholeWorld = new THREE.Group();
const wholeA = new THREE.Group(), wholeB = new THREE.Group();
wholeWorld.add(wholeA, wholeB);
const worldTexture = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1);
const worldGeo = new THREE.IcosahedronGeometry(1, 1);
const worldMat = new THREE.MeshStandardMaterial({ map: worldTexture });
const worldCounts = [worldGeo, worldMat, worldTexture].map(trackDispose);
wholeA.add(new THREE.Mesh(worldGeo, worldMat));
wholeB.add(new THREE.Mesh(worldGeo, worldMat));
const worldResult = disposeObject3DResources(wholeWorld);
assert.equal(worldResult.geometries, 1);
assert.equal(worldResult.materials, 1);
assert.equal(worldResult.textures, 1);
assert.deepEqual(worldCounts.map(read => read()), [1, 1, 1],
  "whole-world disposal releases internally shared geometry/material/texture once");
assert.equal(wholeWorld.parent, null);
assert.equal(wholeWorld.children.length, 0);
disposeObject3DResources(wholeWorld);
assert.deepEqual(worldCounts.map(read => read()), [1, 1, 1], "whole-world disposal remains idempotent");

const playSource = readFileSync(new URL("../play/play.js", import.meta.url), "utf8");
const detailSource = readFileSync(new URL("../assets/planetary-detail.js", import.meta.url), "utf8");
assert.match(playSource, /disposeObject3DResources\(worldRoot\)/,
  "world teardown must use the shared resource lifecycle helper");
assert.match(playSource, /disposeResourcesIfUnreferenced\(\[oldGeometry\],scene\)/,
  "terrain chunk geometry replacement must guard against sibling references");
assert.match(detailSource, /disposeObject3DResources\(root\)/,
  "biome quality replacement must use shared ownership-aware disposal");

console.log("Three.js resource lifecycle: PASS — shared chunk references, texture cleanup, LOD geometry and idempotent world teardown.");
