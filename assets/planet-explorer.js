const THREE_URL = "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js";

const WORLDS = {
  kharon: {
    id:"kharon",name:"Kharon's Rest",tag:"TERRESTRIAL / BIOSPHERE",description:"A pale blue frontier with a restless cloud deck and the first known echoes of the Quantum Lattice.",
    category:"TERRESTRIAL WORLD",gravity:"1.00",atmosphere:"N₂ / O₂",state:"STABLE",threat:"LOW",access:"HOMEWORLD",anomalies:"02 DETECTED",signal:84,
    unlock:"Starting world",kind:0,colors:["#153c5c","#4c8b9d","#c7c9a8","#d6e8e8"],atmosphereColor:"#81d8f2",clouds:true,ring:false,rotation:0.00022,seed:4
  },
  vespera: {
    id:"vespera",name:"Vespera",tag:"OCEANIC / CIVILIZED",description:"A deep-water world of turquoise shelves, luminous reef chains and drowned signal towers beneath a shifting storm line.",
    category:"OCEANIC WORLD",gravity:"1.05",atmosphere:"N₂ / O₂ / H₂O",state:"TIDAL ACTIVE",threat:"MODERATE",access:"CHAPTER 2",anomalies:"05 DETECTED",signal:68,
    unlock:"Chapter 2 · scanner tier II",kind:1,colors:["#082f4a","#107b83","#4dcbb5","#b9f1dc"],atmosphereColor:"#53e0d5",clouds:true,ring:false,rotation:0.00018,seed:19
  },
  cinder: {
    id:"cinder",name:"Cinderwake",tag:"VOLCANIC / DECLINING",description:"A restless crust of black glass and molten channels. Seismic patterns suggest movement beneath the planetary mantle.",
    category:"VOLCANIC WORLD",gravity:"1.10",atmosphere:"SO₂ / CO₂",state:"DECLINING",threat:"HIGH",access:"CHAPTER 5",anomalies:"04 DETECTED",signal:42,
    unlock:"Level 18 · thermal suit",kind:2,colors:["#211b25","#6f3434","#bd5b38","#ffb16a"],atmosphereColor:"#f17b48",clouds:false,ring:false,rotation:0.00016,seed:38
  },
  nox: {
    id:"nox",name:"Nox Aeterna",tag:"REMNANT / GRAVITY FLUX",description:"A shattered remnant caught in unstable gravity. Its folded horizon conceals structures that should not exist in three dimensions.",
    category:"PLANETARY REMNANT",gravity:"0.50",atmosphere:"NONE",state:"REMNANT",threat:"EXTREME",access:"CHAPTER 8",anomalies:"09 DETECTED",signal:17,
    unlock:"Chapter 8 · void adaptation",kind:4,colors:["#0e1028","#352c64","#7564a4","#c6aeff"],atmosphereColor:"#a88cff",clouds:false,ring:true,rotation:0.00011,seed:77
  },
  aureon: {
    id:"aureon",name:"Aureon",tag:"GAS GIANT / RING SYSTEM",description:"A colossal banded giant with a pale ice ring and a slow-moving storm large enough to swallow an expedition fleet.",
    category:"GAS GIANT",gravity:"2.80",atmosphere:"H₂ / He / CH₄",state:"ATMOSPHERIC",threat:"SEVERE",access:"CHAPTER 6",anomalies:"07 DETECTED",signal:31,
    unlock:"Chapter 6 · long-range drive",kind:3,colors:["#725441","#b78c66","#e3caa0","#f5e3be"],atmosphereColor:"#e5c6a0",clouds:false,ring:true,rotation:0.00028,seed:112
  },
  glaciera: {
    id:"glaciera",name:"Glaciera",tag:"ICE WORLD / CRYOVOLCANIC",description:"A frozen ocean moon where blue fissures breathe vapor into space and enormous ice plates drift above a dark subsurface sea.",
    category:"ICE WORLD",gravity:"0.72",atmosphere:"N₂ / TRACE O₂",state:"CRYOVOLCANIC",threat:"HIGH",access:"CHAPTER 4",anomalies:"06 DETECTED",signal:53,
    unlock:"Chapter 4 · cryo gear",kind:5,colors:["#1b4770","#5c9db7","#b1e5ee","#effaff"],atmosphereColor:"#9de5ff",clouds:false,ring:false,rotation:0.00014,seed:241
  }
};

const el = id => document.getElementById(id);
const toast = message => {
  const node=el("toast"); node.textContent=message; node.classList.add("visible");
  clearTimeout(toast.timer); toast.timer=setTimeout(()=>node.classList.remove("visible"),2400);
};

