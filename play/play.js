import { PLANETS, REGIONS, EVENT_NAMES } from "./region-data.js";
import * as AudioSystem from "./audio.js";
import * as AccountSystem from "./auth.js";
import * as SocialSystem from "./social.js";
import { mountSocialUI } from "./social-ui.js";
import { createPlanetPbrMaps, createPlanetPbrMaterial, createCinematicEnvironment } from "../assets/pbr-surfaces.js?v=pbr-surface-4k-r4";
const THREE_URL="https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js";
const SAVE_KEY="astrospace-campaign-v2";
const WORLDS=PLANETS;
const $=id=>document.getElementById(id),clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),lerp=(a,b,t)=>a+(b-a)*t;
const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
const toast=msg=>{const n=$("toast-message");n.textContent=msg;n.classList.add("visible");clearTimeout(toast.timer);toast.timer=setTimeout(()=>n.classList.remove("visible"),2900);};
const freshSave=()=>({regionCursor:0,taskProgress:{},completedRegions:[],completedPlanets:[],bonusFound:[],unlockedWorlds:["kharon"],flightUnlocked:false,shards:0,currentWorld:"kharon",introSeen:false,discoveries:0});
function loadSave(){try{const raw=localStorage.getItem(SAVE_KEY);if(!raw)return freshSave();const p=JSON.parse(raw),b=freshSave();return {...b,...p,taskProgress:p.taskProgress&&typeof p.taskProgress==="object"?p.taskProgress:{},completedRegions:Array.isArray(p.completedRegions)?p.completedRegions:[],completedPlanets:Array.isArray(p.completedPlanets)?p.completedPlanets:[],bonusFound:Array.isArray(p.bonusFound)?p.bonusFound:[],unlockedWorlds:Array.isArray(p.unlockedWorlds)?p.unlockedWorlds:["kharon"],regionCursor:clamp(Number(p.regionCursor)||0,0,REGIONS.length-1)};}catch{return freshSave();}}
const save=loadSave();
let THREE,scene,camera,renderer,clock,avatar,worldRoot,terrain,skyShell=null,sunLight=null,fillLight=null,frontFillLight=null,worldGlow=null,transitRoot=null,travelSequence=null,relays=[],missionEntities=[],secretEntities=[],activeEventEntities=[],currentRegion=REGIONS[Math.min(save.regionCursor,REGIONS.length-1)],currentWorld=WORLDS.find(w=>w.id===currentRegion.planetId)||WORLDS[0];
let accountSession=null,accountConfigured=false,cloudSaveTimer=null,stepAccumulator=0,eventNextAt=55,eventUntil=0,activeEvent="",audioStarted=false,uiSystems=null,environmentTarget=null,settings={quality:(()=>{try{const q=JSON.parse(localStorage.getItem("astrospace-settings-v2")||"{}").quality;return ["performance","balanced","cinematic","4k","8k"].includes(q)?q:"balanced";}catch{return "balanced";}})(),fov:58,sensitivity:1,invert:false,reducedMotion:false,music:.24,ambience:.22,sfx:.55,subtitles:true,hud:true};
let yaw=0,pitch=.13,cameraDistance=17.5,dragging=false,lastX=0,lastY=0,flightMode=false,velocityY=0,horizontalFlightSpeed=0,jumpVelocity=0,elapsed=0,frame=0;
const keys=new Set(),touchKeys=new Set();

(async function boot(){
 const loader=$("loading-screen");
 let bootStage="loading Three.js";
 try{
  THREE=await import(THREE_URL);
  bootStage="initialising the planetary scene";
  initGame();
  loader.classList.add("loaded");
  setTimeout(()=>loader.remove(),850);
  if(!save.introSeen)$("intro-overlay").hidden=false;
 }catch(error){
  console.error("AstroSpace prologue boot failed during "+bootStage,error);
  startCompatibilityScene(error,bootStage);
  loader?.classList.add("loaded");
  setTimeout(()=>loader?.remove(),650);
 }
})();

function createAdaptiveRenderer(initialCanvas){
 const attempts=[
  {antialias:true,alpha:false,powerPreference:"high-performance"},
  {antialias:false,alpha:false,powerPreference:"default"},
  {antialias:false,alpha:false,powerPreference:"low-power"}
 ];
 let canvas=initialCanvas,lastError;
 for(let i=0;i<attempts.length;i++){
  try{
   return new THREE.WebGLRenderer({canvas,...attempts[i],failIfMajorPerformanceCaveat:false,preserveDrawingBuffer:false});
  }catch(error){
   lastError=error;
   if(i<attempts.length-1){
    const replacement=document.createElement("canvas");
    replacement.id=canvas.id;
    replacement.className=canvas.className;
    replacement.setAttribute("aria-label",canvas.getAttribute("aria-label")||"AstroSpace 3D world");
    canvas.replaceWith(replacement);
    canvas=replacement;
   }
  }
 }
 throw lastError||new Error("No compatible WebGL renderer could be created.");
}

function startCompatibilityScene(error,stage){
 const original=$("game-canvas");
 if(!original?.parentNode)return;
 const canvas=document.createElement("canvas");
 canvas.id="compatibility-canvas";
 canvas.setAttribute("aria-label","AstroSpace compatibility scene");
 original.parentNode.insertBefore(canvas,original);
 original.style.display="none";
 const ctx=canvas.getContext("2d",{alpha:false});
 const panel=$("webgl-error");
 if(panel){
  panel.hidden=false;
  panel.style.top="auto";
  panel.style.bottom="88px";
  panel.style.transform="translateX(-50%)";
  panel.style.padding="12px 18px";
  const heading=panel.querySelector("b"),detail=panel.querySelector("p"),link=panel.querySelector("a");
  if(heading)heading.textContent="2D COMPATIBILITY MODE";
  if(detail)detail.textContent="3D could not start ("+stage+"): "+String(error?.message||error||"unknown error").slice(0,150)+". The scene below is a visual fallback; enable WebGL / hardware acceleration and reload for full gameplay.";
  if(link){link.textContent="RETRY 3D";link.href=window.location.href;}
 }
 if(!ctx)return;
 const stars=Array.from({length:240},(_,i)=>({x:((i*7919)%997)/997,y:((i*3571)%991)/991,r:.35+((i*13)%10)/10,phase:i*.71}));
 let width=0,height=0,dpr=1,frameId=0,previous=0;
 const resize=()=>{
  width=Math.max(1,window.innerWidth);height=Math.max(1,window.innerHeight);
  dpr=Math.min(window.devicePixelRatio||1,1.5);
  canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);
  canvas.style.width=width+"px";canvas.style.height=height+"px";
 };
 const draw=now=>{
  frameId=requestAnimationFrame(draw);
  if(now-previous<30)return;
  previous=now;
  const t=now*.00012,move=(keys.has("KeyA")||touchKeys.has("KeyA")?-1:0)+(keys.has("KeyD")||touchKeys.has("KeyD")?1:0);
  ctx.setTransform(dpr,0,0,dpr,0,0);
  const sky=ctx.createLinearGradient(0,0,0,height);
  sky.addColorStop(0,"#030914");sky.addColorStop(.48,"#0a2637");sky.addColorStop(1,"#102b32");
  ctx.fillStyle=sky;ctx.fillRect(0,0,width,height);
  const glow=ctx.createRadialGradient(width*.57,height*.46,4,width*.57,height*.46,Math.max(width,height)*.58);
  glow.addColorStop(0,"rgba(57,166,169,.25)");glow.addColorStop(1,"rgba(3,9,20,0)");
  ctx.fillStyle=glow;ctx.fillRect(0,0,width,height);
  for(const star of stars){
   const x=((star.x*width+Math.sin(t+star.phase)*8+width)%width);
   const y=star.y*height*.72;
   ctx.globalAlpha=.35+.55*(.5+.5*Math.sin(t*5+star.phase));
   ctx.fillStyle="#d8fbff";ctx.beginPath();ctx.arc(x,y,star.r,0,Math.PI*2);ctx.fill();
  }
  ctx.globalAlpha=1;
  const px=width*.72,py=height*.31,pr=Math.min(width,height)*.105;
  const planet=ctx.createRadialGradient(px-pr*.35,py-pr*.4,pr*.05,px,py,pr);
  planet.addColorStop(0,"#a9e8d4");planet.addColorStop(.48,"#368e91");planet.addColorStop(1,"#102f50");
  ctx.fillStyle=planet;ctx.beginPath();ctx.arc(px,py,pr,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle="rgba(130,240,220,.3)";ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(px,py+pr*.18,pr*1.55,pr*.32,-.2,Math.PI*1.08,Math.PI*1.95);ctx.stroke();
  const horizon=height*.69;
  const ridge=(base,amp,seed,color)=>{
   ctx.beginPath();ctx.moveTo(0,height);
   for(let x=0;x<=width+8;x+=8){const y=base+Math.sin(x*.004+seed+t)*amp+Math.sin(x*.011+seed*2)*amp*.34+Math.sin(x*.0017+seed)*amp*.6;ctx.lineTo(x,y);}
   ctx.lineTo(width,height);ctx.closePath();ctx.fillStyle=color;ctx.fill();
  };
  ridge(horizon-75,52,1,"#173d48");ridge(horizon-25,38,3,"#0c2936");ridge(horizon+20,23,5,"#061923");
  const unitX=width*.5+move*22,unitY=horizon-28;
  ctx.save();ctx.translate(unitX,unitY);
  ctx.shadowColor="#72e9e0";ctx.shadowBlur=18;
  ctx.fillStyle="#9de7df";ctx.fillRect(-10,-39,20,25);
  ctx.fillStyle="#d5f7f0";ctx.fillRect(-7,-34,14,8);
  ctx.shadowBlur=0;ctx.fillStyle="#183b48";ctx.fillRect(-15,-14,30,24);
  ctx.fillStyle="#70d9d0";ctx.fillRect(-18,9,11,19);ctx.fillRect(7,9,11,19);
  ctx.strokeStyle="#8af4e7";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-12,-5);ctx.lineTo(-24,8);ctx.moveTo(12,-5);ctx.lineTo(24,8);ctx.stroke();
  ctx.restore();
  const vignette=ctx.createRadialGradient(width*.5,height*.48,Math.min(width,height)*.2,width*.5,height*.48,Math.max(width,height)*.75);
  vignette.addColorStop(0,"rgba(0,0,0,0)");vignette.addColorStop(1,"rgba(0,4,12,.62)");
  ctx.fillStyle=vignette;ctx.fillRect(0,0,width,height);
 };
 if(!width)resize();
 window.addEventListener("resize",resize,{passive:true});
 if(ctx)draw(0);
}

