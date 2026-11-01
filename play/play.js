const THREE_URL="https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js";
const SAVE_KEY="astrospace-prologue-v1";
const WORLDS=[
{id:"kharon",name:"ELYNDRA",title:"THE VERDANT AURORA",type:"TEMPERATE BIOSPHERE",palette:["#162c36","#376a53","#78ad78","#c9d5a9"],sky:"#071824",fog:"#183d42",accent:"#80e3c0",light:"#e1d8af",seed:17,terrain:0,summary:"Cobalt oceans, jade forests and ancient relay towers beneath a ribbon of living aurora."},
{id:"vespera",name:"NERITH",title:"THE LUMINOUS PELAGIC",type:"OCEANIC FRONTIER",palette:["#092b40","#0b6977","#35b8a2","#a5e5d3"],sky:"#061b2a",fog:"#0e4351",accent:"#4af0d7",light:"#a2f4e8",seed:43,terrain:1,summary:"An endless tide world where luminous reef networks pulse beneath a storm-wrapped sky."},
{id:"cinder",name:"KALDRAX",title:"THE OBSIDIAN FURNACE",type:"PYROCLASTIC WORLD",palette:["#1c1820","#5b3030","#a94b31","#eea06a"],sky:"#170c14",fog:"#5b2927",accent:"#ff8a4d",light:"#ffc18b",seed:86,terrain:2,summary:"Black glass plateaus, molten rivers and enormous volcanic crowns split the living crust."},
{id:"nox",name:"VANTHRIS",title:"THE GRAVITY REMNANT",type:"FRACTURED WORLD",palette:["#17172b","#3c3267","#8275ad","#d6c5ed"],sky:"#100e22",fog:"#342a59",accent:"#ba9cff",light:"#d4c7ff",seed:131,terrain:3,summary:"A broken planetary shell suspended above a violet gravity well. Nothing here falls normally."},
{id:"aureon",name:"OROVANE",title:"THE EYE OF ORU",type:"SUPER-JOVIAN SKYLAND",palette:["#30263a","#735044","#c18b5f","#ead0a1"],sky:"#211a31",fog:"#8a6049",accent:"#f5c28a",light:"#ffe1bd",seed:209,terrain:4,summary:"A storm giant whose upper cloud deck carries drifting stone continents and a colossal cyclone."},
{id:"glaciera",name:"ISKARA",title:"THE SAPPHIRE CRYOSPHERE",type:"FROZEN OCEAN WORLD",palette:["#132f4e","#346f99","#8fc9db","#e7f5f5"],sky:"#06172e",fog:"#275b7c",accent:"#86e9ff",light:"#d9f5ff",seed:283,terrain:5,summary:"A frozen ocean sealed under a sapphire glacier shell, cut by luminous crevasses and crystal spires."}
];
const $=id=>document.getElementById(id),clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),lerp=(a,b,t)=>a+(b-a)*t;
const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
const toast=msg=>{const n=$("toast-message");n.textContent=msg;n.classList.add("visible");clearTimeout(toast.timer);toast.timer=setTimeout(()=>n.classList.remove("visible"),2900);};
const freshSave=()=>({relays:[false,false,false],flightUnlocked:false,visited:{kharon:true},surveyed:{},shards:0,currentWorld:"kharon",introSeen:false});
function loadSave(){try{const raw=localStorage.getItem(SAVE_KEY);if(!raw)return freshSave();const p=JSON.parse(raw),b=freshSave();return {...b,...p,relays:Array.isArray(p.relays)?p.relays.slice(0,3):b.relays,visited:{...b.visited,...p.visited},surveyed:{...p.surveyed}};}catch{return freshSave();}}
const save=loadSave();
let THREE,scene,camera,renderer,clock,avatar,worldRoot,terrain,craft,relays=[],currentWorld=WORLDS.find(w=>w.id===save.currentWorld)||WORLDS[0];
let yaw=0,pitch=.16,cameraDistance=9.4,dragging=false,lastX=0,lastY=0,flightMode=false,velocityY=0,jumpVelocity=0,elapsed=0,frame=0;
const keys=new Set(),touchKeys=new Set();

(async function boot(){
 const loader=$("loading-screen");
 try{THREE=await import(THREE_URL);initGame();loader.classList.add("loaded");setTimeout(()=>loader.remove(),850);if(!save.introSeen)$("intro-overlay").hidden=false;}
 catch(error){console.error("AstroSpace prologue boot failed",error);$("webgl-error").hidden=false;loader.classList.add("loaded");}
})();

