const worldData = {
  kharon: {
    type: "TERRAN WORLD", access: "STARTING WORLD", name: "Kharon's Rest",
    description: "A temperate frontier wrapped in pale cloud bands. The first traces of the Quantum Lattice lie beneath its ancient basin.",
    threat: "LOW", requirement: "STORY INTRO", anomalies: "02", palette: "kharon"
  },
  vespera: {
    type: "OCEANIC WORLD", access: "LOCKED DESTINATION", name: "Vespera",
    description: "A deep-water world with enormous tidal shelves, bioluminescent reefs and abandoned signal towers below the storm line.",
    threat: "MODERATE", requirement: "CHAPTER 2 + SCAN II", anomalies: "05", palette: "vespera"
  },
  cinder: {
    type: "VOLCANIC WORLD", access: "LOCKED DESTINATION", name: "Cinderwake",
    description: "A restless crust of black glass and molten channels. Seismic patterns suggest something is moving beneath the planetary mantle.",
    threat: "HIGH", requirement: "LEVEL 18 + THERMAL SUIT", anomalies: "04", palette: "cinder"
  },
  nox: {
    type: "HOLLOW WORLD", access: "RESTRICTED DESTINATION", name: "Nox Aeterna",
    description: "A fractured remnant caught in unstable gravity. Its horizon bends around structures that should not exist in three-dimensional space.",
    threat: "EXTREME", requirement: "CHAPTER 4 + VOID ADAPTATION", anomalies: "09", palette: "nox"
  }
};
const cards = document.querySelectorAll(".world-card");
const detail = document.querySelector(".world-detail");
function selectWorld(id) {
  const world = worldData[id];
  if (!world) return;
  cards.forEach(function(card) {
    const active = card.dataset.world === id;
    card.classList.toggle("active", active);
    card.setAttribute("aria-selected", active ? "true" : "false");
  });
  document.getElementById("world-class").textContent = world.type;
  const access = document.getElementById("world-access");
  access.textContent = world.access;
  access.classList.toggle("locked", id !== "kharon");
  document.getElementById("world-name").textContent = world.name;
  document.getElementById("world-description").textContent = world.description;
  document.getElementById("world-threat").textContent = world.threat;
  document.getElementById("world-requirement").textContent = world.requirement;
  document.getElementById("world-anomalies").textContent = world.anomalies;
  detail.dataset.palette = world.palette;
  const sphere = document.querySelector(".detail-sphere");
  const palettes = {
    kharon: "radial-gradient(circle at 35% 28%,#d7e3d2,#7b9ea0 35%,#365c75 62%,#0a162d)",
    vespera: "radial-gradient(circle at 35% 28%,#a8f2e9,#2986a0 38%,#123b67 68%,#06152b)",
    cinder: "radial-gradient(circle at 35% 28%,#ffe0a6,#c35a3c 38%,#61273b 66%,#190e24)",
    nox: "radial-gradient(circle at 35% 28%,#d7c1ff,#7350a8 38%,#30204e 66%,#070817)"
  };
  sphere.style.background = palettes[world.palette];
  sphere.style.boxShadow = id === "nox" ? "inset -22px -15px 34px #020815,0 0 0 1px rgba(179,226,255,.25),0 0 75px rgba(169,138,255,.35)" : "inset -22px -15px 34px #020815,0 0 0 1px rgba(179,226,255,.25),0 0 65px rgba(73,158,220,.25)";
}
cards.forEach(function(card) {
  card.addEventListener("click", function() { selectWorld(card.dataset.world); });
  card.addEventListener("keydown", function(event) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      selectWorld(card.dataset.world);
    }
  });
});
