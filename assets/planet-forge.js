const THREE_URL = "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js";

const WORLDS = {
  kharon:{id:"kharon",name:"Elyndra",markup:"ELYN<em>DRA</em>",tag:"VERDANT TERRESTRIAL / AURORA BELT",description:"A living jade world shaped by cobalt oceans, emerald continental shelves and a permanent ribbon of high-altitude aurora. Ancient river deltas glow faintly after dusk.",gravity:"0.98",atmosphere:"N₂ / O₂ / Ar",state:"BIOLOGICALLY ACTIVE",threat:"LOW",access:"HOMEWORLD",anomalies:"03 DETECTED",signal:91,kind:0,seed:14,colors:["#071f3e","#176b79","#4fa66f","#e0d6a5"],atmosphereColor:"#54cbe3",cloudTint:"#e9fff5",clouds:true,rotation:.00019},
  vespera:{id:"vespera",name:"Nerith",markup:"NE<em>RITH</em>",tag:"PELAGIC WORLD / LUMINOUS REEFS",description:"A near-global ocean interrupted by needle-thin island chains and luminous reef shelves. Its twin moons drive kilometre-high tidal walls beneath a turquoise storm canopy.",gravity:"1.07",atmosphere:"N₂ / O₂ / H₂O",state:"TIDAL EXTREME",threat:"MODERATE",access:"CHAPTER 2",anomalies:"07 DETECTED",signal:73,kind:1,seed:39,colors:["#041c38","#087d91","#26d3b4","#c4f8d8"],atmosphereColor:"#39e2d0",cloudTint:"#ddfff8",clouds:true,rotation:.00023},
  cinder:{id:"cinder",name:"Kaldrax",markup:"KAL<em>DRAX</em>",tag:"PYROCLASTIC / OBSIDIAN CRUST",description:"A basalt-black supervolcanic world. Vast calderas split the crust into glass plates while molten mantle rivers pulse through a permanent veil of copper ash.",gravity:"1.16",atmosphere:"SO₂ / CO₂ / ASH",state:"TECTONIC CRISIS",threat:"EXTREME",access:"CHAPTER 5",anomalies:"11 DETECTED",signal:46,kind:2,seed:82,colors:["#100d19","#54252d","#c34d25","#ffb15d"],atmosphereColor:"#f17a43",cloudTint:"#f1b28b",clouds:true,rotation:.00016},
  nox:{id:"nox",name:"Vanthris",markup:"VAN<em>THRIS</em>",tag:"GRAVITY REMNANT / FRACTURED BODY",description:"A failed planet held together by an impossible gravity knot. Continental plates drift kilometres above the mantle, exposing a violet-white core through a crown of broken crust.",gravity:"0.54",atmosphere:"IONIZED TRACE",state:"STRUCTURAL COLLAPSE",threat:"CATASTROPHIC",access:"CHAPTER 8",anomalies:"14 DETECTED",signal:19,kind:3,seed:127,colors:["#101126","#3c326e","#9582bd","#f0caff"],atmosphereColor:"#a58cff",cloudTint:"#d9ceff",clouds:false,rotation:.00012},
  aureon:{id:"aureon",name:"Orovane",markup:"ORO<em>VANE</em>",tag:"SUPER-JOVIAN / MULTI-RING GIANT",description:"A colossal hydrogen giant banded in bronze, champagne and deep indigo. The Eye of Oru is a centuries-wide cyclone nested inside a luminous, multi-tier ring system.",gravity:"2.74",atmosphere:"H₂ / He / NH₃",state:"STORM DOMINANT",threat:"SEVERE",access:"CHAPTER 6",anomalies:"09 DETECTED",signal:38,kind:4,seed:203,colors:["#3d2940","#95634d","#d8a66f","#f4dfb6"],atmosphereColor:"#e8b98d",cloudTint:"#fff0d7",clouds:true,rotation:.0003},
  glaciera:{id:"glaciera",name:"Iskara",markup:"IS<em>KARA</em>",tag:"CRYOGENIC OCEAN / CRYSTAL TECTONICS",description:"An ancient ocean sealed beneath a shifting glacier shell. Sapphire chasms cut through pale ice continents, while cryovolcanic plumes seed crystalline towers above the polar fractures.",gravity:"0.76",atmosphere:"N₂ / CH₄ TRACE",state:"CRYOVOLCANIC",threat:"HIGH",access:"CHAPTER 4",anomalies:"08 DETECTED",signal:61,kind:5,seed:281,colors:["#09264b","#316f9b","#9cdce8","#f1fbff"],atmosphereColor:"#83dfff",cloudTint:"#effcff",clouds:true,rotation:.00014}
};

const $=id=>document.getElementById(id);
const toast=message=>{
  const node=$("toast");if(!node)return;
  node.textContent=message;node.classList.add("visible");
  clearTimeout(toast.timer);toast.timer=setTimeout(()=>node.classList.remove("visible"),2600);
};

(async function boot(){
  const loader=$("scene-loader");
  try{
    const THREE=await import(THREE_URL);
    startExperience(THREE);
    loader?.classList.add("loaded");
    setTimeout(()=>loader?.remove(),850);
  }catch(error){
    console.error("AstroSpace Planet Forge failed to initialize",error);
    const panel=$("scene-error");if(panel)panel.hidden=false;
    loader?.classList.add("loaded");
  }
})();