function initGame(){
 scene=new THREE.Scene();scene.background=new THREE.Color(currentWorld.sky);scene.fog=new THREE.Fog(currentWorld.fog,220,3700);
 camera=new THREE.PerspectiveCamera(settings.fov,1,.1,8500);
 renderer=createAdaptiveRenderer($("game-canvas"));
 renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.02;
 try{environmentTarget=createCinematicEnvironment(THREE,renderer);if(environmentTarget)scene.environment=environmentTarget.texture;}
 catch(error){environmentTarget=null;console.warn("AstroSpace cinematic environment skipped; using direct scene lighting",error);}
 renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));renderer.shadowMap.enabled=settings.quality!=="performance";renderer.shadowMap.type=THREE.PCFSoftShadowMap;clock=new THREE.Clock();
 scene.add(new THREE.HemisphereLight(0xc9e0dc,0x111a1c,.92));
 sunLight=new THREE.DirectionalLight(currentWorld.light,3.3);sunLight.position.set(-180,260,-130);sunLight.castShadow=true;sunLight.shadow.mapSize.set(settings.quality==="cinematic"?4096:settings.quality==="performance"?1024:2048,settings.quality==="cinematic"?4096:settings.quality==="performance"?1024:2048);sunLight.shadow.camera.left=-320;sunLight.shadow.camera.right=320;sunLight.shadow.camera.top=320;sunLight.shadow.camera.bottom=-320;sunLight.shadow.bias=-.00015;scene.add(sunLight);
 fillLight=new THREE.DirectionalLight(currentWorld.accent,1.1);fillLight.position.set(180,85,210);scene.add(fillLight);
 frontFillLight=new THREE.DirectionalLight(currentWorld.palette[3],.58);frontFillLight.position.set(-60,40,180);scene.add(frontFillLight);
 worldGlow=new THREE.PointLight(currentWorld.accent,19,250,2);worldGlow.position.set(0,45,0);scene.add(worldGlow);
 createSky();avatar=createRobot();scene.add(avatar.group);buildWorld(currentWorld.id,false);bindUI();
 uiSystems=mountSocialUI({
  toast,
  getWorld:()=>currentWorld,
  getRegion:()=>currentRegion,
  applyGraphics:(prefs)=>applyGraphicsSettings(prefs),
  onSession:async(session)=>{accountSession=session||null;accountConfigured=!!AccountSystem.getSupabase();if(session){try{const cloud=await AccountSystem.loadCloudProgress();const score=(v)=>((v?.completedRegions?.length||0)*4)+Object.values(v?.taskProgress||{}).filter(t=>t?.complete).length;if(cloud&&score(cloud)>score(save)){Object.assign(save,cloud);save.regionCursor=clamp(Number(save.regionCursor)||0,0,REGIONS.length-1);currentRegion=REGIONS[save.regionCursor];currentWorld=PLANETS.find(w=>w.id===currentRegion.planetId)||PLANETS[0];buildWorld(currentWorld.id,false);toast("CLOUD EXPEDITION RESTORED");}else persist();}catch(error){console.warn("Cloud save not ready",error);}}else{accountSession=null;}},
 });
 resize();
 window.addEventListener("resize",resize);window.addEventListener("keydown",onKeyDown);window.addEventListener("keyup",e=>keys.delete(e.code));window.addEventListener("blur",()=>{keys.clear();touchKeys.clear();});
 $("game-canvas").addEventListener("pointerdown",onPointerDown);window.addEventListener("pointermove",onPointerMove);window.addEventListener("pointerup",()=>dragging=false);
 $("game-canvas").addEventListener("wheel",e=>{e.preventDefault();if(!travelSequence)cameraDistance=clamp(cameraDistance+e.deltaY*.012,10,34);},{passive:false});
 $("begin-button").addEventListener("click",()=>{$("intro-overlay").hidden=true;save.introSeen=true;persist();toast("A.R.I.A. ONLINE // RESTORE THE THREE ANCIENT RELAYS");});
 updateUI();requestAnimationFrame(animate);
}
function bindUI(){
 $("begin-button").addEventListener("click",async()=>{audioStarted=!!await AudioSystem.startAudio();$("intro-overlay").hidden=true;save.introSeen=true;persist();toast("A.R.I.A. ONLINE // "+currentRegion.name+" // COMPLETE THE REGION TO PROCEED");});
 $("atlas-button").addEventListener("click",openAtlas);$("flight-button").addEventListener("click",toggleFlight);
 $("region-button").addEventListener("click",()=>{$("region-overlay").hidden=false;updateRegionMap();});
 $("region-close").addEventListener("click",()=>$("region-overlay").hidden=true);
 $("region-advance").addEventListener("click",advanceRegion);
 $("story-close").addEventListener("click",()=>$("story-modal").hidden=true);
 $("story-continue").addEventListener("click",()=>$("story-modal").hidden=true);
 $("atlas-close").addEventListener("click",()=>$("atlas-overlay").hidden=true);
 $("touch-interact").addEventListener("pointerdown",e=>{e.preventDefault();if(!travelSequence)interact();});
 $("touch-jump").addEventListener("pointerdown",e=>{e.preventDefault();if(travelSequence)return;if(flightMode)keys.add("Space");else jump();});
 $("touch-jump").addEventListener("pointerup",()=>keys.delete("Space"));$("touch-jump").addEventListener("pointercancel",()=>keys.delete("Space"));
 document.querySelectorAll("[data-key]").forEach(b=>{const k=b.dataset.key;b.addEventListener("pointerdown",e=>{e.preventDefault();if(travelSequence)return;touchKeys.add(k);b.setPointerCapture?.(e.pointerId);});const clear=()=>touchKeys.delete(k);b.addEventListener("pointerup",clear);b.addEventListener("pointercancel",clear);b.addEventListener("pointerleave",clear);});
}
function onKeyDown(e){
 if(["INPUT","TEXTAREA"].includes(document.activeElement?.tagName))return;
 if(travelSequence){if(["Space","ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].includes(e.code))e.preventDefault();return;}
 if(["Space","ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].includes(e.code))e.preventDefault();
 if(e.repeat&&["KeyE","KeyF","KeyM","KeyG","KeyJ","KeyR","KeyP"].includes(e.code))return;
 keys.add(e.code);if(e.code==="KeyE")interact();if(e.code==="KeyF")hitBoss();if(e.code==="KeyM")openAtlas();if(e.code==="KeyJ"){$("region-overlay").hidden=!$("region-overlay").hidden;updateRegionMap();}if(e.code==="KeyR")scanPulse();if(e.code==="KeyP")togglePhotoMode();if(e.code==="KeyG")toggleFlight();if(e.code==="Escape"){["atlas-overlay","region-overlay","community-overlay","account-overlay","settings-overlay","story-modal"].forEach(id=>$(id).hidden=true);dragging=false;}if(e.code==="Space"&&!flightMode)jump();
}
function onPointerDown(e){if(travelSequence||e.button!==0)return;dragging=true;lastX=e.clientX;lastY=e.clientY;$("game-canvas").setPointerCapture?.(e.pointerId);}
function onPointerMove(e){if(travelSequence||!dragging)return;const dx=e.clientX-lastX,dy=e.clientY-lastY;lastX=e.clientX;lastY=e.clientY;yaw-=dx*.0037*settings.sensitivity;pitch=clamp(pitch+dy*.0022*settings.sensitivity*(settings.invert?-1:1),-.12,.72);}
function resize(){if(!renderer)return;const w=Math.max(1,innerWidth),h=Math.max(1,innerHeight);renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}
function applyGraphicsSettings(prefs={}){
 const quality=prefs.quality||settings.quality||"balanced";
 const profiles={
  performance:{pixelRatio:1,shadowSize:1024,maxPixels:2400000,exposure:1.04},
  balanced:{pixelRatio:1.35,shadowSize:2048,maxPixels:5200000,exposure:1.06},
  cinematic:{pixelRatio:1.65,shadowSize:4096,maxPixels:9000000,exposure:1.08},
  "4k":{pixelRatio:2.1,shadowSize:4096,maxPixels:12500000,exposure:1.1},
  "8k":{pixelRatio:2.6,shadowSize:4096,maxPixels:18000000,exposure:1.12}
 };
 const profile=profiles[quality]||profiles.balanced;
 settings={...settings,...prefs,quality};
 if(renderer){
  const dpr=window.devicePixelRatio||1;
  const viewportPixels=Math.max(1,window.innerWidth*window.innerHeight);
  const budgetRatio=Math.sqrt(profile.maxPixels/viewportPixels);
  renderer.setPixelRatio(Math.max(1,Math.min(dpr,profile.pixelRatio,budgetRatio)));
  renderer.toneMappingExposure=profile.exposure;
  renderer.shadowMap.enabled=quality!=="performance";
  renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  if(sunLight){sunLight.shadow.mapSize.set(profile.shadowSize,profile.shadowSize);sunLight.shadow.needsUpdate=true;}
  renderer.shadowMap.needsUpdate=true;
  renderer.setSize(Math.max(1,innerWidth),Math.max(1,innerHeight),false);
 }
 if(camera){camera.fov=Number(prefs.fov)||settings.fov||58;camera.updateProjectionMatrix();}
 terrain?.userData?.setGeometryQuality?.(quality);
 void terrain?.userData?.refreshPbr?.(quality);
}
function persist(){try{save.currentWorld=currentWorld.id;localStorage.setItem(SAVE_KEY,JSON.stringify(save));$("save-status").textContent="PROGRESS AUTO-SAVED";if(accountSession){clearTimeout(cloudSaveTimer);cloudSaveTimer=setTimeout(()=>AccountSystem.saveCloudProgress(save).catch(e=>console.warn("Cloud save deferred",e)),1800);}}catch(error){console.warn("Local save unavailable",error);$("save-status").textContent="LOCAL SAVE UNAVAILABLE";}}

function createSky(){
 const count=4200,pos=new Float32Array(count*3),colors=new Float32Array(count*3);
 for(let i=0;i<count;i++){const y=Math.random()*2-1,a=Math.random()*Math.PI*2,r=Math.sqrt(1-y*y)*330;pos[i*3]=Math.cos(a)*r;pos[i*3+1]=y*330;pos[i*3+2]=Math.sin(a)*r;const c=new THREE.Color().setHSL(.48+Math.random()*.16,.28,.63+Math.random()*.32);colors[i*3]=c.r;colors[i*3+1]=c.g;colors[i*3+2]=c.b;}
 const g=new THREE.BufferGeometry();g.setAttribute("position",new THREE.BufferAttribute(pos,3));g.setAttribute("color",new THREE.BufferAttribute(colors,3));
 const stars=new THREE.Points(g,new THREE.PointsMaterial({size:.72,sizeAttenuation:true,vertexColors:true,transparent:true,opacity:.88,depthWrite:false}));
 skyShell=new THREE.Group();
 const dome=new THREE.Mesh(new THREE.SphereGeometry(690,48,32),new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,depthTest:false,vertexShader:'varying float vHeight;void main(){vHeight=normalize(position).y;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',fragmentShader:'varying float vHeight;void main(){float h=smoothstep(-.18,.88,vHeight);vec3 horizon=vec3(.075,.22,.25);vec3 zenith=vec3(.008,.026,.055);vec3 col=mix(horizon,zenith,h);float haze=exp(-pow((vHeight-.02)*8.0,2.0));col+=vec3(.045,.13,.15)*haze;gl_FragColor=vec4(col,1.0);}' }));dome.renderOrder=-1000;dome.frustumCulled=false;skyShell.add(dome,stars);scene.add(skyShell);
 const sunCanvas=document.createElement("canvas");sunCanvas.width=128;sunCanvas.height=128;const sunCtx=sunCanvas.getContext("2d"),sunGrad=sunCtx.createRadialGradient(64,64,2,64,64,63);sunGrad.addColorStop(0,"rgba(230,255,241,.94)");sunGrad.addColorStop(.12,"rgba(132,245,222,.48)");sunGrad.addColorStop(.42,"rgba(92,199,219,.13)");sunGrad.addColorStop(1,"rgba(40,145,190,0)");sunCtx.fillStyle=sunGrad;sunCtx.fillRect(0,0,128,128);const sunSprite=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(sunCanvas),transparent:true,depthWrite:false,blending:THREE.AdditiveBlending}));sunSprite.position.set(-165,132,-310);sunSprite.scale.set(185,185,1);skyShell.add(sunSprite);
 const moon=new THREE.Group();moon.add(new THREE.Mesh(new THREE.SphereGeometry(9,48,36),new THREE.MeshStandardMaterial({color:"#a9c2c6",roughness:1})));moon.position.set(92,68,-190);skyShell.add(moon);
 moon.add(new THREE.Mesh(new THREE.SphereGeometry(10.1,32,24),new THREE.MeshBasicMaterial({color:"#82beca",transparent:true,opacity:.08,side:THREE.BackSide,depthWrite:false})));
}
function createAurora(parent){
 const group=new THREE.Group();
 for(let band=0;band<4;band++){const points=[];for(let i=0;i<=90;i++){const x=-150+i*3.3,z=-185-band*11,y=45+Math.sin(i*.13+band*1.7)*13+Math.sin(i*.037+band)*9;points.push(new THREE.Vector3(x,y,z));}
 const curve=new THREE.CatmullRomCurve3(points);group.add(new THREE.Mesh(new THREE.TubeGeometry(curve,180,.72+band*.16,8,false),new THREE.MeshBasicMaterial({color:band%2?"#64bbac":"#70f4d1",transparent:true,opacity:.18,blending:THREE.AdditiveBlending,depthWrite:false})));
 }parent.add(group);
}

