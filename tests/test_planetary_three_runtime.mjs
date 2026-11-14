import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PLANETS } from "../play/region-data.js";
import { createBiomeDetailMaps, createPlanetaryDetail } from "../assets/planetary-detail.js";
import { createPlanetPbrMaps, createPlanetPbrMaterial } from "../assets/pbr-surfaces.js";

const dependencyRoot = process.env.ASTROSPACE_THREE_ROOT;
assert.ok(dependencyRoot, "ASTROSPACE_THREE_ROOT must point to the temporary CI install");
const dependencyRequire = createRequire(join(dependencyRoot, "astrospace-three-test.cjs"));
const packageJson = JSON.parse(readFileSync(join(dependencyRoot, "node_modules/three/package.json"), "utf8"));
assert.equal(packageJson.version, "0.170.0", "This regression must run against the exact production Three.js version");
const THREE = dependencyRequire("three");
assert.equal(THREE.REVISION, "170", "Unexpected Three.js runtime revision");

assert.equal(PLANETS.length, 6, "The scene regression must cover all six configured planets");
const biomeStyles = ["leaf", "coral", "basalt", "crystal", "stone", "crystal"];
const rendererWithoutWebGL = {capabilities:{maxTextureSize:1024,getMaxAnisotropy:()=>4}};

function disposeDetail(root) {
  root.userData.disposeTextures?.();
  const geometries = new Set();
  const materials = new Set();
  root.traverse(object => {
    if (object.geometry && !geometries.has(object.geometry)) {
      geometries.add(object.geometry);
      object.geometry.dispose();
    }
    const list = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of list) {
      if (material && !materials.has(material)) {
        materials.add(material);
        material.dispose();
      }
    }
  });
  root.clear();
}

for (const planet of PLANETS) {
  const kind = Number(planet.terrain);
  const biomeMaps = createBiomeDetailMaps(THREE,biomeStyles[kind],planet.seed,planet.palette[0],planet.palette[2]);
  assert.ok(biomeMaps.albedo.isDataTexture,planet.id+": biome albedo must be a real Three.js DataTexture");
  assert.ok(biomeMaps.roughness.isDataTexture,planet.id+": biome roughness must be a real Three.js DataTexture");
  assert.ok(biomeMaps.heightMap.isDataTexture,planet.id+": biome height must be a real Three.js DataTexture");
  biomeMaps.dispose();

  let detail;
  try {
    detail = createPlanetaryDetail(THREE,planet,{quality:"performance",terrainHeight:()=>0});
    assert.ok(detail.isGroup,planet.id+": createPlanetaryDetail must return a Three.js Group");
    assert.equal(detail.name,"ASTROSPACE_BIOME_DETAIL");
    assert.ok(detail.children.length>=3,planet.id+": expected ground, foliage and floating detail groups");
    assert.ok(detail.userData.detailTextures.length>0,planet.id+": biome textures must be created");
    assert.equal(detail.userData.quality,"performance");
  } catch(error) {
    throw new Error(planet.id+" planetary detail initialization failed: "+(error?.stack||error),{cause:error});
  } finally {
    if(detail)disposeDetail(detail);
  }

  let pbrMaps;
  let pbrMaterial;
  try {
    pbrMaps = await createPlanetPbrMaps(THREE,rendererWithoutWebGL,planet,{quality:"performance",aspect:"tile"});
    assert.ok(pbrMaps,planet.id+": createPlanetPbrMaps returned no maps");
    assert.equal(pbrMaps.width,1024);
    assert.equal(pbrMaps.height,1024);
    assert.ok(pbrMaps.albedo.isDataTexture,planet.id+": PBR albedo must be a real Three.js DataTexture");
    assert.ok(pbrMaps.normal.isDataTexture,planet.id+": PBR normal must be a real Three.js DataTexture");
    assert.ok(pbrMaps.roughness.isDataTexture,planet.id+": PBR roughness must be a real Three.js DataTexture");
    assert.ok(pbrMaps.heightMap.isDataTexture,planet.id+": PBR height must be a real Three.js DataTexture");
    pbrMaterial = createPlanetPbrMaterial(THREE,pbrMaps,planet);
    assert.equal(pbrMaterial.map,pbrMaps.albedo);
    assert.equal(pbrMaterial.normalMap,pbrMaps.normal);
  } catch(error) {
    throw new Error(planet.id+" PBR map initialization failed: "+(error?.stack||error),{cause:error});
  } finally {
    pbrMaterial?.dispose();
    pbrMaps?.dispose();
  }

  console.log("Three.js 0.170.0 scene init: PASS — "+planet.id);
}

console.log("Real Three.js planetary regression: PASS — all 6 scenes, biome detail maps and PBR maps initialized without WebGL.");
