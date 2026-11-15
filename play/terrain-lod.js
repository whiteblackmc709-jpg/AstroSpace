import { terrainHeight, terrainColorVariation } from "./terrain-sampling.js";

export const TERRAIN_CHUNK_SIZE = 900;
export const TERRAIN_SKIRT_DEPTH = 72;
export const TERRAIN_BUILD_BUDGET_MS = 2;
export const TERRAIN_BUILD_WORK_QUANTUM = 256;

const LEGACY_BASE_SEGMENTS = Object.freeze({
 performance:128,
 balanced:224,
 cinematic:320,
 "4k":384,
 "8k":448
});
const RING_DIVISOR = Object.freeze({near:1,middle:4,far:8});
const RING_PRIORITY = Object.freeze({near:0,middle:1,far:2});

export function getTerrainBaseSegments(legacyQuality){
 return LEGACY_BASE_SEGMENTS[legacyQuality]||LEGACY_BASE_SEGMENTS.balanced;
}

export function resolveTerrainLodSegments(baseSegments,ring){
 const divisor=RING_DIVISOR[ring];
 if(!Number.isFinite(baseSegments)||baseSegments<8||!divisor)throw new RangeError("Invalid terrain LOD request");
 return Math.max(8,Math.round(baseSegments/divisor));
}

export function createTerrainLodLayout(baseSegments,chunkSize,centerX,centerZ){
 if(!Number.isFinite(chunkSize)||chunkSize<=0)throw new RangeError("Terrain chunk size must be positive");
 const layout=[];
 for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++){
  const ring=dx===0&&dz===0?"near":dx===0||dz===0?"middle":"far";
  layout.push({
   index:(dz+1)*3+(dx+1),
   dx,dz,ring,priority:RING_PRIORITY[ring],
   centerX:centerX+dx*chunkSize,
   centerZ:centerZ+dz*chunkSize,
   segments:resolveTerrainLodSegments(baseSegments,ring)
  });
 }
 return layout.sort((a,b)=>a.priority-b.priority||a.index-b.index);
}

export function getTerrainChunkTriangleCount(segments){
 if(!Number.isInteger(segments)||segments<1)throw new RangeError("Terrain segments must be a positive integer");
 return 2*segments*segments+8*segments;
}

function edgeVertexIndex(side,index,stride,segments){
 if(side===0)return index*stride;
 if(side===1)return index*stride+segments;
 if(side===2)return index;
 return segments*stride+index;
}

/**
 * Builds one indexed grid chunk over multiple small work slices.
 * Surface samples and all gameplay height queries use the exact same
 * terrainHeight(worldX, worldZ, world) function.
 */