function noise2(x,z,seed){
 const ix=Math.floor(x),iz=Math.floor(z),fx=x-ix,fz=z-iz,sx=fx*fx*(3-2*fx),sz=fz*fz*(3-2*fz);
 const hash=(a,b)=>{const n=Math.sin(a*127.1+b*311.7+seed*71.73)*43758.5453;return n-Math.floor(n);};
 const a=hash(ix,iz),b=hash(ix+1,iz),c=hash(ix,iz+1),d=hash(ix+1,iz+1);return lerp(lerp(a,b,sx),lerp(c,d,sx),sz);
}
function fbm2(x,z,seed){let v=0,amp=.52,norm=0;for(let i=0;i<5;i++){v+=noise2(x,z,seed+i*17)*amp;norm+=amp;x=x*2.03+13.7;z=z*2.03-7.1;amp*=.49;}return v/norm;}
function terrainHeight(x,z,w){
 const continental=fbm2(x*.00175,z*.00175,w.seed+3);
 const rolling=fbm2(x*.0058+11,z*.0058-7,w.seed+19);
 const fine=fbm2(x*.018+31,z*.018-17,w.seed+47);
 const ridge=1-Math.abs(rolling*2-1);
 const detail=fine-.5;
 let h=(continental-.5)*48+(rolling-.5)*22+(ridge-.52)*9+detail*3;
 if(w.terrain===0){
  h=(continental-.5)*58+(rolling-.5)*28+(ridge-.54)*8+detail*2.4;
 }else if(w.terrain===1){
  h=(continental-.5)*28+(rolling-.5)*18+(ridge-.56)*5+detail*1.4;
 }else if(w.terrain===2){
  const volcanicRidge=Math.pow(Math.max(0,ridge-.24),1.35);
  h=(continental-.5)*54+(rolling-.5)*26+volcanicRidge*27+detail*2.8;
 }else if(w.terrain===3){
  h=(continental-.5)*64+(rolling-.5)*34+(ridge-.45)*22+detail*3.2;
 }else if(w.terrain===4){
  h=(continental-.5)*34+(rolling-.5)*20+(ridge-.5)*12+detail*1.8;
 }else if(w.terrain===5){
  h=(continental-.5)*44+(rolling-.5)*25+(ridge-.47)*16+detail*2.2;
 }
 const spawnBlend=smooth(24,220,Math.hypot(x,z));
 return lerp(-1.2,h,spawnBlend);
}
function deterministic(i,seed){const n=Math.sin(i*127.1+seed*311.7)*43758.5453;return n-Math.floor(n);}
function createTerrainChunk(w,material,cx,cz,size=900,segments=128){
 const geo=new THREE.PlaneGeometry(size,size,segments,segments);geo.rotateX(-Math.PI/2);const pos=geo.attributes.position;
 for(let i=0;i<pos.count;i++)pos.setY(i,terrainHeight(pos.getX(i)+cx,pos.getZ(i)+cz,w));
 pos.needsUpdate=true;geo.computeVertexNormals();
 const mesh=new THREE.Mesh(geo,material);mesh.position.set(cx,0,cz);mesh.receiveShadow=true;mesh.userData.chunkCenter={x:cx,z:cz};return mesh;
}
function updateTerrainChunk(mesh,w,cx,cz){const old=mesh.userData.chunkCenter;if(old&&old.x===cx&&old.z===cz)return;const p=mesh.geometry.attributes.position;for(let i=0;i<p.count;i++)p.setY(i,terrainHeight(p.getX(i)+cx,p.getZ(i)+cz,w));p.needsUpdate=true;mesh.geometry.computeVertexNormals();mesh.position.set(cx,0,cz);mesh.userData.chunkCenter={x:cx,z:cz};}
function createTerrain(w){
 const group=new THREE.Group(),size=900,chunks=[];
 let currentMaps=null,currentMaterial=new THREE.MeshPhysicalMaterial({color:w.palette[0],roughness:.96,metalness:.012}),generation=0,currentQuality=null,pendingQuality=null,pendingPromise=null;
 const segmentsFor=quality=>({performance:128,balanced:224,cinematic:320,"4k":384,"8k":448}[quality]||224);
 let currentSegments=segmentsFor(settings.quality);
 for(let z=-1;z<=1;z++)for(let x=-1;x<=1;x++){const mesh=createTerrainChunk(w,currentMaterial,x*size,z*size,size,currentSegments);group.add(mesh);chunks.push(mesh);}
 group.userData.setGeometryQuality=quality=>{
  const nextSegments=segmentsFor(quality);
  if(nextSegments===currentSegments)return;
  for(const mesh of chunks){
   const oldGeometry=mesh.geometry,center=mesh.userData.chunkCenter||{x:mesh.position.x,z:mesh.position.z};
   const replacement=createTerrainChunk(w,currentMaterial,center.x,center.z,size,nextSegments);
   mesh.geometry=replacement.geometry;
   replacement.geometry=oldGeometry;
   replacement.geometry.dispose();
   mesh.userData.chunkCenter={x:center.x,z:center.z};
  }
  currentSegments=nextSegments;
 };
 group.userData.refreshPbr=(quality=settings.quality)=>{
  if(currentMaps&&currentQuality===quality)return Promise.resolve();
  if(pendingPromise&&pendingQuality===quality)return pendingPromise;
  const request=++generation;pendingQuality=quality;
  const status=$("texture-quality-status");
  if(status)status.textContent="SURFACE MAPS // SYNTHESIZING "+quality.toUpperCase();
  const task=(async()=>{
   let maps;
   try{
    maps=await createPlanetPbrMaps(THREE,renderer,w,{
     quality,aspect:"tile",repeatX:16,repeatY:16,
     onProgress:value=>{if(status&&request===generation&&value<1)status.textContent="SURFACE MAPS // "+Math.round(value*100)+"% // "+quality.toUpperCase();},
     shouldCancel:()=>request!==generation||terrain!==group||currentWorld.id!==w.id
    });
   }catch(error){
    console.warn("Terrain PBR maps deferred",w.id,error);
    if(status&&request===generation)status.textContent="SURFACE MAPS // FALLBACK MATERIAL";
    return;
   }
   if(!maps||request!==generation||terrain!==group||currentWorld.id!==w.id){maps?.dispose();return;}
   const nextMaterial=createPlanetPbrMaterial(THREE,maps,w,{surface:"terrain"});
   chunks.forEach(mesh=>{mesh.material=nextMaterial;});
   const oldMaterial=currentMaterial,oldMaps=currentMaps;currentMaterial=nextMaterial;currentMaps=maps;currentQuality=quality;
   if(status)status.textContent="SURFACE MAPS // "+maps.width+"×"+maps.height+" // "+quality.toUpperCase()+" PROFILE";
   oldMaterial?.dispose();oldMaps?.dispose();
  })().finally(()=>{
   if(pendingPromise===task){pendingPromise=null;pendingQuality=null;}
  });
  pendingPromise=task;
  return task;
 };
 group.userData.disposePbr=()=>{generation++;currentMaps?.dispose();currentMaps=null;currentQuality=null;};
 let baseX=0,baseZ=0;group.userData.updateAround=(x,z)=>{const bx=Math.floor(x/size)*size,bz=Math.floor(z/size)*size;if(bx===baseX&&bz===baseZ)return;baseX=bx;baseZ=bz;let i=0;for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++)updateTerrainChunk(chunks[i++],w,bx+dx*size,bz+dz*size);};
 void group.userData.refreshPbr(settings.quality);
 return group;
}
function createMountainRidge(w,originX=0,originZ=0){
 const group=new THREE.Group(),count=76,dummy=new THREE.Object3D();
 const geometry=new THREE.ConeGeometry(1,1,18,5),position=geometry.attributes.position;
 for(let i=0;i<position.count;i++){
  const x=position.getX(i),y=position.getY(i),z=position.getZ(i),variation=1+.075*Math.sin(x*17.3+z*11.7+y*7.1);
  position.setXYZ(i,x*variation,y,z*variation);
 }
 geometry.computeVertexNormals();
 const material=new THREE.MeshStandardMaterial({color:"#ffffff",roughness:.96,metalness:.015,vertexColors:true});
 const peaks=new THREE.InstancedMesh(geometry,material,count);
 for(let i=0;i<count;i++){
  const a=i/count*Math.PI*2+deterministic(i+3,w.seed)*.055;
  const r=2180+deterministic(i,w.seed)*720,x=Math.cos(a)*r,z=Math.sin(a)*r;
  const h=180+deterministic(i+82,w.seed)*310,width=105+deterministic(i+17,w.seed)*205;
  const ground=terrainHeight(x+originX,z+originZ,w);
  dummy.position.set(x,ground+h*.49,z);
  dummy.rotation.set((deterministic(i+5,13)-.5)*.12,deterministic(i+9,17)*Math.PI*2,(deterministic(i+7,19)-.5)*.12);
  dummy.scale.set(width,h,width*(.62+deterministic(i+11,23)*.5));
  dummy.updateMatrix();peaks.setMatrixAt(i,dummy.matrix);
  const rockTone=new THREE.Color(w.palette[0]).lerp(new THREE.Color(w.palette[1]),.12+deterministic(i+21,w.seed)*.25);
  peaks.setColorAt(i,rockTone);
 }
 peaks.instanceMatrix.needsUpdate=true;peaks.castShadow=true;peaks.receiveShadow=true;group.add(peaks);
 return group;
}
function createWorldDecor(w,originX=0,originZ=0){
 const group=new THREE.Group(),dummy=new THREE.Object3D();
 const rockCount=({performance:120,balanced:190,cinematic:250,"4k":310,"8k":360}[settings.quality]||190);
 const rockGeo=new THREE.IcosahedronGeometry(1,4),rockPos=rockGeo.attributes.position;for(let v=0;v<rockPos.count;v++){const q=rockPos.getX(v)*7.13+rockPos.getY(v)*11.7+rockPos.getZ(v)*4.3;rockPos.setXYZ(v,rockPos.getX(v)*(1+.065*Math.sin(q)),rockPos.getY(v)*(1+.045*Math.cos(q*1.27)),rockPos.getZ(v)*(1+.055*Math.sin(q*.83)));}rockGeo.computeVertexNormals();const rocks=new THREE.InstancedMesh(rockGeo,new THREE.MeshStandardMaterial({color:w.palette[1],roughness:.88,metalness:.025}),rockCount);
 for(let i=0;i<rockCount;i++){
  const a=deterministic(i,w.seed)*Math.PI*2,r=140+deterministic(i+37,w.seed)*1180,x=Math.cos(a)*r,z=Math.sin(a)*r,y=terrainHeight(x+originX,z+originZ,w);
  const sx=4+deterministic(i+71,w.seed)*18,sy=3+deterministic(i+81,w.seed)*14,sz=4+deterministic(i+91,w.seed)*18;
  dummy.position.set(x,y+sy*.28,z);dummy.rotation.set(deterministic(i+3,8)*2,deterministic(i+4,9)*4,deterministic(i+5,7)*2);dummy.scale.set(sx,sy,sz);dummy.updateMatrix();rocks.setMatrixAt(i,dummy.matrix);rocks.setColorAt(i,new THREE.Color(w.palette[1]).lerp(new THREE.Color(w.palette[2]),deterministic(i+119,w.seed)*.28));
 }
 rocks.castShadow=true;rocks.receiveShadow=true;group.add(rocks);
 if(w.terrain===0){
  const density={performance:.58,balanced:1,cinematic:1.28,"4k":1.48,"8k":1.7}[settings.quality]||1;
  const treeCount=Math.round(172*density),groveCount=16;
  const trunkGeo=new THREE.CylinderGeometry(.18,.42,1,12,2);
  const trunkMat=new THREE.MeshStandardMaterial({color:"#5b4636",roughness:.94});
  const trunks=new THREE.InstancedMesh(trunkGeo,trunkMat,treeCount);
  const branchCount=treeCount*3,branchGeo=new THREE.CylinderGeometry(.07,.19,1,8,1);
  const branchMat=new THREE.MeshStandardMaterial({color:"#6a513b",roughness:.94});
  const branches=new THREE.InstancedMesh(branchGeo,branchMat,branchCount);
  const crownGeo=new THREE.IcosahedronGeometry(1,2),crownPos=crownGeo.attributes.position;
  for(let v=0;v<crownPos.count;v++){
   const x=crownPos.getX(v),y=crownPos.getY(v),z=crownPos.getZ(v);
   const n=1+.075*Math.sin(x*8.7+y*5.9+z*10.3)+.035*Math.cos(y*13.1-z*6.7);
   crownPos.setXYZ(v,x*n,y*n,z*n);
  }
  crownGeo.computeVertexNormals();
  const crownMat=new THREE.MeshStandardMaterial({color:"#ffffff",roughness:.92,metalness:.005});
  const crowns=new THREE.InstancedMesh(crownGeo,crownMat,treeCount*5);
  let crownIndex=0,branchIndex=0;
  const leafPalette=["#174f3d","#216747","#2b7950","#39865a","#4b9560","#276e55"];
  const grovePoint=(grove)=>{
   const a=deterministic(grove+9,w.seed+44)*Math.PI*2,r=300+deterministic(grove+51,w.seed)*810;
   return {x:Math.cos(a)*r,z:Math.sin(a)*r};
  };
  for(let i=0;i<treeCount;i++){
   const grove=grovePoint(i%groveCount),angle=deterministic(i+12,w.seed+44)*Math.PI*2;
   const localRadius=Math.sqrt(deterministic(i+42,w.seed+44))*118;
   const x=grove.x+Math.cos(angle)*localRadius,z=grove.z+Math.sin(angle)*localRadius;
   const h=terrainHeight(x+originX,z+originZ,w);
   const treeH=27+deterministic(i+76,w.seed)*39,crownSize=10+deterministic(i+81,w.seed)*16;
   dummy.position.set(x,h+treeH*.5,z);
   dummy.rotation.set(0,deterministic(i+3,w.seed)*Math.PI*2,(deterministic(i+5,7)-.5)*.07);
   dummy.scale.set(.72+deterministic(i+91,w.seed)*.32,treeH,.72+deterministic(i+93,w.seed)*.32);
   dummy.updateMatrix();trunks.setMatrixAt(i,dummy.matrix);
   const shade=new THREE.Color(leafPalette[i%leafPalette.length]);
   const crownParts=[
    [0,treeH+.2,0,crownSize*1.32,crownSize*.92,crownSize*1.2],
    [-crownSize*.72,treeH*.83,crownSize*.2,crownSize*.82,crownSize*.78,crownSize*.9],
    [crownSize*.68,treeH*.86,-crownSize*.22,crownSize*.9,crownSize*.84,crownSize*.88],
    [-crownSize*.18,treeH*1.12,-crownSize*.58,crownSize*.84,crownSize*.92,crownSize*.82],
    [crownSize*.22,treeH*1.1,crownSize*.58,crownSize*.82,crownSize*.88,crownSize*.85]
   ];
   for(let part=0;part<crownParts.length;part++){
    const p=crownParts[part];
    dummy.position.set(x+p[0],h+p[1],z+p[2]);
    dummy.rotation.set((deterministic(crownIndex+5,9)-.5)*.2,deterministic(crownIndex+8,7)*Math.PI*2,(deterministic(crownIndex+3,5)-.5)*.2);
    dummy.scale.set(p[3],p[4],p[5]);dummy.updateMatrix();crowns.setMatrixAt(crownIndex,dummy.matrix);
    crowns.setColorAt(crownIndex,shade.clone().multiplyScalar(.84+deterministic(crownIndex+13,12)*.28));
    crownIndex++;
   }
   for(let side=0;side<3;side++){
    const angle2=angle+side*Math.PI*2/3+Math.PI*.2,reach=crownSize*(.48+deterministic(i+side+61,w.seed)*.22);
    dummy.position.set(x+Math.cos(angle2)*reach*.42,h+treeH*(.58+side*.055),z+Math.sin(angle2)*reach*.42);
    dummy.rotation.set(Math.cos(angle2)*.72,angle2,-Math.sin(angle2)*.72);
    dummy.scale.set(.7,treeH*(.22+deterministic(i+side+71,w.seed)*.08),.7);
    dummy.updateMatrix();branches.setMatrixAt(branchIndex++,dummy.matrix);
   }
  }
  trunks.instanceMatrix.needsUpdate=true;branches.instanceMatrix.needsUpdate=true;crowns.instanceMatrix.needsUpdate=true;
  if(trunks.instanceColor)trunks.instanceColor.needsUpdate=true;if(branches.instanceColor)branches.instanceColor.needsUpdate=true;if(crowns.instanceColor)crowns.instanceColor.needsUpdate=true;
  trunks.castShadow=true;trunks.receiveShadow=true;branches.castShadow=true;branches.receiveShadow=true;
  crowns.castShadow=true;crowns.receiveShadow=true;
  group.add(trunks,branches,crowns);

  const bushCount=Math.round(132*density);
  const bushGeo=new THREE.IcosahedronGeometry(1,2),bushPos=bushGeo.attributes.position;
  for(let i=0;i<bushPos.count;i++){
   const x=bushPos.getX(i),y=bushPos.getY(i),z=bushPos.getZ(i),n=1+.12*Math.sin(x*9+y*7+z*11);
   bushPos.setXYZ(i,x*n,y*n,z*n);
  }
  bushGeo.computeVertexNormals();
  const bushMat=new THREE.MeshStandardMaterial({color:"#ffffff",roughness:.98,vertexColors:true});
  const bushes=new THREE.InstancedMesh(bushGeo,bushMat,bushCount);
  for(let i=0;i<bushCount;i++){
   const a=deterministic(i+23,w.seed+61)*Math.PI*2,r=90+deterministic(i+43,w.seed+61)*1080;
   const x=Math.cos(a)*r,z=Math.sin(a)*r,y=terrainHeight(x+originX,z+originZ,w),scale=2.8+deterministic(i+53,w.seed)*5.5;
   dummy.position.set(x,y+scale*.42,z);dummy.rotation.set(.1,deterministic(i+63,w.seed)*Math.PI*2,.1);
   dummy.scale.set(scale*1.2,scale*.72,scale);dummy.updateMatrix();bushes.setMatrixAt(i,dummy.matrix);
   bushes.setColorAt(i,new THREE.Color(leafPalette[i%leafPalette.length]));
  }
  bushes.instanceMatrix.needsUpdate=true;if(bushes.instanceColor)bushes.instanceColor.needsUpdate=true;bushes.castShadow=true;group.add(bushes);

  const sporeCount=Math.round(120*density),spores=new THREE.InstancedMesh(
   new THREE.IcosahedronGeometry(1.6,1),
   new THREE.MeshStandardMaterial({color:"#b6ffd9",emissive:"#3bdc9c",emissiveIntensity:.6,roughness:.35}),
   sporeCount
  );
  for(let i=0;i<sporeCount;i++){
   const a=deterministic(i+9,w.seed)*Math.PI*2,r=95+deterministic(i+11,w.seed)*1050;
   const x=Math.cos(a)*r,z=Math.sin(a)*r,h=terrainHeight(x+originX,z+originZ,w),scale=.52+deterministic(i+81,w.seed)*.85;
   dummy.position.set(x,h+1.2+scale,z);dummy.rotation.set(0,deterministic(i,1)*6,0);dummy.scale.setScalar(scale);
   dummy.updateMatrix();spores.setMatrixAt(i,dummy.matrix);
  }
  spores.instanceMatrix.needsUpdate=true;group.add(spores);

  // A shallow, terrain-conforming river replaces the elevated tube that looked like a floating pipe.
  const riverPositions=[],riverUvs=[],riverIndices=[],riverSamples=180;
  for(let i=0;i<=riverSamples;i++){
   const u=i/riverSamples,x=-660+u*1320,z=430+Math.sin(u*7.8)*58+Math.sin(u*15.2)*21;
   const prevU=Math.max(0,u-.002),nextU=Math.min(1,u+.002);
   const prevZ=430+Math.sin(prevU*7.8)*58+Math.sin(prevU*15.2)*21;
   const nextZ=430+Math.sin(nextU*7.8)*58+Math.sin(nextU*15.2)*21;
   const tx=(nextU-prevU)*1320,tz=nextZ-prevZ,len=Math.hypot(tx,tz)||1,nx=-tz/len,nz=tx/len;
   const width=7.2+Math.sin(u*Math.PI*8)*1.8,baseY=terrainHeight(x+originX,z+originZ,w)+.48;
   riverPositions.push(x+nx*width,baseY,z+nz*width,x-nx*width,baseY,z-nz*width);
   riverUvs.push(0,u*9,1,u*9);
   if(i<riverSamples){const a=i*2;riverIndices.push(a,a+1,a+2,a+1,a+3,a+2);}
  }
  const riverGeo=new THREE.BufferGeometry();
  riverGeo.setAttribute("position",new THREE.Float32BufferAttribute(riverPositions,3));
  riverGeo.setAttribute("uv",new THREE.Float32BufferAttribute(riverUvs,2));
  riverGeo.setIndex(riverIndices);riverGeo.computeVertexNormals();
  const river=new THREE.Mesh(riverGeo,new THREE.MeshPhysicalMaterial({
   color:"#227c82",roughness:.16,metalness:.08,clearcoat:1,clearcoatRoughness:.04,
   envMapIntensity:1.15,emissive:"#07353a",emissiveIntensity:.08,side:THREE.DoubleSide
  }));
  river.receiveShadow=true;group.add(river);

  const bladePositions=[
   -.16,0,0,.16,0,0,-.105,.52,.06,.105,.52,.06,0,1,.16
  ];
  const bladeGeo=new THREE.BufferGeometry();
  bladeGeo.setAttribute("position",new THREE.Float32BufferAttribute(bladePositions,3));
  bladeGeo.setAttribute("uv",new THREE.Float32BufferAttribute([0,0,1,0,.16,.54,.84,.54,.5,1],2));
  bladeGeo.setIndex([0,1,2,1,3,2,2,3,4,3,4,2]);bladeGeo.computeVertexNormals();
  const grassCount=Math.round(10500*density);
  const grassMat=new THREE.MeshStandardMaterial({color:"#ffffff",roughness:.98,vertexColors:true,side:THREE.DoubleSide});
  const grass=new THREE.InstancedMesh(bladeGeo,grassMat,grassCount);
  const patchCount=24,grassPalette=["#285f44","#397d50","#4d965e","#79a968","#a2bd79"];
  for(let i=0;i<grassCount;i++){
   const patch=i%patchCount,pa=deterministic(patch+91,w.seed+92)*Math.PI*2,pr=180+deterministic(patch+31,w.seed+92)*1030;
   const pcx=Math.cos(pa)*pr,pcz=Math.sin(pa)*pr,angle=deterministic(i+7,w.seed+92)*Math.PI*2;
   const localR=Math.sqrt(deterministic(i+31,w.seed+92))*95;
   const x=pcx+Math.cos(angle)*localR,z=pcz+Math.sin(angle)*localR,y=terrainHeight(x+originX,z+originZ,w);
   const h=.8+deterministic(i+57,w.seed)*2.2,width=.62+deterministic(i+22,w.seed)*.75;
   dummy.position.set(x,y+.06,z);dummy.rotation.set((deterministic(i+8,w.seed)-.5)*.13,deterministic(i+12,w.seed)*Math.PI*2,(deterministic(i+16,w.seed)-.5)*.16);
   dummy.scale.set(width,h,width);dummy.updateMatrix();grass.setMatrixAt(i,dummy.matrix);
   grass.setColorAt(i,new THREE.Color(grassPalette[i%grassPalette.length]).multiplyScalar(.84+deterministic(i+72,w.seed)*.28));
  }
  grass.instanceMatrix.needsUpdate=true;if(grass.instanceColor)grass.instanceColor.needsUpdate=true;grass.castShadow=false;grass.receiveShadow=false;group.add(grass);

  const bloomCount=Math.round(260*density),blooms=new THREE.InstancedMesh(
   new THREE.IcosahedronGeometry(.32,1),
   new THREE.MeshStandardMaterial({color:"#e3ffd0",emissive:"#97df9e",emissiveIntensity:.36,roughness:.36}),
   bloomCount
  );
  for(let i=0;i<bloomCount;i++){
   const a=deterministic(i+17,w.seed+82)*Math.PI*2,r=70+deterministic(i+71,w.seed+82)*1080;
   const x=Math.cos(a)*r,z=Math.sin(a)*r,y=terrainHeight(x+originX,z+originZ,w);
   dummy.position.set(x,y+.55,z);dummy.rotation.set(0,deterministic(i+23,w.seed)*6.28,0);
   dummy.scale.setScalar(.65+deterministic(i+29,w.seed)*.9);dummy.updateMatrix();blooms.setMatrixAt(i,dummy.matrix);
  }
  blooms.instanceMatrix.needsUpdate=true;group.add(blooms);
 }else{
  let geometry,count=72,scale=1;
  if(w.terrain===1){geometry=new THREE.ConeGeometry(.55,2.6,6);count=92;scale=1.15;}
  else if(w.terrain===2){geometry=new THREE.ConeGeometry(.9,6.6,7);count=64;scale=1.4;}
  else if(w.terrain===3){geometry=new THREE.IcosahedronGeometry(1.2,1);count=86;scale=1.35;}
  else if(w.terrain===4){geometry=new THREE.DodecahedronGeometry(1.6,1);count=56;scale=1.4;}
  else{geometry=new THREE.OctahedronGeometry(1.15,1);count=82;scale=1.25;}
  const mat=new THREE.MeshStandardMaterial({color:w.accent,roughness:w.terrain===5?.22:.58,metalness:w.terrain===5?.32:.16,emissive:w.accent,emissiveIntensity:w.terrain===2?.48:.12});
  const features=new THREE.InstancedMesh(geometry,mat,count);
  for(let i=0;i<count;i++){
   const a=deterministic(i+12,w.seed+44)*Math.PI*2,r=34+deterministic(i+42,w.seed+44)*102,x=Math.cos(a)*r,z=Math.sin(a)*r,h=terrainHeight(x+originX,z+originZ,w),s=(.6+deterministic(i+76,w.seed)*1.5)*scale;
   if(w.terrain===3||w.terrain===4){dummy.position.set(x,h+5+deterministic(i+22,w.seed)*13,z);dummy.rotation.set(deterministic(i+9,w.seed)*1.5,deterministic(i+4,w.seed)*4,deterministic(i+6,w.seed)*1.5);}
   else{dummy.position.set(x,h+s*1.2,z);dummy.rotation.set(0,deterministic(i+4,w.seed)*6.28,(deterministic(i+7,w.seed)-.5)*.25);}
   dummy.scale.set(s,s*(.65+deterministic(i+7,w.seed)*1.35),s);dummy.updateMatrix();features.setMatrixAt(i,dummy.matrix);
  }
  features.castShadow=true;features.receiveShadow=true;group.add(features);
  if(w.terrain===1){
   const reefCount=82,reefLights=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(.28,1),new THREE.MeshStandardMaterial({color:"#a5fff0",emissive:"#42e7ce",emissiveIntensity:1.4,roughness:.2}),reefCount);
   for(let i=0;i<reefCount;i++){const a=deterministic(i+9,w.seed)*Math.PI*2,r=18+deterministic(i+11,w.seed)*112,x=Math.cos(a)*r,z=Math.sin(a)*r,h=terrainHeight(x+originX,z+originZ,w);dummy.position.set(x,h+.24,z);dummy.scale.setScalar(.45+deterministic(i+81,w.seed)*.55);dummy.updateMatrix();reefLights.setMatrixAt(i,dummy.matrix);}
   group.add(reefLights);
  }
 }
 if(w.terrain===2){
  const lm=new THREE.MeshBasicMaterial({color:"#ff7138",transparent:true,opacity:.5});
  for(let i=0;i<9;i++){const x=(deterministic(i,9)-.5)*145,z=(deterministic(i,99)-.5)*145,h=terrainHeight(x+originX,z+originZ,w),stream=new THREE.Mesh(new THREE.CylinderGeometry(.12,.26,9+deterministic(i,8)*15,8),lm);stream.position.set(x,h+.12,z);stream.rotation.z=(deterministic(i,7)-.5)*.4;group.add(stream);}
 }
 if(w.terrain===5){
  const cm=new THREE.MeshPhysicalMaterial({color:"#d5fbff",roughness:.12,metalness:.16,clearcoat:1,clearcoatRoughness:.08,iridescence:.28,iridescenceIOR:1.32,emissive:"#42c9f2",emissiveIntensity:.42});
  for(let i=0;i<24;i++){const x=(deterministic(i,73)-.5)*150,z=(deterministic(i,127)-.5)*150,h=terrainHeight(x+originX,z+originZ,w),height=4+deterministic(i,18)*10,crystal=new THREE.Mesh(new THREE.IcosahedronGeometry(.7,2),cm);crystal.position.set(x,h+height*.43,z);crystal.scale.set(.8,height,.8);crystal.rotation.y=deterministic(i,4)*3.14;crystal.castShadow=true;group.add(crystal);}
 }
 if(w.terrain===4){
  const cm=new THREE.MeshStandardMaterial({color:"#e5c6a3",transparent:true,opacity:.45,roughness:1});
  for(let i=0;i<22;i++){const x=(deterministic(i,44)-.5)*180,z=(deterministic(i,84)-.5)*160,cloud=new THREE.Mesh(new THREE.SphereGeometry(6+deterministic(i,34)*8,16,12),cm);cloud.position.set(x,8+deterministic(i,54)*13,z);cloud.scale.set(1.7,.35,1);group.add(cloud);}
 }
 const cloudCount=({performance:30,balanced:52,cinematic:78,"4k":96,"8k":112}[settings.quality]||52),cloudGeo=new THREE.SphereGeometry(1,24,16),cloudMat=new THREE.MeshPhysicalMaterial({color:"#d8eee7",roughness:1,metalness:0,transparent:true,opacity:w.terrain===0?.14:.1,depthWrite:false});
 const horizonClouds=new THREE.InstancedMesh(cloudGeo,cloudMat,cloudCount),cloudDummy=new THREE.Object3D();
 for(let i=0;i<cloudCount;i++){const a=deterministic(i+61,w.seed+8)*Math.PI*2,r=360+deterministic(i+31,w.seed+8)*940,x=Math.cos(a)*r,z=Math.sin(a)*r,y=116+deterministic(i+41,w.seed+8)*122,sz=24+deterministic(i+51,w.seed+8)*62;cloudDummy.position.set(x,y,z);cloudDummy.rotation.y=a;cloudDummy.scale.set(sz*1.85,sz*.22,sz*.85);cloudDummy.updateMatrix();horizonClouds.setMatrixAt(i,cloudDummy.matrix);horizonClouds.setColorAt(i,new THREE.Color(w.palette[3]).lerp(new THREE.Color("#eaf8ed"),.55));}
 horizonClouds.instanceMatrix.needsUpdate=true;horizonClouds.castShadow=false;horizonClouds.receiveShadow=false;group.add(horizonClouds);
 return group;
}
function makePylon(index,x,z,label,accent){
 const group=new THREE.Group(),metal=new THREE.MeshStandardMaterial({color:"#29444c",metalness:.74,roughness:.27}),glowMat=new THREE.MeshStandardMaterial({color:accent,emissive:accent,emissiveIntensity:2.4,metalness:.15,roughness:.22});
 const add=(geo,mat,px,py,pz)=>{const m=new THREE.Mesh(geo,mat);m.position.set(px,py,pz);m.castShadow=true;group.add(m);return m;};
 add(new THREE.CylinderGeometry(2.5,3.2,.9,36,1),metal,0,.45,0);
 const collar=add(new THREE.TorusGeometry(2.2,.12,10,48),glowMat,0,1,0);collar.rotation.x=Math.PI/2;
 add(new THREE.CylinderGeometry(.48,.92,4.5,28,1),metal,0,3.1,0);
 const crown=add(new THREE.IcosahedronGeometry(1.05,3),glowMat,0,5.55,0);crown.rotation.y=.3;
 const r1=add(new THREE.TorusGeometry(1.55,.055,8,48),glowMat,0,4.1,0);r1.rotation.x=Math.PI/2;
 const r2=add(new THREE.TorusGeometry(1.12,.055,12,72),glowMat,0,6.6,0);r2.rotation.x=Math.PI/2;
 for(let side=0;side<4;side++){const angle=side*Math.PI/2,strip=add(new THREE.BoxGeometry(.075,3.05,.12),glowMat,Math.cos(angle)*.56,3.05,Math.sin(angle)*.56);strip.rotation.y=-angle;}
 const neckRing=add(new THREE.TorusGeometry(.72,.065,12,64),metal,0,4.92,0);neckRing.rotation.x=Math.PI/2;
 const beam=add(new THREE.CylinderGeometry(.1,.7,42,24,1,true),new THREE.MeshBasicMaterial({color:accent,transparent:true,opacity:.075,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending}),0,18,0);
 const light=new THREE.PointLight(accent,16,28,2);light.position.y=5.6;group.add(light);
 group.position.set(x,terrainHeight(x,z,currentWorld),z);group.userData={id:index,label:label,active:false,light:light,glowMat:glowMat,beam:beam};return group;
}
function activatePylon(p){
 p.userData.active=true;p.userData.glowMat.emissiveIntensity=4.4;p.userData.light.intensity=31;p.userData.beam.material.opacity=.21;
 const ring=new THREE.Mesh(new THREE.TorusGeometry(3.1,.055,8,72),new THREE.MeshBasicMaterial({color:"#b8fff0",transparent:true,opacity:.82}));ring.rotation.x=Math.PI/2;ring.position.y=.22;p.add(ring);
}
function createRegionalLandmark(region){
 const group=new THREE.Group(),cx=region.center.x,cz=region.center.z,seed=region.seed;
 const palette=region.planetPalette.map(c=>new THREE.Color(c)),accent=new THREE.Color(currentWorld.accent);
 const stone=new THREE.MeshStandardMaterial({color:palette[0].clone().lerp(palette[1],.34),roughness:.96,metalness:.015});
 const worn=new THREE.MeshStandardMaterial({color:palette[1],roughness:.88,metalness:.045});
 const alloy=new THREE.MeshStandardMaterial({color:"#394c50",roughness:.61,metalness:.48});
 const rune=new THREE.MeshStandardMaterial({color:accent,emissive:accent,emissiveIntensity:.55,roughness:.62,metalness:.12});
 const wet=new THREE.MeshPhysicalMaterial({color:palette[2],roughness:.23,metalness:.12,clearcoat:.62,clearcoatRoughness:.28,transparent:true,opacity:.78});
 const add=(geo,mat,x,y,z,rx=0,ry=0,rz=0,sx=1,sy=1,sz=1)=>{const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.rotation.set(rx,ry,rz);m.scale.set(sx,sy,sz);m.castShadow=true;m.receiveShadow=true;group.add(m);return m;};
 // A broad, chipped stone forecourt anchors every ruin and provides scale.
 add(new THREE.CylinderGeometry(118,126,10,12),stone,0,5,0,0,region.regionIndex*.21);
 for(let i=0;i<7;i++){
  const a=i/7*Math.PI*2,r=110,x=Math.cos(a)*r,z=Math.sin(a)*r;
  const h=22+deterministic(i,seed)*20;
  add(new THREE.BoxGeometry(18,h,18),worn,x,h/2,z,deterministic(i+2,seed)*.08,a,deterministic(i+4,seed)*.08,1,1+deterministic(i+6,seed)*.3,1);
 }
 // A broken, monumental gate: chipped supports, iron clamps and a weathered lintel.
 for(const side of [-1,1]){
  add(new THREE.CylinderGeometry(7.2,9.4,88,9,1),stone,side*48,49,0,0,side*.035,side*.04);
  add(new THREE.CylinderGeometry(9.6,9.6,4,10),worn,side*48,18,0);
  add(new THREE.CylinderGeometry(10.2,10.2,5,10),worn,side*48,82,0);
  add(new THREE.BoxGeometry(23,5,8),alloy,side*48,55,8,0,0,side*.1);
 }
 add(new THREE.BoxGeometry(117,13,25),stone,0,91,0,0,0,region.regionIndex%2?.13:-.08);
 add(new THREE.TorusGeometry(43,5.2,16,72),alloy,0,95,0,0,0,0);
 add(new THREE.TorusGeometry(39,.95,8,88),rune,0,95,0,0,0,0);
 add(new THREE.OctahedronGeometry(7,1),rune,0,95,0,region.regionIndex*.2,.3,0);
 // Inscribed floor rings and broken stone paths.
 for(let i=0;i<3;i++)add(new THREE.TorusGeometry(22+i*18,.55,7,76),i===1?rune:alloy,0,10+i*.12,0,Math.PI/2,0,0);
 for(let i=0;i<9;i++){
  const a=i/9*Math.PI*2,r=148+deterministic(i,seed+11)*25,x=Math.cos(a)*r,z=Math.sin(a)*r;
  const h=16+deterministic(i+9,seed)*36;
  add(new THREE.BoxGeometry(15,h,17),stone,x,h/2,z,deterministic(i+12,seed)*.16,a,deterministic(i+15,seed)*.12);
  if(i%3===0)add(new THREE.BoxGeometry(3,h*.42,3),rune,x,h*.52,z+8);
 }
 // Every world uses its own geology, structures and light response.
 if(region.planetId==="kharon"){
  const bark=new THREE.MeshStandardMaterial({color:"#3b4c37",roughness:1});
  for(let i=0;i<5;i++){const a=i/5*Math.PI*2,x=Math.cos(a)*82,z=Math.sin(a)*82;
   const root=add(new THREE.CylinderGeometry(1.8,8,54,7),bark,x,28,z,.0,0,(i-2)*.19);
   root.scale.set(1.2,1.25,1.2);
   add(new THREE.IcosahedronGeometry(18+deterministic(i,seed)*7,1),worn,x*1.42,61,z*1.42,0,a,0,1.3,1.6,1.25);
  }
  add(new THREE.SphereGeometry(28,24,16),new THREE.MeshStandardMaterial({color:"#9bbf75",roughness:.94,emissive:"#426b3c",emissiveIntensity:.12}),0,118,0);
 }else if(region.planetId==="vespera"){
  add(new THREE.CircleGeometry(155,64),wet,0,8,0,-Math.PI/2);
  for(let i=0;i<6;i++){const a=i/6*Math.PI*2,r=120,x=Math.cos(a)*r,z=Math.sin(a)*r,h=15+deterministic(i,seed)*32;
   add(new THREE.OctahedronGeometry(7,1),worn,x,h/2,z,0,a,.2,1.1,h/16,1.15);
   add(new THREE.IcosahedronGeometry(4,1),rune,x*1.12,h+9,z*1.12,.2,a,0,1.2,1.8,1.2);
  }
  for(let i=0;i<4;i++)add(new THREE.TorusGeometry(38+i*18,.42,7,80),rune,0,9+i*.12,0,-Math.PI/2,0,0);
 }else if(region.planetId==="cinder"){
  const lava=new THREE.MeshStandardMaterial({color:"#8e321f",emissive:"#ef5525",emissiveIntensity:.65,roughness:.88,metalness:.01});
  for(let i=0;i<7;i++){const x=(i-3)*22,z=(i%2?1:-1)*(35+deterministic(i,seed)*28),len=45+deterministic(i+9,seed)*48;
   add(new THREE.BoxGeometry(2.1,1.2,len),lava,x,11,z,.04,deterministic(i,seed)*.2,.16);
  }
  for(let i=0;i<5;i++){const a=i/5*Math.PI*2,r=112;add(new THREE.ConeGeometry(17+deterministic(i,seed)*8,35+deterministic(i+5,seed)*45,7),stone,Math.cos(a)*r,23,Math.sin(a)*r,.18,0,.1);}
 }else if(region.planetId==="nox"){
  for(let i=0;i<7;i++){const a=i/7*Math.PI*2,r=92+deterministic(i,seed)*48,x=Math.cos(a)*r,z=Math.sin(a)*r,y=48+deterministic(i+4,seed)*62;
   const shard=add(new THREE.OctahedronGeometry(13+deterministic(i+8,seed)*12,1),stone,x,y,z,.2,0,(i%2?-.36:.36),.65,2.6,.7);
   shard.userData.floating=true;shard.userData.baseY=y;
   add(new THREE.TorusGeometry(13+deterministic(i,seed)*8,.48,7,48),rune,x,y-17,z,Math.PI/2,.2,0);
  }
  add(new THREE.TorusKnotGeometry(24,2.1,100,10,2,3),alloy,0,112,0,.5,0,0);
 }else if(region.planetId==="aureon"){
  const cloud=new THREE.MeshStandardMaterial({color:palette[3],roughness:1,transparent:true,opacity:.48});
  for(let i=0;i<6;i++){const a=i/6*Math.PI*2,r=142,x=Math.cos(a)*r,z=Math.sin(a)*r,y=42+deterministic(i,seed)*48;
   add(new THREE.DodecahedronGeometry(28,1),worn,x,y,z,.3,0,a,.95,.42,.8);
   add(new THREE.SphereGeometry(24,18,12),cloud,x,y+24,z,0,a,0,1.5,.38,1.1);
  }
  add(new THREE.TorusGeometry(132,2.6,12,120),rune,0,38,0,Math.PI/2,0,0);
 }else if(region.planetId==="glaciera"){
  const ice=new THREE.MeshPhysicalMaterial({color:palette[3],roughness:.31,metalness:.03,transmission:.18,thickness:1.8,clearcoat:.48,clearcoatRoughness:.34});
  for(let i=0;i<11;i++){const a=i/11*Math.PI*2,r=70+deterministic(i,seed)*100,x=Math.cos(a)*r,z=Math.sin(a)*r,h=34+deterministic(i+5,seed)*96;
   add(new THREE.ConeGeometry(8+deterministic(i+7,seed)*10,h,6),ice,x,h/2,z,.04,a,(i%2?-.12:.12),1,.9,1.12);
   if(i%2===0)add(new THREE.BoxGeometry(2.4,h*.68,2.4),rune,x,h*.42,z+7,.12,a,0);
  }
  add(new THREE.CircleGeometry(145,72),new THREE.MeshPhysicalMaterial({color:"#6cc8e1",roughness:.19,metalness:.08,clearcoat:1,transparent:true,opacity:.62}),0,10,0,-Math.PI/2);
 }
 const gy=terrainHeight(cx+385,cz-350,currentWorld);group.position.set(cx+385,gy,cz-350);
 group.traverse(o=>{if(o.isMesh)o.castShadow=true;});
 return group;
}

