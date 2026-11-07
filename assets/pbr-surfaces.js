const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const smooth=(a,b,v)=>{const t=clamp((v-a)/(b-a));return t*t*(3-2*t);};
const mix=(a,b,t)=>a+(b-a)*t;
const fract=v=>v-Math.floor(v);

function hash2(x,y,seed){
  let n=(Math.imul((x|0)+seed,374761393)+Math.imul((y|0)-seed,668265263))|0;
  n=Math.imul(n^(n>>>13),1274126177);
  return ((n^(n>>>16))>>>0)/4294967295;
}
function makeGrid(width,height,seed){
  const data=new Float32Array(width*height);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++)data[y*width+x]=hash2(x,y,seed);
  return {data,width,height};
}
function sampleGrid(grid,u,v){
  const x=fract(u)*grid.width,y=fract(v)*grid.height;
  const x0=Math.floor(x),y0=Math.floor(y),fx=x-x0,fy=y-y0;
  const xa=x0%grid.width,xb=(xa+1)%grid.width,ya=y0%grid.height,yb=(ya+1)%grid.height;
  const a=grid.data[ya*grid.width+xa],b=grid.data[ya*grid.width+xb];
  const c=grid.data[yb*grid.width+xa],d=grid.data[yb*grid.width+xb];
  return mix(mix(a,b,fx),mix(c,d,fx),fy);
}
function hexColor(hex){
  const value=String(hex||"#808080").replace("#","");
  const n=parseInt(value.length===3?value.split("").map(c=>c+c).join(""):value,16);
  return [(n>>16&255)/255,(n>>8&255)/255,(n&255)/255];
}
function blendColor(a,b,t){
  return [mix(a[0],b[0],t),mix(a[1],b[1],t),mix(a[2],b[2],t)];
}
function packColor(out,index,color){
  out[index]=Math.round(clamp(color[0])*255);
  out[index+1]=Math.round(clamp(color[1])*255);
  out[index+2]=Math.round(clamp(color[2])*255);
}
export function chooseSurfaceSize(renderer,quality="balanced",aspect="tile"){
  const max=Math.max(1024,renderer?.capabilities?.maxTextureSize||4096);
  const memory=Number(typeof navigator!=="undefined"?navigator.deviceMemory||4:4);
  const supports4k=max>=4096&&memory>=4;
  const supports8k=max>=8192&&memory>=8;
  let width=2048;
  if(quality==="performance")width=1024;
  else if(quality==="8k")width=supports8k?8192:supports4k?4096:2048;
  else if(quality==="4k"||quality==="cinematic")width=supports4k?4096:2048;
  width=Math.min(width,max);
  width=width>=8192?8192:width>=4096?4096:width>=2048?2048:1024;
  return {width,height:aspect==="equirectangular"?width/2:width};
}
function textureFrom(THREE,data,width,height,format,colorSpace,renderer,repeatX=1,repeatY=1){
  const texture=new THREE.DataTexture(data,width,height,format);
  texture.wrapS=texture.wrapT=THREE.RepeatWrapping;
  texture.repeat.set(repeatX,repeatY);
  texture.magFilter=THREE.LinearFilter;
  texture.minFilter=THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps=true;
  texture.anisotropy=Math.min(16,renderer?.capabilities?.getMaxAnisotropy?.()||8);
  texture.unpackAlignment=1;
  if(colorSpace!==undefined&&colorSpace!==null)texture.colorSpace=colorSpace;
  texture.needsUpdate=true;
  return texture;
}
function nextFrame(){
  return new Promise(resolve=>{
    const schedulerObject=typeof window!=="undefined"?window.scheduler:null;
    if(schedulerObject&&typeof schedulerObject.yield==="function"){
      schedulerObject.yield().then(resolve,resolve);
    }else{
      setTimeout(resolve,0);
    }
  });
}

/**
 * Seeded, tileable PBR material synthesis. Produces real GPU textures instead of
 * relying on one low-resolution flat color. Yields between scanline batches so
 * high-resolution texture creation does not monopolise the browser main thread.
 */
