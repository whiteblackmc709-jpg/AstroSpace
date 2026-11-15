const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const lerp=(a,b,t)=>a+(b-a)*t;
const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};

export function noise2(x,z,seed){
 const ix=Math.floor(x),iz=Math.floor(z),fx=x-ix,fz=z-iz,sx=fx*fx*(3-2*fx),sz=fz*fz*(3-2*fz);
 const hash=(a,b)=>{const n=Math.sin(a*127.1+b*311.7+seed*71.73)*43758.5453;return n-Math.floor(n);};
 const a=hash(ix,iz),b=hash(ix+1,iz),c=hash(ix,iz+1),d=hash(ix+1,iz+1);return lerp(lerp(a,b,sx),lerp(c,d,sx),sz);
}
function fbm2(x,z,seed){let v=0,amp=.52,norm=0;for(let i=0;i<5;i++){v+=noise2(x,z,seed+i*17)*amp;norm+=amp;x=x*2.03+13.7;z=z*2.03-7.1;amp*=.49;}return v/norm;}

export function terrainHeight(x,z,w){
 const continental=fbm2(x*.00155,z*.00155,w.seed+3);
 const rolling=fbm2(x*.0058+11,z*.0058-7,w.seed+19);
 const fine=noise2(x*.018+31,z*.018-17,w.seed+47);
 const micro=noise2(x*.052-9,z*.052+23,w.seed+83);
 const ridge=1-Math.abs(rolling*2-1);
 const detail=fine-.5,grain=micro-.5;
 const erosion=noise2(x*.011+71,z*.011-53,w.seed+101);
 const incised=(1-smooth(.025,.19,Math.abs(erosion-.51)))*2.2;
 let h=(continental-.5)*52+(rolling-.5)*25+(ridge-.52)*10+detail*3+grain*.8-incised*.45;
 if(w.terrain===0){
  const terrace=Math.pow(Math.max(0,ridge-.48),1.24);
  h=(continental-.5)*66+(rolling-.5)*31+terrace*10+detail*3.1+grain*1.05-incised;
 }else if(w.terrain===1){
  const shelf=smooth(.41,.72,continental);
  h=(continental-.5)*31+(rolling-.5)*20+(ridge-.56)*6+detail*1.8+grain*.5-incised*.35+shelf*1.1;
 }else if(w.terrain===2){
  const volcanicRidge=Math.pow(Math.max(0,ridge-.22),1.42);
  const caldera=Math.sin(continental*22+rolling*8)*Math.pow(Math.max(0,rolling-.56),2)*5;
  h=(continental-.5)*58+(rolling-.5)*28+volcanicRidge*31+detail*3.4+grain*1.2+caldera;
 }else if(w.terrain===3){
  const fracture=Math.pow(Math.max(0,ridge-.28),1.25);
  h=(continental-.5)*70+(rolling-.5)*37+fracture*25+detail*3.8+grain*1.35-incised*.3;
 }else if(w.terrain===4){
  const band=.5+.5*Math.sin(z*.0024+rolling*3.2);
  h=(continental-.5)*38+(rolling-.5)*22+(ridge-.5)*14+detail*2.1+grain*.55+(band-.5)*7;
 }else if(w.terrain===5){
  const glacialRidge=Math.pow(Math.max(0,ridge-.34),1.28);
  h=(continental-.5)*49+(rolling-.5)*28+glacialRidge*19+detail*2.8+grain*.85-incised*.55;
 }
 const spawnBlend=smooth(24,220,Math.hypot(x,z));
 return lerp(-1.2,h,spawnBlend);
}

export function terrainColorVariation(w,x,z,height,normalY){
 const kind=Number(w.terrain)||0,macro=noise2(x*.009+7,z*.009-11,w.seed+133),micro=noise2(x*.061-19,z*.061+29,w.seed+151);
 const slope=1-clamp(normalY,0,1),grain=(macro-.5)*.18+(micro-.5)*.075;
 let tint=[1+grain,1+grain,1+grain];
 if(kind===0){
  const mineral=smooth(18,42,height),wet=1-smooth(-3,6,height);
  tint=[.88+mineral*.16+grain,.98+mineral*.12+grain,.84+mineral*.17+grain];
  tint[1]+=wet*.08;tint[2]+=wet*.12;
 }else if(kind===1){
  const reef=smooth(-2,16,height),deep=1-smooth(-8,7,height);
  tint=[.76+reef*.15+grain,.98+reef*.12+grain,1.02+grain+deep*.08];
 }else if(kind===2){
  const ash=smooth(8,30,height),heat=1-smooth(.02,.19,Math.abs(micro-.53));
  tint=[.82+ash*.15+grain+heat*.18,.78+grain+heat*.07,.75+grain];
 }else if(kind===3){
  const exposed=smooth(8,34,height);
  tint=[.84+exposed*.13+grain,.78+exposed*.16+grain,.98+grain];
 }else if(kind===4){
  const cloudBand=.5+.5*Math.sin(x*.003+macro*5);
  tint=[.94+cloudBand*.08+grain,.86+cloudBand*.1+grain,.78+cloudBand*.14+grain];
 }else{
  const snow=smooth(4,23,height),crevasse=1-smooth(.02,.18,Math.abs(micro-.5));
  tint=[.77+snow*.22+grain,.9+snow*.17+grain,1.02+grain-crevasse*.09];
 }
 const face=slope>.34?1.04:1;
 return tint.map(v=>clamp(v*face,.58,1.34));
}