function createRobot(){
 const root=new THREE.Group();
 const ceramic=new THREE.MeshPhysicalMaterial({color:"#c8d5d3",metalness:.38,roughness:.29,clearcoat:.82,clearcoatRoughness:.2});
 const alloy=new THREE.MeshPhysicalMaterial({color:"#526970",metalness:.78,roughness:.3,clearcoat:.55});
 const dark=new THREE.MeshStandardMaterial({color:"#12242b",metalness:.68,roughness:.36});
 const teal=new THREE.MeshStandardMaterial({color:"#64d5c9",metalness:.32,roughness:.28,emissive:"#0b615c",emissiveIntensity:.45});
 const glow=new THREE.MeshStandardMaterial({color:"#d3ffff",emissive:"#36eee8",emissiveIntensity:2.2,metalness:.12,roughness:.2});
 const add=(parent,geo,mat,x,y,z,sx=1,sy=1,sz=1)=>{const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;};
 // Pressure shell, layered chest plates and exposed articulated joints.
 const abdomen=add(root,new THREE.CapsuleGeometry(.43,.58,8,22),dark,0,1.55,0,1,.95,.78);
 const torso=add(root,new THREE.CapsuleGeometry(.52,.72,10,28),ceramic,0,2.22,0,1.02,1,.78);
 const chest=add(root,new THREE.SphereGeometry(.57,32,24),alloy,0,2.25,.235,1.03,.77,.48);
 add(root,new THREE.BoxGeometry(.56,.48,.105),dark,0,2.22,.51,.98,1,.8);
 add(root,new THREE.BoxGeometry(.33,.075,.045),glow,0,2.3,.57);
 add(root,new THREE.SphereGeometry(.105,20,14),glow,0,2.04,.565);
 for(const side of [-1,1]){
  add(root,new THREE.SphereGeometry(.085,16,12),teal,side*.42,1.62,.23);
  add(root,new THREE.CylinderGeometry(.045,.045,.48,12),alloy,side*.43,2.64,.02,1,1,1);
  add(root,new THREE.SphereGeometry(.23,24,18),ceramic,side*.67,2.72,0,1.16,.88,1.05);
  add(root,new THREE.TorusGeometry(.19,.035,10,24),teal,side*.67,2.68,0).rotation.x=Math.PI/2;
 }
 // Helmet with a curved optical visor, edge seals and status lamps.
 const head=new THREE.Group();head.position.set(0,3.08,.04);root.add(head);
 add(head,new THREE.SphereGeometry(.46,40,28),ceramic,0,.38,0,1,.98,.9);
 add(head,new THREE.SphereGeometry(.35,36,24),dark,0,.4,.355,1,.42,.25);
 add(head,new THREE.SphereGeometry(.295,36,24),alloy,0,.4,.408,1,.31,.16);
 add(head,new THREE.BoxGeometry(.48,.045,.035),glow,0,.43,.536);
 add(head,new THREE.SphereGeometry(.065,16,12),glow,-.37,.38,.06);
 add(head,new THREE.SphereGeometry(.065,16,12),glow,.37,.38,.06);
 const antenna=add(head,new THREE.CylinderGeometry(.022,.032,.34,12),alloy,.12,.88,-.02);
 add(head,new THREE.SphereGeometry(.085,20,14),glow,.12,1.08,-.02);
 // Back-mounted Aether drive: two visible nozzles belong to the suit itself.
 const pack=add(root,new THREE.CapsuleGeometry(.3,.72,8,22),dark,0,2.15,-.49,1.35,1,.82);
 add(root,new THREE.BoxGeometry(.68,.56,.12),alloy,0,2.23,-.69);
 const packGlow=add(root,new THREE.BoxGeometry(.43,.34,.055),teal,0,2.22,-.765);
 const nozzleParts=[];
 for(const side of [-1,1]){
  const pod=add(root,new THREE.CylinderGeometry(.17,.24,.74,24),alloy,side*.245,1.55,-.66);
  const collar=add(root,new THREE.TorusGeometry(.19,.045,12,28),teal,side*.245,1.28,-.66);collar.rotation.x=Math.PI/2;
  const inner=add(root,new THREE.CylinderGeometry(.095,.13,.18,20),dark,side*.245,1.13,-.66);
  const flame=add(root,new THREE.ConeGeometry(.12,.74,18,2),glow,side*.245,.72,-.66);flame.rotation.x=Math.PI;
  flame.visible=false;nozzleParts.push({pod,collar,inner,flame});
 }
 // Hinged arms with shoulder caps, elbow bearings and armored forearms.
 const leftArm=new THREE.Group();leftArm.position.set(-.69,2.62,0);root.add(leftArm);
 const rightArm=new THREE.Group();rightArm.position.set(.69,2.62,0);root.add(rightArm);
 for(const [arm,side] of [[leftArm,-1],[rightArm,1]]){
  add(arm,new THREE.SphereGeometry(.19,24,16),dark,0,-.1,0,1.08,1,1);
  add(arm,new THREE.CapsuleGeometry(.155,.5,8,18),ceramic,0,-.44,0);
  add(arm,new THREE.TorusGeometry(.16,.045,10,24),teal,0,-.49,0);
  add(arm,new THREE.SphereGeometry(.145,20,14),alloy,0,-.78,.015);
  add(arm,new THREE.CapsuleGeometry(.145,.43,8,18),dark,0,-1.02,.025);
  add(arm,new THREE.SphereGeometry(.16,22,16),ceramic,0,-1.32,.085,1.05,.75,1.16);
  add(arm,new THREE.BoxGeometry(.19,.2,.22),teal,0,-1.42,.16);
  add(arm,new THREE.TorusGeometry(.11,.024,8,20),alloy,0,-.91,.13);
 }
 // Digitized hip, knee and shin armor with articulated magnetic boots.
 const leftLeg=new THREE.Group();leftLeg.position.set(-.32,1.2,0);root.add(leftLeg);
 const rightLeg=new THREE.Group();rightLeg.position.set(.32,1.2,0);root.add(rightLeg);
 for(const [leg,side] of [[leftLeg,-1],[rightLeg,1]]){
  add(leg,new THREE.SphereGeometry(.19,22,16),dark,0,-.05,0);
  add(leg,new THREE.CapsuleGeometry(.18,.42,8,18),ceramic,0,-.39,0,1,.95,.95);
  add(leg,new THREE.SphereGeometry(.16,20,14),alloy,0,-.71,.025);
  add(leg,new THREE.TorusGeometry(.14,.032,8,20),teal,0,-.72,.035);
  add(leg,new THREE.CapsuleGeometry(.155,.43,8,18),dark,0,-.98,.02,1,1,.9);
  add(leg,new THREE.BoxGeometry(.25,.38,.09),ceramic,0,-.99,.16,.92,1,.7);
  add(leg,new THREE.BoxGeometry(.42,.18,.65),alloy,0,-1.31,.17,1,1,1);
  add(leg,new THREE.BoxGeometry(.34,.045,.16),teal,0,-1.22,.45);
 }
 const thrusterLeft=nozzleParts[0].flame,thrusterRight=nozzleParts[1].flame;
 return {group:root,leftArm,rightArm,leftLeg,rightLeg,head,thrusterLeft,thrusterRight,packGlow,antenna,nozzleParts};
}
function regionState(task){return save.taskProgress[task.id]||(save.taskProgress[task.id]={count:0,hp:task.required||1,collected:[],complete:false});}
function regionComplete(region=currentRegion){return region.tasks.every(t=>regionState(t).complete);}
function regionPercent(region=currentRegion){return Math.round(region.tasks.filter(t=>regionState(t).complete).length/region.tasks.length*100);}
function disposeWorld(){
 if(!worldRoot)return;
 terrain?.userData?.disposePbr?.();scene.remove(worldRoot);
 const geometries=new Set(),materials=new Set();
 worldRoot.traverse(o=>{
  if(o.geometry&&!geometries.has(o.geometry)){geometries.add(o.geometry);o.geometry.dispose();}
  if(o.material){
   const list=Array.isArray(o.material)?o.material:[o.material];
   for(const material of list){if(material&&!materials.has(material)){materials.add(material);material.dispose();}}
  }
 });
 worldRoot=null;terrain=null;
}
function createMarker(task,role,index,total){
 const g=new THREE.Group(),accent=currentWorld.accent;
 const metal=new THREE.MeshStandardMaterial({color:"#3b4c50",metalness:.22,roughness:.76});
 const crystal=new THREE.MeshStandardMaterial({color:accent,emissive:accent,emissiveIntensity:role==="boss"?.4:1.15,roughness:.42,metalness:.04});
 const ring=new THREE.Mesh(new THREE.TorusGeometry(role==="boss"?12:6,.34,10,48),new THREE.MeshBasicMaterial({color:accent,transparent:true,opacity:.72}));
 ring.rotation.x=Math.PI/2;ring.position.y=.6;g.add(ring);
 const beam=new THREE.Mesh(new THREE.CylinderGeometry(.32,role==="boss"?4:1.8,role==="boss"?86:52,10,1,true),new THREE.MeshBasicMaterial({color:accent,transparent:true,opacity:.085,side:THREE.DoubleSide,depthWrite:false,blending:THREE.AdditiveBlending}));beam.position.y=role==="boss"?44:27;g.add(beam);
 if(role==="story"){
  const body=new THREE.Mesh(new THREE.CapsuleGeometry(2.1,5.4,5,9),new THREE.MeshStandardMaterial({color:"#aebdb7",roughness:.88}));body.position.y=5;g.add(body);
  const head=new THREE.Mesh(new THREE.SphereGeometry(1.65,20,18),new THREE.MeshStandardMaterial({color:"#d5d0b8",roughness:.92}));head.position.y=10;g.add(head);
  const eye=new THREE.Mesh(new THREE.BoxGeometry(1.4,.24,.18),crystal);eye.position.set(0,10,1.5);g.add(eye);
 }else if(role==="boss"){
  const body=new THREE.Mesh(new THREE.IcosahedronGeometry(9,2),new THREE.MeshStandardMaterial({color:"#32333d",roughness:.94,metalness:.035}));body.position.y=9;body.castShadow=true;g.add(body);
  for(let k=-1;k<=1;k+=2){const horn=new THREE.Mesh(new THREE.ConeGeometry(2.4,13,7),metal);horn.position.set(k*5,16,-2);horn.rotation.z=k*-.4;g.add(horn);}
  const eyes=new THREE.Mesh(new THREE.BoxGeometry(6,.8,.35),new THREE.MeshBasicMaterial({color:"#ff766e"}));eyes.position.set(0,10,8.4);g.add(eyes);
 }else if(role==="bonus"){
  const box=new THREE.Mesh(new THREE.DodecahedronGeometry(3,1),crystal);box.position.y=6;g.add(box);
 }else if(role==="ruins"){
  const plinth=new THREE.Mesh(new THREE.CylinderGeometry(2.2,3.6,3,8),metal);plinth.position.y=1.5;g.add(plinth);
  const pillar=new THREE.Mesh(new THREE.BoxGeometry(3.2,10,3.2),metal);pillar.position.y=8;g.add(pillar);
  const cap=new THREE.Mesh(new THREE.OctahedronGeometry(2.2,1),crystal);cap.position.y=14;g.add(cap);
  const line=new THREE.Mesh(new THREE.BoxGeometry(.28,5.4,.16),new THREE.MeshBasicMaterial({color:accent}));line.position.set(0,8,1.66);g.add(line);
 }else if(role==="event"){
  const shard=new THREE.Mesh(new THREE.OctahedronGeometry(3.4,1),crystal);shard.position.y=6;shard.rotation.set(.4,.6,.2);g.add(shard);
  const halo=new THREE.Mesh(new THREE.TorusGeometry(5,.18,8,40),new THREE.MeshBasicMaterial({color:accent,transparent:true,opacity:.72}));halo.position.y=6;halo.rotation.x=.4;g.add(halo);
 }else{
  const geo=role==="recover"?new THREE.OctahedronGeometry(3.4,1):new THREE.TorusKnotGeometry(2.3,.5,92,12,2,3);
  const item=new THREE.Mesh(geo,crystal);item.position.y=6.5;g.add(item);
  const pedestal=new THREE.Mesh(new THREE.CylinderGeometry(1.2,2.5,2.2,8),metal);pedestal.position.y=1;g.add(pedestal);
 }
 const angle=total>1?index/total*Math.PI*2:0,spread=total>1?22+index%2*16:0;
 const x=task.x+Math.cos(angle)*spread,z=task.z+Math.sin(angle)*spread;
 g.position.set(x,terrainHeight(x,z,currentWorld),z);
 g.userData={role,taskId:task.id,index,active:true,label:role==="story"?(task.npc||"FIELD CONTACT"):role==="boss"?(task.boss||"REGIONAL GUARDIAN"):role==="bonus"?task.title:(task.item||task.title),beam};
 return g;
}
function buildRegionEntities(){
 missionEntities=[];secretEntities=[];
 for(const task of currentRegion.tasks){
  const state=regionState(task);if(state.complete)continue;
  const role=task.type,count=role==="survey"||role==="ruins"||role==="recover"?task.required:1,indices=role==="survey"||role==="ruins"||role==="recover"?Array.from({length:count},(_,i)=>i).filter(i=>!(state.collected||[]).includes(i)):[0];
  for(const index of indices){const entity=createMarker(task,role,index,count);missionEntities.push(entity);worldRoot.add(entity);}
 }
 for(const secret of currentRegion.secrets){if(save.bonusFound.includes(secret.id))continue;const entity=createMarker(secret,"bonus",0,1);entity.position.set(secret.x,terrainHeight(secret.x,secret.z,currentWorld),secret.z);entity.userData.secretId=secret.id;secretEntities.push(entity);worldRoot.add(entity);}
}
function buildWorld(worldId,travel=true){
 clearWorldEvent();
 currentRegion=REGIONS[Math.min(save.regionCursor,REGIONS.length-1)]||REGIONS[0];
 const next=PLANETS.find(w=>w.id===currentRegion.planetId)||PLANETS[0];if(worldId&&worldId!==next.id)worldId=next.id;
 disposeWorld();currentWorld=next;scene.background=new THREE.Color(next.sky);scene.fog=new THREE.Fog(next.fog,220,4100);
 if(sunLight){sunLight.color.set(next.light);sunLight.intensity=next.terrain===2?3.7:3.3;}
 if(fillLight){fillLight.color.set(next.accent);fillLight.intensity=next.terrain===3?1.35:1.1;}
 if(frontFillLight){frontFillLight.color.set(next.palette[3]);frontFillLight.intensity=next.terrain===5?1.0:.58;}
 if(worldGlow){worldGlow.color.set(next.accent);worldGlow.intensity=next.terrain===2?25:19;}
 worldRoot=new THREE.Group();scene.add(worldRoot);terrain=createTerrain(next);worldRoot.add(terrain);const ridge=createMountainRidge(next,currentRegion.center.x,currentRegion.center.z);ridge.position.set(currentRegion.center.x,0,currentRegion.center.z);worldRoot.add(ridge);
 const decor=createWorldDecor(next,currentRegion.center.x,currentRegion.center.z);decor.position.set(currentRegion.center.x,0,currentRegion.center.z);worldRoot.add(decor);worldRoot.add(createRegionalLandmark(currentRegion));
 if(next.id==="kharon"){const aurora=new THREE.Group();createAurora(aurora);aurora.position.set(currentRegion.center.x,0,currentRegion.center.z);worldRoot.add(aurora);}
 relays=[];buildRegionEntities();
 const cx=currentRegion.center.x,cz=currentRegion.center.z;avatar.group.position.set(cx-280,terrainHeight(cx-280,cz+260,next),cz+260);avatar.group.rotation.y=0;terrain.userData.updateAround(avatar.group.position.x,avatar.group.position.z);
 if(travel){save.currentWorld=next.id;if(!save.unlockedWorlds.includes(next.id))save.unlockedWorlds.push(next.id);persist();}
 velocityY=0;jumpVelocity=0;flightMode=false;avatar.thrusterLeft.visible=false;avatar.thrusterRight.visible=false;
 $("flight-hud").hidden=true;$("flight-button").disabled=false;$("flight-button").classList.remove("selected");$("flight-button").innerHTML="<span>✧</span> AETHER FLIGHT <kbd>G</kbd>";
 $("control-guide").innerHTML="<span><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> MOVE</span><span><kbd>SHIFT</kbd> RUN</span><span><kbd>SPACE</kbd> JUMP</span><span><kbd>E</kbd> INTERACT</span><span><kbd>F</kbd> STRIKE</span>";
 AudioSystem.setWorldAudio(next.id);updateWorldUI();updateUI();updateRegionMap();uiSystems?.refreshContext();if(travel)toast("REGIONAL INSERTION // "+currentRegion.name);
}
function completeTask(task){
 const state=regionState(task);if(state.complete)return;state.complete=true;save.shards+=(task.reward||100);AudioSystem.playSfx("complete");
 if(regionComplete()){if(!save.completedRegions.includes(currentRegion.id))save.completedRegions.push(currentRegion.id);if(currentRegion.regionIndex===3&&!save.completedPlanets.includes(currentWorld.id)){save.completedPlanets.push(currentWorld.id);const next=PLANETS[currentRegion.planetIndex+1];if(next&&!save.unlockedWorlds.includes(next.id))save.unlockedWorlds.push(next.id);if(currentWorld.id==="kharon")save.flightUnlocked=true;}showRegionStory();}
 persist();updateUI();updateRegionMap();
}
function showTaskTransmission(task){
 $("story-chapter").textContent=currentRegion.planetName+" / "+currentRegion.name;
 $("story-id").textContent=task.id.toUpperCase();$("story-title").textContent=task.title.toUpperCase();
 $("story-briefing").textContent=task.description||currentRegion.lore;
 $("story-quote").textContent=task.dialogue||currentRegion.lore;
 $("story-modal").hidden=false;AudioSystem.playSfx("interact");
}
function showRegionStory(){
 $("story-chapter").textContent=currentRegion.planetName+" / REGION "+(currentRegion.regionIndex+1)+" COMPLETE";
 $("story-id").textContent=currentRegion.id.toUpperCase();$("story-title").innerHTML="THE FRONTIER <em>OPENS</em>";
 $("story-briefing").textContent="100% COMPLETE — "+currentRegion.name+". Every mandatory contract is secured. The route to the next region is now unlocked.";
 $("story-quote").textContent=currentRegion.lore;$("story-modal").hidden=false;AudioSystem.playSfx("complete");
}
function makeTransitPlanet(world,radius=112){
 const group=new THREE.Group(),width=512,height=256,canvas=document.createElement("canvas");canvas.width=width;canvas.height=height;
 const ctx=canvas.getContext("2d"),image=ctx.createImageData(width,height),a=new THREE.Color(world.palette[0]),b=new THREE.Color(world.palette[1]),c=new THREE.Color(world.palette[2]),d=new THREE.Color(world.palette[3]);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const u=x/width,v=y/height,lat=(v-.5)*Math.PI,warp=fbm2(u*8+world.seed*.013,v*5,world.seed+17),large=fbm2(u*4+2,v*3-1,world.seed+3),detail=fbm2(u*31,v*16,world.seed+81);
  let land=smooth(.4,.63,large*.72+warp*.28),color;
  if(world.terrain===1)land=1-land*.55;
  if(world.terrain===4){const bands=.5+.5*Math.sin(v*78+large*11);color=b.clone().lerp(c,bands*.55).lerp(d,detail*.13);}
  else if(world.terrain===2){color=a.clone().lerp(b,land*.52).lerp(c,detail*.2);if(detail>.73)color.lerp(new THREE.Color("#ff9a48"),.38);}
  else if(world.terrain===5){color=b.clone().lerp(c,.35+.3*Math.sin(v*45+large*8)).lerp(d,detail*.12);}
  else{color=a.clone().lerp(b,land).lerp(c,detail*.16);if(world.terrain===3)color.lerp(new THREE.Color("#eaf8ff"),.28+land*.22);}
  const limb=.86+.14*Math.max(0,Math.cos(lat)),shade=limb*(.92+detail*.12),i=(y*width+x)*4;
  image.data[i]=Math.max(0,Math.min(255,Math.round(color.r*255*shade)));image.data[i+1]=Math.max(0,Math.min(255,Math.round(color.g*255*shade)));image.data[i+2]=Math.max(0,Math.min(255,Math.round(color.b*255*shade)));image.data[i+3]=255;
 }
 ctx.putImageData(image,0,0);const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;map.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());map.generateMipmaps=true;map.minFilter=THREE.LinearMipmapLinearFilter;
 const sphere=new THREE.Mesh(new THREE.SphereGeometry(radius,96,64),new THREE.MeshPhysicalMaterial({map,roughness:.72,metalness:.035,clearcoat:.2,clearcoatRoughness:.55}));group.add(sphere);
 const cloudCanvas=document.createElement("canvas");cloudCanvas.width=256;cloudCanvas.height=128;const cloudCtx=cloudCanvas.getContext("2d"),cloudData=cloudCtx.createImageData(512,256);
 for(let y=0;y<128;y++)for(let x=0;x<256;x++){const n=fbm2(x/256*13+world.seed*.07,y/128*7,world.seed+101),alpha=Math.round(smooth(.58,.78,n)*148),i=(y*256+x)*4;cloudData.data[i]=235;cloudData.data[i+1]=247;cloudData.data[i+2]=255;cloudData.data[i+3]=alpha;}
 cloudCtx.putImageData(cloudData,0,0);const cloudMap=new THREE.CanvasTexture(cloudCanvas);cloudMap.colorSpace=THREE.SRGBColorSpace;
 const clouds=new THREE.Mesh(new THREE.SphereGeometry(radius*1.012,72,48),new THREE.MeshBasicMaterial({map:cloudMap,transparent:true,opacity:.55,depthWrite:false}));group.add(clouds);
 const atmosphere=new THREE.Mesh(new THREE.SphereGeometry(radius*1.075,72,48),new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.BackSide,blending:THREE.AdditiveBlending,uniforms:{uColor:{value:new THREE.Color(world.accent)},uOpacity:{value:.48}},vertexShader:'varying vec3 vNormalW; varying vec3 vPositionW; void main(){vec4 wp=modelMatrix*vec4(position,1.0);vPositionW=wp.xyz;vNormalW=normalize(mat3(modelMatrix)*normal);gl_Position=projectionMatrix*viewMatrix*wp;}',fragmentShader:'uniform vec3 uColor;uniform float uOpacity;varying vec3 vNormalW;varying vec3 vPositionW;void main(){vec3 V=normalize(cameraPosition-vPositionW);float rim=pow(1.0-max(dot(normalize(vNormalW),V),0.0),2.3);gl_FragColor=vec4(uColor,rim*uOpacity);}' }));group.add(atmosphere);
 group.userData.clouds=clouds;group.userData.surfaceMap=map;group.userData.cloudMap=cloudMap;group.userData.radius=radius;return group;
}
function makeTransitBackdrop(fromWorld,toWorld){
 transitRoot=new THREE.Group();scene.add(transitRoot);
 const count=2400,positions=new Float32Array(count*3),colors=new Float32Array(count*3);
 for(let i=0;i<count;i++){const u=deterministic(i+1,fromWorld.seed)*2-1,a=deterministic(i+31,toWorld.seed)*Math.PI*2,r=800+deterministic(i+73,fromWorld.seed)*1500,s=Math.sqrt(1-u*u);positions[i*3]=Math.cos(a)*s*r;positions[i*3+1]=u*r;positions[i*3+2]=Math.sin(a)*s*r;const c=new THREE.Color().setHSL(.49+deterministic(i+22,toWorld.seed)*.14,.35,.52+deterministic(i+18,fromWorld.seed)*.35);colors[i*3]=c.r;colors[i*3+1]=c.g;colors[i*3+2]=c.b;}
 const starGeometry=new THREE.BufferGeometry();starGeometry.setAttribute("position",new THREE.BufferAttribute(positions,3));starGeometry.setAttribute("color",new THREE.BufferAttribute(colors,3));
 const stars=new THREE.Points(starGeometry,new THREE.PointsMaterial({size:1.9,sizeAttenuation:true,vertexColors:true,transparent:true,opacity:.95,depthWrite:false,fog:false}));transitRoot.add(stars);
 const streakPositions=new Float32Array(440*6);for(let i=0;i<440;i++){const x=(deterministic(i,77)-.5)*1500,y=(deterministic(i,99)-.5)*900,z=(deterministic(i,31)-.5)*1500,k=i*6;streakPositions[k]=x;streakPositions[k+1]=y;streakPositions[k+2]=z;streakPositions[k+3]=x*1.035;streakPositions[k+4]=y*1.035;streakPositions[k+5]=z+24+deterministic(i+1,4)*74;}
 const streakGeometry=new THREE.BufferGeometry();streakGeometry.setAttribute("position",new THREE.BufferAttribute(streakPositions,3));const streaks=new THREE.LineSegments(streakGeometry,new THREE.LineBasicMaterial({color:0x8bdcf2,transparent:true,opacity:0,depthWrite:false}));transitRoot.add(streaks);
 const source=makeTransitPlanet(fromWorld,124),destination=makeTransitPlanet(toWorld,112);source.position.set(-145,32,400);destination.position.set(150,-28,720);source.rotation.z=.16;destination.rotation.z=-.1;transitRoot.add(source,destination);
 travelSequence.sourcePlanet=source;travelSequence.destinationPlanet=destination;travelSequence.streaks=streaks;
}
function disposeTransitBackdrop(){
 if(!transitRoot)return;scene.remove(transitRoot);const geometries=new Set(),materials=new Set(),textures=new Set();
 transitRoot.traverse(o=>{if(o.geometry&&!geometries.has(o.geometry)){geometries.add(o.geometry);o.geometry.dispose();}const list=Array.isArray(o.material)?o.material:[o.material];for(const m of list){if(!m||materials.has(m))continue;materials.add(m);for(const v of Object.values(m)){if(v?.isTexture&&!textures.has(v)){textures.add(v);v.dispose();}}m.dispose();}});
 transitRoot=null;
}
function beginPlayerFlight(destinationRegion){
 if(travelSequence)return;
 const destinationWorld=PLANETS.find(w=>w.id===destinationRegion.planetId);
 if(!destinationWorld){currentRegion=destinationRegion;buildWorld(destinationRegion.planetId,true);return;}
 const samePlanet=destinationWorld.id===currentWorld.id,startX=avatar.group.position.x,startY=avatar.group.position.y,startZ=avatar.group.position.z;
 const landingX=destinationRegion.center.x-280,landingZ=destinationRegion.center.z+260;
 const ground=getGround(startX,startZ);
 travelSequence={destinationRegion,destinationWorld,fromWorld:currentWorld,samePlanet,phase:"ascent",time:0,ground,startY,startX,startZ,landingX,landingZ,backdropReady:false,arrivalReady:false,oldFog:scene.fog,oldBackground:scene.background.clone()};
 keys.clear();touchKeys.clear();flightMode=true;velocityY=0;horizontalFlightSpeed=0;
 avatar.thrusterLeft.visible=true;avatar.thrusterRight.visible=true;avatar.group.rotation.x=-.12;cameraDistance=27;pitch=.25;
 $("flight-hud").hidden=false;$("flight-button").disabled=true;$("flight-button").classList.add("selected");$("flight-button").innerHTML="<span>✧</span> TRANSIT ACTIVE";
 const overlay=$("travel-sequence");if(overlay){overlay.hidden=false;overlay.classList.add("active");overlay.classList.toggle("regional",samePlanet);}
 $("travel-sequence-top").querySelector("span").innerHTML="<i></i> AETHER DRIVE // "+(samePlanet?"REGIONAL FLIGHT":"PILOT-POWERED TRANSIT");
 $("travel-sequence-steps").innerHTML=samePlanet?"<span>01 ASCENT</span><span>02 AERIAL CROSSING</span><span>03 APPROACH</span><span>04 TOUCHDOWN</span>":"<span>01 ASCENT</span><span>02 ORBIT</span><span>03 DEEP SPACE</span><span>04 RE-ENTRY</span>";
 updateTransitPanel("ATMOSPHERIC ASCENT","The explorer is lifting away from the surface under personal exosuit propulsion.",0);
 toast(samePlanet?"REGIONAL FLIGHT // EXOSUIT PROPULSION ENGAGED":"INTERPLANETARY FLIGHT // EXOSUIT PROPULSION ENGAGED");
}
function updateTransitPanel(phase,detail,progress){const a=$("travel-phase"),b=$("travel-detail"),c=$("travel-progress-fill"),d=$("travel-destination");if(a)a.textContent=phase;if(b)b.textContent=detail;if(c)c.style.width=(clamp(progress,0,1)*100)+"%";if(d&&travelSequence)d.textContent=(travelSequence.samePlanet?travelSequence.destinationRegion.name:travelSequence.destinationWorld.name).toUpperCase();}
function finishTravelLanding(){
 const overlay=$("travel-sequence");if(overlay){overlay.classList.remove("active","regional");overlay.hidden=true;}
 flightMode=false;velocityY=0;horizontalFlightSpeed=0;keys.clear();touchKeys.clear();avatar.thrusterLeft.visible=false;avatar.thrusterRight.visible=false;avatar.group.rotation.set(0,0,0);avatar.leftArm.rotation.x=0;avatar.rightArm.rotation.x=0;avatar.leftLeg.rotation.x=0;avatar.rightLeg.rotation.x=0;avatar.head.rotation.x=0;avatar.packGlow.material.emissiveIntensity=.45;
 $("flight-hud").hidden=true;$("flight-button").disabled=false;$("flight-button").classList.remove("selected");$("flight-button").innerHTML="<span>✧</span> AETHER FLIGHT <kbd>G</kbd>";
 $("control-guide").innerHTML="<span><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> MOVE</span><span><kbd>SHIFT</kbd> RUN</span><span><kbd>SPACE</kbd> JUMP</span><span><kbd>E</kbd> INTERACT</span><span><kbd>DRAG</kbd> LOOK</span>";
 cameraDistance=17.5;pitch=.13;travelSequence=null;updateUI();updateRegionMap();updateWorldUI();uiSystems?.refreshContext();
 toast("TOUCHDOWN // "+currentWorld.name.toUpperCase()+" FRONTIER");
}
function updateInterplanetaryTravel(dt){
 const tr=travelSequence;if(!tr)return;tr.time+=dt;const t=tr.time,spaceColor=new THREE.Color("#020711");
 if(tr.samePlanet){
  if(t<2.2){
   tr.phase="regional-ascent";const p=smooth(0,2.2,t);avatar.group.position.y=tr.startY+280*p+Math.sin(t*4)*2;avatar.group.rotation.x=lerp(-.12,-.2,p);
   if(scene.fog){scene.fog.near=lerp(220,100,p);scene.fog.far=lerp(4100,1900,p);}cameraDistance=lerp(27,34,p);pitch=lerp(.25,.42,p);
   updateTransitPanel("VERTICAL ASCENT","The pilot clears the canopy and climbs above the terrain on twin Aether thrusters.",.22*p);
  }else if(t<5.35){
   tr.phase="regional-cruise";const p=smooth(0,1,(t-2.2)/3.15);avatar.group.position.x=lerp(tr.startX,tr.landingX,p);avatar.group.position.z=lerp(tr.startZ,tr.landingZ,p);avatar.group.position.y=tr.startY+280+Math.sin(p*Math.PI)*34;avatar.group.rotation.x=lerp(-.2,-.06,p);cameraDistance=lerp(34,28,p);pitch=lerp(.42,.27,p);
   updateTransitPanel("AERIAL FRONTIER CROSSING","The explorer is flying above the living landscape. Destination terrain streams in beneath the pilot.",.22+.54*p);
  }else{
   tr.phase="regional-landing";if(!tr.arrivalReady){tr.arrivalReady=true;buildWorld(tr.destinationWorld.id,true);$("flight-button").disabled=true;$("flight-button").classList.add("selected");$("flight-button").innerHTML="<span>✧</span> TRANSIT ACTIVE";tr.landingX=avatar.group.position.x;tr.landingZ=avatar.group.position.z;tr.landingGround=getGround(tr.landingX,tr.landingZ);avatar.group.position.y=tr.landingGround+280;flightMode=true;avatar.thrusterLeft.visible=true;avatar.thrusterRight.visible=true;cameraDistance=28;pitch=.27;$("flight-hud").hidden=true;}
   const p=smooth(0,1,(t-5.35)/1.85);avatar.group.position.x=tr.landingX;avatar.group.position.z=tr.landingZ;avatar.group.position.y=tr.landingGround+280*(1-p);avatar.group.rotation.x=lerp(-.06,0,p);cameraDistance=lerp(28,18,p);pitch=lerp(.27,.13,p);
   updateTransitPanel("POWERED TOUCHDOWN","The thrusters stabilize the descent and set the pilot down in the next region.",.76+.24*p);
   if(p>=1){avatar.group.position.set(tr.landingX,tr.landingGround,tr.landingZ);finishTravelLanding();}
  }
  return;
 }
 if(t<3.5){
  const p=smooth(0,3.5,t),altitude=tr.startY+640*p;avatar.group.position.y=altitude;avatar.group.rotation.x=lerp(avatar.group.rotation.x,-.13,dt*2);
  if(scene.fog){scene.fog.near=lerp(220,48,p);scene.fog.far=lerp(4100,820,p);}scene.background.lerpColors(tr.oldBackground,spaceColor,p*.92);cameraDistance=lerp(27,35,p);pitch=lerp(.25,.37,p);
  updateTransitPanel("ATMOSPHERIC ASCENT","Aether propulsion lifts the pilot through cloud layers and beyond the atmosphere.",.23*p);
 }else if(t<7.35){
  if(!tr.backdropReady){tr.backdropReady=true;if(worldRoot)worldRoot.visible=false;makeTransitBackdrop(tr.fromWorld,tr.destinationWorld);avatar.group.position.set(0,0,0);avatar.group.rotation.set(-.08,0,0);yaw=0;pitch=.08;cameraDistance=31;scene.fog=null;scene.background.set("#020711");}
  tr.phase="cruise";const p=smooth(0,1,(t-3.5)/3.85);if(transitRoot){transitRoot.rotation.y+=dt*.035;transitRoot.children[0].position.z-=dt*2.2;tr.sourcePlanet.position.x=lerp(-145,-265,p);tr.sourcePlanet.position.z=lerp(400,760,p);tr.sourcePlanet.scale.setScalar(lerp(1,1.24,p));tr.destinationPlanet.position.x=lerp(150,34,p);tr.destinationPlanet.position.y=lerp(-28,22,p);tr.destinationPlanet.position.z=lerp(720,285,p);tr.destinationPlanet.scale.setScalar(lerp(.7,1.2,p));tr.sourcePlanet.rotation.y+=dt*.06;tr.destinationPlanet.rotation.y+=dt*.11;tr.sourcePlanet.userData.clouds.rotation.y+=dt*.075;tr.destinationPlanet.userData.clouds.rotation.y+=dt*.09;tr.streaks.material.opacity=smooth(.24,.5,p)*.8;tr.streaks.scale.z=1+p*4;}
  avatar.group.position.y=Math.sin(t*1.7)*.22;avatar.group.rotation.z=Math.sin(t*.9)*.035;cameraDistance=lerp(31,35,p);updateTransitPanel("DEEP-SPACE CROSSING","No carrier craft. The explorer crosses the interplanetary corridor under suit power.",.23+.47*p);
 }else{
  if(!tr.arrivalReady){tr.arrivalReady=true;tr.phase="reentry";disposeTransitBackdrop();buildWorld(tr.destinationWorld.id,true);$("flight-button").disabled=true;$("flight-button").classList.add("selected");$("flight-button").innerHTML="<span>✧</span> TRANSIT ACTIVE";const x=avatar.group.position.x,z=avatar.group.position.z;tr.landingGround=getGround(x,z);tr.landingX=x;tr.landingZ=z;avatar.group.position.y=tr.landingGround+620;avatar.group.rotation.set(-.16,0,0);flightMode=true;avatar.thrusterLeft.visible=true;avatar.thrusterRight.visible=true;cameraDistance=30;pitch=.34;scene.background.set(tr.destinationWorld.sky);scene.fog=new THREE.Fog(tr.destinationWorld.fog,55,1150);worldRoot.visible=true;$("flight-hud").hidden=true;}
  const p=smooth(0,1,(t-7.35)/3.2),altitude=620*(1-p);avatar.group.position.x=tr.landingX+Math.sin(p*Math.PI)*5;avatar.group.position.z=tr.landingZ-Math.sin(p*Math.PI)*8;avatar.group.position.y=tr.landingGround+altitude;avatar.group.rotation.x=lerp(-.16,0,p);cameraDistance=lerp(30,18,p);pitch=lerp(.34,.13,p);if(scene.fog){scene.fog.near=lerp(55,220,p);scene.fog.far=lerp(1150,4100,p);}updateTransitPanel("ATMOSPHERIC RE-ENTRY","The pilot is bleeding speed and descending toward the new frontier.",.70+.30*p);
  if(p>=1){avatar.group.position.set(tr.landingX,tr.landingGround,tr.landingZ);disposeTransitBackdrop();finishTravelLanding();}
 }
}
function advanceRegion(){
 if(!regionComplete()){toast("FRONTIER SEALED // COMPLETE ALL FIVE CONTRACTS");return;}
 if(save.regionCursor>=REGIONS.length-1){toast("THE SIX-WORLD CAMPAIGN IS COMPLETE");return;}
 const to=REGIONS[save.regionCursor+1];
 save.regionCursor++;save.currentWorld=to.planetId;persist();$("story-modal").hidden=true;
 beginPlayerFlight(to);
}

