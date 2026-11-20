import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  LEGACY_QUALITY_VALUES,
  normalizeLegacyQuality,
  resolveQualityProfile
} from "../play/quality-profile.js";

const expected = {
  performance: "low",
  balanced: "medium",
  cinematic: "high",
  "4k": "ultra",
  "8k": "ultra"
};
assert.deepEqual(LEGACY_QUALITY_VALUES, Object.keys(expected));
for (const [legacy, profile] of Object.entries(expected)) {
  const resolved = resolveQualityProfile(legacy);
  assert.equal(resolved.legacyQuality, legacy, legacy + " must remain a distinct legacy tier");
  assert.equal(resolved.id, profile, legacy + " must map to the expected canonical QualityProfile");
  assert.equal(resolved.label, profile[0].toUpperCase() + profile.slice(1));
  assert.ok(Object.isFrozen(resolved));
}
assert.equal(resolveQualityProfile("4k").id, resolveQualityProfile("8k").id,
  "4K and 8K legacy tiers share the Ultra profile family");
assert.notEqual(resolveQualityProfile("4k").legacyQuality, resolveQualityProfile("8k").legacyQuality,
  "4K and 8K resource budgets must remain distinguishable");
assert.equal(normalizeLegacyQuality("unknown"), "balanced");
assert.equal(normalizeLegacyQuality("unknown", "performance"), "performance");
assert.equal(normalizeLegacyQuality("unknown", "invalid"), "balanced");

const app = readFileSync(new URL("../play/play.js", import.meta.url), "utf8");
const ui = readFileSync(new URL("../play/social-ui.js", import.meta.url), "utf8");
const html = readFileSync(new URL("../play/index.html", import.meta.url), "utf8");
assert.match(app, /qualityProfile:resolveQualityProfile\(INITIAL_QUALITY\)\.id/,
  "the initial runtime state must expose the canonical profile");
assert.match(app, /qualityProfile:resolvedProfile\.id/,
  "runtime graphics application must keep the profile id alongside the legacy tier");
assert.match(app, /const quality=resolvedProfile\.legacyQuality/,
  "all existing rendering subsystems must continue receiving the exact legacy tier");
assert.match(ui, /prefs\.quality = profile\.legacyQuality/,
  "settings must preserve the previous localStorage quality value");
assert.match(ui, /prefs\.qualityProfile = profile\.id/,
  "settings can persist the new canonical profile id as an additive field");
const select = html.match(/<select id="quality-select">([\s\S]*?)<\/select>/)?.[1] || "";
assert.deepEqual([...select.matchAll(/option value="([^"]+)"/g)].map(match => match[1]),
  ["performance", "balanced", "cinematic", "4k", "8k"],
  "legacy quality select values must remain intact for backwards compatibility");
for (const label of ["LOW · PERFORMANCE", "MEDIUM · BALANCED · 2K", "HIGH · CINEMATIC · 4K AUTO", "ULTRA · 4K TEXTURES", "ULTRA · 8K TEXTURES"]) {
  assert.ok(select.includes(label), "Missing profile label: " + label);
}
console.log("QualityProfile contract: PASS — four canonical profiles, five preserved legacy tiers and storage compatibility.");
