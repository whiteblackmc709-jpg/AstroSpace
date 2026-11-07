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
  const supports4k=max>=4096&&memory>=8;
  const supports8k=max>=8192&&memory>=16;
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

        const pore=1-smooth(.015,.12,Math.abs(micro-.5+(detail-.5)*.09));
        const striation=.5+.5*Math.sin(v*height*.17+middle*18+micro*4.2);
        const grain=(micro-.5)*.105+(detail-.5)*.072+(striation-.5)*.035;
        if(kind===0){color=blendColor(color,colors[3],smooth(.84,.98,middle)*.11);rough=clamp(rough+(pore-.5)*.08);}
        else if(kind===1){color=blendColor(color,colors[3],pore*.12);rough=clamp(rough+(pore-.5)*.1);}
        else if(kind===2){color=blendColor(color,colors[3],pore*.18);rough=clamp(rough-pore*.22);}
        else if(kind===3){color=blendColor(color,colors[3],pore*.14);}
        else if(kind===5){color=blendColor(color,colors[3],pore*.16);rough=clamp(rough+(pore-.5)*.06);}
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
    normalScale:new THREE.Vector2(isPlanet?1.22:1.28,isPlanet?1.22:1.28),
    bumpMap:maps.heightMap,bumpScale:isPlanet?.026:.09,
    displacementMap:isPlanet?maps.heightMap:null,displacementScale:isPlanet?.048:0,
    displacementBias:isPlanet?-.024:0,
    roughness:kind===1?.72:kind===4?.42:kind===5?.43:.86,vertexColors:!isPlanet,
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
  const width=2048,height=1024,canvas=document.createElement("canvas");canvas.width=width;canvas.height=height;
  const ctx=canvas.getContext("2d",{alpha:false});
  const base=ctx.createLinearGradient(0,0,0,height);
  base.addColorStop(0,"#01040d");base.addColorStop(.2,"#07182c");base.addColorStop(.42,"#142d43");base.addColorStop(.53,"#203846");base.addColorStop(.72,"#09182a");base.addColorStop(1,"#01030a");
  ctx.fillStyle=base;ctx.fillRect(0,0,width,height);
  let seed=913,rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  const hazeLayers=[
   {x:width*.25,y:height*.32,r:390,color:"76,105,174",alpha:.24},
   {x:width*.57,y:height*.42,r:520,color:"52,151,169",alpha:.19},
   {x:width*.82,y:height*.28,r:360,color:"127,76,156",alpha:.17},
   {x:width*.48,y:height*.68,r:420,color:"47,81,132",alpha:.16}
  ];
  for(const layer of hazeLayers){
   const gradient=ctx.createRadialGradient(layer.x,layer.y,8,layer.x,layer.y,layer.r);
   gradient.addColorStop(0,"rgba("+layer.color+","+layer.alpha+")");
   gradient.addColorStop(.34,"rgba("+layer.color+","+(layer.alpha*.44)+")");
   gradient.addColorStop(1,"rgba("+layer.color+",0)");
   ctx.fillStyle=gradient;ctx.fillRect(0,0,width,height);
  }
  // Fine turbulent filaments give the reflection map a layered dust-cloud structure.
  for(let i=0;i<34;i++){
   const x=rand()*width,y=height*(.12+rand()*.72),rx=90+rand()*360,ry=16+rand()*85,rotation=(rand()-.5)*.9;
   ctx.save();ctx.translate(x,y);ctx.rotate(rotation);
   const g=ctx.createRadialGradient(0,0,3,0,0,rx);
   const tone=i%3===0?"105,169,197":i%3===1?"124,113,192":"191,130,91";
   g.addColorStop(0,"rgba("+tone+",.075)");g.addColorStop(.45,"rgba("+tone+",.035)");g.addColorStop(1,"rgba("+tone+",0)");
   ctx.fillStyle=g;ctx.beginPath();ctx.ellipse(0,0,rx,ry,0,0,Math.PI*2);ctx.fill();ctx.restore();
  }
  // Star layers have a broad luminance range; the bright few are reflection anchors, not a flat speckle field.
  for(let i=0;i<6800;i++){
   const x=rand()*width,y=rand()*height,r=.28+Math.pow(rand(),5)*2.8,a=.1+rand()*.72;
   const tone=rand(),color=tone<.12?"211,229,255":tone<.22?"255,217,181":"224,238,255";
   ctx.fillStyle="rgba("+color+","+a+")";ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();
  }
  const sun=ctx.createRadialGradient(width*.18,height*.27,1,width*.18,height*.27,158);
  sun.addColorStop(0,"rgba(255,249,229,.98)");sun.addColorStop(.035,"rgba(255,224,172,.8)");
  sun.addColorStop(.13,"rgba(255,188,128,.32)");sun.addColorStop(.42,"rgba(125,181,209,.1)");sun.addColorStop(1,"rgba(255,160,90,0)");
  ctx.fillStyle=sun;ctx.fillRect(width*.08,height*.14,320,320);
  const source=new THREE.CanvasTexture(canvas);source.mapping=THREE.EquirectangularReflectionMapping;source.colorSpace=THREE.SRGBColorSpace;
  source.generateMipmaps=true;source.minFilter=THREE.LinearMipmapLinearFilter;
  const pmrem=new THREE.PMREMGenerator(renderer);pmrem.compileEquirectangularShader();
  const target=pmrem.fromEquirectangular(source);
  source.dispose();pmrem.dispose();return target;
}
