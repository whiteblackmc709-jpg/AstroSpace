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
assert.match(html, /play\\.js\\?v=phase-1a-timing-r1/,
  "the repaired game module must use a new cache-busting version");


assert.match(source, /errorStack=error\?\.stack/,
  "startup fallback must log the full exception stack to the console");
assert.match(source, /errorName=String\(error\?\.name\|\|"Error"\)/,
  "startup fallback must expose the actual exception type");
assert.match(source, /isWebGLFailure=/,
  "WebGL guidance must be conditional on a recognized WebGL failure");
assert.doesNotMatch(source, /enable WebGL \/ hardware acceleration/,
  "application exceptions must not be blamed on WebGL or hardware acceleration");
assert.match(html, /3D startup failed\. Diagnostic details will appear here\./,
  "static fallback copy must not assume a WebGL failure");

console.log("WebGL boot contract: PASS — startup error name/stack, conditional WebGL guidance and cache bust.");

assert.match(source, /const updateMs=measureDebug\?performance\.now\(\)-updateStartedAt:null/,
  "debug timing must measure JavaScript update work without affecting normal frames");
assert.match(source, /const renderSubmitMs=measureDebug\?performance\.now\(\)-renderStartedAt:null/,
  "debug timing must measure only the JavaScript renderer.render submission call");
assert.match(source, /debugOverlay\?\.beginGpuFrame\(\)[\s\S]*?renderer\.render\(scene,camera\)[\s\S]*?debugOverlay\?\.endGpuFrame\(\)/,
  "GPU timer query must bracket the renderer submission");
assert.match(html, /play\.js\?v=phase-1a-timing-r1/,
  "timing instrumentation must use a new runtime cache-busting version");
