import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PLANETS } from "../play/region-data.js";
import { terrainHeight, terrainColorVariation } from "../play/terrain-sampling.js";
import { createPlanetPbrMaterial } from "../assets/pbr-surfaces.js";
import {
 createTerrainChunkBuildJob,
 createTerrainLodLayout,
 getTerrainBaseSegments,
 getTerrainChunkTriangleCount,
 resolveTerrainLodSegments,
 TERRAIN_CHUNK_SIZE
} from "../play/terrain-lod.js";

const dependencyRoot=process.env.ASTROSPACE_THREE_ROOT;
assert.ok(dependencyRoot,"ASTROSPACE_THREE_ROOT must point to the pinned Three.js runtime install");
const dependencyRequire=createRequire(join(dependencyRoot,"astrospace-three-terrain-lod-test.cjs"));
const packageJson=JSON.parse(readFileSync(join(dependencyRoot,"node_modules/three/package.json"),"utf8"));
assert.equal(packageJson.version,"0.170.0","Terrain mesh regression must use the production Three.js version");
const THREE=dependencyRequire("three");
assert.equal(THREE.REVISION,"170");

const colorScratch=[0,0,0];
const colorResult=terrainColorVariation(PLANETS[0],120,-90,7,.94,colorScratch);
assert.equal(colorResult,colorScratch,"terrain color sampling must reuse the caller's scratch array");
assert.ok(colorScratch.every(Number.isFinite),"scratch color channels must remain finite");

const expectedQuality={
 performance:[128,32,16],
 balanced:[224,56,28],
 cinematic:[320,80,40],
 "4k":[384,96,48],
 "8k":[448,112,56]
};
for(const [quality,expected] of Object.entries(expectedQuality)){
 const base=getTerrainBaseSegments(quality);
 assert.equal(base,expected[0],quality+" near segment budget");
 assert.deepEqual([
  resolveTerrainLodSegments(base,"near"),
  resolveTerrainLodSegments(base,"middle"),
  resolveTerrainLodSegments(base,"far")
 ],expected,quality+" ring budgets");
}
assert.equal(getTerrainBaseSegments("unknown"),224,"unknown legacy quality keeps the balanced fallback");

const layout=createTerrainLodLayout(224,TERRAIN_CHUNK_SIZE,0,0);
assert.equal(layout.length,9);
assert.equal(layout.filter(item=>item.ring==="near").length,1);
assert.equal(layout.filter(item=>item.ring==="middle").length,4);
assert.equal(layout.filter(item=>item.ring==="far").length,4);
assert.equal(layout[0].ring,"near","near chunk is first in the build priority queue");
assert.equal(layout[0].segments,224);
assert.ok(layout.filter(item=>item.ring==="middle").every(item=>item.segments===56));
assert.ok(layout.filter(item=>item.ring==="far").every(item=>item.segments===28));

const terrainTriangles=layout.reduce((sum,item)=>sum+getTerrainChunkTriangleCount(item.segments),0);
assert.equal(terrainTriangles,136192,"Balanced LOD triangle estimate includes all four perimeter skirts");
const baselineTerrainTriangles=9*2*224*224;
const baselineSceneTriangles=1442748;
const nonTerrainTriangles=baselineSceneTriangles-baselineTerrainTriangles;
const projectedSceneTriangles=nonTerrainTriangles+terrainTriangles;
assert.ok(projectedSceneTriangles<=baselineSceneTriangles*.5,
 "Balanced 1/4/8 rings plus skirts must fit the <=50% scene triangle target estimate");

const samplePoints=[
 [-280,260],
 [0,0],
 [450,450],
 [812.5,-137.25],
 [-1780.125,960.75],
 [3210.5,-2480.25]
];
for(const world of PLANETS){
 for(const [x,z] of samplePoints){
  const expected=terrainHeight(x,z,world);
  for(const segments of [224,56,28,128,32,16,448,112,56]){
   assert.equal(terrainHeight(x,z,world),expected,
    world.id+" height sample must not depend on the selected LOD segment count "+segments);
  }
 }
}

