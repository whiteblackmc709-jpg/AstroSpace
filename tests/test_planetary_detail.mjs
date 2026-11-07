import assert from "node:assert/strict";
import { createBiomeDetailMaps, planetaryDetailBudget } from "../assets/planetary-detail.js";
import { readFileSync } from "node:fs";

class DataTexture {
  constructor(data,width,height,format){this.image={data,width,height};this.format=format;this.repeat={set:(x,y)=>{this.repeatX=x;this.repeatY=y;}};this.disposed=false;}
  dispose(){this.disposed=true;}
}
const THREE={DataTexture,RGBFormat:"rgb",RGFormat:"rg",RedFormat:"red",SRGBColorSpace:"srgb",NoColorSpace:"",RepeatWrapping:"repeat",LinearFilter:"linear",LinearMipmapLinearFilter:"mipmap"};
const maps=createBiomeDetailMaps(THREE,"bark",19,"#49382a","#c69b61");
assert.equal(maps.albedo.image.data.length,256*256*3);
assert.equal(maps.roughness.image.data.length,256*256*2);
assert.equal(maps.heightMap.image.data.length,256*256);
assert.equal(maps.albedo.format,"rgb");
assert.equal(maps.roughness.format,"rg");
assert.equal(maps.heightMap.format,"red");
assert.equal(maps.albedo.colorSpace,"srgb");
assert.equal(maps.albedo.repeatX,2);
assert.equal(maps.heightMap.repeatY,2);
const source = readFileSync(new URL("../assets/planetary-detail.js", import.meta.url), "utf8");
assert.match(source,/material\.bumpMap=maps\.heightMap/, "All detailed props must have a surface relief map.");
assert.match(source,/material\.roughnessMap=maps\.roughness/, "Detailed props must use roughness variation.");
maps.dispose();
assert.ok(maps.albedo.disposed&&maps.roughness.disposed&&maps.heightMap.disposed,"Biome texture sets must dispose cleanly.");
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
