import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../play/play.js", import.meta.url), "utf8");
const html = readFileSync(new URL("../play/index.html", import.meta.url), "utf8");

const start = source.indexOf("function createSky(){");
const end = source.indexOf("\nfunction ", start + 10);
assert.ok(start >= 0 && end > start, "createSky must exist");
const createSky = source.slice(start, end);
const starsDeclaration = createSky.indexOf("const stars=new THREE.Points(");
const starsUse = createSky.indexOf("skyShell.add(dome,stars)");
assert.ok(starsDeclaration >= 0, "createSky must construct the star Points object");
assert.ok(starsUse > starsDeclaration, "the star Points object must exist before being added to the sky shell");

assert.match(source, /try\{environmentTarget=createCinematicEnvironment\(THREE,renderer\)/,
  "optional PMREM environment failure must not abort 3D startup");
assert.match(source, /initialising the planetary scene/,
  "boot should record the stage for useful startup diagnostics");
assert.match(source, /startCompatibilityScene\(error,bootStage\)/,
  "the error panel must show the actual startup failure instead of always blaming WebGL");
assert.match(html, /play\.js\?v=toolbar-boot-fix-r1/,
  "the repaired game module must use a new cache-busting version");

console.log("WebGL boot contract: PASS — star field declared before use, optional PMREM fallback, useful diagnostics and cache bust.");
