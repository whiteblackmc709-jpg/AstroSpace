import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../play/play.js", import.meta.url), "utf8");
const cameraStart = source.indexOf("function updateCamera(dt){");
const cameraEnd = source.indexOf("\nfunction ", cameraStart + 10);
const camera = source.slice(cameraStart, cameraEnd);
assert.ok(camera.includes("cameraDesiredPosition.set("), "camera update must write into a persistent Vector3");
assert.ok(!/new THREE\.Vector3\(/.test(camera), "camera update must not allocate a Vector3 per frame");
assert.ok(source.includes("cameraDesiredPosition=new THREE.Vector3()"),
  "the camera scratch vector must be allocated once during initGame");

const moveStart = source.indexOf("function moveRobot(dt){");
const moveEnd = source.indexOf("\nfunction ", moveStart + 10);
const move = source.slice(moveStart, moveEnd);
assert.ok(move.length > 0, "moveRobot must exist");
assert.ok(!/new Set\(/.test(move), "moveRobot must not allocate a Set on each frame");
assert.ok(!/\[\.\.\.keys|\[\.\.\.touchKeys/.test(move),
  "moveRobot must not spread input sets into temporary arrays");
assert.ok(move.includes("isInputDown("), "movement must query persistent input sets directly");

const interactStart = source.indexOf("function nearestInteractable(){");
const interactEnd = source.indexOf("\nfunction ", interactStart + 10);
const interact = source.slice(interactStart, interactEnd);
assert.ok(!/\[\.\.\.missionEntities/.test(interact),
  "nearest-interactable scans must not allocate a merged entity array");
assert.ok(interact.includes("missionEntities.length") && interact.includes("secretEntities.length"),
  "mission and secret entities must be scanned independently without transient arrays");
assert.ok(!/new THREE\.Matrix4\(/.test(camera + move),
  "there must be no per-frame Matrix4 allocation in camera/movement");

const transitStart = source.indexOf("function updateInterplanetaryTravel(dt){");
const transitEnd = source.indexOf("\nfunction ", transitStart + 10);
const transit = source.slice(transitStart, transitEnd);
assert.ok(transit.length > 0, "updateInterplanetaryTravel must exist");
assert.ok(!/new THREE\.Color\(/.test(transit),
  "interplanetary flight must not allocate a Color every frame");
assert.ok(source.includes('travelSpaceColor=new THREE.Color("#020711")'),
  "the transit background color must be allocated once during initialization");
assert.ok(transit.includes("scene.background.lerpColors(tr.oldBackground,spaceColor"),
  "interplanetary transition must reuse the persistent space color");

console.log("Hot-path allocation contract: PASS — scratch Vector3/Color; no per-frame Set or input/entity arrays.");