function startExperience(T){
  const canvas=$("space-canvas");if(!canvas)throw new Error("Missing #space-canvas");
  const scene=new T.Scene();scene.background=new T.Color("#02050d");
  const camera=new T.PerspectiveCamera(36,1,.1,420);
  const renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:"high-performance"});
  renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.34;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.75));
  const clock=new T.Clock(),target=new T.Vector3(0,0,0),worldLight=new T.Vector3(-.64,.38,.67).normalize();
  const keys=new Set(),velocity=new T.Vector3();
  let selected=WORLDS.kharon,yaw=.13,pitch=.055,distance=10.7,dragging=false,lastX=0,lastY=0;
  let flightMode=false,qualityHigh=true,eventMode="none";
  const planetGroup=new T.Group();scene.add(planetGroup);
  const hemi=new T.HemisphereLight(0xa9d6f2,0x101421,.68);scene.add(hemi);
  const keyLight=new T.DirectionalLight(0xffe7c8,4.35);keyLight.position.set(-9,5,10);scene.add(keyLight);
  const fillLight=new T.PointLight(0x378edb,34,48,2);fillLight.position.set(8,-6,-8);scene.add(fillLight);
  const bounceLight=new T.PointLight(0x5ed9db,10,22,2);bounceLight.position.set(-5,-2,5);scene.add(bounceLight);
  const starfield=makeStarfield(T,7600,150);scene.add(starfield);
  const star=makeStar(T);star.position.set(-19,8,-35);scene.add(star);
  const distantWorlds=makeDistantWorlds(T);scene.add(distantWorlds);
  const nebula=makeNebula(T);scene.add(nebula);

  const surfaceUniforms={
    uTime:{value:0},uKind:{value:0},uSeed:{value:14},uEvent:{value:0},
    uOcean:{value:new T.Color("#071f3e")},uMid:{value:new T.Color("#176b79")},
    uLand:{value:new T.Color("#4fa66f")},uHigh:{value:new T.Color("#e0d6a5")},uLight:{value:worldLight}
  };
  const planetMaterial=new T.ShaderMaterial({uniforms:surfaceUniforms,vertexShader:planetVertex,fragmentShader:planetFragment});
  const planetMesh=new T.Mesh(new T.SphereGeometry(3.2,256,192),planetMaterial);planetGroup.add(planetMesh);
  const cloudUniforms={uTime:{value:0},uKind:{value:0},uSeed:{value:14},uTint:{value:new T.Color("#e9fff5")}};
  const cloudMaterial=new T.ShaderMaterial({uniforms:cloudUniforms,vertexShader:cloudVertex,fragmentShader:cloudFragment,transparent:true,depthWrite:false,side:T.FrontSide});
  const clouds=new T.Mesh(new T.SphereGeometry(3.235,192,128),cloudMaterial);planetGroup.add(clouds);
  const atmoUniforms={uColor:{value:new T.Color("#54cbe3")},uPower:{value:2.25},uAlpha:{value:.7},uTime:{value:0}};
  const atmosphereMaterial=new T.ShaderMaterial({uniforms:atmoUniforms,vertexShader:atmoVertex,fragmentShader:atmoFragment,transparent:true,depthWrite:false,side:T.BackSide,blending:T.AdditiveBlending});
  const atmosphere=new T.Mesh(new T.SphereGeometry(3.39,160,112),atmosphereMaterial);planetGroup.add(atmosphere);
  const innerHaloMaterial=new T.MeshBasicMaterial({color:"#7dddf3",transparent:true,opacity:.055,side:T.BackSide,depthWrite:false,blending:T.AdditiveBlending});
  const innerHalo=new T.Mesh(new T.SphereGeometry(3.47,96,64),innerHaloMaterial);planetGroup.add(innerHalo);
  const rings=createRings(T);planetGroup.add(rings);
  const moonOrbit=new T.Group();planetGroup.add(moonOrbit);moonOrbit.add(createMoon(T));
  const features=createSurfaceFeatures(T);planetGroup.add(features.group);
  const eventDebris=makeDebris(T);eventDebris.visible=false;scene.add(eventDebris);
  const blackHole=makeBlackHole(T);blackHole.position.set(-11,2,-19);blackHole.visible=false;scene.add(blackHole);
  const flare=makeFlare(T);flare.position.copy(star.position);flare.visible=false;scene.add(flare);
  const ship=makeShip(T);ship.position.set(-4.6,-1.4,3.5);ship.scale.setScalar(.74);scene.add(ship);
  const shipGlow=new T.PointLight(0x65f0ec,5.5,9,2);ship.add(shipGlow);shipGlow.position.set(0,0,1.2);

  applyWorld(selected,true);resize();
  window.addEventListener("resize",resize);
  canvas.addEventListener("pointerdown",onPointerDown);
  window.addEventListener("pointermove",onPointerMove);
  window.addEventListener("pointerup",()=>dragging=false);
  canvas.addEventListener("wheel",onWheel,{passive:false});
  canvas.addEventListener("dblclick",()=>{distance=selected.kind===4?8.8:7.9;toast("CLOSE ORBIT // "+selected.name.toUpperCase());});
  window.addEventListener("keydown",onKeyDown);window.addEventListener("keyup",e=>keys.delete(e.code));window.addEventListener("blur",()=>keys.clear());
  document.querySelectorAll("[data-planet]").forEach(b=>b.addEventListener("click",()=>selectWorld(b.dataset.planet)));
  document.querySelectorAll("[data-event]").forEach(b=>b.addEventListener("click",()=>setEvent(b.dataset.event)));
  $("zoom-in")?.addEventListener("click",()=>distance=Math.max(5.25,distance-.95));
  $("zoom-out")?.addEventListener("click",()=>distance=Math.min(23,distance+1.15));
  $("reset-view")?.addEventListener("click",resetCamera);
  $("scan-button")?.addEventListener("click",deepScan);
  $("flight-toggle")?.addEventListener("click",toggleFlight);
  $("quality-toggle")?.addEventListener("click",toggleQuality);

  function resize(){
    const r=canvas.getBoundingClientRect(),w=Math.max(1,r.width),h=Math.max(1,r.height);
    renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();
  }
  function onPointerDown(e){if(e.button!==0)return;dragging=true;lastX=e.clientX;lastY=e.clientY;canvas.setPointerCapture?.(e.pointerId);}
  function onPointerMove(e){
    if(!dragging)return;
    const dx=e.clientX-lastX,dy=e.clientY-lastY;lastX=e.clientX;lastY=e.clientY;
    yaw-=dx*.0041;pitch=T.MathUtils.clamp(pitch+dy*.0032,-1.16,1.16);
  }
  function onWheel(e){e.preventDefault();distance=T.MathUtils.clamp(distance+e.deltaY*.0065,5.15,26);}
  function onKeyDown(e){
    if(["INPUT","TEXTAREA"].includes(document.activeElement?.tagName))return;
    if(["Space","ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].includes(e.code))e.preventDefault();
    keys.add(e.code);
  }
  function resetCamera(){yaw=.13;pitch=.055;distance=10.7;target.set(0,0,0);toast("ORBITAL FRAME RECALIBRATED");}
  function selectWorld(id){
    const world=WORLDS[id];if(!world)return;
    selected=world;applyWorld(world,false);resetCamera();eventMode="none";
    surfaceUniforms.uEvent.value=0;eventDebris.visible=false;blackHole.visible=false;flare.visible=false;updateEventButtons();
    document.querySelectorAll("[data-planet]").forEach(b=>{
      b.classList.toggle("selected",b.dataset.planet===id);b.setAttribute("aria-pressed",b.dataset.planet===id?"true":"false");
    });
    toast("WORLD ASSET LOADED // "+world.name.toUpperCase());
  }
  function applyWorld(world,initial){
    const c=world.colors.map(v=>new T.Color(v));
    surfaceUniforms.uKind.value=world.kind;surfaceUniforms.uSeed.value=world.seed;
    surfaceUniforms.uOcean.value.copy(c[0]);surfaceUniforms.uMid.value.copy(c[1]);surfaceUniforms.uLand.value.copy(c[2]);surfaceUniforms.uHigh.value.copy(c[3]);surfaceUniforms.uEvent.value=0;
    cloudUniforms.uKind.value=world.kind;cloudUniforms.uSeed.value=world.seed;cloudUniforms.uTint.value.set(world.cloudTint);clouds.visible=world.clouds;
    atmosphereMaterial.uniforms.uColor.value.set(world.atmosphereColor);
    atmosphereMaterial.uniforms.uPower.value=world.kind===3?2.9:world.kind===5?2.15:2.4;
    innerHaloMaterial.color.set(world.atmosphereColor);
    rings.children[0].visible=world.kind===4||world.kind===3;
    rings.children[1].visible=world.kind===4;rings.children[2].visible=world.kind===3;
    moonOrbit.visible=world.kind!==4;
    features.volcanoes.visible=world.kind===2;features.crystals.visible=world.kind===5;
    features.fragments.visible=world.kind===3;features.reefBeacons.visible=world.kind===1;
    planetGroup.rotation.set(.035,0,0);
    $("scene-world-tag").textContent=world.name.toUpperCase();
    $("readout-category").textContent=world.tag;$("readout-name").innerHTML=world.markup;
    $("readout-desc").textContent=world.description;$("metric-gravity").innerHTML=world.gravity+' <i>G</i>';
    $("metric-atmosphere").textContent=world.atmosphere;$("metric-state").textContent=world.state;
    $("metric-threat").textContent=world.threat;
    $("metric-threat").className=world.threat==="LOW"?"threat-low":world.threat==="MODERATE"?"threat-med":"threat-high";
    $("metric-access").textContent=world.access;$("metric-anomalies").textContent=world.anomalies;
    $("dossier-index").textContent=String(Object.keys(WORLDS).indexOf(world.id)+1).padStart(2,"0")+" / 06";
    $("signal-value").textContent="—";$("signal-fill").style.width="0%";$("signal-caption").textContent="AWAITING ACTIVE SCAN";
    const coords={kharon:"14.82.06 N / 031.44.19 E",vespera:"03.17.62 S / 118.08.42 E",cinder:"46.22.91 S / 072.51.03 E",nox:"00.00.00 / GRAVITY NULL",aureon:"28.40.17 N / 204.11.62 E",glaciera:"71.09.48 N / 009.36.21 E"};
    $("coordinates").textContent=coords[world.id];$("view-mode-label").textContent=flightMode?"PILOT FLIGHT":"ORBITAL OBSERVATION";
    if(!initial)$("flight-toggle-label").textContent=flightMode?"EXIT FLIGHT":"ENGAGE FLIGHT";
  }
  function deepScan(){
    const n=selected.signal;$("signal-value").textContent=n+"%";$("signal-fill").style.width=n+"%";
    $("signal-caption").textContent=n>78?"BIOSIGNATURE LOCK // CLEAN RETURN":n>55?"MULTIPLE ANOMALIES // PARTIAL MAP":"SIGNAL SCATTER // EXTREME DISTORTION";
    toast("SPECTRAL SCAN COMPLETE // "+selected.name.toUpperCase());
  }
  function setEvent(event){
    eventMode=eventMode===event?"none":event;
    surfaceUniforms.uEvent.value=eventMode==="fracture"?1:eventMode==="flare"?2:eventMode==="lensing"?3:0;
    eventDebris.visible=eventMode==="fracture";blackHole.visible=eventMode==="lensing";flare.visible=eventMode==="flare";
    keyLight.intensity=eventMode==="flare"?6.4:4.35;fillLight.intensity=eventMode==="lensing"?52:34;
    updateEventButtons();toast(eventMode==="none"?"COSMIC EVENT CONTAINED":eventMode.toUpperCase()+" EVENT SIMULATED");
  }
  function updateEventButtons(){
    document.querySelectorAll("[data-event]").forEach(b=>{
      b.classList.toggle("active",b.dataset.event===eventMode);b.setAttribute("aria-pressed",b.dataset.event===eventMode?"true":"false");
    });
  }
  function toggleFlight(){
    flightMode=!flightMode;$("flight-hud").hidden=!flightMode;
    $("flight-toggle").classList.toggle("engaged",flightMode);
    $("flight-toggle-label").textContent=flightMode?"EXIT FLIGHT":"ENGAGE FLIGHT";
    $("view-mode-label").textContent=flightMode?"PILOT FLIGHT":"ORBITAL OBSERVATION";
    $("view-instruction").textContent=flightMode?"W A S D · Q E · SHIFT BOOST · SPACE BRAKE":"DRAG TO ROTATE · SCROLL TO APPROACH";
    $("scene").classList.toggle("flight-hud-on",flightMode);
    if(flightMode){target.copy(ship.position);distance=8.1;}else{target.set(0,0,0);distance=10.7;velocity.set(0,0,0);}
    toast(flightMode?"PILOT LINK ESTABLISHED":"RETURNING TO ORBITAL OBSERVATION");
  }
  function toggleQuality(){
    qualityHigh=!qualityHigh;renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,qualityHigh?1.75:1.05));
    planetMesh.geometry.dispose();planetMesh.geometry=new T.SphereGeometry(3.2,qualityHigh?256:128,qualityHigh?192:96);
    clouds.geometry.dispose();clouds.geometry=new T.SphereGeometry(3.235,qualityHigh?192:96,qualityHigh?128:64);
    atmosphere.geometry.dispose();atmosphere.geometry=new T.SphereGeometry(3.39,qualityHigh?160:80,qualityHigh?112:56);
    $("quality-toggle").textContent=qualityHigh?"◈":"◇";
    toast(qualityHigh?"PLANET FORGE // ULTRA":"PLANET FORGE // PERFORMANCE");
  }

  function animate(){
    requestAnimationFrame(animate);
    const dt=Math.min(clock.getDelta(),.04),time=clock.elapsedTime;
    surfaceUniforms.uTime.value=time;cloudUniforms.uTime.value=time;atmoUniforms.uTime.value=time;
    planetGroup.rotation.y+=selected.rotation*60*dt;clouds.rotation.y+=selected.rotation*108*dt;
    rings.rotation.y+=.000075*60*dt;moonOrbit.rotation.y+=.00034*60*dt;
    features.fragments.rotation.y+=.00021*60*dt;eventDebris.rotation.y+=.00085*60*dt;
    blackHole.rotation.y+=.0011*60*dt;star.rotation.y+=.00018*60*dt;nebula.rotation.z+=.000012*60*dt;
    distantWorlds.rotation.y+=.000055*60*dt;
    if(flightMode){
      const boost=(keys.has("ShiftLeft")||keys.has("ShiftRight"))?3.4:1,accel=7.4*boost*dt;
      if(keys.has("KeyW")||keys.has("ArrowUp"))velocity.z-=accel;
      if(keys.has("KeyS")||keys.has("ArrowDown"))velocity.z+=accel;
      if(keys.has("KeyA")||keys.has("ArrowLeft"))velocity.x-=accel;
      if(keys.has("KeyD")||keys.has("ArrowRight"))velocity.x+=accel;
      if(keys.has("KeyQ"))velocity.y-=accel;if(keys.has("KeyE"))velocity.y+=accel;
      if(keys.has("Space"))velocity.multiplyScalar(Math.pow(.006,dt));
      velocity.multiplyScalar(Math.pow(.90,dt*60));ship.position.addScaledVector(velocity,dt);
      ship.rotation.z=T.MathUtils.lerp(ship.rotation.z,keys.has("KeyA")?.28:keys.has("KeyD")?-.28:0,.1);
      ship.rotation.x=T.MathUtils.lerp(ship.rotation.x,keys.has("KeyW")?-.18:keys.has("KeyS")?.18:0,.1);
      target.lerp(ship.position,.085);$("speed-value").textContent=(velocity.length()*18).toFixed(1)+" KM/S";
    }
    const cp=Math.cos(pitch),sp=Math.sin(pitch);
    const desired=new T.Vector3(Math.sin(yaw)*cp,sp,Math.cos(yaw)*cp).multiplyScalar(distance).add(target);
    camera.position.lerp(desired,.085);camera.lookAt(target);renderer.render(scene,camera);
  }

  function makeStarfield(THREE,count,radius){
    const positions=new Float32Array(count*3),colors=new Float32Array(count*3);
    for(let i=0;i<count;i++){
      const u=Math.random()*2-1,a=Math.random()*Math.PI*2,s=Math.sqrt(1-u*u);
      positions[i*3]=radius*s*Math.cos(a);positions[i*3+1]=radius*u;positions[i*3+2]=radius*s*Math.sin(a);
      const c=new THREE.Color().setHSL(.53+Math.random()*.12,.28,.68+Math.random()*.28);
      colors[i*3]=c.r;colors[i*3+1]=c.g;colors[i*3+2]=c.b;
    }
    const geo=new THREE.BufferGeometry();geo.setAttribute("position",new THREE.BufferAttribute(positions,3));geo.setAttribute("color",new THREE.BufferAttribute(colors,3));
    return new THREE.Points(geo,new THREE.PointsMaterial({size:.105,sizeAttenuation:true,vertexColors:true,transparent:true,opacity:.9,depthWrite:false}));
  }
  function makeStar(THREE){
    const g=new THREE.Group();
    g.add(new THREE.Mesh(new THREE.SphereGeometry(1.55,64,48),new THREE.MeshBasicMaterial({color:"#fff1ce"})));
    g.add(new THREE.Mesh(new THREE.SphereGeometry(2.12,64,48),new THREE.MeshBasicMaterial({color:"#ffbd79",transparent:true,opacity:.18,side:THREE.BackSide,depthWrite:false})));
    g.add(new THREE.PointLight(0xffd49a,125,110,2));return g;
  }
  function makeDistantWorlds(THREE){
    const g=new THREE.Group(),data=[{p:[9,5,-27],r:.86,c:"#6ca8a5"},{p:[15,-2,-33],r:1.16,c:"#bc8060"},{p:[-8,-8,-31],r:.67,c:"#597eb3"},{p:[-17,4,-24],r:.46,c:"#b19add"}];
    data.forEach(o=>{const m=new THREE.Mesh(new THREE.SphereGeometry(o.r,40,32),new THREE.MeshStandardMaterial({color:o.c,roughness:.94,metalness:.02}));m.position.set(...o.p);g.add(m);});return g;
  }
  function makeNebula(THREE){
    const g=new THREE.Group();
    const clusters=[
      {p:[-25,9,-52],s:[18,9,8],c:"#4389c1"},
      {p:[23,-8,-61],s:[22,11,9],c:"#8b66bb"},
      {p:[3,18,-75],s:[27,10,11],c:"#3c9c9d"}
    ];
    clusters.forEach((cloud,index)=>{
      const count=920,positions=new Float32Array(count*3),colors=new Float32Array(count*3),base=new THREE.Color(cloud.c);
      for(let i=0;i<count;i++){
        const a=Math.random()*Math.PI*2,r=Math.sqrt(Math.random());
        positions[i*3]=cloud.p[0]+Math.cos(a)*r*cloud.s[0];
        positions[i*3+1]=cloud.p[1]+Math.sin(a)*r*cloud.s[1];
        positions[i*3+2]=cloud.p[2]+(Math.random()-.5)*cloud.s[2];
        const c=base.clone().multiplyScalar(.72+Math.random()*.42);
        colors[i*3]=c.r;colors[i*3+1]=c.g;colors[i*3+2]=c.b;
      }
      const geometry=new THREE.BufferGeometry();
      geometry.setAttribute("position",new THREE.BufferAttribute(positions,3));
      geometry.setAttribute("color",new THREE.BufferAttribute(colors,3));
      const material=new THREE.PointsMaterial({size:1.15+index*.25,sizeAttenuation:true,vertexColors:true,transparent:true,opacity:.13,depthWrite:false,blending:THREE.AdditiveBlending});
      g.add(new THREE.Points(geometry,material));
    });
    return g;
  }
  function createRings(THREE){
    const g=new THREE.Group();
    const create=(inner,outer,style,opacity,tilt)=>{
      const mat=new THREE.ShaderMaterial({uniforms:{uStyle:{value:style},uOpacity:{value:opacity},uTime:{value:0}},transparent:true,side:THREE.DoubleSide,depthWrite:false,vertexShader:ringVertex,fragmentShader:ringFragment});
      const mesh=new THREE.Mesh(new THREE.RingGeometry(inner,outer,512),mat);mesh.rotation.x=tilt;mesh.rotation.z=-.18;return mesh;
    };
    g.add(create(4.08,6.28,0,.9,1.2));g.add(create(6.36,6.82,1,.72,1.2));g.add(create(3.7,5.25,2,.8,.91));return g;
  }
  function createMoon(THREE){
    const g=new THREE.Group();g.position.set(5.05,.52,-.72);
    g.add(new THREE.Mesh(new THREE.SphereGeometry(.43,64,48),new THREE.MeshStandardMaterial({color:"#8c9bab",roughness:.96,metalness:.03})));
    return g;
  }
  function createSurfaceFeatures(THREE){
    const group=new THREE.Group(),up=new THREE.Vector3(0,1,0);
    const point=(i,count,seed,radius)=>{
      const y=1-2*(i+.5)/count,a=i*2.399963+seed,r=Math.sqrt(1-y*y);
      return new THREE.Vector3(Math.cos(a)*r,y,Math.sin(a)*r).multiplyScalar(radius);
    };
    const instanced=(geometry,material,count,seed,minScale,maxScale,radius,spread=0)=>{
      const mesh=new THREE.InstancedMesh(geometry,material,count),dummy=new THREE.Object3D();
      for(let i=0;i<count;i++){
        const normal=point(i,count,seed,1),offset=spread?Math.sin(i*19.13+seed)*spread:0;
        dummy.position.copy(normal).multiplyScalar(radius+offset);dummy.quaternion.setFromUnitVectors(up,normal);
        const scale=minScale+(maxScale-minScale)*(.5+.5*Math.sin(i*83.7+seed*3.1));
        dummy.scale.set(scale,scale*(.6+Math.abs(Math.sin(i*4.3))),scale);dummy.rotateY(i*1.91);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);
      }
      mesh.instanceMatrix.needsUpdate=true;return mesh;
    };
    const volcanoes=instanced(new THREE.ConeGeometry(.12,.42,7),new THREE.MeshStandardMaterial({color:"#29232a",roughness:.84,metalness:.12,emissive:"#5a1e0f",emissiveIntensity:.44}),34,82,.55,1.6,3.19,.035);
    const crystals=instanced(new THREE.OctahedronGeometry(.19,1),new THREE.MeshPhysicalMaterial({color:"#a9f2ff",roughness:.2,metalness:.18,clearcoat:.9,clearcoatRoughness:.12,emissive:"#1f8ba7",emissiveIntensity:.48}),46,281,.42,1.55,3.2,.025);
    const fragments=instanced(new THREE.IcosahedronGeometry(.22,1),new THREE.MeshStandardMaterial({color:"#8070b6",roughness:.72,metalness:.34,emissive:"#4a2e84",emissiveIntensity:.65,flatShading:true}),58,127,.55,2.3,3.72,.92);
    const reefBeacons=instanced(new THREE.SphereGeometry(.026,10,8),new THREE.MeshBasicMaterial({color:"#65ffd6"}),92,39,.6,1.4,3.22,.012);
    group.add(volcanoes,crystals,fragments,reefBeacons);return {group,volcanoes,crystals,fragments,reefBeacons};
  }
  function makeDebris(THREE){
    const g=new THREE.Group(),mesh=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(.055,1),new THREE.MeshStandardMaterial({color:"#e1b18b",roughness:.86,metalness:.16,emissive:"#572d35",emissiveIntensity:.12}),230),dummy=new THREE.Object3D();
    for(let i=0;i<230;i++){
      const y=Math.random()*2-1,a=Math.random()*Math.PI*2,r=Math.sqrt(1-y*y),d=3.8+Math.random()*2.7;
      dummy.position.set(Math.cos(a)*r*d,y*d,Math.sin(a)*r*d);dummy.rotation.set(Math.random()*3,Math.random()*3,Math.random()*3);
      const s=.25+Math.random()*2;dummy.scale.set(s,s,s);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);
    }
    g.add(mesh);return g;
  }
  function makeBlackHole(THREE){
    const g=new THREE.Group();g.add(new THREE.Mesh(new THREE.SphereGeometry(1.05,96,64),new THREE.MeshBasicMaterial({color:"#000106"})));
    const disk=new THREE.Mesh(new THREE.RingGeometry(1.34,3.42,512),new THREE.ShaderMaterial({uniforms:{uTime:{value:0}},vertexShader:ringVertex,fragmentShader:blackHoleFragment,transparent:true,side:THREE.DoubleSide,depthWrite:false,blending:THREE.AdditiveBlending}));
    disk.rotation.x=1.18;disk.rotation.z=.18;g.add(disk);
    const photon=new THREE.Mesh(new THREE.TorusGeometry(1.22,.045,16,128),new THREE.MeshBasicMaterial({color:"#d6b8ff",transparent:true,opacity:.74,blending:THREE.AdditiveBlending}));photon.rotation.x=1.18;g.add(photon);
    g.add(new THREE.PointLight(0x9d79ff,28,24,2));return g;
  }
  function makeFlare(THREE){
    const g=new THREE.Group();g.add(new THREE.Mesh(new THREE.SphereGeometry(3.3,64,48),new THREE.MeshBasicMaterial({color:"#ffc77e",transparent:true,opacity:.16,side:THREE.BackSide,blending:THREE.AdditiveBlending,depthWrite:false})));
    g.add(new THREE.PointLight(0xffb56f,90,60,2));return g;
  }
  function makeShip(THREE){
    const g=new THREE.Group(),hull=new THREE.MeshStandardMaterial({color:"#b6cad7",metalness:.78,roughness:.23,emissive:"#153746",emissiveIntensity:.58}),wing=new THREE.MeshStandardMaterial({color:"#557f95",metalness:.86,roughness:.3,side:THREE.DoubleSide,emissive:"#0d3143",emissiveIntensity:.44});
    const core=new THREE.Mesh(new THREE.ConeGeometry(.23,1.25,10),hull);core.rotation.x=-Math.PI/2;core.position.z=-.12;g.add(core);
    const cabin=new THREE.Mesh(new THREE.SphereGeometry(.145,24,16),new THREE.MeshPhysicalMaterial({color:"#b5f8f2",metalness:.15,roughness:.08,transmission:.35,emissive:"#1e6a70",emissiveIntensity:.32}));cabin.scale.set(.8,.52,1.35);cabin.position.set(0,.11,-.2);g.add(cabin);
    const geo=new THREE.BufferGeometry();geo.setAttribute("position",new THREE.Float32BufferAttribute([-.12,0,.02,-1.1,0,.5,-.18,0,.66,.12,0,.02,.18,0,.66,1.1,0,.5],3));geo.setIndex([0,1,2,3,4,5]);geo.computeVertexNormals();g.add(new THREE.Mesh(geo,wing));
    const engine=new THREE.Mesh(new THREE.ConeGeometry(.09,.55,16),new THREE.MeshBasicMaterial({color:"#69eff0",transparent:true,opacity:.9}));engine.rotation.x=Math.PI/2;engine.position.z=.88;g.add(engine);return g;
  }
  animate();
}