export function createTerrainChunkBuildJob(THREE,world,{
 centerX=0,centerZ=0,size=TERRAIN_CHUNK_SIZE,segments=128,skirtDepth=TERRAIN_SKIRT_DEPTH
}={}){
 if(!THREE?.BufferGeometry||!THREE?.BufferAttribute)throw new TypeError("A Three.js namespace is required");
 if(!Number.isInteger(segments)||segments<8)throw new RangeError("Terrain segments must be an integer >= 8");
 if(!Number.isFinite(size)||size<=0||!Number.isFinite(skirtDepth)||skirtDepth<=0)throw new RangeError("Invalid terrain chunk dimensions");

 const stride=segments+1;
 const surfaceVertexCount=stride*stride;
 const skirtVertexCount=stride*8;
 const vertexCount=surfaceVertexCount+skirtVertexCount;
 const surfaceCellCount=segments*segments;
 const surfaceTriangleCount=surfaceCellCount*2;
 const skirtUnitCount=segments*4;
 const totalTriangleCount=surfaceTriangleCount+skirtUnitCount*2;
 const surfaceIndexCount=surfaceCellCount*6;
 const indexArray=vertexCount<=65536?new Uint16Array(totalTriangleCount*3):new Uint32Array(totalTriangleCount*3);
 const positions=new Float32Array(vertexCount*3);
 const normals=new Float32Array(vertexCount*3);
 const colors=new Float32Array(vertexCount*3);
 const geometry=new THREE.BufferGeometry();
 const positionAttribute=new THREE.BufferAttribute(positions,3);
 const normalAttribute=new THREE.BufferAttribute(normals,3);
 const colorAttribute=new THREE.BufferAttribute(colors,3);
 geometry.setAttribute("position",positionAttribute);
 geometry.setAttribute("normal",normalAttribute);
 geometry.setAttribute("color",colorAttribute);
 geometry.setIndex(new THREE.BufferAttribute(indexArray,1));

 const half=size*.5,step=size/segments;
 let phase=0,cursor=0,finalized=false,disposed=false;
 const tintScratch=[1,1,1];
 let minX=Infinity,minY=Infinity,minZ=Infinity,maxX=-Infinity,maxY=-Infinity,maxZ=-Infinity,maxRadiusSquared=0;

 function writeIndices(unit,indexOffset){
  if(unit<surfaceCellCount){
   const row=Math.floor(unit/segments),column=unit-row*segments;
   const a=row*stride+column,b=a+1,c=a+stride,d=c+1;
   indexArray[indexOffset]=a;
   indexArray[indexOffset+1]=c;
   indexArray[indexOffset+2]=b;
   indexArray[indexOffset+3]=b;
   indexArray[indexOffset+4]=c;
   indexArray[indexOffset+5]=d;
   return;
  }
  const skirtUnit=unit-surfaceCellCount,side=Math.floor(skirtUnit/segments),edge=skirtUnit-side*segments;
  const sideBase=surfaceVertexCount+side*stride*2;
  const top0=sideBase+edge*2,bottom0=top0+1,top1=top0+2,bottom1=top1+1;
  const forward=side===1||side===2;
  if(forward){
   indexArray[indexOffset]=top0;indexArray[indexOffset+1]=top1;indexArray[indexOffset+2]=bottom0;
   indexArray[indexOffset+3]=top1;indexArray[indexOffset+4]=bottom1;indexArray[indexOffset+5]=bottom0;
  }else{
   indexArray[indexOffset]=top0;indexArray[indexOffset+1]=bottom0;indexArray[indexOffset+2]=top1;
   indexArray[indexOffset+3]=top1;indexArray[indexOffset+4]=bottom0;indexArray[indexOffset+5]=bottom1;
  }
 }

 function trackBounds(x,y,z){
  minX=Math.min(minX,x);minY=Math.min(minY,y);minZ=Math.min(minZ,z);
  maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);maxZ=Math.max(maxZ,z);
  maxRadiusSquared=Math.max(maxRadiusSquared,x*x+y*y+z*z);
 }

 function sampleSurfaceVertex(vertex){
  const row=Math.floor(vertex/stride),column=vertex-row*stride,k=vertex*3;
  const x=-half+column*step,z=-half+row*step,y=terrainHeight(centerX+x,centerZ+z,world);
  positions[k]=x;positions[k+1]=y;positions[k+2]=z;
  trackBounds(x,y,z);
 }

 function accumulateSurfaceNormal(triangle){
  const offset=triangle*3;
  const a=indexArray[offset],b=indexArray[offset+1],c=indexArray[offset+2];
  const ak=a*3,bk=b*3,ck=c*3;
  const abx=positions[bk]-positions[ak],aby=positions[bk+1]-positions[ak+1],abz=positions[bk+2]-positions[ak+2];
  const acx=positions[ck]-positions[ak],acy=positions[ck+1]-positions[ak+1],acz=positions[ck+2]-positions[ak+2];
  const nx=aby*acz-abz*acy,ny=abz*acx-abx*acz,nz=abx*acy-aby*acx;
  normals[ak]+=nx;normals[ak+1]+=ny;normals[ak+2]+=nz;
  normals[bk]+=nx;normals[bk+1]+=ny;normals[bk+2]+=nz;
  normals[ck]+=nx;normals[ck+1]+=ny;normals[ck+2]+=nz;
 }

 function normalizeAndColorVertex(vertex){
  const k=vertex*3,x=positions[k],y=positions[k+1],z=positions[k+2];
  const nx=normals[k],ny=normals[k+1],nz=normals[k+2],length=Math.hypot(nx,ny,nz)||1;
  const normalX=nx/length,normalY=ny/length,normalZ=nz/length;
  normals[k]=normalX;normals[k+1]=normalY;normals[k+2]=normalZ;
  terrainColorVariation(world,centerX+x,centerZ+z,y,normalY,tintScratch);
  colors[k]=tintScratch[0];colors[k+1]=tintScratch[1];colors[k+2]=tintScratch[2];
 }

 function fillSkirtVertex(vertex){
  const side=Math.floor(vertex/(stride*2)),local=vertex-side*stride*2;
  const edgeIndex=Math.floor(local/2),isBottom=(local&1)===1;
  const source=edgeVertexIndex(side,edgeIndex,stride,segments)*3;
  const destination=(surfaceVertexCount+vertex)*3;
  positions[destination]=positions[source];
  positions[destination+1]=positions[source+1]-(isBottom?skirtDepth:0);
  positions[destination+2]=positions[source+2];
  if(side===0){normals[destination]=-1;normals[destination+1]=0;normals[destination+2]=0;}
  else if(side===1){normals[destination]=1;normals[destination+1]=0;normals[destination+2]=0;}
  else if(side===2){normals[destination]=0;normals[destination+1]=0;normals[destination+2]=-1;}
  else{normals[destination]=0;normals[destination+1]=0;normals[destination+2]=1;}
  colors[destination]=colors[source];colors[destination+1]=colors[source+1];colors[destination+2]=colors[source+2];
  trackBounds(positions[destination],positions[destination+1],positions[destination+2]);
 }

 function finalize(){
  if(finalized)return;
  positionAttribute.needsUpdate=true;
  normalAttribute.needsUpdate=true;
  colorAttribute.needsUpdate=true;
  geometry.index.needsUpdate=true;
  geometry.boundingBox=new THREE.Box3(
   new THREE.Vector3(minX,minY,minZ),
   new THREE.Vector3(maxX,maxY,maxZ)
  );
  // Origin-centred sphere is conservative and avoids an O(vertex-count) final scan.
  geometry.boundingSphere=new THREE.Sphere(new THREE.Vector3(0,0,0),Math.sqrt(maxRadiusSquared));
  finalized=true;
 }

 return {
  geometry,segments,centerX,centerZ,size,skirtDepth,
  step(workQuantum=TERRAIN_BUILD_WORK_QUANTUM){
   if(disposed)throw new Error("Cannot advance a disposed terrain build job");
   let remaining=Math.max(1,Math.floor(workQuantum));
   while(remaining>0&&phase<5){
    if(phase===0){
     const totalUnits=surfaceCellCount+skirtUnitCount,end=Math.min(totalUnits,cursor+remaining),start=cursor;
     for(let unit=start;unit<end;unit++)writeIndices(unit,unit*6);
     cursor=end;remaining-=end-start;
     if(cursor>=totalUnits){phase=1;cursor=0;}
    }else if(phase===1){
     const end=Math.min(surfaceVertexCount,cursor+remaining),start=cursor;
     for(let vertex=start;vertex<end;vertex++)sampleSurfaceVertex(vertex);
     cursor=end;remaining-=end-start;
     if(cursor>=surfaceVertexCount){phase=2;cursor=0;}
    }else if(phase===2){
     const end=Math.min(surfaceTriangleCount,cursor+remaining),start=cursor;
     for(let triangle=start;triangle<end;triangle++)accumulateSurfaceNormal(triangle);
     cursor=end;remaining-=end-start;
     if(cursor>=surfaceTriangleCount){phase=3;cursor=0;}
    }else if(phase===3){
     const end=Math.min(surfaceVertexCount,cursor+remaining),start=cursor;
     for(let vertex=start;vertex<end;vertex++)normalizeAndColorVertex(vertex);
     cursor=end;remaining-=end-start;
     if(cursor>=surfaceVertexCount){phase=4;cursor=0;}
    }else{
     const end=Math.min(skirtVertexCount,cursor+remaining),start=cursor;
     for(let vertex=start;vertex<end;vertex++)fillSkirtVertex(vertex);
     cursor=end;remaining-=end-start;
     if(cursor>=skirtVertexCount)phase=5;
    }
   }
   if(phase===5)finalize();
   return phase===5;
  },
  dispose(){
   if(disposed)return;
   disposed=true;
   geometry.dispose();
  }
 };
}
