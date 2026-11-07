const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const fract=v=>v-Math.floor(v);
const seeded=(i,seed=1)=>fract(Math.sin((i+1)*127.1+(seed+3)*311.7)*43758.5453123);
const lerp=(a,b,t)=>a+(b-a)*t;

export function planetaryDetailBudget(quality="balanced"){
 const density=({performance:.48,balanced:1,cinematic:1.38,"4k":1.72,"8k":1.92}[quality]||1);
 return {
  density,
  boulders:Math.round(140*density),
  pebbles:Math.round(820*density),
  canopyTrees:Math.round(58*density),
  canopyLeaves:Math.round(58*density)*13,
  forestGrass:Math.round(7600*density),
  forestFerns:Math.round(240*density),
  forestFlowers:Math.round(220*density),
  reefColonies:Math.round(86*density),
  reefBranches:Math.round(86*density)*5,
  reefPearls:Math.round(260*density),
  basaltColumns:Math.round(96*density),
  lavaFissures:Math.round(112*density),
  gravityShards:Math.round(116*density),
  skyIslands:Math.round(66*density),
  cloudPuffs:Math.round(104*density),
  iceSpire:Math.round(145*density),
  iceFragments:Math.round(320*density)
 };
}

function roughGeometry(THREE,geometry,{strength=.08,frequency=11,seed=1}={}){
 const p=geometry.attributes.position;
 for(let i=0;i<p.count;i++){
  const x=p.getX(i),y=p.getY(i),z=p.getZ(i);
  const n=Math.sin(x*frequency+seed)*Math.cos(y*frequency*.83-seed*.7)*Math.sin(z*frequency*1.17+seed*.3);
  const f=1+strength*n;
  p.setXYZ(i,x*f,y*(1+strength*.58*n),z*f);
 }
 p.needsUpdate=true;geometry.computeVertexNormals();return geometry;
}
function leafGeometry(THREE){
 const g=new THREE.PlaneGeometry(1,1.8,4,9),p=g.attributes.position;
 for(let i=0;i<p.count;i++){
  const y=p.getY(i),v=clamp((y+.9)/1.8),x=p.getX(i);
  const taper=Math.pow(Math.sin(Math.PI*v),.72);
  p.setX(i,x*taper);
  p.setZ(i,.095*Math.sin(v*Math.PI*2)+.035*x*x);
 }
 p.needsUpdate=true;g.computeVertexNormals();return g;
}
function bladeGeometry(THREE){
 const g=new THREE.PlaneGeometry(.28,1.35,1,5),p=g.attributes.position;
 for(let i=0;i<p.count;i++){
  const y=p.getY(i),v=clamp((y+.675)/1.35);
  p.setX(i,p.getX(i)*(1-.58*v)+.075*Math.sin(v*Math.PI));
  p.setZ(i,.075*v*v);
 }
 p.needsUpdate=true;g.computeVertexNormals();return g;
}
function orientCylinder(dummy,x,y,z,dx,dy,dz,length,thickness,yaw=0){
 const len=Math.hypot(dx,dy,dz)||1;
 dummy.position.set(x+dx*.5,y+dy*.5,z+dz*.5);
 dummy.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),new THREE.Vector3(dx/len,dy/len,dz/len));
 dummy.rotateY(yaw);
 dummy.scale.set(thickness,length,thickness);dummy.updateMatrix();
}
function instance(THREE,geometry,material,count,group){
 const mesh=new THREE.InstancedMesh(geometry,material,Math.max(1,count));
 mesh.count=count;mesh.castShadow=false;mesh.receiveShadow=false;
 group.add(mesh);return mesh;
}
function place(THREE,mesh,index,dummy,x,y,z,sx,sy,sz,rx=0,ry=0,rz=0,color=null){
 dummy.position.set(x,y,z);dummy.rotation.set(rx,ry,rz);dummy.scale.set(sx,sy,sz);dummy.updateMatrix();
 mesh.setMatrixAt(index,dummy.matrix);
 if(color&&mesh.setColorAt)mesh.setColorAt(index,color);
}
function finish(mesh){
 if(!mesh)return;
 mesh.instanceMatrix.needsUpdate=true;
 if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;
}