(async function boot(){
  const loader=el("scene-loader");
  try {
    const THREE=await import(THREE_URL);
    startExperience(THREE);
    loader.classList.add("loaded");
    setTimeout(()=>loader.remove(),750);
  } catch(error) {
    console.error("AstroSpace WebGL boot failed",error);
    el("scene-error").hidden=false;
    loader.classList.add("loaded");
  }
})();

function startExperience(THREE){
  const canvas=el("space-canvas");
  const scene=new THREE.Scene();
  scene.background=new THREE.Color("#030711");
  const camera=new THREE.PerspectiveCamera(38,1,0.1,320);
  const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:"high-performance"});
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.22;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
  const clock=new THREE.Clock();
  const target=new THREE.Vector3(0,0,0);
  let yaw=0.16,pitch=0.08,distance=10.4,dragging=false,lastX=0,lastY=0,flightMode=false,selected=WORLDS.kharon,eventMode="none",scanTimer=0,qualityHigh=true;
  const keys=new Set();
  const shipVelocity=new THREE.Vector3();
  let activeWorldGroup=null,planetMaterial=null,cloudMaterial=null,atmosphereMaterial=null,ringMesh=null,blackHoleGroup=null,debris=null,flareSprite=null;
  const ambient=new THREE.HemisphereLight(0x9db9d9,0x111725,1.12);scene.add(ambient);
  const keyLight=new THREE.DirectionalLight(0xfff0d7,3.05);keyLight.position.set(-8,5,11);scene.add(keyLight);
  const rimLight=new THREE.PointLight(0x4d8dff,38,55,2);rimLight.position.set(7,-5,-7);scene.add(rimLight);

  const stars=makeStarfield(THREE,5200,115);scene.add(stars);
  const distantStar=makeStar(THREE);distantStar.position.set(-17,7,-30);scene.add(distantStar);
  const distantWorlds=makeDistantWorlds(THREE);scene.add(distantWorlds);

  const planetGroup=new THREE.Group();scene.add(planetGroup);
  const sphereGeometry=new THREE.SphereGeometry(3.22,qualityHigh?160:96,qualityHigh?128:80);
  const surfaceUniforms={
    uTime:{value:0},uKind:{value:0},uSeed:{value:4},uEvent:{value:0},
    uOcean:{value:new THREE.Color("#153c5c")},uMid:{value:new THREE.Color("#4c8b9d")},uLand:{value:new THREE.Color("#c7c9a8")},uHigh:{value:new THREE.Color("#d6e8e8")},
    uLight:{value:new THREE.Vector3(-0.55,0.42,0.72).normalize()}
  };
  planetMaterial=new THREE.ShaderMaterial({uniforms:surfaceUniforms,vertexShader:planetVertex,fragmentShader:planetFragment});
  const planetMesh=new THREE.Mesh(sphereGeometry,planetMaterial);planetGroup.add(planetMesh);

  const cloudUniforms={uTime:{value:0},uSeed:{value:4},uTint:{value:new THREE.Color("#dff6ff")}};
  cloudMaterial=new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms:cloudUniforms,vertexShader:cloudVertex,fragmentShader:cloudFragment});
  const clouds=new THREE.Mesh(new THREE.SphereGeometry(3.245,96,80),cloudMaterial);planetGroup.add(clouds);

  const atmoUniforms={uColor:{value:new THREE.Color("#81d8f2")},uPower:{value:2.4},uAlpha:{value:.64}};
  atmosphereMaterial=new THREE.ShaderMaterial({uniforms:atmoUniforms,vertexShader:atmoVertex,fragmentShader:atmoFragment,transparent:true,depthWrite:false,side:THREE.BackSide,blending:THREE.AdditiveBlending});
  const atmosphere=new THREE.Mesh(new THREE.SphereGeometry(3.34,96,80),atmosphereMaterial);planetGroup.add(atmosphere);

  ringMesh=makePlanetRing(THREE);ringMesh.visible=false;planetGroup.add(ringMesh);
  const moon=makeMoon(THREE);planetGroup.add(moon);
  debris=makeDebris(THREE);debris.visible=false;scene.add(debris);
  blackHoleGroup=makeBlackHole(THREE);blackHoleGroup.visible=false;blackHoleGroup.position.set(-10,2,-18);scene.add(blackHoleGroup);
  flareSprite=makeFlare(THREE);flareSprite.visible=false;flareSprite.position.set(-17,7,-30);scene.add(flareSprite);

  const ship=makeShip(THREE);ship.position.set(-4.7,-1.35,5.3);scene.add(ship);
  const shipLight=new THREE.PointLight(0x5ee8e5,4,8,2);ship.add(shipLight);shipLight.position.set(0,0,1.4);

  applyWorld(selected,true);
  resize();
  window.addEventListener("resize",resize);
  canvas.addEventListener("pointerdown",onPointerDown);
  window.addEventListener("pointermove",onPointerMove);
  window.addEventListener("pointerup",()=>dragging=false);
  canvas.addEventListener("wheel",onWheel,{passive:false});
  canvas.addEventListener("dblclick",()=>{distance=selected.kind===3?9.5:8.3;toast("ORBITAL APPROACH LOCKED");});
  window.addEventListener("keydown",e=>{if(["INPUT","TEXTAREA"].includes(document.activeElement?.tagName))return;if(["Space","ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].includes(e.code))e.preventDefault();keys.add(e.code);});
  window.addEventListener("keyup",e=>keys.delete(e.code));
  document.querySelectorAll("[data-planet]").forEach(button=>button.addEventListener("click",()=>selectWorld(button.dataset.planet)));
  document.querySelectorAll("[data-event]").forEach(button=>button.addEventListener("click",()=>setEvent(button.dataset.event)));
  el("zoom-in").addEventListener("click",()=>distance=Math.max(5.3,distance-1.1));
  el("zoom-out").addEventListener("click",()=>distance=Math.min(21,distance+1.2));
  el("reset-view").addEventListener("click",resetCamera);
  el("scan-button").addEventListener("click",deepScan);
  el("flight-toggle").addEventListener("click",toggleFlight);
  el("quality-toggle").addEventListener("click",toggleQuality);
  el("quality-toggle").addEventListener("keydown",()=>{});
  window.addEventListener("blur",()=>keys.clear());

  function resize(){
    const rect=canvas.getBoundingClientRect();
    const w=Math.max(1,rect.width),h=Math.max(1,rect.height);
    renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();
  }
  function onPointerDown(e){dragging=true;lastX=e.clientX;lastY=e.clientY;canvas.setPointerCapture?.(e.pointerId);}
  function onPointerMove(e){
    if(!dragging)return;
    const dx=e.clientX-lastX,dy=e.clientY-lastY;lastX=e.clientX;lastY=e.clientY;
    yaw-=dx*.0042;pitch=THREE.MathUtils.clamp(pitch+dy*.0032,-1.12,1.12);
  }
  function onWheel(e){e.preventDefault();distance=THREE.MathUtils.clamp(distance+e.deltaY*.006,5.3,25);}
  function resetCamera(){yaw=.16;pitch=.08;distance=10.4;target.set(0,0,0);toast("CAMERA ORIENTATION RESTORED");}
  function selectWorld(id){
    const world=WORLDS[id];if(!world)return;
    selected=world;applyWorld(world,false);resetCamera();
    document.querySelectorAll("[data-planet]").forEach(b=>b.classList.toggle("selected",b.dataset.planet===id));
    eventMode="none";updateEventButtons();toast("PLANETARY RECORD LOADED // "+world.name.toUpperCase());
  }
  function applyWorld(world,initial){
    const c=world.colors.map(v=>new THREE.Color(v));
    surfaceUniforms.uKind.value=world.kind;surfaceUniforms.uSeed.value=world.seed;
    surfaceUniforms.uOcean.value.copy(c[0]);surfaceUniforms.uMid.value.copy(c[1]);surfaceUniforms.uLand.value.copy(c[2]);surfaceUniforms.uHigh.value.copy(c[3]);surfaceUniforms.uEvent.value=0;
    cloudUniforms.uSeed.value=world.seed;cloudUniforms.uTint.value.set(world.kind===1?"#b6fff1":"#e8f6ff");
    clouds.visible=world.clouds;
    atmosphereMaterial.uniforms.uColor.value.set(world.atmosphereColor);
    atmosphereMaterial.uniforms.uPower.value=world.kind===4?2.8:2.25;
    ringMesh.visible=world.ring;
    moon.visible=world.kind!==3;
    planetGroup.rotation.set(.08,0,0);
    el("scene-world-tag").textContent=world.name.toUpperCase();
    el("readout-category").textContent=world.tag;
    el("readout-name").innerHTML=world.name.toUpperCase().replace(" REST"," <em>REST</em>").replace("VESPERA","VESPERA").replace("CINDERWAKE","CINDER<em>WAKE</em>").replace("NOX AETERNA","NOX <em>AETERNA</em>").replace("AUREON","AURE<em>ON</em>").replace("GLACIERA","GLACI<em>ERA</em>");
    el("readout-desc").textContent=world.description;
    el("metric-gravity").innerHTML=world.gravity+' <i>G</i>';
    el("metric-atmosphere").textContent=world.atmosphere;
    el("metric-state").textContent=world.state;
    el("metric-threat").textContent=world.threat;
    el("metric-threat").className=world.threat==="LOW"?"threat-low":world.threat==="MODERATE"?"threat-med":"threat-high";
    el("metric-access").textContent=world.access;
    el("metric-anomalies").textContent=world.anomalies;
    el("dossier-index").textContent=String(Object.keys(WORLDS).indexOf(world.id)+1).padStart(2,"0")+" / 06";
    el("signal-value").textContent="—";
    el("signal-fill").style.width="0%";
    el("signal-caption").textContent="AWAITING ACTIVE SCAN";
    el("coordinates").textContent=world.id==="kharon"?"08.41.22 N / 104.08.51 E":world.id==="vespera"?"12.08.44 N / 061.31.20 E":world.id==="cinder"?"41.55.03 S / 078.14.09 E":world.id==="nox"?"00.00.00 / VOID REFERENCE":world.id==="aureon"?"22.16.07 N / 188.02.41 E":"64.02.51 N / 014.33.28 E";
    el("view-mode-label").textContent=flightMode?"PILOT FLIGHT":"ORBITAL OBSERVATION";
    if(!initial)el("flight-toggle-label").textContent=flightMode?"EXIT FLIGHT":"ENGAGE FLIGHT";
  }
  function deepScan(){
    const value=selected.signal;
    el("signal-value").textContent=value+"%";
    el("signal-fill").style.width=value+"%";
    el("signal-caption").textContent=value>70?"SIGNATURE MATCH // LATTICE TRACE":value>45?"MULTIPLE ANOMALIES // PARTIAL MATCH":"WEAK SIGNAL // EXTREME DISTORTION";
    scanTimer=2.6;toast("DEEP SCAN COMPLETE // "+selected.name.toUpperCase());
  }
  function setEvent(event){
    eventMode=eventMode===event?"none":event;
    surfaceUniforms.uEvent.value=eventMode==="fracture"?1:eventMode==="flare"?2:eventMode==="lensing"?3:0;
    debris.visible=eventMode==="fracture";
    blackHoleGroup.visible=eventMode==="lensing";
    flareSprite.visible=eventMode==="flare";
    distantStar.material.color.set(eventMode==="flare"?"#fff0cb":"#ffffff");
    keyLight.intensity=eventMode==="flare"?5.7:3.05;
    updateEventButtons();
    toast(eventMode==="none"?"COSMIC EVENT CLEARED":eventMode.toUpperCase()+" EVENT ACTIVE");
  }
  function updateEventButtons(){
    document.querySelectorAll("[data-event]").forEach(b=>b.classList.toggle("active",b.dataset.event===eventMode));
  }
  function toggleFlight(){
    flightMode=!flightMode;
    el("flight-hud").hidden=!flightMode;
    el("flight-toggle").classList.toggle("engaged",flightMode);
    el("flight-toggle-label").textContent=flightMode?"EXIT FLIGHT":"ENGAGE FLIGHT";
    el("view-mode-label").textContent=flightMode?"PILOT FLIGHT":"ORBITAL OBSERVATION";
    el("view-instruction").textContent=flightMode?"W A S D · Q E · SHIFT BOOST · SPACE BRAKE":"DRAG TO ROTATE · SCROLL TO APPROACH";
    document.querySelector(".scene").classList.toggle("flight-hud-on",flightMode);
    toast(flightMode?"PILOT LINK ESTABLISHED // FLIGHT SYSTEMS ONLINE":"RETURNING TO ORBITAL OBSERVATION");
    if(flightMode){target.copy(ship.position);distance=7.8;}
    else{target.set(0,0,0);distance=10.4;shipVelocity.set(0,0,0);}
  }
  function toggleQuality(){
    qualityHigh=!qualityHigh;renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,qualityHigh?2:1.15));
    el("quality-toggle").textContent=qualityHigh?"◈":"◇";
    toast(qualityHigh?"VISUAL QUALITY // HIGH":"VISUAL QUALITY // PERFORMANCE");
  }

  function animate(){
    requestAnimationFrame(animate);
    const dt=Math.min(clock.getDelta(),.04),t=clock.elapsedTime;
    surfaceUniforms.uTime.value=t;cloudUniforms.uTime.value=t;
    planetGroup.rotation.y+=selected.rotation*60*dt;
    if(ringMesh.visible)ringMesh.rotation.z+=.00008*60*dt;
    blackHoleGroup.rotation.y+=.001*60*dt;
    debris.rotation.y+=.0008*60*dt;
    if(scanTimer>0){scanTimer-=dt;if(scanTimer<=0){}}
    if(flightMode){
      const forward=new THREE.Vector3(0,0,-1),right=new THREE.Vector3(1,0,0),up=new THREE.Vector3(0,1,0);
      const boost=keys.has("ShiftLeft")||keys.has("ShiftRight")?2.8:1;
      const acceleration=8*boost*dt;
      if(keys.has("KeyW")||keys.has("ArrowUp"))shipVelocity.addScaledVector(forward,acceleration);
      if(keys.has("KeyS")||keys.has("ArrowDown"))shipVelocity.addScaledVector(forward,-acceleration);
      if(keys.has("KeyA")||keys.has("ArrowLeft"))shipVelocity.addScaledVector(right,-acceleration);
      if(keys.has("KeyD")||keys.has("ArrowRight"))shipVelocity.addScaledVector(right,acceleration);
      if(keys.has("KeyQ"))shipVelocity.addScaledVector(up,-acceleration);
      if(keys.has("KeyE"))shipVelocity.addScaledVector(up,acceleration);
      if(keys.has("Space"))shipVelocity.multiplyScalar(Math.pow(.01,dt));
      shipVelocity.multiplyScalar(Math.pow(.88,dt*60));
      ship.position.addScaledVector(shipVelocity,dt);
      ship.rotation.z=THREE.MathUtils.lerp(ship.rotation.z,keys.has("KeyA")?.25:keys.has("KeyD")?-.25:0,.08);
      ship.rotation.x=THREE.MathUtils.lerp(ship.rotation.x,keys.has("KeyW")?-.16:keys.has("KeyS")?.16:0,.08);
      target.lerp(ship.position,.09);
      el("speed-value").textContent=(shipVelocity.length()*12).toFixed(1)+" KM/S";
    }
    const cosP=Math.cos(pitch),sinP=Math.sin(pitch);
    const desired=new THREE.Vector3(Math.sin(yaw)*cosP,sinP,Math.cos(yaw)*cosP).multiplyScalar(distance).add(target);
    camera.position.lerp(desired,.08);camera.lookAt(target);
    distantWorlds.rotation.y+=.00008*60*dt;
    renderer.render(scene,camera);
  }
  animate();

  function makeStarfield(T,count,radius){
    const positions=new Float32Array(count*3),sizes=new Float32Array(count);
    for(let i=0;i<count;i++){
      const u=Math.random()*2-1,a=Math.random()*Math.PI*2,s=Math.sqrt(1-u*u);
      positions[i*3]=radius*s*Math.cos(a);positions[i*3+1]=radius*u;positions[i*3+2]=radius*s*Math.sin(a);sizes[i]=Math.random()*1.35+.2;
    }
    const geo=new T.BufferGeometry();geo.setAttribute("position",new T.BufferAttribute(positions,3));geo.setAttribute("size",new T.BufferAttribute(sizes,1));
    const mat=new T.PointsMaterial({color:0xbad9ff,size:.1,sizeAttenuation:true,transparent:true,opacity:.78,depthWrite:false});
    return new T.Points(geo,mat);
  }
  function makeStar(T){
    const group=new T.Group();
    const core=new T.Mesh(new T.SphereGeometry(1.8,48,48),new T.MeshBasicMaterial({color:0xffe4a8}));group.add(core);
    const corona=new T.Mesh(new T.SphereGeometry(2.45,48,48),new T.MeshBasicMaterial({color:0xffb76b,transparent:true,opacity:.11,side:T.BackSide,depthWrite:false}));group.add(corona);
    const glow=new T.PointLight(0xffd79d,110,90,2);group.add(glow);return group;
  }
  function makeDistantWorlds(T){
    const g=new T.Group();
    const configs=[{p:[8,4,-22],r:.72,c:"#9d9bb4"},{p:[13,-2,-27],r:1.04,c:"#bb865d"},{p:[-5,-7,-25],r:.52,c:"#4fa1b3"},{p:[-14,3,-19],r:.38,c:"#ad9acb"}];
    configs.forEach(o=>{const m=new T.Mesh(new T.SphereGeometry(o.r,32,24),new T.MeshStandardMaterial({color:o.c,roughness:.92,metalness:.02}));m.position.set(...o.p);g.add(m);});
    return g;
  }
  function makePlanetRing(T){
    const geo=new T.RingGeometry(4.15,6.25,256);
    const mat=new T.ShaderMaterial({transparent:true,side:T.DoubleSide,depthWrite:false,vertexShader:"varying vec2 vUv; void main(){vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}",fragmentShader:`
      varying vec2 vUv;
      void main(){
        float r=vUv.y;
        float bands=0.5+0.5*sin(r*540.0+sin(r*72.0)*2.2);
        float gaps=smoothstep(0.16,0.34,bands);
        float alpha=smoothstep(0.0,0.035,r)*smoothstep(1.0,0.94,r)*(0.26+0.58*gaps);
        vec3 col=mix(vec3(0.16,0.28,0.42),vec3(0.82,0.76,0.63),bands);
        gl_FragColor=vec4(col,alpha);
      }`});
    const mesh=new T.Mesh(geo,mat);mesh.rotation.x=1.19;mesh.rotation.z=-.16;mesh.scale.setScalar(1);return mesh;
  }
  function makeMoon(T){
    const group=new T.Group();group.position.set(4.9,.45,-.6);
    const mesh=new T.Mesh(new T.SphereGeometry(.48,32,24),new T.MeshStandardMaterial({color:"#71889e",roughness:1}));
    group.add(mesh);const atmo=new T.Mesh(new T.SphereGeometry(.51,24,16),new T.MeshBasicMaterial({color:"#8fb8d4",transparent:true,opacity:.09,side:T.BackSide}));group.add(atmo);return group;
  }
  function makeDebris(T){
    const group=new T.Group();const geo=new T.IcosahedronGeometry(.055,0),mat=new T.MeshStandardMaterial({color:"#e3a477",roughness:.86});
    const dummy=new T.Object3D(),count=150,mesh=new T.InstancedMesh(geo,mat,count);
    for(let i=0;i<count;i++){
      const phi=Math.acos(2*Math.random()-1),theta=Math.random()*Math.PI*2,r=3.7+Math.random()*2.5;
      dummy.position.set(r*Math.sin(phi)*Math.cos(theta),r*Math.cos(phi),r*Math.sin(phi)*Math.sin(theta));
      dummy.rotation.set(Math.random()*3,Math.random()*3,Math.random()*3);const s=.4+Math.random()*1.5;dummy.scale.set(s,s,s);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);
    }
    group.add(mesh);return group;
  }
  function makeBlackHole(T){
    const g=new T.Group();
    const core=new T.Mesh(new T.SphereGeometry(1.1,64,48),new T.MeshBasicMaterial({color:"#010207"}));g.add(core);
    const disk=new T.Mesh(new T.RingGeometry(1.45,3.35,256),new T.ShaderMaterial({transparent:true,side:T.DoubleSide,depthWrite:false,blending:T.AdditiveBlending,vertexShader:"varying vec2 vUv; void main(){vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}",fragmentShader:`
      varying vec2 vUv;
      void main(){
        float r=vUv.y; float wave=0.5+0.5*sin(r*150.0+sin(r*18.0)*2.0);
        vec3 col=mix(vec3(0.22,0.42,0.86),vec3(1.0,0.56,0.2),smoothstep(.1,.95,wave));
        float edge=smoothstep(0.0,.09,r)*smoothstep(1.0,.91,r);
        gl_FragColor=vec4(col,edge*(.18+.45*wave));
      }`}));
    disk.rotation.x=1.13;disk.rotation.z=.24;g.add(disk);
    const halo=new T.Mesh(new T.SphereGeometry(1.48,48,32),new T.MeshBasicMaterial({color:"#9a6dff",transparent:true,opacity:.08,side:T.BackSide}));g.add(halo);
    const light=new T.PointLight(0x9d71ff,22,18,2);g.add(light);return g;
  }
  function makeFlare(T){
    const group=new T.Group();
    const geo=new T.SphereGeometry(2.8,40,32);
    const mat=new T.MeshBasicMaterial({color:"#ffd99c",transparent:true,opacity:.2,side:T.BackSide,blending:T.AdditiveBlending,depthWrite:false});
    group.add(new T.Mesh(geo,mat));
    const light=new T.PointLight(0xffba70,75,38,2);group.add(light);return group;
  }
  function makeShip(T){
    const g=new T.Group();
    const body=new T.Mesh(new T.ConeGeometry(.22,1.18,8),new T.MeshStandardMaterial({color:"#c3d9e3",metalness:.72,roughness:.27,emissive:"#17313e",emissiveIntensity:.45}));body.rotation.x=-Math.PI/2;body.position.z=-.12;g.add(body);
    const hull=new T.Mesh(new T.CylinderGeometry(.14,.2,.48,8),new T.MeshStandardMaterial({color:"#496b81",metalness:.68,roughness:.35}));hull.rotation.x=-Math.PI/2;hull.position.z=.42;g.add(hull);
    const wingGeo=new T.BufferGeometry();wingGeo.setAttribute("position",new T.Float32BufferAttribute([-0.12,0,.04,-1.0,0,.42,-.2,0,.55,.12,0,.04,.2,0,.55,1.0,0,.42],3));wingGeo.setIndex([0,1,2,3,4,5]);wingGeo.computeVertexNormals();
    const wings=new T.Mesh(wingGeo,new T.MeshStandardMaterial({color:"#729bad",metalness:.8,roughness:.28,side:T.DoubleSide,emissive:"#0b2636",emissiveIntensity:.35}));g.add(wings);
    const engine=new T.Mesh(new T.ConeGeometry(.075,.42,12),new T.MeshBasicMaterial({color:"#6ce8ee",transparent:true,opacity:.82}));engine.rotation.x=Math.PI/2;engine.position.z=.83;g.add(engine);
    const glow=new T.PointLight(0x61e8ee,2.6,4,2);glow.position.z=1;g.add(glow);
    g.scale.setScalar(.7);return g;
  }
  function toggleQuality(){
    qualityHigh=!qualityHigh;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,qualityHigh?2:1.1));
    planetMesh.geometry.dispose();
    planetMesh.geometry=new THREE.SphereGeometry(3.22,qualityHigh?160:88,qualityHigh?128:64);
    clouds.geometry.dispose();
    clouds.geometry=new THREE.SphereGeometry(3.245,qualityHigh?96:56,qualityHigh?80:48);
    atmosphere.geometry.dispose();
    atmosphere.geometry=new THREE.SphereGeometry(3.34,qualityHigh?96:56,qualityHigh?80:48);
    el("quality-toggle").textContent=qualityHigh?"◈":"◇";
    toast(qualityHigh?"VISUAL QUALITY // HIGH":"VISUAL QUALITY // PERFORMANCE");
  }
}