function jump(){if(!flightMode&&Math.abs(jumpVelocity)<.01)jumpVelocity=8.4;}
function getGround(x,z){return terrainHeight(x,z,currentWorld);}
function moveRobot(dt){
 const active=new Set([...keys,...touchKeys]),forward=(active.has("KeyW")||active.has("ArrowUp")?1:0)-(active.has("KeyS")||active.has("ArrowDown")?1:0),strafe=(active.has("KeyD")||active.has("ArrowRight")?1:0)-(active.has("KeyA")||active.has("ArrowLeft")?1:0),running=active.has("ShiftLeft")||active.has("ShiftRight");
 const speed=running?12.2:6.1,dx=Math.sin(yaw),dz=Math.cos(yaw),rx=Math.cos(yaw),rz=-Math.sin(yaw);
 let mx=dx*forward+rx*strafe,mz=dz*forward+rz*strafe,mag=Math.hypot(mx,mz);if(mag>1){mx/=mag;mz/=mag;}
 if(flightMode){
  const boost=running?2.45:1;horizontalFlightSpeed=mag*speed*boost;avatar.group.position.x+=mx*speed*boost*dt;avatar.group.position.z+=mz*speed*boost*dt;
  if(active.has("Space"))velocityY=Math.min(22,velocityY+24*dt);else if(active.has("ControlLeft")||active.has("ControlRight"))velocityY=Math.max(-18,velocityY-24*dt);else velocityY=lerp(velocityY,0,dt*1.1);
  avatar.group.position.y+=velocityY*dt;avatar.group.position.y=Math.max(getGround(avatar.group.position.x,avatar.group.position.z)+2.2,avatar.group.position.y);
 }else{
  horizontalFlightSpeed=0;avatar.group.position.x+=mx*speed*dt;avatar.group.position.z+=mz*speed*dt;const ground=getGround(avatar.group.position.x,avatar.group.position.z);
  if(jumpVelocity!==0||avatar.group.position.y>ground+.015){jumpVelocity-=22*dt;avatar.group.position.y+=jumpVelocity*dt;if(avatar.group.position.y<=ground){avatar.group.position.y=ground;jumpVelocity=0;}}else avatar.group.position.y=ground;
 }
 avatar.group.position.x=clamp(avatar.group.position.x,-4800,4800);avatar.group.position.z=clamp(avatar.group.position.z,-4800,4800);
 if(mag>.08)avatar.group.rotation.y=Math.atan2(mx,mz);avatar.group.rotation.z=lerp(avatar.group.rotation.z,-strafe*.085,Math.min(1,dt*5));avatar.group.rotation.z=lerp(avatar.group.rotation.z,-strafe*.085,Math.min(1,dt*5));
 const phase=elapsed*(running?10.5:7.2),walk=mag*(running?1.7:1);
 avatar.leftLeg.rotation.x=Math.sin(phase)*.56*walk;avatar.rightLeg.rotation.x=-Math.sin(phase)*.56*walk;
 avatar.leftArm.rotation.x=-Math.sin(phase)*.42*walk;avatar.rightArm.rotation.x=Math.sin(phase)*.42*walk;avatar.head.rotation.y=Math.sin(elapsed*.8)*.045;if(flightMode){avatar.leftArm.rotation.x=lerp(avatar.leftArm.rotation.x,-.48,dt*4);avatar.rightArm.rotation.x=lerp(avatar.rightArm.rotation.x,-.48,dt*4);avatar.leftLeg.rotation.x=lerp(avatar.leftLeg.rotation.x,.28,dt*4);avatar.rightLeg.rotation.x=lerp(avatar.rightLeg.rotation.x,.28,dt*4);}else{avatar.leftArm.rotation.x=lerp(avatar.leftArm.rotation.x,0,dt*2);avatar.rightArm.rotation.x=lerp(avatar.rightArm.rotation.x,0,dt*2);}
 if(flightMode){avatar.thrusterLeft.visible=true;avatar.thrusterRight.visible=true;const pulse=.86+Math.sin(elapsed*18)*.14;avatar.thrusterLeft.scale.y=pulse;avatar.thrusterRight.scale.y=.9+Math.sin(elapsed*18+1.1)*.16;}
 else{avatar.thrusterLeft.visible=false;avatar.thrusterRight.visible=false;}
}
function animateExosuitFlight(dt){
 const blend=Math.min(1,dt*4.2),pulse=.9+Math.sin(elapsed*19)*.13;
 avatar.leftArm.rotation.x=lerp(avatar.leftArm.rotation.x,-.48,blend);avatar.rightArm.rotation.x=lerp(avatar.rightArm.rotation.x,-.48,blend);
 avatar.leftLeg.rotation.x=lerp(avatar.leftLeg.rotation.x,.28,blend);avatar.rightLeg.rotation.x=lerp(avatar.rightLeg.rotation.x,.28,blend);
 avatar.head.rotation.x=lerp(avatar.head.rotation.x,-.035,blend);avatar.thrusterLeft.visible=true;avatar.thrusterRight.visible=true;
 avatar.thrusterLeft.scale.y=pulse;avatar.thrusterRight.scale.y=.88+Math.sin(elapsed*19+1.15)*.15;
 avatar.packGlow.material.emissiveIntensity=1.2+Math.sin(elapsed*9)*.22;
}
function updateCamera(dt){
 const d=travelSequence?cameraDistance:flightMode?23:cameraDistance;
 const desired=new THREE.Vector3(avatar.group.position.x-Math.sin(yaw)*d,avatar.group.position.y+8.2+pitch*7,avatar.group.position.z-Math.cos(yaw)*d);
 camera.position.lerp(desired,settings.reducedMotion?1:1-Math.pow(.001,dt));
 camera.lookAt(avatar.group.position.x,avatar.group.position.y+1.75,avatar.group.position.z);
}
function nearestInteractable(){
 let best=null,bestD=Infinity;
 for(const e of [...missionEntities,...secretEntities]){if(!e.userData.active)continue;const d=avatar.group.position.distanceTo(e.position),limit=e.userData.role==="boss"?42:14;if(d<limit&&d<bestD){best=e;bestD=d;}}
 return best;
}
function interact(){
 if(!$("atlas-overlay").hidden||!$("region-overlay").hidden||!$("community-overlay").hidden||!$("account-overlay").hidden||!$("settings-overlay").hidden||!$("story-modal").hidden)return;
 const target=nearestInteractable();if(!target){toast("NO INTERACTIVE SIGNAL IN RANGE // PRESS R TO SCAN");return;}
 const role=target.userData.role;
 if(role==="bonus"||role==="event"){
  if(role==="event"){
   save.shards+=90;save.discoveries=(save.discoveries||0)+1;
   activeEventEntities=activeEventEntities.filter(e=>e!==target);
   $("world-event-time").textContent=activeEventEntities.length?("ANOMALY SHARDS // "+activeEventEntities.length+" REMAINING"):"EVENT COMPLETE // BONUS SECURED";
  }else{
   save.bonusFound.push(target.userData.secretId);
   save.shards+=target.userData.secretId.includes("secret-a")?90:130;
  }
  target.userData.active=false;worldRoot.remove(target);AudioSystem.playSfx("pickup");persist();updateUI();
  toast(role==="event"?"ANOMALY SHARD SECURED // +90 QUANTUM SHARDS":"HIDDEN CACHE RECOVERED // BONUS SHARDS SECURED");return;
 }
 if(role==="boss"){hitBoss();return;}
 const task=currentRegion.tasks.find(t=>t.id===target.userData.taskId);if(!task)return;
 const state=regionState(task);target.userData.active=false;worldRoot.remove(target);AudioSystem.playSfx(role==="survey"||role==="ruins"||role==="recover"?"pickup":"interact");
 if(role==="story"){completeTask(task);showTaskTransmission(task);toast(task.npc+" // TRANSMISSION ARCHIVED");return;}
 state.collected=state.collected||[];if(!state.collected.includes(target.userData.index))state.collected.push(target.userData.index);state.count=state.collected.length;
 const remain=task.required-state.count;toast(task.item+" // "+state.count+" / "+task.required);
 if(remain<=0)completeTask(task);else{persist();updateUI();}
}
function hitBoss(){
 const target=nearestInteractable();if(!target||target.userData.role!=="boss"){toast("NO REGIONAL GUARDIAN IN STRIKE RANGE");return;}
 const task=currentRegion.tasks.find(t=>t.id===target.userData.taskId);if(!task)return;const state=regionState(task);
 state.hp=Math.max(0,(state.hp||task.required)-1);target.scale.setScalar(1+Math.random()*.12);AudioSystem.playSfx("hit");
 toast(task.boss+" // "+state.hp+" / "+task.required+" ARMOUR NODES");
 if(state.hp<=0){target.userData.active=false;worldRoot.remove(target);completeTask(task);}
 else{persist();updateUI();}
}
function scanPulse(){
 const target=[...missionEntities,...secretEntities].filter(e=>e.userData.active).sort((a,b)=>avatar.group.position.distanceTo(a.position)-avatar.group.position.distanceTo(b.position))[0];
 if(!target){toast("SCAN COMPLETE // NO UNRESOLVED SIGNALS");return;}
 const dist=Math.round(avatar.group.position.distanceTo(target.position));toast("SCANNER LOCK // "+target.userData.label+" // "+dist+" M");AudioSystem.playSfx("scan");
 if(target.userData.beam){target.userData.beam.material.opacity=.26;setTimeout(()=>{if(target.userData.beam)target.userData.beam.material.opacity=.085;},900);}
}
function togglePhotoMode(){document.body.classList.toggle("photo-mode");toast(document.body.classList.contains("photo-mode")?"PHOTO MODE // HUD HIDDEN":"PHOTO MODE // HUD RESTORED");}
function clearWorldEvent(){
 for(const entity of activeEventEntities){entity.userData.active=false;worldRoot?.remove(entity);}
 activeEventEntities=[];
 secretEntities=secretEntities.filter(entity=>entity.userData.role!=="event");
 activeEvent="";$("world-event").hidden=true;
}
function triggerWorldEvent(){
 clearWorldEvent();
 const events=EVENT_NAMES[currentWorld.id]||["Anomaly surge"];
 activeEvent=events[Math.floor(Math.random()*events.length)];
 eventUntil=elapsed+68;eventNextAt=elapsed+245+Math.random()*95;
 for(let i=0;i<4;i++){
  const a=i/4*Math.PI*2+.6,r=140+deterministic(i,currentRegion.seed+Math.floor(elapsed))*155;
  const x=avatar.group.position.x+Math.cos(a)*r,z=avatar.group.position.z+Math.sin(a)*r;
  const task={id:"event-"+Math.floor(elapsed)+"-"+i,type:"event",title:activeEvent,item:"ANOMALY SHARD",x,z};
  const entity=createMarker(task,"event",i,4);entity.userData.eventId=task.id;
  activeEventEntities.push(entity);secretEntities.push(entity);worldRoot.add(entity);
 }
 $("world-event-name").textContent=activeEvent.toUpperCase();
 $("world-event-time").textContent="RECOVER 4 ANOMALY SHARDS // +90 EACH";
 $("world-event").hidden=false;
 toast("PLANETARY EVENT DETECTED // "+activeEvent.toUpperCase());
}