export async function createPlanetPbrMaps(THREE,renderer,world,{
  quality="balanced",aspect="tile",repeatX=1,repeatY=1,onProgress,shouldCancel
}={}){
  const {width,height}=chooseSurfaceSize(renderer,quality,aspect);
  const count=width*height,kind=Number(world.kind??world.terrain??0),seed=Number(world.seed||17);
  const colors=(world.colors||world.palette||["#10283a","#245b62","#57916b","#c4b98f"]).map(hexColor);
  while(colors.length<4)colors.push(colors[colors.length-1]);
  const grids=[
    makeGrid(12,aspect==="tile"?12:6,seed+11),
    makeGrid(24,aspect==="tile"?24:12,seed+23),
    makeGrid(48,aspect==="tile"?48:24,seed+37),
    makeGrid(96,aspect==="tile"?96:48,seed+53),
    makeGrid(192,aspect==="tile"?192:96,seed+71),
    makeGrid(384,aspect==="tile"?384:192,seed+97),
    makeGrid(width>=8192?1536:width>=4096?1024:768,aspect==="tile"?(width>=8192?1536:width>=4096?1024:768):(width>=8192?768:width>=4096?512:384),seed+131)
  ];
  // Compact channel layouts reduce 8K peak memory while preserving full RGB material detail.
  const albedo=new Uint8Array(count*3);
  const normal=new Uint8Array(count*3);
  const roughness=new Uint8Array(count*2);
  const heightMap=new Uint8Array(count);
  // Keep each CPU batch close to 65K pixels: large enough to amortise noise sampling,
  // small enough to yield to input/audio without depending on the 3D renderer's FPS.
  const batchRows=Math.max(12,Math.floor(262144/width));
  let previousProgress=0;

  for(let y0=0;y0<height;y0+=batchRows){
    const y1=Math.min(height,y0+batchRows);
    for(let y=y0;y<y1;y++){
      const v=y/height,latitude=Math.abs(v-.5)*2.0;
      for(let x=0;x<width;x++){
        const u=x/width,i=y*width+x,k=i*3;
        const broad=sampleGrid(grids[0],u,v)*.64+sampleGrid(grids[1],u,v)*.36;
        const middle=sampleGrid(grids[2],u,v)*.58+sampleGrid(grids[3],u,v)*.42;
        const detail=sampleGrid(grids[4],u,v)*.56+sampleGrid(grids[5],u,v)*.44;
        const micro=sampleGrid(grids[6],u,v);
        const ridge=1-Math.abs(middle*2-1);
        let elevation=clamp(broad*.55+middle*.3+detail*.12+micro*.03);
        let color=colors[1],rough=.78,relief=elevation;

        if(kind===0){
          const land=smooth(.455,.575,broad+(detail-.5)*.075);
          const high=smooth(.60,.83,middle*.72+ridge*.28);
          const coast=Math.exp(-Math.abs(broad-.515)*62);
          const sea=blendColor(colors[0],colors[1],smooth(.18,.76,broad));
          let ground=blendColor(colors[2],colors[3],high*.62);
          const biome=sampleGrid(grids[4],u*1.8,v*1.8);
          ground=blendColor(ground,blendColor(colors[1],colors[2],.52),smooth(.78,.94,biome)*.34);
          color=blendColor(sea,ground,land);
          color=blendColor(color,colors[3],coast*.075);
          rough=mix(.2,.9,land);
          relief=mix(.27+middle*.12,.38+high*.42,land);
        }else if(kind===1){
          const shelf=smooth(.43,.68,broad+(detail-.5)*.09);
          const island=smooth(.635,.79,broad+(ridge-.5)*.12);
          const reef=smooth(.58,.86,detail)*(1-island);
          color=blendColor(colors[0],colors[1],shelf*.88);
          color=blendColor(color,colors[2],island*.92);
          color=blendColor(color,colors[3],reef*.52);
          rough=mix(.12,.72,island);
          relief=.25+broad*.22+island*.17;
        }else if(kind===2){
          const fracture=1-smooth(.008,.046,Math.abs(detail-.5+(micro-.5)*.028));
          const branch=1-smooth(.01,.048,Math.abs(middle-.5+(ridge-.5)*.035));
          const lava=clamp(fracture*.72+branch*.26);
          color=blendColor(colors[0],colors[1],broad*.76+detail*.14);
          color=blendColor(color,colors[2],smooth(.59,.88,middle)*.42);
          color=blendColor(color,colors[3],lava*.9);
          rough=mix(.92,.25,lava);
          relief=.34+broad*.28+ridge*.12-lava*.035;
        }else if(kind===3){
          const plate=smooth(.39,.64,broad+(detail-.5)*.085);
          const rift=1-smooth(.008,.047,Math.abs(middle-.5+(micro-.5)*.045));
          const edge=smooth(.62,.9,ridge);
          color=blendColor(colors[0],colors[1],plate*.86);
          color=blendColor(color,colors[2],edge*.62);
          color=blendColor(color,colors[3],rift*.78);
          rough=mix(.82,.32,rift*.38+edge*.18);
          relief=.28+broad*.34+plate*.12;
        }else if(kind===4){
          const band=.5+.5*Math.sin(v*Math.PI*64+(middle-.5)*4.6+Math.sin(u*Math.PI*8)*.42);
          const storm=Math.exp(-Math.pow((u-.67)*2.1,2)*38-Math.pow((v-.36)*1.5,2)*48);
          color=blendColor(colors[0],colors[1],smooth(.12,.9,band));
          color=blendColor(color,colors[2],smooth(.55,.94,band)*.54);
          color=blendColor(color,colors[3],storm*(.24+detail*.34));
          rough=.38+micro*.18;
          relief=.42+broad*.07+storm*.018;
        }else{
          const pole=smooth(.58,.94,latitude);
          const ice=smooth(.43,.68,broad+(ridge-.5)*.1);
          const crevasse=1-smooth(.009,.052,Math.abs(detail-.5+(micro-.5)*.06));
          color=blendColor(colors[0],colors[1],ice*.8);
          color=blendColor(color,colors[2],pole*.35+smooth(.64,.9,middle)*.18);
          color=blendColor(color,colors[3],pole*.7+crevasse*.26);
          rough=mix(.24,.82,crevasse*.55+middle*.2);
          relief=.34+broad*.26+pole*.18-crevasse*.025;
        }

        const grain=(micro-.5)*.075+(detail-.5)*.055;
        color=[clamp(color[0]+grain),clamp(color[1]+grain),clamp(color[2]+grain)];
        packColor(albedo,k,color);
        heightMap[i]=Math.round(clamp(relief)*255);
        const roughValue=Math.round(clamp(rough)*255);roughness[i*2]=roughValue;roughness[i*2+1]=roughValue;
      }
    }
    const progress=y1/height;
    if(onProgress&&progress-previousProgress>=.1){onProgress(progress);previousProgress=progress;}
    await nextFrame();
    if(shouldCancel?.())return null;
  }

  const normalStrength=aspect==="equirectangular"?5.2:4.2;
  for(let y0=0;y0<height;y0+=batchRows){
    const y1=Math.min(height,y0+batchRows);
    for(let y=y0;y<y1;y++){
      const ym=Math.max(0,y-1),yp=Math.min(height-1,y+1);
      for(let x=0;x<width;x++){
        const xm=(x+width-1)%width,xp=(x+1)%width,i=y*width+x,k=i*3;
        const dx=((heightMap[y*width+xp]-heightMap[y*width+xm])/255)*normalStrength;
        const dy=((heightMap[yp*width+x]-heightMap[ym*width+x])/255)*normalStrength;
        let nx=-dx,ny=-dy,nz=1,len=Math.sqrt(nx*nx+ny*ny+nz*nz);
        normal[k]=Math.round((nx/len*.5+.5)*255);
        normal[k+1]=Math.round((ny/len*.5+.5)*255);
        normal[k+2]=Math.round((nz/len*.5+.5)*255);
      }
    }
    await nextFrame();
    if(shouldCancel?.())return null;
  }

  const maps={
    albedo:textureFrom(THREE,albedo,width,height,THREE.RGBFormat,THREE.SRGBColorSpace,renderer,repeatX,repeatY),
    normal:textureFrom(THREE,normal,width,height,THREE.RGBFormat,THREE.NoColorSpace,renderer,repeatX,repeatY),
    roughness:textureFrom(THREE,roughness,width,height,THREE.RGFormat,THREE.NoColorSpace,renderer,repeatX,repeatY),
    heightMap:textureFrom(THREE,heightMap,width,height,THREE.RedFormat,THREE.NoColorSpace,renderer,repeatX,repeatY),
    width,height,dispose(){
      this.albedo.dispose();this.normal.dispose();this.roughness.dispose();this.heightMap.dispose();
    }
  };
  onProgress?.(1);
  return maps;
}