const planetVertex=`
varying vec3 vP; varying vec3 vN; varying vec3 vV;
void main(){
  vP=normalize(position);
  vec4 mv=modelViewMatrix*vec4(position,1.0);
  vN=normalize(normalMatrix*normal);vV=normalize(-mv.xyz);
  gl_Position=projectionMatrix*mv;
}`;
const planetFragment=`
uniform float uTime;uniform float uKind;uniform float uSeed;uniform float uEvent;
uniform vec3 uOcean;uniform vec3 uMid;uniform vec3 uLand;uniform vec3 uHigh;uniform vec3 uLight;
varying vec3 vP;varying vec3 vN;varying vec3 vV;
float hash31(vec3 p){p=fract(p*.1031);p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z);}
float noise3(vec3 x){
  vec3 i=floor(x),f=fract(x);f=f*f*(3.0-2.0*f);
  return mix(mix(mix(hash31(i),hash31(i+vec3(1,0,0)),f.x),mix(hash31(i+vec3(0,1,0)),hash31(i+vec3(1,1,0)),f.x),f.y),
             mix(mix(hash31(i+vec3(0,0,1)),hash31(i+vec3(1,0,1)),f.x),mix(hash31(i+vec3(0,1,1)),hash31(i+vec3(1,1,1)),f.x),f.y),f.z);
}
float fbm(vec3 p){float a=.5,v=0.;for(int i=0;i<6;i++){v+=a*noise3(p);p=p*2.03+vec3(13.1,7.7,4.3);a*=.5;}return v;}
void main(){
  vec3 p=normalize(vP+vec3(uSeed*.013,0.0,uSeed*.021));
  float broad=fbm(p*3.4);float detail=fbm(p*22.0);float micro=fbm(p*72.0);
  vec3 albedo=uMid;float emissive=0.0;vec3 emission=vec3(0.0);
  if(uKind<.5){
    float land=smoothstep(.445,.565,broad);
    float ridges=smoothstep(.57,.77,fbm(p*10.0));
    vec3 ocean=mix(uOcean,uMid,smoothstep(.2,.76,broad));
    vec3 landColor=mix(uLand,uHigh,ridges*.54+smoothstep(.76,.96,abs(p.y))*.18);
    albedo=mix(ocean,landColor,land);
    float coast=exp(-abs(broad-.505)*62.0);albedo+=vec3(.12,.2,.19)*coast*.35;
  }else if(uKind<1.5){
    float islands=smoothstep(.5,.64,broad);
    float reef=exp(-abs(broad-.51)*90.0);
    albedo=mix(mix(uOcean,uMid,broad*.72),mix(uLand,uHigh,detail*.42),islands);
    albedo+=vec3(.16,.65,.49)*reef*.45;
  }else if(uKind<2.5){
    float basalt=fbm(p*8.0);float fissure=1.0-smoothstep(.008,.047,abs(fbm(p*17.0)-.49));
    float lava=smoothstep(.56,.79,fissure+micro*.12);
    albedo=mix(mix(uOcean,uMid,detail),uLand,basalt);
    albedo=mix(albedo,uHigh,smoothstep(.62,.89,broad));
    emission=vec3(1.0,.19,.035)*lava*1.9;emissive=1.0;
  }else if(uKind<3.5){
    float latitude=asin(clamp(p.y,-1.0,1.0));
    float bands=.5+.5*sin(latitude*66.0+fbm(p*5.0)*9.0);
    float storm=exp(-length(vec2(p.x-.25,p.y-.18))*13.0)*smoothstep(.42,.76,fbm(p*9.0));
    albedo=mix(mix(uOcean,uMid,bands),uLand,smoothstep(.72,.96,bands));
    albedo=mix(albedo,uHigh,storm*.72);
  }else if(uKind<4.5){
    float voidTerrain=fbm(p*9.0);float cracks=1.0-smoothstep(.006,.032,abs(fbm(p*21.0)-.5));
    albedo=mix(uOcean,uMid,voidTerrain);albedo=mix(albedo,uLand,smoothstep(.42,.72,detail)*.65);
    emission=vec3(.27,.16,.72)*cracks*.95;
  }else{
    float ice=fbm(p*6.0);float crevasse=1.0-smoothstep(.01,.05,abs(fbm(p*19.0)-.49));
    albedo=mix(mix(uOcean,uMid,ice),uHigh,smoothstep(.42,.78,detail));
    albedo=mix(albedo,uLand,crevasse*.32);
    emission=vec3(.12,.56,.92)*crevasse*.26;
  }
  if(uEvent>.5&&uEvent<1.5){
    float crack=1.0-smoothstep(.002,.028,abs(fbm(p*25.0+uTime*.025)-.5));
    emission+=vec3(1.0,.29,.1)*crack*1.4;
  }else if(uEvent>1.5&&uEvent<2.5){
    float flare=pow(max(dot(normalize(vN),normalize(uLight)),0.0),7.0);
    emission+=vec3(1.0,.45,.16)*flare*.8;
  }else if(uEvent>2.5){
    float ripple=sin(fbm(p*13.0)*36.0+uTime*1.5)*.5+.5;
    emission+=vec3(.3,.16,.78)*pow(ripple,9.0)*.45;
  }
  albedo*=.93+detail*.15+micro*.055;
  vec3 N=normalize(vN),L=normalize(uLight),V=normalize(vV);
  float diff=max(dot(N,L),0.0);
  float wrap=max(0.0,(dot(N,L)+.28)/1.28);
  float spec=pow(max(dot(reflect(-L,N),V),0.0),40.0);
  float fresnel=pow(1.0-max(dot(N,V),0.0),3.2);
  vec3 color=albedo*(.12+wrap*1.08)+vec3(.9,.92,1.0)*spec*.24+emission;
  color+=uHigh*fresnel*.075;
  gl_FragColor=vec4(color,1.0);
}
`;
const cloudVertex=`
varying vec3 vP;varying vec3 vN;varying vec3 vV;
void main(){vP=normalize(position);vec4 mv=modelViewMatrix*vec4(position,1.0);vN=normalize(normalMatrix*normal);vV=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}
`;
const cloudFragment=`
uniform float uTime;uniform float uSeed;uniform vec3 uTint;
varying vec3 vP;varying vec3 vN;varying vec3 vV;
float h(vec3 p){p=fract(p*.1031);p+=dot(p,p.yxz+33.33);return fract((p.x+p.y)*p.z);}
float n(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(h(i),h(i+vec3(1,0,0)),f.x),mix(h(i+vec3(0,1,0)),h(i+vec3(1,1,0)),f.x),f.y),mix(mix(h(i+vec3(0,0,1)),h(i+vec3(1,0,1)),f.x),mix(h(i+vec3(0,1,1)),h(i+vec3(1,1,1)),f.x),f.y),f.z);}
void main(){vec3 p=vP+vec3(uTime*.006,0.,uSeed*.02);float c=n(p*8.)*.62+n(p*17.)*.26+n(p*37.)*.12;float a=smoothstep(.57,.76,c)*.35;float light=.38+.62*max(dot(normalize(vN),normalize(vec3(-.4,.5,.8))),0.);gl_FragColor=vec4(uTint*light,a);}
`;
const atmoVertex=`
varying vec3 vN;varying vec3 vV;
void main(){vec4 mv=modelViewMatrix*vec4(position,1.0);vN=normalize(normalMatrix*normal);vV=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}
`;
const atmoFragment=`
uniform vec3 uColor;uniform float uPower;uniform float uAlpha;
varying vec3 vN;varying vec3 vV;
void main(){float rim=pow(1.0-max(dot(normalize(vN),normalize(vV)),0.0),uPower);gl_FragColor=vec4(uColor,rim*uAlpha);}
`;