function toggleFlight(){
 if(travelSequence)return;
 if(!save.flightUnlocked){toast("FLIGHT LICENSE LOCKED // COMPLETE ALL FOUR ELYNDRA REGIONS");return;}
 flightMode=!flightMode;$("flight-hud").hidden=!flightMode;$("flight-button").classList.toggle("selected",flightMode);
 $("flight-button").innerHTML=flightMode?"<span>✧</span> LAND / WALK <kbd>G</kbd>":"<span>✧</span> AETHER FLIGHT <kbd>G</kbd>";
 $("control-guide").innerHTML=flightMode?"<span><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> FLY</span><span><kbd>SPACE</kbd> ASCEND</span><span><kbd>CTRL</kbd> DESCEND</span><span><kbd>SHIFT</kbd> BOOST</span><span><kbd>G</kbd> LAND</span>":"<span><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> MOVE</span><span><kbd>SHIFT</kbd> RUN</span><span><kbd>SPACE</kbd> JUMP</span><span><kbd>E</kbd> INTERACT</span><span><kbd>DRAG</kbd> LOOK</span>";
 velocityY=0;if(!flightMode)avatar.group.position.y=getGround(avatar.group.position.x,avatar.group.position.z);toast(flightMode?"AETHER PROPULSION ONLINE":"TOUCHDOWN // EXPLORATION MODE");
}
function openAtlas(){updateAtlas();$("atlas-overlay").hidden=false;}
function updateAtlas(){
 const container=$("atlas-grid");if(!container)return;container.innerHTML="";
 PLANETS.forEach((w,i)=>{const b=document.createElement("button");b.type="button";b.className="atlas-world"+(w.id===currentWorld.id?" current":"");b.style.setProperty("--planet-light",w.palette[3]);b.style.setProperty("--planet-dark",w.palette[0]);b.style.setProperty("--planet-glow",w.accent);
 const done=save.completedPlanets.includes(w.id),open=w.id===currentWorld.id||done;
 b.disabled=!open;b.innerHTML="<span class='planet-number'>0"+(i+1)+" // "+w.type+"</span><b>"+w.name+"</b><small>"+w.title+"</small><span class='world-state'>"+(done?"100% COMPLETE":open?"ACTIVE FRONTIER":"SEALED // COMPLETE PREVIOUS WORLD")+"</span>";
 b.addEventListener("click",()=>toast(done?"ARCHIVE VIEW ONLY // RETURN TO THE ACTIVE FRONTIER": "CURRENT PLANET // OPEN REGIONAL ATLAS"));container.appendChild(b);});
}
function updateRegionMap(){
 const list=$("region-grid");if(!list)return;list.innerHTML="";$("region-map-meta").textContent=currentWorld.name+" / AREA "+(currentRegion.regionIndex+1)+" OF 04";
 REGIONS.forEach((r,i)=>{const complete=save.completedRegions.includes(r.id),active=i===save.regionCursor,locked=i>save.regionCursor,b=document.createElement("button");b.type="button";b.className="region-card"+(active?" current":"")+(locked?" locked":"");
 const percent=complete?100:Math.round(r.tasks.filter(t=>regionState(t).complete).length/r.tasks.length*100);
 b.innerHTML="<small>WORLD "+String(r.planetIndex+1).padStart(2,"0")+" / AREA "+String(r.regionIndex+1).padStart(2,"0")+"</small><b>"+r.name+"</b><small>"+r.biome.toUpperCase()+"</small><p>"+r.lore+"</p><div class='region-progress'><i style='width:"+percent+"%'></i></div><span class='region-state'>"+(complete?"COMPLETE":active?"ACTIVE REGION":locked?"LOCKED":"AVAILABLE")+" <b>"+percent+"%</b></span>";
 b.disabled=locked||complete||!active;b.addEventListener("click",()=>{if(active)$("region-overlay").hidden=true;});list.appendChild(b);});
}