export function createPlanetPbrMaterial(THREE,maps,world,{surface="terrain"}={}){
  const kind=Number(world.kind??world.terrain??0);
  const isPlanet=surface==="planet";
  const material=new THREE.MeshPhysicalMaterial({
    color:0xffffff,map:maps.albedo,normalMap:maps.normal,roughnessMap:maps.roughness,
    normalScale:new THREE.Vector2(isPlanet?1.18:1.12,isPlanet?1.18:1.12),
    bumpMap:maps.heightMap,bumpScale:isPlanet?.026:.09,
    displacementMap:isPlanet?maps.heightMap:null,displacementScale:isPlanet?.048:0,
    displacementBias:isPlanet?-.024:0,
    roughness:kind===1?.74:kind===4?.44:kind===5?.48:.88,
    metalness:.018,
    clearcoat:kind===1?.22:kind===5?.18:kind===4?.08:.035,
    clearcoatRoughness:kind===1?.24:kind===5?.3:.46,
    sheen:kind===0?.12:kind===5?.16:0,
    sheenRoughness:.82,
    envMapIntensity:isPlanet?1.08:.68
  });
  if(kind===2){material.emissive=new THREE.Color("#6d2410");material.emissiveIntensity=.14;}
  if(kind===1){material.emissive=new THREE.Color("#073c35");material.emissiveIntensity=.075;}
  if(kind===5){material.emissive=new THREE.Color("#204b63");material.emissiveIntensity=.035;}
  return material;
}

