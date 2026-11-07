import assert from "node:assert/strict";
import { PLANETS, REGIONS, EVENT_NAMES } from "../play/region-data.js";

assert.equal(PLANETS.length, 6, "The campaign must define six original planets.");
assert.equal(REGIONS.length, 24, "Each planet must contain four regions.");
const regionIds = new Set();
const missionTypes = ["story", "survey", "ruins", "recover", "boss"];
for (const planet of PLANETS) {
  const areas = REGIONS.filter((region) => region.planetId === planet.id);
  assert.equal(areas.length, 4, planet.name + " must have four regions.");
  assert.ok(EVENT_NAMES[planet.id]?.length >= 3, planet.name + " needs local events.");
  for (const area of areas) {
    assert.ok(!regionIds.has(area.id), "Duplicate region id: " + area.id);
    regionIds.add(area.id);
    assert.deepEqual(area.tasks.map((task) => task.type), missionTypes);
    assert.equal(area.tasks.length, 5);
    assert.equal(area.secrets.length, 2);
    for (const task of area.tasks) {
      assert.ok(task.id && task.title && task.description);
      assert.ok(Number.isFinite(task.x) && Number.isFinite(task.z));
      assert.ok(Number(task.required) >= 1);
      assert.ok(Number(task.reward) > 0);
    }
    for (const secret of area.secrets) {
      assert.ok(Number.isFinite(secret.x) && Number.isFinite(secret.z));
    }
  }
}
const gameplay = await (await import("node:fs/promises")).readFile(new URL("../play/play.js", import.meta.url), "utf8");
assert.match(gameplay, /complete=done===5/, "A region must require all five mandatory contracts.");
assert.match(gameplay, /if\(!regionComplete\(\)\)/, "The next region must remain locked until the current region is complete.");
assert.match(gameplay, /save\.regionCursor\+\+/, "Region progression must be sequential.");
assert.match(gameplay, /currentRegion\.regionIndex===3/, "Planet completion must be checked at the fourth region.");
console.log("Campaign contract: PASS — 6 planets, 24 regions, 120 mandatory missions, 48 optional caches and sequential gates.");