function updateWorldUI(){
 const i=WORLDS.findIndex(w=>w.id===currentWorld.id);$("world-index").textContent=String(i+1).padStart(2,"0")+" / 06";$("world-name").textContent=currentWorld.name;$("world-subtitle").textContent=currentWorld.title;
 $("world-sector").textContent="SECTOR "+String(i+1).padStart(2,"0")+" · "+currentWorld.type;
 $("world-subtitle").textContent=currentRegion.name;const x=avatar.group.position.x,z=avatar.group.position.z;$("coordinates").textContent=(12.08+x*.004).toFixed(2)+"° N  ·  "+(34.3+z*.004).toFixed(2)+"° E";
}
function updateUI(){
 const done=currentRegion.tasks.filter(t=>regionState(t).complete).length,percent=regionPercent(),complete=done===5,next=REGIONS[save.regionCursor+1];
 $("shard-count").textContent=String(save.shards).padStart(4,"0");$("relay-count").textContent=done+" / 5";
 $("suit-status").textContent=flightMode?"AETHER FLIGHT · ACTIVE":save.flightUnlocked?"AETHER DRIVE · ONLINE":"EXOSUIT · FIELD EXPLORATION";
 $("quest-phase").textContent=currentWorld.name+" // "+currentRegion.biome.toUpperCase();$("quest-count").textContent="AREA "+String(currentRegion.regionIndex+1).padStart(2,"0")+" / 04 · WORLD "+String(currentRegion.planetIndex+1).padStart(2,"0")+" / 06";
 const words=currentRegion.name.split(" ");$("quest-title").innerHTML=words.slice(0,-1).join(" ")+"<br><em>"+words.slice(-1).join(" ")+"</em>";
 $("quest-description").textContent=currentRegion.lore;$("quest-progress-fill").style.width=percent+"%";$("quest-reward").textContent=percent+"% // "+done+" OF 5 CONTRACTS";
 $("objective-list").innerHTML=currentRegion.tasks.map(t=>{const st=regionState(t),ok=st.complete;let progress="PENDING";if(t.type==="survey"||t.type==="ruins"||t.type==="recover")progress=(st.count||0)+" / "+t.required;if(t.type==="boss")progress=(t.required-(st.hp||t.required))+" / "+t.required+" HITS";return `<div class="objective-row ${ok?"done":""}"><span class="objective-state"></span><span><b>${t.title}</b><small>${ok?"CONTRACT COMPLETE":progress}</small></span></div>`;}).join("");
 $("region-advance").hidden=!complete;$("region-advance").innerHTML=next?(next.planetId!==currentWorld.id?"COMPLETE PLANET // LAUNCH "+next.planetName:"ENTER NEXT REGION // "+next.name):"ALL FRONTEERS COMPLETE // EPILOGUE";
 $("flight-button").disabled=!save.flightUnlocked;$("atlas-button").disabled=false;
 updateAtlas();updateRegionMap();
}
function updatePrompt(){
 const target=nearestInteractable(),prompt=$("interaction-prompt"),nav=$("target-label");
 const dx=currentRegion.center.x-avatar.group.position.x,dz=currentRegion.center.z-avatar.group.position.z,meters=Math.round(Math.hypot(dx,dz)),bearing=((Math.atan2(dx,dz)*180/Math.PI)+360)%360;
 nav.querySelector("span").textContent=currentRegion.name+" // "+meters+" M";nav.style.setProperty("--bearing",bearing+"deg");
 if(!target){prompt.hidden=true;return;}prompt.hidden=false;const role=target.userData.role;
 $("interaction-label").textContent=role==="story"?"SPEAK WITH "+target.userData.label:role==="boss"?"F // STRIKE "+target.userData.label:role==="bonus"?"RECOVER HIDDEN "+target.userData.label:role==="survey"?"SCAN "+target.userData.label:role==="ruins"?"ALIGN RUIN PYLON "+target.userData.label:"RECOVER "+target.userData.label;
}
function updateFlightReadout(){
 if(!flightMode)return;
 if(travelSequence){
  const tr=travelSequence,t=tr.time;let speed=0,altitude=Math.max(0,avatar.group.position.y-getGround(avatar.group.position.x,avatar.group.position.z));
  if(tr.samePlanet)speed=t<2.2?280/2.2:t<5.35?Math.hypot(tr.landingX-tr.startX,tr.landingZ-tr.startZ)/3.15:280/1.85;
  else if(t<3.5)speed=640/3.5;else if(t<7.35){speed=720;altitude=0;}else speed=620/3.2;
  $("altitude-value").textContent=!tr.samePlanet&&tr.phase==="cruise"?"ORBIT":String(Math.round(altitude)).padStart(3,"0")+" M";
  $("flight-speed").textContent=String(Math.round(speed*18)).padStart(3,"0")+" KM/H";return;
 }
 const altitude=Math.max(0,avatar.group.position.y-getGround(avatar.group.position.x,avatar.group.position.z));
 $("altitude-value").textContent=String(Math.round(altitude)).padStart(3,"0")+" M";$("flight-speed").textContent=String(Math.round(Math.hypot(velocityY,horizontalFlightSpeed)*18)).padStart(3,"0")+" KM/H";
}
function animate(){
 requestAnimationFrame(animate);const dt=Math.min(clock.getDelta(),.035);elapsed+=dt;frame++;
 if(travelSequence){updateInterplanetaryTravel(dt);if(travelSequence)animateExosuitFlight(dt);}else moveRobot(dt);updateCamera(dt);if(skyShell)skyShell.position.copy(camera.position);
 if(terrain?.userData?.updateAround)terrain.userData.updateAround(avatar.group.position.x,avatar.group.position.z);
 if(sunLight){sunLight.position.set(avatar.group.position.x-180,avatar.group.position.y+260,avatar.group.position.z-130);sunLight.target.position.copy(avatar.group.position);sunLight.target.updateMatrixWorld();}
 if(!flightMode&&(keys.has("KeyW")||keys.has("KeyA")||keys.has("KeyS")||keys.has("KeyD"))){stepAccumulator+=dt;if(stepAccumulator>.46){stepAccumulator=0;AudioSystem.playSfx("step");}}
 if(!travelSequence&&elapsed>eventNextAt)triggerWorldEvent();
 if(!travelSequence&&activeEvent&&elapsed>eventUntil){clearWorldEvent();}
 if(!travelSequence&&worldRoot)worldRoot.traverse(o=>{if(o.userData?.floating){o.position.y=o.userData.baseY+Math.sin(elapsed*0.8+o.position.x*.01)*2.8;o.rotation.y+=dt*.13;}});
 if(frame%8===0){updatePrompt();updateWorldUI();updateFlightReadout();}
 if(frame%600===0)persist();
 if(worldRoot)worldRoot.children.forEach(o=>{if(o.userData&&o.userData.active===false&&o.userData.light){const s=1+Math.sin(elapsed*2.2)*.035;o.scale.setScalar(s);}});
 renderer.render(scene,camera);
}