function initGame(){
 scene=new THREE.Scene();scene.background=new THREE.Color(currentWorld.sky);scene.fog=new THREE.Fog(currentWorld.fog,55,245);
 camera=new THREE.PerspectiveCamera(62,1,.1,550);
 renderer=new THREE.WebGLRenderer({canvas:$("game-canvas"),antialias:true,alpha:false,powerPreference:"high-performance"});
 renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.18;
 renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.65));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;clock=new THREE.Clock();
 scene.add(new THREE.HemisphereLight(0xbfe7ed,0x16242d,.95));
 const sun=new THREE.DirectionalLight(currentWorld.light,3.15);sun.position.set(-78,115,-92);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-90;sun.shadow.camera.right=90;sun.shadow.camera.top=90;sun.shadow.camera.bottom=-90;sun.shadow.bias=-.00018;scene.add(sun);
 const fill=new THREE.DirectionalLight(currentWorld.accent,1.05);fill.position.set(65,38,70);scene.add(fill);
 const glow=new THREE.PointLight(currentWorld.accent,35,90,2);glow.position.set(0,22,0);scene.add(glow);
 createSky();avatar=createRobot();scene.add(avatar.group);buildWorld(currentWorld.id,false);bindUI();resize();
 window.addEventListener("resize",resize);window.addEventListener("keydown",onKeyDown);window.addEventListener("keyup",e=>keys.delete(e.code));window.addEventListener("blur",()=>{keys.clear();touchKeys.clear();});
 $("game-canvas").addEventListener("pointerdown",onPointerDown);window.addEventListener("pointermove",onPointerMove);window.addEventListener("pointerup",()=>dragging=false);
 $("game-canvas").addEventListener("wheel",e=>{e.preventDefault();cameraDistance=clamp(cameraDistance+e.deltaY*.008,5.5,15);},{passive:false});
 $("begin-button").addEventListener("click",()=>{$("intro-overlay").hidden=true;save.introSeen=true;persist();toast("A.R.I.A. ONLINE // RESTORE THE THREE ANCIENT RELAYS");});
 updateUI();requestAnimationFrame(animate);
}
function bindUI(){
 $("atlas-button").addEventListener("click",openAtlas);$("flight-button").addEventListener("click",toggleFlight);
 $("atlas-close").addEventListener("click",()=>$("atlas-overlay").hidden=true);
 $("touch-interact").addEventListener("pointerdown",e=>{e.preventDefault();interact();});
 $("touch-jump").addEventListener("pointerdown",e=>{e.preventDefault();if(flightMode)keys.add("Space");else jump();});
 $("touch-jump").addEventListener("pointerup",()=>keys.delete("Space"));$("touch-jump").addEventListener("pointercancel",()=>keys.delete("Space"));
 document.querySelectorAll("[data-key]").forEach(b=>{const k=b.dataset.key;b.addEventListener("pointerdown",e=>{e.preventDefault();touchKeys.add(k);b.setPointerCapture?.(e.pointerId);});const clear=()=>touchKeys.delete(k);b.addEventListener("pointerup",clear);b.addEventListener("pointercancel",clear);b.addEventListener("pointerleave",clear);});
}
function onKeyDown(e){
 if(["INPUT","TEXTAREA"].includes(document.activeElement?.tagName))return;
 if(["Space","ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].includes(e.code))e.preventDefault();
 if(e.repeat&&["KeyE","KeyM","KeyG"].includes(e.code))return;
 keys.add(e.code);if(e.code==="KeyE")interact();if(e.code==="KeyM")openAtlas();if(e.code==="KeyG")toggleFlight();if(e.code==="Escape"){$("atlas-overlay").hidden=true;dragging=false;}if(e.code==="Space"&&!flightMode)jump();
}
function onPointerDown(e){if(e.button!==0)return;dragging=true;lastX=e.clientX;lastY=e.clientY;$("game-canvas").setPointerCapture?.(e.pointerId);}
function onPointerMove(e){if(!dragging)return;const dx=e.clientX-lastX,dy=e.clientY-lastY;lastX=e.clientX;lastY=e.clientY;yaw-=dx*.0037;pitch=clamp(pitch+dy*.0022,-.12,.72);}
function resize(){if(!renderer)return;const w=Math.max(1,innerWidth),h=Math.max(1,innerHeight);renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}
function persist(){try{save.currentWorld=currentWorld.id;localStorage.setItem(SAVE_KEY,JSON.stringify(save));$("save-status").textContent="PROGRESS AUTO-SAVED";}catch(error){console.warn("Local save unavailable",error);$("save-status").textContent="LOCAL SAVE UNAVAILABLE";}}

function createSky(){
 const count=4200,pos=new Float32Array(count*3),colors=new Float32Array(count*3);
 for(let i=0;i<count;i++){const y=Math.random()*2-1,a=Math.random()*Math.PI*2,r=Math.sqrt(1-y*y)*330;pos[i*3]=Math.cos(a)*r;pos[i*3+1]=y*330;pos[i*3+2]=Math.sin(a)*r;const c=new THREE.Color().setHSL(.48+Math.random()*.16,.28,.63+Math.random()*.32);colors[i*3]=c.r;colors[i*3+1]=c.g;colors[i*3+2]=c.b;}
 const g=new THREE.BufferGeometry();g.setAttribute("position",new THREE.BufferAttribute(pos,3));g.setAttribute("color",new THREE.BufferAttribute(colors,3));
 const stars=new THREE.Points(g,new THREE.PointsMaterial({size:.72,sizeAttenuation:true,vertexColors:true,transparent:true,opacity:.88,depthWrite:false}));scene.add(stars);
 const moon=new THREE.Group();moon.add(new THREE.Mesh(new THREE.SphereGeometry(9,48,36),new THREE.MeshStandardMaterial({color:"#a9c2c6",roughness:1})));moon.position.set(92,68,-190);scene.add(moon);
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
 const broad=fbm2(x*.012,z*.012,w.seed),mid=fbm2(x*.036+4,z*.036-3,w.seed+9),ridge=1-Math.abs(fbm2(x*.052-7,z*.052+3,w.seed+29)*2-1),fine=fbm2(x*.13,z*.13,w.seed+47);
 let h=(broad-.43)*17+(ridge-.42)*8+(fine-.5)*1.65;
 if(w.terrain===1)h=(broad-.49)*8+(ridge-.58)*3;
 if(w.terrain===2)h=(broad-.42)*20+Math.pow(ridge,2)*13+(fine-.5)*3;
 if(w.terrain===3)h=(broad-.44)*22+(ridge-.35)*13+(fine-.5)*4;
 if(w.terrain===4)h=(broad-.45)*8+(ridge-.4)*5;
 if(w.terrain===5)h=(broad-.44)*14+(ridge-.38)*10+(fine-.5)*2;
 return lerp(0,h,smooth(7,31,Math.hypot(x,z)));
}
function deterministic(i,seed){const n=Math.sin(i*127.1+seed*311.7)*43758.5453;return n-Math.floor(n);}
function createTerrain(w){
 const size=360,seg=184,geo=new THREE.PlaneGeometry(size,size,seg,seg);geo.rotateX(-Math.PI/2);
 const p=geo.attributes.position,colors=new Float32Array(p.count*3),pal=w.palette.map(c=>new THREE.Color(c));
 for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i),h=terrainHeight(x,z,w);p.setY(i,h);const n=fbm2(x*.09,z*.09,w.seed+61);
 let c=pal[0].clone().lerp(pal[1],clamp(.28+n*.45+h*.012,0,1));c.lerp(pal[2],clamp((h-3)/20,0,.72));c.lerp(pal[3],clamp((h-13)/17,0,.78));
 if(w.terrain===0&&n>.69)c.lerp(new THREE.Color("#356c58"),.16);if(w.terrain===2&&n>.58)c.lerp(new THREE.Color("#eb7040"),.2);
 colors[i*3]=c.r;colors[i*3+1]=c.g;colors[i*3+2]=c.b;}
 p.needsUpdate=true;geo.setAttribute("color",new THREE.BufferAttribute(colors,3));geo.computeVertexNormals();
 const mesh=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({vertexColors:true,roughness:w.terrain===1?.48:.9,metalness:w.terrain===3?.16:.035}));mesh.receiveShadow=true;return mesh;
}
function createMountainRidge(w){
 const group=new THREE.Group(),mat=new THREE.MeshStandardMaterial({color:w.palette[0],roughness:.97,flatShading:true});
 for(let i=0;i<42;i++){const a=i/42*Math.PI*2,r=138+deterministic(i,w.seed)*26,x=Math.cos(a)*r,z=Math.sin(a)*r,h=16+deterministic(i+82,w.seed)*33,width=8+deterministic(i+17,w.seed)*13;
 const m=new THREE.Mesh(new THREE.ConeGeometry(width,h,8),mat);m.position.set(x,terrainHeight(x,z,w)+h*.34,z);m.castShadow=true;group.add(m);}
 return group;
}
function createWorldDecor(w){
 const group=new THREE.Group(),dummy=new THREE.Object3D();
 const rocks=new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1,1),new THREE.MeshStandardMaterial({color:w.palette[1],roughness:.92,flatShading:true}),175);
 for(let i=0;i<175;i++){const a=deterministic(i,w.seed)*Math.PI*2,r=24+deterministic(i+37,w.seed)*126,x=Math.cos(a)*r,z=Math.sin(a)*r,y=terrainHeight(x,z,w);
 const sx=.7+deterministic(i+71,w.seed)*3.2,sy=.55+deterministic(i+81,w.seed)*2.4,sz=.7+deterministic(i+91,w.seed)*3;
 dummy.position.set(x,y+sy*.35,z);dummy.rotation.set(deterministic(i+3,8)*2,deterministic(i+4,9)*4,deterministic(i+5,7)*2);dummy.scale.set(sx,sy,sz);dummy.updateMatrix();rocks.setMatrixAt(i,dummy.matrix);}
 rocks.castShadow=true;rocks.receiveShadow=true;group.add(rocks);
 let geometry,count=72,scale=1;
 if(w.terrain===0){geometry=new THREE.ConeGeometry(.36,2.3,7);count=115;}
 else if(w.terrain===1){geometry=new THREE.ConeGeometry(.55,2.6,6);count=92;scale=1.15;}
 else if(w.terrain===2){geometry=new THREE.ConeGeometry(.9,6.6,7);count=64;scale=1.4;}
 else if(w.terrain===3){geometry=new THREE.IcosahedronGeometry(1.2,1);count=86;scale=1.35;}
 else if(w.terrain===4){geometry=new THREE.DodecahedronGeometry(1.6,1);count=56;scale=1.4;}
 else{geometry=new THREE.OctahedronGeometry(1.15,1);count=82;scale=1.25;}
 const mat=new THREE.MeshStandardMaterial({color:w.accent,roughness:w.terrain===5?.22:.58,metalness:w.terrain===5?.32:.16,emissive:w.accent,emissiveIntensity:w.terrain===2?.48:.12});
 const features=new THREE.InstancedMesh(geometry,mat,count);
 for(let i=0;i<count;i++){const a=deterministic(i+12,w.seed+44)*Math.PI*2,r=27+deterministic(i+42,w.seed+44)*112,x=Math.cos(a)*r,z=Math.sin(a)*r,h=terrainHeight(x,z,w),s=(.6+deterministic(i+76,w.seed)*1.5)*scale;
 if(w.terrain===3||w.terrain===4){dummy.position.set(x,h+5+deterministic(i+22,w.seed)*13,z);dummy.rotation.set(deterministic(i+9,w.seed)*1.5,deterministic(i+4,w.seed)*4,deterministic(i+6,w.seed)*1.5);}
 else{dummy.position.set(x,h+s*1.2,z);dummy.rotation.set(0,deterministic(i+4,w.seed)*6.28,(deterministic(i+7,w.seed)-.5)*.25);}
 dummy.scale.set(s,s*(.65+deterministic(i+7,w.seed)*1.35),s);dummy.updateMatrix();features.setMatrixAt(i,dummy.matrix);}
 features.castShadow=true;features.receiveShadow=true;group.add(features);
 if(w.terrain===0||w.terrain===1){const bulbs=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(.34,1),new THREE.MeshStandardMaterial({color:"#9effcd",emissive:"#39eaa6",emissiveIntensity:1.8,roughness:.25}),115);
  for(let i=0;i<115;i++){const a=deterministic(i+9,w.seed)*Math.PI*2,r=18+deterministic(i+11,w.seed)*118,x=Math.cos(a)*r,z=Math.sin(a)*r,h=terrainHeight(x,z,w),s=.55+deterministic(i+81,w.seed)*1.2;dummy.position.set(x,h+1.2+s,z);dummy.rotation.set(0,deterministic(i,1)*6,0);dummy.scale.set(s,s,s);dummy.updateMatrix();bulbs.setMatrixAt(i,dummy.matrix);}group.add(bulbs);}
 if(w.terrain===2){const lm=new THREE.MeshBasicMaterial({color:"#ff7138",transparent:true,opacity:.5});for(let i=0;i<9;i++){const x=(deterministic(i,9)-.5)*145,z=(deterministic(i,99)-.5)*145,h=terrainHeight(x,z,w),stream=new THREE.Mesh(new THREE.CylinderGeometry(.12,.26,9+deterministic(i,8)*15,8),lm);stream.position.set(x,h+.12,z);stream.rotation.z=(deterministic(i,7)-.5)*.4;group.add(stream);}}
 if(w.terrain===5){const cm=new THREE.MeshPhysicalMaterial({color:"#bbf7ff",roughness:.14,metalness:.22,clearcoat:1,emissive:"#42c9f2",emissiveIntensity:.7});
  for(let i=0;i<24;i++){const x=(deterministic(i,73)-.5)*150,z=(deterministic(i,127)-.5)*150,h=terrainHeight(x,z,w),height=4+deterministic(i,18)*10,crystal=new THREE.Mesh(new THREE.OctahedronGeometry(.7,0),cm);crystal.position.set(x,h+height*.43,z);crystal.scale.set(.8,height,.8);crystal.rotation.y=deterministic(i,4)*3.14;crystal.castShadow=true;group.add(crystal);}}
 if(w.terrain===4){const cm=new THREE.MeshStandardMaterial({color:"#e5c6a3",transparent:true,opacity:.45,roughness:1});for(let i=0;i<22;i++){const x=(deterministic(i,44)-.5)*180,z=(deterministic(i,84)-.5)*160,cloud=new THREE.Mesh(new THREE.SphereGeometry(6+deterministic(i,34)*8,16,12),cm);cloud.position.set(x,8+deterministic(i,54)*13,z);cloud.scale.set(1.7,.35,1);group.add(cloud);}}
 return group;
}
function makePylon(index,x,z,label,accent){
 const group=new THREE.Group(),metal=new THREE.MeshStandardMaterial({color:"#29444c",metalness:.74,roughness:.27}),glowMat=new THREE.MeshStandardMaterial({color:accent,emissive:accent,emissiveIntensity:2.4,metalness:.15,roughness:.22});
 const add=(geo,mat,px,py,pz)=>{const m=new THREE.Mesh(geo,mat);m.position.set(px,py,pz);m.castShadow=true;group.add(m);return m;};
 add(new THREE.CylinderGeometry(2.5,3.2,.9,10),metal,0,.45,0);
 const collar=add(new THREE.TorusGeometry(2.2,.12,10,48),glowMat,0,1,0);collar.rotation.x=Math.PI/2;
 add(new THREE.CylinderGeometry(.48,.92,4.5,7),metal,0,3.1,0);
 const crown=add(new THREE.OctahedronGeometry(1.05,1),glowMat,0,5.55,0);crown.rotation.y=.3;
 const r1=add(new THREE.TorusGeometry(1.55,.055,8,48),glowMat,0,4.1,0);r1.rotation.x=Math.PI/2;
 const r2=add(new THREE.TorusGeometry(1.12,.055,8,48),glowMat,0,6.6,0);r2.rotation.x=Math.PI/2;
 const beam=add(new THREE.CylinderGeometry(.1,.7,42,12,1,true),new THREE.MeshBasicMaterial({color:accent,transparent:true,opacity:.075,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending}),0,18,0);
 const light=new THREE.PointLight(accent,16,28,2);light.position.y=5.6;group.add(light);
 group.position.set(x,terrainHeight(x,z,currentWorld),z);group.userData={id:index,label:label,active:false,light:light,glowMat:glowMat,beam:beam};return group;
}
function activatePylon(p){
 p.userData.active=true;p.userData.glowMat.emissiveIntensity=4.4;p.userData.light.intensity=31;p.userData.beam.material.opacity=.21;
 const ring=new THREE.Mesh(new THREE.TorusGeometry(3.1,.055,8,72),new THREE.MeshBasicMaterial({color:"#b8fff0",transparent:true,opacity:.82}));ring.rotation.x=Math.PI/2;ring.position.y=.22;p.add(ring);
}
function createCraft(){
 const group=new THREE.Group(),pad=new THREE.Mesh(new THREE.CylinderGeometry(8.4,9.2,.7,64),new THREE.MeshStandardMaterial({color:"#152d3b",metalness:.62,roughness:.4}));pad.position.y=.35;pad.receiveShadow=true;group.add(pad);
 const padRing=new THREE.Mesh(new THREE.TorusGeometry(7.7,.12,10,96),new THREE.MeshBasicMaterial({color:"#70deda",transparent:true,opacity:.8}));padRing.rotation.x=Math.PI/2;padRing.position.y=.78;group.add(padRing);
 for(let i=0;i<4;i++){const mark=new THREE.Mesh(new THREE.BoxGeometry(.18,.035,3.2),new THREE.MeshBasicMaterial({color:"#8beee4"}));mark.position.set(Math.cos(i*Math.PI/2)*5,.74,Math.sin(i*Math.PI/2)*5);mark.rotation.y=-i*Math.PI/2;group.add(mark);}
 const ship=new THREE.Group(),body=new THREE.MeshStandardMaterial({color:"#bacdd0",metalness:.78,roughness:.23}),dark=new THREE.MeshStandardMaterial({color:"#253c4b",metalness:.85,roughness:.28}),glass=new THREE.MeshPhysicalMaterial({color:"#8ef6ec",metalness:.12,roughness:.07,transmission:.35,emissive:"#216d70",emissiveIntensity:.5});
 const hull=new THREE.Mesh(new THREE.CapsuleGeometry(1.1,4.4,8,16),body);hull.rotation.x=Math.PI/2;hull.position.set(0,2.7,-1.4);ship.add(hull);
 const cockpit=new THREE.Mesh(new THREE.SphereGeometry(1.13,32,24),glass);cockpit.scale.set(.93,.58,1.1);cockpit.position.set(0,3.2,-3);ship.add(cockpit);
 const wg=new THREE.BufferGeometry();wg.setAttribute("position",new THREE.Float32BufferAttribute([-.75,2.6,-1,-7,1.8,1.8,-1.2,2.4,3.3,.75,2.6,-1,1.2,2.4,3.3,7,1.8,1.8],3));wg.setIndex([0,1,2,3,4,5]);wg.computeVertexNormals();ship.add(new THREE.Mesh(wg,new THREE.MeshStandardMaterial({color:"#638c9a",metalness:.74,roughness:.3,side:THREE.DoubleSide})));
 for(let side=-1;side<=1;side+=2){const engine=new THREE.Mesh(new THREE.CylinderGeometry(.32,.5,1.2,16),dark);engine.rotation.x=Math.PI/2;engine.position.set(side*2,2.3,1.6);ship.add(engine);const flame=new THREE.Mesh(new THREE.ConeGeometry(.38,2.2,16),new THREE.MeshBasicMaterial({color:"#64e9ed",transparent:true,opacity:.62,blending:THREE.AdditiveBlending}));flame.rotation.x=Math.PI;flame.position.set(side*2,2.3,2.8);ship.add(flame);}
 group.add(ship);const lamp=new THREE.PointLight("#64dfe4",23,35,2);lamp.position.set(0,4,0);group.add(lamp);return group;
}
function createRobot(){
 const root=new THREE.Group(),metal=new THREE.MeshStandardMaterial({color:"#c0d0d5",metalness:.76,roughness:.27}),dark=new THREE.MeshStandardMaterial({color:"#263d4a",metalness:.82,roughness:.32}),accent=new THREE.MeshStandardMaterial({color:"#5bd4d0",metalness:.25,roughness:.22,emissive:"#1c8d87",emissiveIntensity:.65}),glow=new THREE.MeshStandardMaterial({color:"#b6ffff",emissive:"#3be7e4",emissiveIntensity:2.3,roughness:.16});
 const add=(parent,geo,mat,x,y,z,sx=1,sy=1,sz=1)=>{const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;};
 add(root,new THREE.CylinderGeometry(.48,.56,.42,12),dark,0,1.25,0);add(root,new THREE.BoxGeometry(1.06,1.12,.66),metal,0,2.05,0,1,1,.86);
 add(root,new THREE.BoxGeometry(.72,.64,.12),dark,0,2.12,.38);add(root,new THREE.OctahedronGeometry(.21,1),glow,0,2.14,.47);
 add(root,new THREE.BoxGeometry(.76,.25,.52),dark,0,2.7,-.02);
 const head=new THREE.Group();head.position.set(0,2.95,.02);root.add(head);
 add(head,new THREE.SphereGeometry(.48,28,22),metal,0,.43,0,1,.95,.83);add(head,new THREE.BoxGeometry(.69,.27,.12),dark,0,.43,.38,1,1,.35);
 add(head,new THREE.BoxGeometry(.53,.1,.055),glow,0,.45,.445);add(head,new THREE.SphereGeometry(.075,12,10),glow,-.42,.43,.05);add(head,new THREE.SphereGeometry(.075,12,10),glow,.42,.43,.05);
 const antenna=add(head,new THREE.CylinderGeometry(.025,.04,.48,8),dark,.13,.94,-.03);add(head,new THREE.SphereGeometry(.09,16,12),glow,.13,1.2,-.03);
 add(root,new THREE.BoxGeometry(.64,.98,.4),dark,0,2.2,-.46);const packGlow=add(root,new THREE.BoxGeometry(.36,.52,.06),accent,0,2.24,-.69);
 const leftArm=new THREE.Group();leftArm.position.set(-.68,2.55,0);root.add(leftArm);const rightArm=new THREE.Group();rightArm.position.set(.68,2.55,0);root.add(rightArm);
 for(const arm of [leftArm,rightArm]){add(arm,new THREE.SphereGeometry(.19,16,12),dark,0,-.08,0);add(arm,new THREE.CapsuleGeometry(.15,.54,4,8),metal,0,-.46,0);add(arm,new THREE.TorusGeometry(.16,.045,8,16),accent,0,-.42,0);add(arm,new THREE.CapsuleGeometry(.13,.42,4,8),dark,0,-.93,.02);add(arm,new THREE.BoxGeometry(.27,.24,.24),metal,0,-1.22,.05);}
 const leftLeg=new THREE.Group();leftLeg.position.set(-.31,1.28,0);root.add(leftLeg);const rightLeg=new THREE.Group();rightLeg.position.set(.31,1.28,0);root.add(rightLeg);
 for(const leg of [leftLeg,rightLeg]){add(leg,new THREE.SphereGeometry(.22,16,12),dark,0,-.06,0);add(leg,new THREE.CapsuleGeometry(.18,.54,4,8),metal,0,-.43,0);add(leg,new THREE.BoxGeometry(.42,.22,.66),dark,0,-.86,.12);add(leg,new THREE.BoxGeometry(.16,.065,.08),accent,0,-.5,.19);}
 const thrusterLeft=add(root,new THREE.ConeGeometry(.13,.75,12),glow,-.23,1.62,-.72),thrusterRight=add(root,new THREE.ConeGeometry(.13,.75,12),glow,.23,1.62,-.72);
 thrusterLeft.rotation.x=Math.PI;thrusterRight.rotation.x=Math.PI;thrusterLeft.visible=false;thrusterRight.visible=false;
 return {group:root,leftArm,rightArm,leftLeg,rightLeg,head,thrusterLeft,thrusterRight,packGlow,antenna};
}

