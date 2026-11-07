import assert from "node:assert/strict";
import { createPlanetaryDetailPalette } from "../assets/planetary-detail.js";

class Color {
  constructor(value) { this.value = value; }
}

const palette = createPlanetaryDetailPalette({ Color }, {
  palette: ["#071f3e", "#176b79", "#4fa66f", "#e0d6a5"]
});
assert.deepEqual(palette.map(color => color.value), [
  "#071f3e", "#176b79", "#4fa66f", "#e0d6a5"
], "The planetary palette must be fully resolved before biome textures are created.");

const fallback = createPlanetaryDetailPalette({ Color }, { palette: ["#123456"] });
assert.deepEqual(fallback.map(color => color.value), [
  "#123456", "#123456", "#123456", "#123456"
], "Short palettes must be padded to four valid colours.");
console.log("Planetary palette initialization contract: PASS.");