export function createCinematicEnvironment(THREE,renderer){
  if(typeof document==="undefined"||!THREE.PMREMGenerator)return null;
  const canvas=document.createElement("canvas");canvas.width=1024;canvas.height=512;
  const ctx=canvas.getContext("2d",{alpha:false});
  const base=ctx.createLinearGradient(0,0,0,512);
  base.addColorStop(0,"#020816");base.addColorStop(.34,"#101d35");base.addColorStop(.52,"#192b40");base.addColorStop(.74,"#070d1d");base.addColorStop(1,"#01040b");
  ctx.fillStyle=base;ctx.fillRect(0,0,1024,512);
  const haze=ctx.createRadialGradient(570,205,8,570,205,380);
  haze.addColorStop(0,"rgba(87,130,180,.32)");haze.addColorStop(.48,"rgba(42,93,136,.13)");haze.addColorStop(1,"rgba(4,12,25,0)");
  ctx.fillStyle=haze;ctx.fillRect(0,0,1024,512);
  let seed=913;
  const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967295;};
  for(let i=0;i<1050;i++){
    const x=rand()*1024,y=rand()*512,r=.35+rand()*1.1,a=.16+rand()*.52;
    ctx.fillStyle="rgba(197,220,255,"+a+")";ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();
  }
  const sun=ctx.createRadialGradient(185,138,1,185,138,76);
  sun.addColorStop(0,"rgba(255,244,218,.98)");sun.addColorStop(.055,"rgba(255,212,153,.72)");sun.addColorStop(.22,"rgba(255,184,113,.18)");sun.addColorStop(1,"rgba(255,160,90,0)");
  ctx.fillStyle=sun;ctx.fillRect(105,58,160,160);
  const source=new THREE.CanvasTexture(canvas);source.mapping=THREE.EquirectangularReflectionMapping;source.colorSpace=THREE.SRGBColorSpace;
  const pmrem=new THREE.PMREMGenerator(renderer);pmrem.compileEquirectangularShader();
  const target=pmrem.fromEquirectangular(source);
  source.dispose();pmrem.dispose();
  return target;
}
