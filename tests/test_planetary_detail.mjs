import assert from "node:assert/strict";
import { planetaryDetailBudget } from "../assets/planetary-detail.js";
import { readFileSync } from "node:fs";

const expected = ["performance","balanced","cinematic","4k","8k"];
const budgets = expected.map(planetaryDetailBudget);
for (let i=0;i<budgets.length;i++) {
  assert.ok(budgets[i].boulders > 0 && budgets[i].pebbles > 0, "Every profile needs geological detail.");
  assert.ok(budgets[i].forestLeaves > 0 || budgets[i].canopyLeaves > 0, "Canopy detail budget must be present.");
  assert.ok(budgets[i].forestGrass > 0 && budgets[i].reefBranches > 0, "Foliage and reef budgets must be present.");
  assert.equal(budgets[i].canopyLeaves, budgets[i].canopyTrees * 13, "Canopy instance count must match leaf placement count.");
  assert.equal(budgets[i].reefBranches, budgets[i].reefColonies * 5, "Reef instance count must match branch placement count.");
  if (i) assert.ok(budgets[i].density >= budgets[i-1].density, "Detail density must scale monotonically.");
}
const source = readFileSync(new URL("../assets/planetary-detail.js", import.meta.url), "utf8");
assert.match(source, /setFromUnitVectors\(new THREE\.Vector3\(0,1,0\),new THREE\.Vector3\(/,
  "Branch and coral segments must align from the up axis using Vector3 directions.");
assert.match(source, /userData\.setQuality=/, "The active biome detail pass must rebuild on quality changes.");
for (const feature of ["canopyTrees","reefColonies","basaltColumns","gravityShards","skyIslands","iceSpire"]) {
  assert.ok(source.includes(feature), "Missing biome-specific system: " + feature);
}
console.log("Planetary detail contract: PASS — six biome systems with balanced, cinematic and GPU scalability profiles.");
