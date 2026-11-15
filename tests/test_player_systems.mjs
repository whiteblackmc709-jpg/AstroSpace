import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { planetaryDetailBudget } from "../assets/planetary-detail.js";

const game = readFileSync(new URL("../play/play.js", import.meta.url), "utf8");
const html = readFileSync(new URL("../play/index.html", import.meta.url), "utf8");
const ui = readFileSync(new URL("../play/social-ui.js", import.meta.url), "utf8");
const auth = readFileSync(new URL("../play/auth.js", import.meta.url), "utf8");

for (const id of ["character-button","character-overlay","character-callsign","character-suit","character-frame","character-accent","character-save"]) {
  assert.ok(html.includes('id="' + id + '"'), "Missing character control: " + id);
}
assert.match(game, /character:\{\.\.\.DEFAULT_CHARACTER\}/, "Legacy saves must receive a default character profile.");
assert.match(game, /function applyCharacterProfile\(/, "Character choices must change the live robot model.");
assert.match(game, /function saveCharacterProfile\(/, "Character changes must be persisted.");
assert.match(ui, /function setAuthMode\(/, "Sign-in and sign-up must have separate modes.");
assert.match(ui, /function resetPassword\(/, "The account UI must expose password recovery.");
assert.match(auth, /resetPasswordForEmail/, "Password reset must call Supabase Auth.");
assert.match(html, /id="adaptive-quality"/, "Settings must expose adaptive frame pacing.");
assert.match(game, /function updatePerformanceGovernor\(/, "The renderer must adapt to measured frame time.");
assert.match(game, /for\(const o of animatedObjects\)/, "Per-frame world traversal must be removed.");
assert.match(game, /createPlanetaryDetail\(THREE,next/, "Every planet must receive its biome-specific detail layer.");
assert.match(game, /biomeDetail=biomeDetail\.userData\.setQuality\(quality\)/, "Biome detail density must follow the active quality profile.");
const detailSource = readFileSync(new URL("../assets/planetary-detail.js", import.meta.url), "utf8");
const debugHarness = readFileSync(new URL("../play/debug-harness.js", import.meta.url), "utf8");
assert.match(game, /PLAY_DEBUG_OFF_FLAGS|RUN_OPTIONS\\.off/,
  "The play runtime must support explicit debug render isolation flags.");
assert.match(game, /RUN_OPTIONS\\.off\\.includes\\("terrainpbr"\\)/,
  "terrainpbr isolation must bypass terrain PBR material/map generation.");
assert.match(game, /RUN_OPTIONS\\.off\\.includes\\("shadows"\\)/,
  "shadow isolation must disable the renderer shadow map.");
assert.match(game, /renderGroup==="grass"&&off\\.includes\\("grass"\\)/,
  "grass isolation must hide all tagged grass render groups.");
assert.match(game, /renderGroup==="foliage"&&off\\.includes\\("foliage"\\)/,
  "foliage isolation must hide all tagged foliage render groups.");
assert.match(game, /renderGroup==="river"&&off\\.includes\\("river"\\)/,
  "river isolation must hide the tagged river mesh.");
assert.match(game, /getTriangleBreakdown:\\(\\)=>collectTriangleBreakdown\\(scene\\)/,
  "The overlay must show grouped scene triangle estimates.");
assert.match(game, /renderGroup="terrain"/,
  "Terrain chunks must be identified in the triangle breakdown.");
assert.match(game, /renderGroup="character"/,
  "The player model must be identified in the triangle breakdown.");
assert.match(game, /renderGroup="sky"/,
  "Sky geometry must be identified in the triangle breakdown.");
assert.match(detailSource, /grassGroup\\.userData\\.renderGroup="grass"/,
  "Biome grass/ferns/flowers need their own profiling group.");
assert.match(detailSource, /foliage\\.userData\\.renderGroup="foliage"/,
  "Biome canopy meshes need a distinct foliage profiling group.");
assert.match(debugHarness, /scene-visible estimate/,
  "Grouped triangle numbers must be labelled as a scene-visible estimate, not exact renderer submissions.");
const terrainSampling = readFileSync(new URL("../play/terrain-sampling.js", import.meta.url), "utf8");
const terrainLod = readFileSync(new URL("../play/terrain-lod.js", import.meta.url), "utf8");
assert.match(game, /import \{ terrainHeight \} from "\.\/terrain-sampling\.js"/,
  "Gameplay and terrain generation must share the canonical height sampler.");
assert.match(terrainSampling, /export function terrainColorVariation\(/,
  "Terrain sampling must preserve slope and biome-aware surface variation.");
assert.match(terrainLod, /terrainColorVariation\(world,centerX\+x,centerZ\+z,y,normalY/,
  "Every terrain LOD must use the same biome surface variation function.");
assert.match(game, /createTerrainLodLayout\(currentSegments,size,centerX,centerZ\)/,
  "Terrain rebuilds must assign distance rings around the active player chunk.");
assert.match(game, /createTerrainChunkBuildJob\(THREE,w/,
  "Terrain geometry must be produced by the incremental chunk builder.");
assert.match(game, /TERRAIN_BUILD_BUDGET_MS/,
  "Terrain rebuild work must obey a bounded per-frame budget.");
assert.match(game, /terrain\?\.userData\?\.processBuilds\?\.\(\)/,
  "The frame loop must advance the terrain build queue.");
assert.match(game, /terrain\?\.userData\?\.cancelPendingBuilds\?\.\(\)/,
  "World teardown must cancel partial terrain rebuild jobs.");
assert.match(game, /function getGround\(x,z\)\{return terrainHeight\(x,z,currentWorld\);\}/,
  "Character grounding must continue to use only the canonical terrainHeight sampler.");
assert.match(game, /uHorizon.*uZenith.*uAccent/s, "The sky shader must inherit each planet's atmospheric palette.");
assert.match(game, /worldShaders/, "Layered aurora ribbons must animate without scene-wide traversal.");
assert.ok(readFileSync(new URL("../assets/planetary-detail.js", import.meta.url), "utf8").includes("planetaryDetailBudget"),
  "The new biome detail budget module must be present.");
const performanceBudget = planetaryDetailBudget("performance");
const cinematicBudget = planetaryDetailBudget("cinematic");
assert.ok(cinematicBudget.forestGrass > performanceBudget.forestGrass, "Cinematic detail should add foliage density.");
assert.ok(cinematicBudget.iceSpire > performanceBudget.iceSpire, "Cinematic detail should add crystal density.");
assert.ok(performanceBudget.forestGrass > 0 && performanceBudget.reefBranches > 0, "Every detail budget should be populated.");
console.log("Player systems contract: PASS — pilot creator, account recovery, adaptive render scale, biome LOD and detailed planetary layers.");