const planetVertex=`
uniform float uKind;uniform float uSeed;uniform float uTime;
varying vec3 vP;varying vec3 vN;varying vec3 vV;varying float vHeight;
float h3(vec3 p){p=fract(p*.1031);p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z);}
float n3(vec3 x){vec3 i=floor(x),f=fract(x);f=f*f*(3.0-2.0*f);return mix(mix(mix(h3(i),h3(i+vec3(1,0,0)),f.x),mix(h3(i+vec3(0,1,0)),h3(i+vec3(1,1,0)),f.x),f.y),mix(mix(h3(i+vec3(0,0,1)),h3(i+vec3(1,0,1)),f.x),mix(h3(i+vec3(0,1,1)),h3(i+vec3(1,1,1)),f.x),f.y),f.z);}
float fb3(vec3 p){float a=.52,v=0.;for(int i=0;i<5;i++){v+=a*n3(p);p=p*2.04+vec3(13.7,7.1,9.2);a*=.49;}return v;}
float ridge3(vec3 p){float n=fb3(p);return 1.0-abs(n*2.0-1.0);}
void main(){
 vec3 dir=normalize(position),q=dir+vec3(uSeed*.013,uSeed*.007,-uSeed*.011);
 float broad=fb3(q*3.4),mid=fb3(q*8.5),fine=fb3(q*28.0),relief=0.0;
 if(uKind<.5){float land=smoothstep(.455,.585,broad);relief=(land-.38)*.11+ridge3(q*13.0)*land*.055+(mid-.5)*.025;}
 else if(uKind<1.5){float shelf=smoothstep(.43,.67,broad);relief=(broad-.5)*.095+shelf*.028+ridge3(q*15.0)*.018;}
 else if(uKind<2.5){relief=(broad-.5)*.07+pow(ridge3(q*7.0),5.0)*.12+fine*.025;}
 else if(uKind<3.5){float plate=step(.49,fb3(q*7.0));relief=(plate-.5)*.14+ridge3(q*17.0)*.055+(fine-.5)*.07;}
 else if(uKind<4.5){relief=(broad-.5)*.035+(mid-.5)*.018;}
 else{float shelf=smoothstep(.48,.68,broad);relief=(shelf-.4)*.095+ridge3(q*18.0)*.045+(fine-.5)*.024;}
 vec3 displaced=position+normal*relief;vP=dir;vN=normalize(normal);vHeight=relief;
 vec4 mv=modelViewMatrix*vec4(displaced,1.0);vV=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;
}`;