export function createPlanetaryDetail(THREE,world,{
 quality="balanced",originX=0,originZ=0,terrainHeight=()=>0
}={}){
 const budget=planetaryDetailBudget(quality),seed=Number(world.seed)||17,kind=Number(world.terrain??world.kind??0);
 const root=new THREE.Group();root.position.set(originX,0,originZ);root.name="ASTROSPACE_BIOME_DETAIL";
 const ground=new THREE.Group(),foliage=new THREE.Group(),floaters=new THREE.Group();
 root.add(ground,foliage,floaters);
 const dummy=new THREE.Object3D();
 const palette=(world.palette||world.colors||["#142a31","#416a64","#80b29a","#d5d5b5"]).map(c=>new THREE.Color(c));
 while(palette.length<4)palette.push(palette[palette.length-1]);

 // High-frequency geology: one instanced mesh for large boulders and a second for field rubble.
 const boulderGeo=roughGeometry(THREE,new THREE.IcosahedronGeometry(1,2),{strength:.16,frequency:9,seed:seed+2});
 const boulders=instance(THREE,boulderGeo,new THREE.MeshStandardMaterial({color:"#ffffff",roughness:.91,metalness:.035,vertexColors:true}),budget.boulders,ground);
 const pebbleGeo=roughGeometry(THREE,new THREE.DodecahedronGeometry(1,1),{strength:.13,frequency:13,seed:seed+5});
 const pebbles=instance(THREE,pebbleGeo,new THREE.MeshStandardMaterial({color:"#ffffff",roughness:.95,vertexColors:true}),budget.pebbles,ground);
 for(let i=0;i<budget.boulders;i++){
  const a=seeded(i+4,seed)*Math.PI*2,r=58+seeded(i+17,seed)*850,x=Math.cos(a)*r,z=Math.sin(a)*r;
  const y=terrainHeight(x+originX,z+originZ,world),sx=4+seeded(i+21,seed)*16,sy=2.5+seeded(i+29,seed)*10,sz=4+seeded(i+31,seed)*18;
  const col=palette[1].clone().lerp(palette[2],.12+seeded(i+38,seed)*.28);
  place(THREE,boulders,i,dummy,x,y+sy*.35,z,sx,sy,sz,seeded(i+2,seed)*.8,seeded(i+8,seed)*6.28,seeded(i+12,seed)*.7,col);
 }
 for(let i=0;i<budget.pebbles;i++){
  const a=seeded(i+1400,seed)*Math.PI*2,r=22+seeded(i+1600,seed)*920,x=Math.cos(a)*r,z=Math.sin(a)*r;
  const y=terrainHeight(x+originX,z+originZ,world),s=.28+seeded(i+1800,seed)*1.55;
  const col=palette[1].clone().lerp(palette[2],seeded(i+1900,seed)*.34);
  place(THREE,pebbles,i,dummy,x,y+s*.28,z,s*1.5,s*.72,s,seeded(i+2000,seed),seeded(i+2100,seed)*6.28,seeded(i+2200,seed),col);
 }
 finish(boulders);finish(pebbles);

 if(kind===0){
  // Elyndra: layered broadleaf canopy, visible branch structure, ferns, grass and small bioluminescent flowers.
  const trunks=instance(THREE,roughGeometry(THREE,new THREE.CylinderGeometry(.38,.82,1,12,6),{strength:.065,frequency:15,seed:seed+11}),
   new THREE.MeshStandardMaterial({color:"#ffffff",roughness:.94,vertexColors:true}),budget.canopyTrees,foliage);
  const branches=instance(THREE,new THREE.CylinderGeometry(.045,.2,1,8,3),
   new THREE.MeshStandardMaterial({color:"#604a35",roughness:.95}),budget.canopyTrees*4,foliage);
  const leaves=instance(THREE,leafGeometry(THREE),
   new THREE.MeshStandardMaterial({color:"#ffffff",roughness:.88,side:THREE.DoubleSide,vertexColors:true}),budget.canopyLeaves,foliage);
  const crowns=instance(THREE,roughGeometry(THREE,new THREE.IcosahedronGeometry(1,2),{strength:.14,frequency:8,seed:seed+15}),
   new THREE.MeshStandardMaterial({color:"#ffffff",roughness:.93,vertexColors:true}),budget.canopyTrees*2,foliage);
  const barkPalette=["#5d4834","#71563a","#493d32","#826545"].map(c=>new THREE.Color(c));
  const leafPalette=["#174c39","#1f6747","#2d8051","#438d59","#6b9d5c","#93a96a"].map(c=>new THREE.Color(c));
  let branchIndex=0,leafIndex=0,crownIndex=0;
  for(let i=0;i<budget.canopyTrees;i++){
   const grove=i%23,ga=seeded(grove+91,seed+31)*Math.PI*2,gr=185+seeded(grove+107,seed+31)*690;
   const centerX=Math.cos(ga)*gr,centerZ=Math.sin(ga)*gr;
   const a=seeded(i+120,seed)*Math.PI*2,rr=Math.sqrt(seeded(i+160,seed))*102;
   const x=centerX+Math.cos(a)*rr,z=centerZ+Math.sin(a)*rr,y=terrainHeight(x+originX,z+originZ,world);
   const h=24+seeded(i+190,seed)*38,radius=3.5+seeded(i+220,seed)*3.4;
   place(THREE,trunks,i,dummy,x,y+h*.49,z,radius*.52,h,radius*.52,0,a,(seeded(i+225,seed)-.5)*.08,barkPalette[i%barkPalette.length]);
   // Four tapering limbs grow outward from each trunk; this breaks the single-sphere tree silhouette.
   for(let k=0;k<4;k++){
    const ba=a+k*Math.PI*.5+(seeded(i+k+230,seed)-.5)*.35;
    const reach=9+seeded(i+k+240,seed)*8,up=8+seeded(i+k+250,seed)*13;
    const startY=y+h*(.48+k*.075),dx=Math.cos(ba)*reach,dz=Math.sin(ba)*reach;
    orientCylinder(dummy,x+Math.cos(ba)*2,startY,z+Math.sin(ba)*2,dx,up,dz,Math.hypot(dx,up,dz),.55);
    branches.setMatrixAt(branchIndex++,dummy.matrix);
   }
   // Individual leaf blades in overlapping fans, not a single low-detail canopy blob.
   for(let k=0;k<13;k++){
    const la=seeded(i*19+k+300,seed)*Math.PI*2,rad=4+seeded(i*17+k+330,seed)*11;
    const ly=y+h*.66+seeded(i+k+350,seed)*h*.55;
    const lx=x+Math.cos(la)*rad,lz=z+Math.sin(la)*rad;
    const scale=.9+seeded(i+k+370,seed)*1.55;
    const col=leafPalette[Math.floor(seeded(i+k+390,seed)*leafPalette.length)].clone().multiplyScalar(.78+seeded(i+k+400,seed)*.55);
    place(THREE,leaves,leafIndex++,dummy,lx,ly,lz,scale*.62,scale,scale*.18,(seeded(i+k+410,seed)-.5)*.7,la,(seeded(i+k+420,seed)-.5)*1.1,col);
   }
   for(let k=0;k<2;k++){
    const la=seeded(i+k+430,seed)*Math.PI*2,rad=7+seeded(i+k+440,seed)*7;
    const lx=x+Math.cos(la)*rad,lz=z+Math.sin(la)*rad,ly=y+h*.78+k*5;
    const sc=7+seeded(i+k+450,seed)*6;
    place(THREE,crowns,crownIndex++,dummy,lx,ly,lz,sc,sc*.65,sc,0,la,0,leafPalette[(i+k)%leafPalette.length]);
   }
  }
  finish(trunks);finish(branches);finish(leaves);finish(crowns);
  const blade=instance(THREE,bladeGeometry(THREE),new THREE.MeshStandardMaterial({color:"#ffffff",roughness:.98,side:THREE.DoubleSide,vertexColors:true}),budget.forestGrass,ground);
  const grassColors=["#39734a","#4b8c50","#76a85b","#a9b96e","#2c6847"].map(c=>new THREE.Color(c));
  for(let i=0;i<budget.forestGrass;i++){
   const patch=i%37,pa=seeded(patch+600,seed)*Math.PI*2,pr=145+seeded(patch+620,seed)*820;
   const cx=Math.cos(pa)*pr,cz=Math.sin(pa)*pr,ga=seeded(i+650,seed)*Math.PI*2,rr=Math.sqrt(seeded(i+680,seed))*68;
   const x=cx+Math.cos(ga)*rr,z=cz+Math.sin(ga)*rr,y=terrainHeight(x+originX,z+originZ,world);
   const h=.6+seeded(i+700,seed)*2.65,w=.36+seeded(i+720,seed)*.64;
   place(THREE,blade,i,dummy,x,y+.04,z,w,h,w,(seeded(i+740,seed)-.5)*.18,seeded(i+760,seed)*6.28,(seeded(i+780,seed)-.5)*.18,grassColors[i%grassColors.length]);
  }
  finish(blade);
  const fernGeo=leafGeometry(THREE);
  const ferns=instance(THREE,fernGeo,new THREE.MeshStandardMaterial({color:"#ffffff",roughness:.9,side:THREE.DoubleSide,vertexColors:true}),budget.forestFerns*7,ground);
  let fi=0;
  for(let i=0;i<budget.forestFerns;i++){
   const a=seeded(i+820,seed)*Math.PI*2,r=70+seeded(i+840,seed)*900,x=Math.cos(a)*r,z=Math.sin(a)*r,y=terrainHeight(x+originX,z+originZ,world);
   for(let k=0;k<7;k++){
    const angle=k/7*Math.PI*2,sc=.9+seeded(i+k+860,seed)*1.1;
    const col=grassColors[(i+k)%grassColors.length].clone();
    place(THREE,ferns,fi++,dummy,x+Math.cos(angle)*1.1,y+sc*.45,z+Math.sin(angle)*1.1,.44*sc,1.4*sc,.1,Math.cos(angle)*.42,angle,Math.sin(angle)*.42,col);
   }
  }
  finish(ferns);
  const flowerGeo=new THREE.SphereGeometry(.34,10,8),flowers=instance(THREE,flowerGeo,new THREE.MeshStandardMaterial({color:"#dfffe2",emissive:"#73d5a0",emissiveIntensity:.24,roughness:.42}),budget.forestFlowers,ground);
  for(let i=0;i<budget.forestFlowers;i++){
   const a=seeded(i+930,seed)*Math.PI*2,r=80+seeded(i+950,seed)*880,x=Math.cos(a)*r,z=Math.sin(a)*r,y=terrainHeight(x+originX,z+originZ,world),sc=.42+seeded(i+970,seed)*.95;
   place(THREE,flowers,i,dummy,x,y+sc*.45,z,sc*.7,sc*1.25,sc*.7,0,seeded(i+980,seed)*6.28,0);
  }
  finish(flowers);
 }else if(kind===1){
  // Nerith: branching reef fans, mineral shelves and suspended bioluminescent polyps.
  const branchGeo=new THREE.CylinderGeometry(.08,.34,1,8,3),branches=instance(THREE,branchGeo,
   new THREE.MeshPhysicalMaterial({color:"#ffffff",roughness:.36,metalness:.05,clearcoat:.5,vertexColors:true}),budget.reefBranches,ground);
  const reefTints=["#167c7d","#20a99c","#53c6ac","#8ed8c6","#e0d4ac"].map(c=>new THREE.Color(c));
  let bi=0;
  for(let i=0;i<budget.reefColonies;i++){
   const a=seeded(i+1100,seed)*Math.PI*2,r=60+seeded(i+1120,seed)*840,x=Math.cos(a)*r,z=Math.sin(a)*r,y=terrainHeight(x+originX,z+originZ,world);
   for(let k=0;k<5;k++){
    const angle=seeded(i*7+k+1140,seed)*Math.PI*2,reach=4+seeded(i+k+1160,seed)*8,up=8+seeded(i+k+1180,seed)*22;
    const dx=Math.cos(angle)*reach,dz=Math.sin(angle)*reach;
    orientCylinder(dummy,x,y,z,dx,up,dz,Math.hypot(dx,up,dz),.72+seeded(i+k+1200,seed)*.65);
    branches.setMatrixAt(bi++,dummy.matrix);
    branches.setColorAt(bi-1,reefTints[(i+k)%reefTints.length]);
   }
  }
  finish(branches);
  const pearl=instance(THREE,new THREE.SphereGeometry(.42,12,10),new THREE.MeshStandardMaterial({color:"#cafff4",emissive:"#38e9d3",emissiveIntensity:1.1,roughness:.18}),budget.reefPearls,floaters);
  for(let i=0;i<budget.reefPearls;i++){
   const a=seeded(i+1300,seed)*Math.PI*2,r=52+seeded(i+1320,seed)*870,x=Math.cos(a)*r,z=Math.sin(a)*r,y=terrainHeight(x+originX,z+originZ,world),sc=.45+seeded(i+1340,seed)*1.4;
   place(THREE,pearl,i,dummy,x,y+2+seeded(i+1360,seed)*8,z,sc,sc,sc,0,seeded(i+1380,seed)*6.28,0);
  }
  finish(pearl);
  const shelf=instance(THREE,roughGeometry(THREE,new THREE.ConeGeometry(1,1,7,3),{strength:.2,frequency:8,seed:seed+24}),
   new THREE.MeshStandardMaterial({color:"#ffffff",roughness:.57,metalness:.08,vertexColors:true}),Math.round(budget.reefColonies*.7),ground);
  for(let i=0;i<shelf.count;i++){
   const a=seeded(i+1410,seed)*Math.PI*2,r=100+seeded(i+1430,seed)*800,x=Math.cos(a)*r,z=Math.sin(a)*r,y=terrainHeight(x+originX,z+originZ,world),sc=3+seeded(i+1450,seed)*12;
   place(THREE,shelf,i,dummy,x,y+sc*.35,z,sc,sc*(1.1+seeded(i+1470,seed)),sc,0,seeded(i+1490,seed)*6.28,0,reefTints[i%reefTints.length]);
  }
  finish(shelf);
 }else if(kind===2){
  // Kaldrax: fractured basalt columns with lit magma seams and vent rims.
  const basalt=instance(THREE,roughGeometry(THREE,new THREE.CylinderGeometry(.62,.94,1,7,5),{strength:.13,frequency:17,seed:seed+33}),
   new THREE.MeshStandardMaterial({color:"#ffffff",roughness:.93,metalness:.08,vertexColors:true}),budget.basaltColumns,ground);
  for(let i=0;i<budget.basaltColumns;i++){
   const a=seeded(i+1500,seed)*Math.PI*2,r=70+seeded(i+1520,seed)*820,x=Math.cos(a)*r,z=Math.sin(a)*r,y=terrainHeight(x+originX,z+originZ,world),h=8+seeded(i+1540,seed)*38,sc=2.6+seeded(i+1560,seed)*6;
   place(THREE,basalt,i,dummy,x,y+h*.5,z,sc,h,sc*(.65+seeded(i+1580,seed)*.45),(seeded(i+1600,seed)-.5)*.18,seeded(i+1620,seed)*6.28,(seeded(i+1640,seed)-.5)*.12,palette[0].clone().lerp(palette[1],.2+seeded(i+1660,seed)*.35));
  }
  finish(basalt);
  const fissure=instance(THREE,new THREE.BoxGeometry(.1,.08,1),new THREE.MeshBasicMaterial({color:"#ff793a",transparent:true,opacity:.8}),budget.lavaFissures,ground);
  for(let i=0;i<budget.lavaFissures;i++){
   const a=seeded(i+1700,seed)*Math.PI*2,r=38+seeded(i+1720,seed)*750,x=Math.cos(a)*r,z=Math.sin(a)*r,y=terrainHeight(x+originX,z+originZ,world)+.22,sc=2+seeded(i+1740,seed)*15;
   place(THREE,fissure,i,dummy,x,y,z,sc*.13,.45,sc,(seeded(i+1760,seed)-.5)*.06,seeded(i+1780,seed)*6.28,(seeded(i+1800,seed)-.5)*.08);
  }
  finish(fissure);
  const vents=instance(THREE,new THREE.TorusGeometry(1,.12,8,20),new THREE.MeshStandardMaterial({color:"#6f2c23",emissive:"#ff522b",emissiveIntensity:.28,roughness:.48}),Math.round(budget.lavaFissures*.22),ground);
  for(let i=0;i<vents.count;i++){
   const a=seeded(i+1820,seed)*Math.PI*2,r=80+seeded(i+1840,seed)*730,x=Math.cos(a)*r,z=Math.sin(a)*r,y=terrainHeight(x+originX,z+originZ,world)+.35,sc=2+seeded(i+1860,seed)*4;
   place(THREE,vents,i,dummy,x,y,z,sc,sc,sc,Math.PI/2,seeded(i+1880,seed)*6.28,0);
  }
  finish(vents);
 }else if(kind===3){
  // Vanthris: suspended broken crust, exposed mineral shards and orbiting fragments.
  const shard=instance(THREE,roughGeometry(THREE,new THREE.OctahedronGeometry(1.2,1),{strength:.21,frequency:12,seed:seed+41}),
   new THREE.MeshPhysicalMaterial({color:"#ffffff",roughness:.32,metalness:.24,clearcoat:.8,emissive:"#4b2e9b",emissiveIntensity:.12,vertexColors:true}),budget.gravityShards,floaters);
  const shimmer=["#7560b5","#9b8ad3","#c7b6eb","#6e7da8"].map(c=>new THREE.Color(c));
  for(let i=0;i<budget.gravityShards;i++){
   const a=seeded(i+1900,seed)*Math.PI*2,r=60+seeded(i+1920,seed)*840,x=Math.cos(a)*r,z=Math.sin(a)*r,y=terrainHeight(x+originX,z+originZ,world)+10+seeded(i+1940,seed)*52,sc=3+seeded(i+1960,seed)*13;
   place(THREE,shard,i,dummy,x,y,z,sc*.6,sc*(1.6+seeded(i+1980,seed)),sc*.55,.2,seeded(i+2000,seed)*6.28,.4,shimmer[i%shimmer.length]);
  }
  finish(shard);
  const orbit=instance(THREE,new THREE.TorusGeometry(1,.035,6,30),new THREE.MeshBasicMaterial({color:"#bba7ff",transparent:true,opacity:.6}),Math.round(budget.gravityShards*.24),floaters);
  for(let i=0;i<orbit.count;i++){
   const a=seeded(i+2020,seed)*Math.PI*2,r=100+seeded(i+2040,seed)*700,x=Math.cos(a)*r,z=Math.sin(a)*r,y=terrainHeight(x+originX,z+originZ,world)+24+seeded(i+2060,seed)*50,sc=3+seeded(i+2080,seed)*8;
   place(THREE,orbit,i,dummy,x,y,z,sc,sc*.7,sc,Math.PI/2,seeded(i+2100,seed)*6.28,.2);
  }
  finish(orbit);
 }else if(kind===4){
  // Orovane: floating storm-rocks with layered cloud banks and suspended mineral dust.
  const islands=instance(THREE,roughGeometry(THREE,new THREE.DodecahedronGeometry(1,2),{strength:.2,frequency:10,seed:seed+51}),
   new THREE.MeshStandardMaterial({color:"#ffffff",roughness:.95,vertexColors:true}),budget.skyIslands,floaters);
  for(let i=0;i<budget.skyIslands;i++){
   const a=seeded(i+2120,seed)*Math.PI*2,r=100+seeded(i+2140,seed)*820,x=Math.cos(a)*r,z=Math.sin(a)*r,y=28+seeded(i+2160,seed)*118,sc=7+seeded(i+2180,seed)*24;
   place(THREE,islands,i,dummy,x,y,z,sc*1.35,sc*.42,sc,seeded(i+2200,seed)*.2,seeded(i+2220,seed)*6.28,seeded(i+2240,seed)*.2,palette[2].clone().lerp(palette[3],seeded(i+2260,seed)*.5));
  }
  finish(islands);
  const cloudMat=new THREE.MeshStandardMaterial({color:"#e7d8c2",transparent:true,opacity:.27,roughness:1,depthWrite:false});
  const clouds=instance(THREE,new THREE.SphereGeometry(1,12,10),cloudMat,budget.cloudPuffs,floaters);
  for(let i=0;i<budget.cloudPuffs;i++){
   const a=seeded(i+2280,seed)*Math.PI*2,r=80+seeded(i+2300,seed)*870,x=Math.cos(a)*r,z=Math.sin(a)*r,y=54+seeded(i+2320,seed)*115,sc=9+seeded(i+2340,seed)*27;
   place(THREE,clouds,i,dummy,x,y,z,sc*2.5,sc*.32,sc,0,seeded(i+2360,seed)*6.28,0);
  }
  finish(clouds);
 }else{
  // Iskara: faceted ice towers, sapphire seams and scattered cryogenic shards.
  const iceMat=new THREE.MeshPhysicalMaterial({color:"#ffffff",roughness:.18,metalness:.1,clearcoat:1,clearcoatRoughness:.12,iridescence:.28,iridescenceIOR:1.32,vertexColors:true});
  const spires=instance(THREE,roughGeometry(THREE,new THREE.ConeGeometry(1,1,6,5),{strength:.075,frequency:8,seed:seed+61}),iceMat,budget.iceSpire,ground);
  const tints=["#76d6f2","#bcecff","#edfaff","#5a9fd0"].map(c=>new THREE.Color(c));
  for(let i=0;i<budget.iceSpire;i++){
   const a=seeded(i+2380,seed)*Math.PI*2,r=48+seeded(i+2400,seed)*850,x=Math.cos(a)*r,z=Math.sin(a)*r,y=terrainHeight(x+originX,z+originZ,world),h=10+seeded(i+2420,seed)*46,sc=2.2+seeded(i+2440,seed)*7;
   place(THREE,spires,i,dummy,x,y+h*.5,z,sc,h,sc*(.7+seeded(i+2460,seed)*.4),.03,seeded(i+2480,seed)*6.28,(seeded(i+2500,seed)-.5)*.12,tints[i%tints.length]);
  }
  finish(spires);
  const fragments=instance(THREE,roughGeometry(THREE,new THREE.OctahedronGeometry(1,1),{strength:.14,frequency:11,seed:seed+71}),iceMat,budget.iceFragments,ground);
  for(let i=0;i<budget.iceFragments;i++){
   const a=seeded(i+2520,seed)*Math.PI*2,r=30+seeded(i+2540,seed)*900,x=Math.cos(a)*r,z=Math.sin(a)*r,y=terrainHeight(x+originX,z+originZ,world),sc=.8+seeded(i+2560,seed)*5;
   place(THREE,fragments,i,dummy,x,y+sc*.55,z,sc*.7,sc*(.8+seeded(i+2580,seed)),sc*.7,.2,seeded(i+2600,seed)*6.28,.3,tints[(i+1)%tints.length]);
  }
  finish(fragments);
 }

 root.userData.detailBudget=budget;
 root.userData.quality=quality;
 root.userData.setQuality=nextQuality=>{
  if(nextQuality===root.userData.quality)return root;
  const parent=root.parent;
  const replacement=createPlanetaryDetail(THREE,world,{quality:nextQuality,originX,originZ,terrainHeight});
  if(parent){parent.add(replacement);parent.remove(root);}
  const geometries=new Set(),materials=new Set();
  root.traverse(object=>{
   if(object.geometry&&!geometries.has(object.geometry)){geometries.add(object.geometry);object.geometry.dispose();}
   if(object.material){
    const list=Array.isArray(object.material)?object.material:[object.material];
    for(const material of list){if(material&&!materials.has(material)){materials.add(material);material.dispose();}}
   }
  });
  root.clear();return replacement;
 };
 root.userData.update=(time,dt)=>{
  foliage.rotation.z=kind===0?Math.sin(time*.28)*.003:0;
  floaters.rotation.y+=dt*(kind===3?.018:kind===4?.008:.003);
  floaters.position.y=kind===3?Math.sin(time*.42)*1.6:Math.sin(time*.18)*.45;
 };
 return root;
}