function buildChunk(world,descriptor){
 const job=createTerrainChunkBuildJob(THREE,world,{
  centerX:descriptor.centerX,
  centerZ:descriptor.centerZ,
  size:TERRAIN_CHUNK_SIZE,
  segments:descriptor.segments
 });
 let steps=0,done=false;
 while(!done){
  done=job.step(1024);
  steps++;
  assert.ok(steps<2000,"incremental terrain build must eventually complete");
 }
 assert.ok(steps>1,"terrain generation must be sliced across multiple work steps");
 const geometry=job.geometry;
 assert.ok(geometry.isBufferGeometry);
 assert.ok(geometry.attributes.uv,"every terrain LOD geometry must provide UVs for its sampled maps");
 const positionAttribute=geometry.attributes.position;
 const uvs=geometry.attributes.uv;
 assert.equal(uvs.count,positionAttribute.count,"terrain UV count must match every surface and skirt vertex");
 for(let vertex=0;vertex<positionAttribute.count;vertex++){
  const x=positionAttribute.getX(vertex),z=positionAttribute.getZ(vertex);
  const expectedU=(x+TERRAIN_CHUNK_SIZE*.5)/TERRAIN_CHUNK_SIZE;
  const expectedV=1-(z+TERRAIN_CHUNK_SIZE*.5)/TERRAIN_CHUNK_SIZE;
  const actualU=uvs.getX(vertex),actualV=uvs.getY(vertex);
  assert.ok(actualU>=0&&actualU<=1&&actualV>=0&&actualV<=1,
   descriptor.ring+" UVs must remain in [0,1], including skirt vertices");
  assert.ok(Math.abs(actualU-expectedU)<1e-6&&Math.abs(actualV-expectedV)<1e-6,
   descriptor.ring+" UVs must match normalized PlaneGeometry coordinates for every vertex");
 }
 assert.ok(geometry.boundingSphere);
 assert.ok(geometry.boundingBox);
 assert.equal(geometry.attributes.position.count,(descriptor.segments+1)**2+8*(descriptor.segments+1));
 assert.equal(geometry.index.count/3,getTerrainChunkTriangleCount(descriptor.segments));
 for(const attributeName of ["position","normal","color"]){
  const array=geometry.attributes[attributeName].array;
  assert.ok(Array.from(array).every(Number.isFinite),attributeName+" values must be finite");
 }
 const positions=geometry.attributes.position.array;
 const normals=geometry.attributes.normal.array;
 const surfaceCount=(descriptor.segments+1)**2;
 for(let i=0;i<surfaceCount;i++){
  const k=i*3,length=Math.hypot(normals[k],normals[k+1],normals[k+2]);
  assert.ok(Math.abs(length-1)<1e-4,"surface normals must be normalized");
 }
 const skirtTop=surfaceCount*3,skirtBottom=(surfaceCount+1)*3;
 assert.equal(positions[skirtTop],positions[skirtBottom],"skirt top/bottom share the source edge X");
 assert.equal(positions[skirtTop+2],positions[skirtBottom+2],"skirt top/bottom share the source edge Z");
 assert.ok(Math.abs((positions[skirtTop+1]-positions[skirtBottom+1])-72)<1e-4,"skirt depth is 72 world units");
 const indices=geometry.index.array;
 assert.ok(Array.from(indices).every(index=>index<geometry.attributes.position.count),"all chunk indices stay inside their geometry");
 return {job,geometry,descriptor};
}

const pbrMaps={
 albedo:new THREE.Texture(),
 normal:new THREE.Texture(),
 roughness:new THREE.Texture(),
 heightMap:new THREE.Texture()
};
const terrainPbr=createPlanetPbrMaterial(THREE,pbrMaps,PLANETS[0],{surface:"terrain"});
assert.ok(terrainPbr.map,"terrain PBR material must require the albedo map");
assert.ok(terrainPbr.normalMap,"terrain PBR material must require the normal map");
assert.ok(terrainPbr.roughnessMap,"terrain PBR material must require the roughness map");
assert.ok(terrainPbr.bumpMap,"terrain PBR material must require the bump map");
assert.ok(terrainPbr.map&&terrainPbr.normalMap&&terrainPbr.roughnessMap&&terrainPbr.bumpMap,
 "any geometry assigned the production terrain PBR material must supply UV coordinates");
terrainPbr.dispose();
Object.values(pbrMaps).forEach(texture=>texture.dispose());

const world=PLANETS[0];
const nearDescriptor=layout.find(item=>item.ring==="near");
const eastMiddleDescriptor=layout.find(item=>item.ring==="middle"&&item.dx===1&&item.dz===0);
const southeastFarDescriptor=layout.find(item=>item.ring==="far"&&item.dx===1&&item.dz===1);
const near=buildChunk(world,nearDescriptor);
const eastMiddle=buildChunk(world,eastMiddleDescriptor);
const southeastFar=buildChunk(world,southeastFarDescriptor);

function surfaceY(built,row,column){
 const stride=built.descriptor.segments+1;
 return built.geometry.attributes.position.getY(row*stride+column);
}
// Near (224) to middle (56): every fourth near edge vertex is a shared world sample.
for(let row=0;row<=56;row++){
 assert.equal(surfaceY(near,row*4,224),surfaceY(eastMiddle,row,0),
  "near/middle common edge heights must be identical at world X=450");
}
// Middle (56) to far (28): every second middle edge vertex is a shared world sample.
for(let column=0;column<=28;column++){
 assert.equal(surfaceY(eastMiddle,56,column*2),surfaceY(southeastFar,0,column),
  "middle/far common edge heights must be identical at world Z=450");
}

near.job.dispose();
eastMiddle.job.dispose();
southeastFar.job.dispose();

console.log("Terrain distance LOD: PASS — all five quality budgets, UV mapping/material contract on every ring and skirt vertex, shared height sampler, incremental Three.js 0.170.0 mesh builds, skirt closure and exact cross-ring edge samples.");