const planetFragment=`
uniform float uTime;uniform float uKind;uniform float uSeed;uniform float uEvent;
uniform vec3 uOcean;uniform vec3 uMid;uniform vec3 uLand;uniform vec3 uHigh;uniform vec3 uLight;
varying vec3 vP;varying vec3 vN;varying vec3 vV;varying float vHeight;
float h3(vec3 p){p=fract(p*.1031);p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z);}
float n3(vec3 x){vec3 i=floor(x),f=fract(x);f=f*f*(3.0-2.0*f);return mix(mix(mix(h3(i),h3(i+vec3(1,0,0)),f.x),mix(h3(i+vec3(0,1,0)),h3(i+vec3(1,1,0)),f.x),f.y),mix(mix(h3(i+vec3(0,0,1)),h3(i+vec3(1,0,1)),f.x),mix(h3(i+vec3(0,1,1)),h3(i+vec3(1,1,1)),f.x),f.y),f.z);}
float fb3(vec3 p){float a=.52,v=0.;for(int i=0;i<6;i++){v+=a*n3(p);p=p*2.03+vec3(13.1,7.7,4.3);a*=.49;}return v;}
float ridge3(vec3 p){return 1.0-abs(fb3(p)*2.0-1.0);}
float crater(vec3 p,float scale){float cell=fb3(normalize(p)*scale);float rim=1.0-smoothstep(0.0,.045,abs(cell-.5));float bowl=1.0-smoothstep(0.0,.08,abs(cell-.5));return clamp(rim*.7+bowl*.18,0.0,1.0);}
void main(){
 vec3 p=normalize(vP+vec3(uSeed*.001,0.0,-uSeed*.0013));
 float broad=fb3(p*3.7),continent=fb3(p*7.8),detail=fb3(p*24.0),micro=fb3(p*82.0),ridges=pow(ridge3(p*10.0),2.1);
 vec3 color=uMid,emission=vec3(0.0);float rough=.78;
 if(uKind<.5){
  float land=smoothstep(.452,.584,broad+fb3(p*12.0)*.065),highland=smoothstep(.61,.78,ridges+continent*.16),desert=smoothstep(.64,.81,fb3(p*4.0+vec3(7.0,2.0,1.0)));
  vec3 sea=mix(uOcean,uMid,smoothstep(.18,.76,broad)),green=mix(uLand,uHigh,highland*.72);green=mix(green,vec3(.63,.47,.28),desert*.34);
  float coast=exp(-abs(broad-.51)*75.0);color=mix(sea,green,land);color+=vec3(.2,.56,.42)*coast*.12;
  float river=1.0-smoothstep(.006,.025,abs(sin(p.x*33.0+fb3(p*13.0)*8.0)*sin(p.z*29.0)-.08));
  emission+=vec3(.035,.32,.28)*river*land*.22;
  float city=(1.0-smoothstep(-.12,.1,dot(normalize(vN),normalize(uLight))))*pow(fb3(p*75.0),12.0);
  emission+=vec3(.24,.54,.46)*city*.42;rough=mix(.12,.88,land);
 }else if(uKind<1.5){
  float island=smoothstep(.565,.69,broad+fb3(p*15.0)*.045),shelf=smoothstep(.47,.57,broad),reef=pow(ridge3(p*18.0),5.0)*smoothstep(.35,.62,continent);
  color=mix(uOcean,uMid,shelf*.8);color=mix(color,uLand,island);color+=vec3(.03,.62,.48)*reef*.7;
  float tideLine=exp(-abs(broad-.555)*100.0);color+=vec3(.1,.55,.49)*tideLine*.2;
  float abyss=1.0-smoothstep(.28,.55,broad);color=mix(color,uOcean*.48,abyss*.55);
  emission+=vec3(.02,.58,.4)*reef*.56;rough=mix(.08,.45,island);
 }else if(uKind<2.5){
  float basalt=fb3(p*8.0),fracture=1.0-smoothstep(.008,.045,abs(fb3(p*17.0+vec3(2.0,0.0,3.0))-.49));
  float branch=1.0-smoothstep(.008,.03,abs(ridge3(p*24.0)-.22)),lava=clamp(fracture*.72+branch*.34,0.0,1.0),caldera=crater(p,13.0);
  color=mix(uOcean,uMid,basalt*.8);color=mix(color,uLand,smoothstep(.53,.82,fb3(p*5.0))*.46);
  color=mix(color,uHigh,caldera*.17+detail*.06);color*=.5+detail*.55;
  emission+=vec3(1.0,.16,.025)*lava*1.85+vec3(1.0,.48,.13)*caldera*.27;rough=.9;
 }else if(uKind<3.5){
  float plate=fb3(p*7.0),crack=1.0-smoothstep(.006,.037,abs(fb3(p*19.0)-.5));
  float gap=smoothstep(.51,.58,fb3(p*11.0+vec3(4.0,2.0,7.0))),edge=pow(ridge3(p*15.0),6.0);
  color=mix(uOcean,uMid,plate);color=mix(color,uLand,smoothstep(.43,.7,detail)*.62);color=mix(color,uHigh,edge*.3);color*=1.0-gap*.62;
  emission+=vec3(.41,.18,.94)*crack*.9+vec3(.82,.55,1.0)*gap*.28;rough=.84;
 }else if(uKind<4.5){
  float lat=asin(clamp(p.y,-1.0,1.0)),warp=fb3(p*5.0)*.75+fb3(p*13.0)*.18;
  float bands=.5+.5*sin(lat*58.0+warp*10.0+sin(lat*13.0)*1.5),striation=fb3(p*vec3(28.0,8.0,28.0));
  color=mix(uOcean,uMid,smoothstep(.12,.91,bands));color=mix(color,uLand,smoothstep(.58,.9,bands)*.62);
  color=mix(color,uHigh,smoothstep(.72,.92,fb3(p*18.0))*.22);
  float sx=(p.x-.21)+sin(p.y*8.0)*.035,sy=(p.y-.17)*1.48;
  float storm=exp(-dot(vec2(sx*1.7,sy),vec2(sx*1.7,sy))*43.0),eye=exp(-dot(vec2(sx*1.25,sy*1.25),vec2(sx*1.25,sy*1.25))*340.0);
  float spiral=.5+.5*sin(atan(sy,sx)*5.0+length(vec2(sx,sy))*58.0+uTime*.12);
  color=mix(color,uHigh,storm*(.24+spiral*.34));color=mix(color,uOcean*.42,eye*.65);
  emission+=vec3(.38,.19,.09)*storm*.18;color+=vec3(.13,.09,.05)*striation*.1;rough=.32;
 }else{
  float ice=fb3(p*6.0),trench=1.0-smoothstep(.005,.052,abs(fb3(p*17.0+vec3(1.0,7.0,2.0))-.49));
  float crystal=pow(ridge3(p*31.0),8.0),shelf=smoothstep(.42,.76,ice);
  color=mix(uOcean,uMid,ice*.78);color=mix(color,uHigh,shelf*.86);color=mix(color,uLand,crystal*.36);color*=1.0-trench*.48;
  emission+=vec3(.06,.62,1.0)*trench*.78+vec3(.34,.84,1.0)*crystal*.2;
  float plume=pow(max(0.0,p.y),9.0)*fb3(p*28.0);emission+=vec3(.3,.68,1.0)*plume*.18;rough=.2;
 }
 color*=.92+(micro-.5)*.12+(detail-.5)*.1;
 vec3 N=normalize(vN),L=normalize(uLight),V=normalize(vV);
 float wrap=max(0.0,(dot(N,L)+.24)/1.24),specPower=mix(74.0,18.0,rough);
 float spec=pow(max(dot(reflect(-L,N),V),0.0),specPower)*(1.0-rough*.72),fresnel=pow(1.0-max(dot(N,V),0.0),3.1);
 float terminator=smoothstep(-.32,.13,dot(N,L));
 vec3 shaded=color*(.075+wrap*1.18)+vec3(.84,.91,1.0)*spec*.34+emission+uHigh*fresnel*.12;
 if(uEvent>.5&&uEvent<1.5){float fault=1.0-smoothstep(.003,.03,abs(fb3(p*29.0+uTime*.018)-.5));shaded+=vec3(1.0,.24,.06)*fault*1.3;}
 else if(uEvent>1.5&&uEvent<2.5)shaded+=vec3(1.0,.47,.2)*pow(max(dot(N,L),0.0),5.0)*.85;
 else if(uEvent>2.5){float wave=.5+.5*sin(fb3(p*15.0)*36.0+uTime*1.4);shaded+=vec3(.42,.18,.95)*pow(wave,8.0)*.62;}
 shaded=mix(shaded,shaded*.17+emission*.3,1.0-terminator);gl_FragColor=vec4(shaded,1.0);
}}`;

