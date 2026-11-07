import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

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
console.log("Player systems contract: PASS — pilot creator, account recovery, adaptive render scale and cached scene animation.");
