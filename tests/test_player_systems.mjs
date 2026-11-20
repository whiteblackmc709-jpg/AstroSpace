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
const playCss = readFileSync(new URL("../play/play.css", import.meta.url), "utf8");
for (const contract of [
  'RUN_OPTIONS.off.includes("terrainpbr")',
  'RUN_OPTIONS.off.includes("shadows")',
  '["grass","foliage","river","rocks","sky"].includes(renderGroup)&&off.includes(renderGroup)',
  'RUN_OPTIONS.lockscale!==null',
  'RUN_OPTIONS.lockscale!==null){',
  'off.includes("fog")?null:new THREE.Fog(currentWorld.fog,560,4800)',
  '["grass","foliage","river","rocks","sky"].includes(renderGroup)',
  'off.includes("hud")',
  'getTriangleBreakdown:()=>collectTriangleBreakdown(scene)',
  'group.userData.renderGroup="terrain"',
  'avatar.group.userData.renderGroup="character"',
  'skyShell.userData.renderGroup="sky"'
]) {
  assert.ok(game.includes(contract), "Missing runtime render isolation/triangle contract: " + contract);
}
assert.ok(detailSource.includes('grassGroup.userData.renderGroup="grass"'),
  "Biome grass/ferns/flowers need their own profiling group.");
assert.ok(detailSource.includes('foliage.userData.renderGroup="foliage"'),
  "Biome canopy meshes need a distinct foliage profiling group.");
assert.ok(debugHarness.includes("scene-visible estimate"),
  "Grouped triangle numbers must be labelled as a scene-visible estimate, not exact renderer submissions.");
assert.ok(playCss.includes(".game-shell.debug-hide-hud>:not(#game-canvas):not(.world-grade):not(.film-grain)"),
  "HUD diagnostic mode hides UI DOM but preserves canvas and grade layers.");
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