function buildWorld(worldId,travel=true){
 const next=WORLDS.find(w=>w.id===worldId)||WORLDS[0];
 if(worldRoot){scene.remove(worldRoot);worldRoot.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material){if(Array.isArray(o.material))o.material.forEach(m=>m.dispose());else o.material.dispose();}});}
 currentWorld=next;scene.background=new THREE.Color(next.sky);scene.fog=new THREE.Fog(next.fog,55,245);
 worldRoot=new THREE.Group();scene.add(worldRoot);worldRoot.add(createTerrain(next));worldRoot.add(createMountainRidge(next));worldRoot.add(createWorldDecor(next));
 relays=[];
 if(next.id==="kharon"){
  const pos=[[-31,-17],[31,-21],[4,48]],labels=["WESTERN CANOPY RELAY","EASTERN RIDGE RELAY","SOUTHERN ROOT RELAY"];
  for(let i=0;i<3;i++){const p=makePylon(i,pos[i][0],pos[i][1],labels[i],next.accent);if(save.relays[i])activatePylon(p);worldRoot.add(p);relays.push(p);}
  craft=createCraft();craft.position.set(7,terrainHeight(7,9,next),9);worldRoot.add(craft);
  createAurora(worldRoot);
 }else{
  craft=null;
  if(!save.surveyed[next.id]){const p=makePylon(0,0,-42,"PLANETARY ANOMALY",next.accent);worldRoot.add(p);relays.push(p);}
 }
 const sx=0,sz=0;
 avatar.group.position.set(sx,terrainHeight(sx,sz,next),sz);avatar.group.rotation.y=0;
 velocityY=0;jumpVelocity=0;flightMode=false;avatar.thrusterLeft.visible=false;avatar.thrusterRight.visible=false;
 $("flight-hud").hidden=true;$("flight-button").classList.remove("selected");$("flight-button").innerHTML="<span>✧</span> AETHER FLIGHT <kbd>G</kbd>";
 $("control-guide").innerHTML="<span><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> MOVE</span><span><kbd>SHIFT</kbd> RUN</span><span><kbd>SPACE</kbd> JUMP</span><span><kbd>E</kbd> INTERACT</span><span><kbd>DRAG</kbd> LOOK</span>";
 if(travel){save.currentWorld=next.id;save.visited[next.id]=true;persist();toast("PLANETARY INSERTION COMPLETE // "+next.name);}
 updateWorldUI();updateUI();
}
function jump(){if(!flightMode&&Math.abs(jumpVelocity)<.01)jumpVelocity=8.4;}
function getGround(x,z){return terrainHeight(x,z,currentWorld);}
function moveRobot(dt){
 const active=new Set([...keys,...touchKeys]),forward=(active.has("KeyW")||active.has("ArrowUp")?1:0)-(active.has("KeyS")||active.has("ArrowDown")?1:0),strafe=(active.has("KeyD")||active.has("ArrowRight")?1:0)-(active.has("KeyA")||active.has("ArrowLeft")?1:0),running=active.has("ShiftLeft")||active.has("ShiftRight");
 const speed=running?12.2:6.1,dx=Math.sin(yaw),dz=Math.cos(yaw),rx=Math.cos(yaw),rz=-Math.sin(yaw);
 let mx=dx*forward+rx*strafe,mz=dz*forward+rz*strafe,mag=Math.hypot(mx,mz);if(mag>1){mx/=mag;mz/=mag;}
 if(flightMode){
  const boost=running?2.45:1;avatar.group.position.x+=mx*speed*boost*dt;avatar.group.position.z+=mz*speed*boost*dt;
  if(active.has("Space"))velocityY=Math.min(22,velocityY+24*dt);else if(active.has("ControlLeft")||active.has("ControlRight"))velocityY=Math.max(-18,velocityY-24*dt);else velocityY=lerp(velocityY,0,dt*1.1);
  avatar.group.position.y+=velocityY*dt;avatar.group.position.y=Math.max(getGround(avatar.group.position.x,avatar.group.position.z)+2.2,avatar.group.position.y);
 }else{
  avatar.group.position.x+=mx*speed*dt;avatar.group.position.z+=mz*speed*dt;const ground=getGround(avatar.group.position.x,avatar.group.position.z);
  if(jumpVelocity!==0||avatar.group.position.y>ground+.015){jumpVelocity-=22*dt;avatar.group.position.y+=jumpVelocity*dt;if(avatar.group.position.y<=ground){avatar.group.position.y=ground;jumpVelocity=0;}}else avatar.group.position.y=ground;
 }
 avatar.group.position.x=clamp(avatar.group.position.x,-165,165);avatar.group.position.z=clamp(avatar.group.position.z,-165,165);
 if(mag>.08)avatar.group.rotation.y=Math.atan2(mx,mz);
 const phase=elapsed*(running?10.5:7.2),walk=mag*(running?1.7:1);
 avatar.leftLeg.rotation.x=Math.sin(phase)*.56*walk;avatar.rightLeg.rotation.x=-Math.sin(phase)*.56*walk;
 avatar.leftArm.rotation.x=-Math.sin(phase)*.42*walk;avatar.rightArm.rotation.x=Math.sin(phase)*.42*walk;avatar.head.rotation.y=Math.sin(elapsed*.8)*.045;
 if(flightMode){avatar.thrusterLeft.visible=true;avatar.thrusterRight.visible=true;avatar.thrusterLeft.scale.y=1+Math.random()*.5;avatar.thrusterRight.scale.y=1+Math.random()*.5;}
 else{avatar.thrusterLeft.visible=false;avatar.thrusterRight.visible=false;}
}
function updateCamera(dt){
 const d=flightMode?12:cameraDistance,desired=new THREE.Vector3(avatar.group.position.x-Math.sin(yaw)*d,avatar.group.position.y+3.8+pitch*6,avatar.group.position.z-Math.cos(yaw)*d);
 camera.position.lerp(desired,1-Math.pow(.001,dt));camera.lookAt(avatar.group.position.x,avatar.group.position.y+2.05,avatar.group.position.z);
}
function nearestInteractable(){
 let best=null,bestD=6.4;
 for(const p of relays){if(p.userData.active)continue;const d=avatar.group.position.distanceTo(p.position);if(d<bestD){best=p;bestD=d;}}
 if(currentWorld.id==="kharon"&&save.relays.every(Boolean)&&!save.flightUnlocked&&craft){const d=avatar.group.position.distanceTo(craft.position);if(d<bestD){best=craft;bestD=d;}}
 return best;
}
function interact(){
 if(!$("atlas-overlay").hidden)return;
 const target=nearestInteractable();if(!target){toast("NO INTERACTIVE SIGNAL IN RANGE");return;}
 if(target.userData&&target.userData.label){
  if(currentWorld.id==="kharon"){
   const id=target.userData.id;save.relays[id]=true;activatePylon(target);save.shards++;persist();updateUI();
   const n=save.relays.filter(Boolean).length;toast(n===3?"ALL THREE RELAYS SYNCHRONISED // RETURN TO YOUR CRAFT":"RELAY "+String(id+1).padStart(2,"0")+" SYNCHRONISED // "+n+" / 03");
  }else{save.surveyed[currentWorld.id]=true;save.shards+=3;activatePylon(target);persist();updateUI();toast(currentWorld.name+" ARCHIVED // PLANETARY DATA SECURED");}
 }else if(target===craft&&!save.flightUnlocked){
  save.flightUnlocked=true;persist();updateUI();$("flight-button").disabled=false;$("atlas-button").disabled=false;toast("AETHER DRIVE INSTALLED // FLIGHT AND STAR ATLAS UNLOCKED");openAtlas();
 }
}
function toggleFlight(){
 if(!save.flightUnlocked){toast("FLIGHT LOCKED // RESTORE THE THREE ELYNDRAN RELAYS FIRST");return;}
 flightMode=!flightMode;$("flight-hud").hidden=!flightMode;$("flight-button").classList.toggle("selected",flightMode);
 $("flight-button").innerHTML=flightMode?"<span>✧</span> LAND / WALK <kbd>G</kbd>":"<span>✧</span> AETHER FLIGHT <kbd>G</kbd>";
 $("control-guide").innerHTML=flightMode?"<span><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> FLY</span><span><kbd>SPACE</kbd> ASCEND</span><span><kbd>CTRL</kbd> DESCEND</span><span><kbd>SHIFT</kbd> BOOST</span><span><kbd>G</kbd> LAND</span>":"<span><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> MOVE</span><span><kbd>SHIFT</kbd> RUN</span><span><kbd>SPACE</kbd> JUMP</span><span><kbd>E</kbd> INTERACT</span><span><kbd>DRAG</kbd> LOOK</span>";
 velocityY=0;if(!flightMode)avatar.group.position.y=getGround(avatar.group.position.x,avatar.group.position.z);toast(flightMode?"AETHER PROPULSION ONLINE":"TOUCHDOWN // EXPLORATION MODE");
}
function openAtlas(){if(!save.flightUnlocked){toast("STAR ATLAS LOCKED // COMPLETE THE ELYNDRA PROLOGUE");return;}updateAtlas();$("atlas-overlay").hidden=false;}
function updateAtlas(){
 const container=$("atlas-grid");if(!container)return;container.innerHTML="";
 WORLDS.forEach((w,i)=>{const b=document.createElement("button");b.type="button";b.className="atlas-world"+(w.id===currentWorld.id?" current":"");
 b.style.setProperty("--planet-light",w.palette[3]);b.style.setProperty("--planet-dark",w.palette[0]);b.style.setProperty("--planet-glow",w.accent);
 const state=save.surveyed[w.id]?"ARCHIVE COMPLETE":save.visited[w.id]?"EXPEDITION ACTIVE":w.id==="kharon"?"HOMEWORLD":"DESTINATION READY";
 b.innerHTML="<span class='planet-number'>0"+(i+1)+" // "+w.type+"</span><b>"+w.name+"</b><small>"+w.title+"</small><span class='world-state'>"+state+"</span>";
 b.addEventListener("click",()=>{if(w.id!==currentWorld.id)buildWorld(w.id,true);$("atlas-overlay").hidden=true;});container.appendChild(b);});
}
function updateWorldUI(){
 const i=WORLDS.findIndex(w=>w.id===currentWorld.id);$("world-index").textContent=String(i+1).padStart(2,"0")+" / 06";$("world-name").textContent=currentWorld.name;$("world-subtitle").textContent=currentWorld.title;
 $("world-sector").textContent="SECTOR "+String(i+1).padStart(2,"0")+" · "+currentWorld.type;
 const x=avatar.group.position.x,z=avatar.group.position.z;$("coordinates").textContent=(12.08+x*.004).toFixed(2)+"° N  ·  "+(34.3+z*.004).toFixed(2)+"° E";
}
function updateUI(){
 const home=currentWorld.id==="kharon",count=save.relays.filter(Boolean).length;
 $("shard-count").textContent=String(save.shards).padStart(3,"0");$("relay-count").textContent=count+" / 3";
 $("suit-status").textContent=flightMode?"AETHER FLIGHT · ACTIVE":save.flightUnlocked?"AETHER DRIVE · ONLINE":"EXOSUIT · CALIBRATING";
 if(home&&count<3){
  $("quest-phase").textContent="FIRST CONTACT";$("quest-count").textContent=String(count).padStart(2,"0")+" / 03";$("quest-title").innerHTML="THE FIRST<br><em>SIGNAL</em>";
  $("quest-description").textContent="Three ancient relays are sleeping beneath Elyndra's canopy. Find them and bring the old network back to life.";
  $("quest-reward").textContent="AETHER DRIVE // LOCKED";$("quest-progress-fill").style.width=count/3*100+"%";
  $("objective-list").innerHTML=save.relays.map((d,i)=>"<div class='objective-row "+(d?"done":"")+"'><span class='objective-state'></span><span>"+["Synchronise the western canopy relay","Synchronise the eastern ridge relay","Synchronise the southern root relay"][i]+"</span></div>").join("");
 }else if(home&&!save.flightUnlocked){
  $("quest-phase").textContent="RETURN TO CRAFT";$("quest-count").textContent="03 / 03";$("quest-title").innerHTML="THE SKY<br><em>IS EARNED</em>";
  $("quest-description").textContent="The ancient network is awake. Return to your landing craft and install the Aether Drive.";
  $("quest-reward").textContent="AETHER DRIVE // READY";$("quest-progress-fill").style.width="100%";
  $("objective-list").innerHTML="<div class='objective-row done'><span class='objective-state'></span><span>All three relays synchronised</span></div><div class='objective-row'><span class='objective-state'></span><span>Return to the landing craft</span></div>";
 }else if(!home&&!save.surveyed[currentWorld.id]){
  $("quest-phase").textContent="NEW WORLD // SURVEY";$("quest-count").textContent="01 / 01";$("quest-title").innerHTML="THE UNKNOWN<br><em>CALLS</em>";
  $("quest-description").textContent="A fresh anomaly is broadcasting beneath "+currentWorld.name+"'s surface. Find the beacon and record its signal.";
  $("quest-reward").textContent="PLANETARY DATA // +03 SHARDS";$("quest-progress-fill").style.width="0%";
  $("objective-list").innerHTML="<div class='objective-row'><span class='objective-state'></span><span>Locate the planetary anomaly</span></div><div class='objective-row'><span class='objective-state'></span><span>Record the world signature</span></div>";
 }else{
  $("quest-phase").textContent="EXPEDITION LOG";$("quest-count").textContent="COMPLETE";$("quest-title").innerHTML="WORLD<br><em>ARCHIVED</em>";
  $("quest-description").textContent=currentWorld.name+" has been added to your expedition archive. Every system hides another signal.";
  $("quest-reward").textContent="DATA ARCHIVE // COMPLETE";$("quest-progress-fill").style.width="100%";
  $("objective-list").innerHTML="<div class='objective-row done'><span class='objective-state'></span><span>World signature recorded</span></div><div class='objective-row done'><span class='objective-state'></span><span>Planetary archive updated</span></div>";
 }
 $("flight-button").disabled=!save.flightUnlocked;$("atlas-button").disabled=!save.flightUnlocked;updateAtlas();
}
function updatePrompt(){
 const target=nearestInteractable(),prompt=$("interaction-prompt"),nav=$("target-label");
 let objective=null;
 if(currentWorld.id==="kharon"){
  objective=relays.find(p=>!p.userData.active)||(!save.flightUnlocked&&save.relays.every(Boolean)?craft:null);
 }else objective=relays.find(p=>!p.userData.active)||null;
 if(objective){
  const dx=objective.position.x-avatar.group.position.x,dz=objective.position.z-avatar.group.position.z;
  const meters=Math.round(Math.hypot(dx,dz));
  const bearing=((Math.atan2(dx,dz)*180/Math.PI)+360)%360;
  nav.querySelector("span").textContent=(objective===craft?"LANDING CRAFT":objective.userData.label)+" // "+meters+" M";
  nav.style.setProperty("--bearing",bearing+"deg");
 }else nav.querySelector("span").textContent="WORLD ARCHIVED // EXPLORE FREELY";
 if(!target){prompt.hidden=true;return;}
 prompt.hidden=false;
 $("interaction-label").textContent=target===craft?"INSTALL AETHER DRIVE":currentWorld.id==="kharon"?"SYNCHRONISE "+target.userData.label:"SCAN PLANETARY ANOMALY";
}
function updateFlightReadout(){
 if(!flightMode)return;const altitude=Math.max(0,avatar.group.position.y-getGround(avatar.group.position.x,avatar.group.position.z));
 $("altitude-value").textContent=String(Math.round(altitude)).padStart(3,"0")+" M";$("flight-speed").textContent=String(Math.round(Math.hypot(velocityY,0)*18)).padStart(3,"0")+" KM/H";
}
function animate(){
 requestAnimationFrame(animate);const dt=Math.min(clock.getDelta(),.035);elapsed+=dt;frame++;
 moveRobot(dt);updateCamera(dt);
 if(frame%8===0){updatePrompt();updateWorldUI();updateFlightReadout();}
 if(frame%600===0)persist();
 if(worldRoot)worldRoot.children.forEach(o=>{if(o.userData&&o.userData.active===false&&o.userData.light){const s=1+Math.sin(elapsed*2.2)*.035;o.scale.setScalar(s);}});
 renderer.render(scene,camera);
}
