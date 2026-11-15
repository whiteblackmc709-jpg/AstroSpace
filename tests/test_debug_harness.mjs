import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import {
  createGpuTimer,
  createSeededRandom,
  parsePlayDebugOptions,
  PLAY_DEBUG_BOOKMARKS,
  PLAY_DEBUG_OFF_FLAGS,
  collectTriangleBreakdown
} from "../play/debug-harness.js";

const enabled = parsePlayDebugOptions("?debug=1&seed=7319&bookmark=orbit");
assert.deepEqual(enabled, { debug: true, seed: 7319, bookmark: "orbit", off: [] });

const disabled = parsePlayDebugOptions("");
assert.deepEqual(disabled, { debug: false, seed: null, bookmark: null, off: [] });

const invalid = parsePlayDebugOptions("?debug=true&seed=not-a-number&bookmark=unknown");
assert.deepEqual(invalid, { debug: false, seed: null, bookmark: null, off: [] });

const negative = parsePlayDebugOptions("?debug=1&seed=-17&bookmark=aether");
assert.deepEqual(negative, { debug: true, seed: -17, bookmark: "aether", off: [] });

assert.deepEqual(Object.keys(PLAY_DEBUG_BOOKMARKS), ["near", "mid", "far", "orbit", "aether"]);
for (const bookmark of Object.values(PLAY_DEBUG_BOOKMARKS)) {
  assert.ok(Number.isFinite(bookmark.yaw) && Number.isFinite(bookmark.pitch));
  assert.ok(bookmark.distance > 0);
}
assert.equal(PLAY_DEBUG_BOOKMARKS.aether.flight, true);
assert.ok(PLAY_DEBUG_BOOKMARKS.aether.altitude > 0);
assert.deepEqual(PLAY_DEBUG_OFF_FLAGS, ["shadows", "terrainpbr", "grass", "foliage", "river", "post"]);
assert.deepEqual(
  parsePlayDebugOptions("?debug=1&off=shadows,terrainpbr&off=grass&off=foliage,river&off=post&off=unknown").off,
  ["shadows", "terrainpbr", "grass", "foliage", "river", "post"],
  "off flags accept comma-separated or repeated query parameters, deduplicate, and ignore unknown names"
);
assert.deepEqual(
  parsePlayDebugOptions("?off=grass").off,
  ["grass"],
  "render isolation flags are usable independently of the visible debug overlay"
);

// Group counts include regular and instanced mesh triangle costs and ignore hidden branches.
const makeMesh = (count, instances = 1) => ({
  isMesh: true,
  isInstancedMesh: instances !== 1,
  count: instances,
  visible: true,
  userData: {},
  geometry: { attributes: { position: { count } }, drawRange: { start: 0, count: Infinity }, groups: [] },
  children: []
});
const diagnosticScene = {
  visible: true,
  userData: {},
  children: [
    { visible: true, userData: { renderGroup: "terrain" }, children: [makeMesh(303)] },
    { visible: true, userData: { renderGroup: "foliage" }, children: [makeMesh(90, 12)] },
    { visible: true, userData: { renderGroup: "grass" }, children: [makeMesh(60)] },
    { visible: false, userData: { renderGroup: "rocks" }, children: [makeMesh(300)] },
    { visible: true, userData: { renderGroup: "character" }, children: [makeMesh(12)] }
  ]
};
const grouped = collectTriangleBreakdown(diagnosticScene);
assert.equal(grouped.terrain, 101, "terrain triangles use geometry vertex/index counts / 3");
assert.equal(grouped.foliage, 360, "instanced geometry triangles multiply by active instance count");
assert.equal(grouped.grass, 20);
assert.equal(grouped.rocks, 0, "hidden render groups are excluded");
assert.equal(grouped.character, 4);
assert.equal(grouped.total, 485, "group breakdown total is the sum of tagged visible geometry");

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


// GPU timer queries must be asynchronous, non-blocking and optional.
function makeFakeGpu({ available = true, disjoint = false, nanoseconds = 2_500_000, extension = true } = {}) {
  const calls = [];
  const gl = {
    QUERY_RESULT_AVAILABLE: 0x8867,
    QUERY_RESULT: 0x8866,
    getExtension(name) {
      assert.equal(name, "EXT_disjoint_timer_query_webgl2");
      return extension ? { TIME_ELAPSED_EXT: 0x88BF, GPU_DISJOINT_EXT: 0x8FBB } : null;
    },
    createQuery() { calls.push("create"); return {}; },
    beginQuery(target) { calls.push(["begin", target]); },
    endQuery(target) { calls.push(["end", target]); },
    getQueryParameter(_query, parameter) {
      return parameter === this.QUERY_RESULT_AVAILABLE ? available : nanoseconds;
    },
    getParameter() { return disjoint; },
    deleteQuery() { calls.push("delete"); }
  };
  return { renderer: { getContext: () => gl }, gl, calls, setAvailable(value) { available = value; } };
}
const gpu = makeFakeGpu();
const gpuTimer = createGpuTimer(gpu.renderer);
gpuTimer.beginFrame();
gpuTimer.endFrame();
gpu.setAvailable(false);
assert.equal(gpuTimer.read(), null, "GPU timer read must not block while the query is pending");
gpu.setAvailable(true);
assert.equal(gpuTimer.read(), 2.5, "GPU nanoseconds should be converted to milliseconds");
assert.deepEqual(gpu.calls.slice(0, 3), ["create", ["begin", 0x88BF], ["end", 0x88BF]]);
gpuTimer.dispose();
assert.ok(gpu.calls.includes("delete"));

const disjointGpu = makeFakeGpu({ disjoint: true });
const disjointTimer = createGpuTimer(disjointGpu.renderer);
disjointTimer.beginFrame();
disjointTimer.endFrame();
assert.equal(disjointTimer.read(), null, "disjoint GPU timer samples must be discarded");
disjointTimer.dispose();

const unsupportedGpu = makeFakeGpu({ extension: false });
const unsupportedTimer = createGpuTimer(unsupportedGpu.renderer);
unsupportedTimer.beginFrame();
unsupportedTimer.endFrame();
assert.equal(unsupportedTimer.read(), null, "unsupported GPU timer query must gracefully report n/a");
unsupportedTimer.dispose();

console.log("Debug harness contract: PASS — query parsing, five stable bookmarks and deterministic event RNG.");

const debugSource = readFileSync(new URL("../play/debug-harness.js", import.meta.url), "utf8");
assert.match(debugSource, /"top:auto"/, "runtime debug overlay must not remain pinned to the upper-right");
assert.match(debugSource, /"bottom:88px"/, "runtime debug overlay must move below the world-title area");
assert.match(debugSource, /JS timings are CPU-side; GPU time requires a supported timer query\./,
  "the overlay must distinguish JavaScript CPU timings from GPU timer-query results");
