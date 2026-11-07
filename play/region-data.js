const centres=[[0,0],[1450,260],[-1280,1180],[620,-1850]];
const regionSpecs=[
{id:"kharon",name:"ELYNDRA",title:"THE VERDANT AURORA",type:"TEMPERATE BIOSPHERE",sky:"#071824",fog:"#173d3b",accent:"#80e3c0",light:"#e1d8af",palette:["#152e31","#38644a","#78a978","#d2d0a5"],seed:17,terrain:0,
regions:[
["ASTERFALL EXPANSE","Open grasslands","RHEA VOSS","HOLLOW WARDEN","LUMENWAKES","A broken ark rests beneath the living aurora. Its recorder knows your unit serial before you do."],
["VEYRA CANOPY","Ancient rainforest","SERA MORN","ROOTSTALKER ALPHA","VERDANT SEEDS","The canopy has grown over a vanished road. A cartographer is tracking a signal through the roots."],
["ROOTGLASS BASIN","Crystal marsh","THEO ARDEN","BASIN COLOSSUS","MEMORY GLASS","The mineral roots preserve the last thoughts of a lost civilisation. Something is editing the memories."],
["HOLLOW MERIDIAN","Buried observatory","THE HOLLOW WARDEN","MERIDIAN SENTINEL","STAR CHARTS","Below the oldest crater, a star map points to five other worlds and an erased seventh planet."]]},
{id:"vespera",name:"NERITH",title:"THE LUMINOUS PELAGIC",type:"OCEANIC FRONTIER",sky:"#061b2a",fog:"#0e4351",accent:"#4af0d7",light:"#a2f4e8",palette:["#092b40","#0b6977","#35b8a2","#a5e5d3"],seed:43,terrain:1,
regions:[
["PELAGIC REACH","Tidal coast","TAL","TIDEBOUND SENTINEL","RESONANCE SHELLS","A keeper at the reef edge hears a second heartbeat beneath the tide."],
["GLASSREEF CATHEDRAL","Luminous reef","NAMI OF THE DEEP","CHOIR EATER","GLASS CHORUS","The reef sings in a language older than the ocean. Four notes open the cathedral gate."],
["DROWNED CITY","Submerged ruins","ARCHIVIST OREN","ABYSSAL CANTOR","TIDAL ARCHIVES","A city faces the abyss. Its archive measures distances between stars, not streets."],
["ABYSSAL TRENCH","Deep ocean trench","THE LAST DIVER","THE TRENCH KING","PELAGIC CORES","A guardian keeps the oldest signal from reaching the surface. It is afraid of what answers."]]},
{id:"cinder",name:"KALDRAX",title:"THE OBSIDIAN FURNACE",type:"PYROCLASTIC WORLD",sky:"#170c14",fog:"#5b2927",accent:"#ff8a4d",light:"#ffc18b",palette:["#1c1820","#5b3030","#a94b31","#eea06a"],seed:86,terrain:2,
regions:[
["EMBERFALL BASIN","Ashen valley","MARA QUILL","ASH CONVOY TITAN","FORGE RECORDS","The mining convoy did not die in the eruption. Its final transmission stops when the stars blink."],
["OBSIDIAN BARRENS","Glass desert","JAX KERR","BASALT REAPER","OBSIDIAN KEYS","The caldera vault is sealed by heat-tempered glass from the planet's first sunrise."],
["CINDER CROWN","Volcanic highlands","VULCAN-6","CROWN DEVOURER","FURNACE SIGILS","A second star pulses beneath the crust, draining the planet to keep itself alive."],
["HEARTFORGE","Molten coreworks","THE FORGE MIND","HEARTFORGE TITAN","SOLAR SHARDS","A machine has mistaken endless heat for eternal life. The world is beginning to crack."]]},
{id:"nox",name:"VANTHRIS",title:"THE GRAVITY REMNANT",type:"FRACTURED WORLD",sky:"#100e22",fog:"#342a59",accent:"#ba9cff",light:"#d4c7ff",palette:["#17172b","#3c3267","#8275ad","#d6c5ed"],seed:131,terrain:3,
regions:[
["BROKEN EXPANSE","Floating shardfields","ION VEY","FRACTURE STALKER","GRAVITY KEYS","The land hangs above its own gravity well. The first fracture is a doorway, not a wound."],
["INVERTED STAIR","Impossible ruins","MIRA-9","UPFALL COLOSSUS","INVERSION RELICS","The stairs fall upward into memories that should not belong to a machine."],
["SHATTERED ARCHIVE","Floating library","THE ECHO","NULL CARTOGRAPHER","VOID MANUSCRIPTS","An archive records A.R.I.A.-07 before its construction. The memory was planted."],
["VIOLET ENGINE","Gravity heart","THE FIRST ECHO","NULL SOVEREIGN","SINGULARITY CORES","The original star map is hidden inside an engine that bends distance into time."]]},
{id:"aureon",name:"OROVANE",title:"THE EYE OF ORU",type:"SUPER-JOVIAN SKYLAND",sky:"#211a31",fog:"#8a6049",accent:"#f5c28a",light:"#ffe1bd",palette:["#30263a","#735044","#c18b5f","#ead0a1"],seed:209,terrain:4,
regions:[
["CLOUDSEA VERGE","Floating cliffs","ORU-9","SKY SHEPHERD","STORM MEMORIES","A voice travels through lightning and asks you to find a storm that remembers your ship."],
["CYCLONE ARCHIPELAGO","Storm islands","KAI OF THE WIND","TEMPEST WRAITH","WIND RELICS","Four memories are trapped in drifting stone shelves above the cloud deck."],
["SHEPHERD'S ROOST","Upper atmosphere","THE STORM SHEPHERD","THUNDER REGENT","AETHER FEATHERS","The storm has been protecting a city that vanished centuries ago."],
["EYE OF ORU","Cyclone eye","ORU-9","STORM SOVEREIGN","CYCLONE HEARTS","The cyclone is a living memory. It has been holding the eye open for a reason."]]},
{id:"glaciera",name:"ISKARA",title:"THE SAPPHIRE CRYOSPHERE",type:"FROZEN OCEAN WORLD",sky:"#06172e",fog:"#275b7c",accent:"#86e9ff",light:"#d9f5ff",palette:["#132f4e","#346f99","#8fc9db","#e7f5f5"],seed:283,terrain:5,
regions:[
["SAPPHIRE REACH","Glacier coast","ELI SORN","FROSTBOUND COLOSSUS","CRYO BLOOMS","The ice around the monolith is warm. Something beneath it has been breathing."],
["CRYO GARDENS","Buried biosphere","DR. VENN'S ECHO","GARDEN WARDEN","PRESERVED MEMORIES","Four blooms hold the final days of the Meridian project — and a face that looks like yours."],
["FIRST ARCHIVE","Subglacial city","DR. ELYS VENN","ARCHIVE KEEPER","MEMORY KEYS","The First Cartographer is waiting in the archive, and knows why A.R.I.A.-07 was built."],
["MERIDIAN HEART","Frozen machine core","THE QUIET SUN","THE QUIET SUN","MERIDIAN FRAGMENTS","The machine was built to save six worlds. It has forgotten the difference between preservation and control."]]}
];
const offsets=[[-150,30],[155,-100],[-35,190],[190,190]];
export const PLANETS=regionSpecs.map(({regions,...p})=>({...p,regions:regions.map((r,i)=>({id:p.id+"-"+(i+1),name:r[0],biome:r[1],npc:r[2],boss:r[3],relic:r[4],lore:r[5],center:{x:centres[i][0],z:centres[i][1]}}))}));
export const REGIONS=PLANETS.flatMap((planet,pi)=>planet.regions.map((region,ri)=>{
 const {x:sx,z:sz}=region.center,make=(key,type,title,description,ox,oz,extra={})=>({id:region.id+"-"+key,type,title,description,x:sx+ox,z:sz+oz,...extra});
 return { ...region,planetId:planet.id,planetIndex:pi,regionIndex:ri,planetName:planet.name,planetTitle:planet.title,planetPalette:planet.palette,seed:planet.seed+ri*37,
  tasks:[
   make("story","story","Find " + region.npc,region.lore,-150,30,{npc:region.npc,dialogue:region.npc+": The signal is not coming from the stars. It is coming from something buried beneath this place. I found the first mark, but I cannot read what it remembers.",required:1,reward:160}),
   make("survey","survey","Trace the fractured signal","Three signal fractures are distorting the local navigation grid. Isolate their source and map the hidden route.",155,-100,{item:"SIGNAL TRACE",required:3,reward:240}),
   make("ruins","ruins","Open the " + region.name + " Reliquary","The ruin twin memory pylons have fallen out of phase. Re-align them to open the sealed archive.",430,-315,{item:"RELIQUARY SIGIL",required:2,reward:280}),
   make("relics","recover","Recover the " + region.relic,"Four relic fragments were scattered when the Meridian network collapsed. Recover all fragments before the guardian wakes.",-35,190,{item:region.relic,required:4,reward:320}),
   make("threat","boss","Confront " + region.boss,"The guardian is bound to the Meridian signal. Break its four armour nodes and uncover what it was ordered to protect.",190,190,{boss:region.boss,required:4,reward:520})
  ],
  secrets:[{id:region.id+"-secret-a",title:"Buried Star Cache",x:sx-410,z:sz-330,reward:90},{id:region.id+"-secret-b",title:"Lost Cartographer's Beacon",x:sx+460,z:sz+360,reward:130}]
 };
}));
export const EVENT_NAMES={
 kharon:["Aurora Bloom","Ancient root resonance","Meteor pollen fall"],
 vespera:["Tidal resonance","Glassreef migration","Abyssal pressure wave"],
 cinder:["Emberfall storm","Caldera surge","Obsidian lightning"],
 nox:["Gravitic inversion","Shardfall","Violet pulse"],
 aureon:["Cyclone migration","Ion lightning","Cloudsea rupture"],
 glaciera:["Cryo bloom","Sapphire aurora","Subglacial tremor"]
};
