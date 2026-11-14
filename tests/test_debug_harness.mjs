import assert from "node:assert/strict";
import {
  createSeededRandom,
  parsePlayDebugOptions,
  PLAY_DEBUG_BOOKMARKS
} from "../play/debug-harness.js";

const enabled = parsePlayDebugOptions("?debug=1&seed=7319&bookmark=orbit");
assert.deepEqual(enabled, { debug: true, seed: 7319, bookmark: "orbit" });

const disabled = parsePlayDebugOptions("");
assert.deepEqual(disabled, { debug: false, seed: null, bookmark: null });

const invalid = parsePlayDebugOptions("?debug=true&seed=not-a-number&bookmark=unknown");
assert.deepEqual(invalid, { debug: false, seed: null, bookmark: null });

const negative = parsePlayDebugOptions("?debug=1&seed=-17&bookmark=aether");
assert.deepEqual(negative, { debug: true, seed: -17, bookmark: "aether" });

assert.deepEqual(Object.keys(PLAY_DEBUG_BOOKMARKS), ["near", "mid", "far", "orbit", "aether"]);
for (const bookmark of Object.values(PLAY_DEBUG_BOOKMARKS)) {
  assert.ok(Number.isFinite(bookmark.yaw) && Number.isFinite(bookmark.pitch));
  assert.ok(bookmark.distance > 0);
}
assert.equal(PLAY_DEBUG_BOOKMARKS.aether.flight, true);
assert.ok(PLAY_DEBUG_BOOKMARKS.aether.altitude > 0);

const randomA = createSeededRandom(7319);
const randomB = createSeededRandom(7319);
const sequenceA = Array.from({ length: 8 }, () => randomA());
const sequenceB = Array.from({ length: 8 }, () => randomB());
assert.deepEqual(sequenceA, sequenceB, "The same seed must reproduce the same random sequence.");
assert.ok(sequenceA.every(value => value >= 0 && value < 1));

const randomC = createSeededRandom(7320);
assert.notDeepEqual(
  Array.from({ length: 8 }, () => randomC()),
  sequenceA,
  "Different seeds should produce different event sequences."
);

console.log("Debug harness contract: PASS — query parsing, five stable bookmarks and deterministic event RNG.");
