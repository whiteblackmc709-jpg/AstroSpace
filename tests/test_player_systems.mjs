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
assert.match(game, /updateTerrainVertexColors\(/, "Terrain chunks must carry slope and biome-aware surface variation.");
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