const cloudVertex=`
varying vec3 vP;varying vec3 vN;varying vec3 vV;
void main(){vP=normalize(position);vec4 mv=modelViewMatrix*vec4(position,1.0);vN=normalize(normalMatrix*normal);vV=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}
`;
const cloudFragment=`
uniform float uTime;uniform float uSeed;uniform float uKind;uniform vec3 uTint;
varying vec3 vP;varying vec3 vN;varying vec3 vV;
float h(vec3 p){p=fract(p*.1031);p+=dot(p,p.yxz+33.33);return fract((p.x+p.y)*p.z);}
float n(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(h(i),h(i+vec3(1,0,0)),f.x),mix(h(i+vec3(0,1,0)),h(i+vec3(1,1,0)),f.x),f.y),mix(mix(h(i+vec3(0,0,1)),h(i+vec3(1,0,1)),f.x),mix(h(i+vec3(0,1,1)),h(i+vec3(1,1,1)),f.x),f.y),f.z);}
float fb(vec3 p){float a=.55,v=0.;for(int i=0;i<5;i++){v+=a*n(p);p=p*2.03+vec3(11.,7.,3.);a*=.48;}return v;}
void main(){
 vec3 p=vP+vec3(uTime*.0035,0.,uSeed*.017);float base=fb(p*7.0),fine=fb(p*19.0),wisps=fb(p*38.0),cloud=base*.68+fine*.23+wisps*.09;
 float bands=.5+.5*sin(p.y*52.0+fb(p*8.0)*9.0),storm=exp(-dot(vec2(p.x-.21,p.y-.17),vec2(p.x-.21,p.y-.17))*28.0);
 if(uKind>3.5&&uKind<4.5)cloud=mix(cloud,bands*.72+fine*.28,.72);
 if(uKind>1.5&&uKind<2.5)cloud*=smoothstep(.55,.8,cloud);
 if(uKind>.5&&uKind<1.5)cloud+=storm*.18;
 float alpha=smoothstep(.52,.73,cloud)*.48+storm*.13*smoothstep(.4,.68,cloud);
 float light=.28+.72*max(dot(normalize(vN),normalize(vec3(-.54,.42,.73))),0.0);
 gl_FragColor=vec4(mix(uTint,uTint*1.22,storm*.45)*light,alpha);
}`;
const atmoVertex=`
varying vec3 vN;varying vec3 vV;
void main(){vec4 mv=modelViewMatrix*vec4(position,1.0);vN=normalize(normalMatrix*normal);vV=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}
`;
const atmoFragment=`
uniform vec3 uColor;uniform float uPower;uniform float uAlpha;uniform float uTime;
varying vec3 vN;varying vec3 vV;
void main(){float facing=max(dot(normalize(vN),normalize(vV)),0.0);float rim=pow(1.0-facing,uPower);float aurora=.84+.16*sin(vN.y*21.0+uTime*.22);gl_FragColor=vec4(uColor*aurora,rim*uAlpha);}
`;
const ringVertex=`
varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}
`;
const ringFragment=`
uniform float uStyle;uniform float uOpacity;uniform float uTime;varying vec2 vUv;
void main(){
 float r=vUv.y,phase=sin(r*490.0+sin(r*51.0)*2.5+uTime*.08),grain=.5+.5*sin(r*1700.0+sin(r*92.0)*2.0);
 float bands=.5+.5*phase,gap=smoothstep(.22,.42,bands),edge=smoothstep(0.0,.035,r)*(1.0-smoothstep(.93,1.0,r));
 vec3 outer=vec3(.67,.77,.82),inner=vec3(.24,.35,.55);
 if(uStyle>1.5){outer=vec3(.63,.44,.92);inner=vec3(.14,.19,.36);}else if(uStyle>.5){outer=vec3(.42,.7,.83);inner=vec3(.1,.2,.34);}
 vec3 col=mix(inner,outer,bands)*(.8+grain*.32);float alpha=edge*(.13+.58*gap)*uOpacity;gl_FragColor=vec4(col,alpha);
}`;
const blackHoleFragment=`
uniform float uTime;varying vec2 vUv;
void main(){
 float r=vUv.y,wave=.5+.5*sin(r*170.0+sin(r*18.0+uTime*.3)*2.2);
 vec3 blue=vec3(.2,.42,.96),gold=vec3(1.0,.53,.22),violet=vec3(.64,.37,1.0);
 vec3 col=mix(blue,gold,smoothstep(.12,.86,wave));col=mix(col,violet,smoothstep(.72,.99,r)*.55);
 float edge=smoothstep(0.0,.08,r)*(1.0-smoothstep(.9,1.0,r));gl_FragColor=vec4(col,edge*(.18+.52*wave));
}`;
