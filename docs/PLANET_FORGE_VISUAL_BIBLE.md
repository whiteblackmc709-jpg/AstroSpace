# AstroSpace — Planet Forge Visual Bible

## Creative direction

Solace Minor is an original fictional system. Scientific and cinematic references are used only to study light transport, scale, atmospheric layering, cloud behavior and geological plausibility. No reference video, still, map or external planet model is imported into the game.

The Planet Forge replaces the earlier shared-sphere color variants with six authored identities. Each world has original naming, palette, material language, geography, atmosphere and signature geometry.

## The six worlds

### 01 — Elyndra / The Verdant Aurora
A temperate biosphere with cobalt abyssal oceans, jade continental shelves and pale mineral highlands. Its signature is a high-altitude aurora ribbon and bioluminescent river deltas. Surface language: layered coastlines, mountain relief, wet ocean specular and restrained night-side settlement lights. Palette: abyss blue, deep teal, living green and mineral ivory.

### 02 — Nerith / The Luminous Pelagic
A near-global ocean world. Tiny island chains sit above extensive turquoise shelf reefs; luminous reef beacons mark the shallows. A turbulent cyan storm canopy and tidal walls driven by two moons define its silhouette. Surface language: dark abyssal trenches, turquoise shallows, irregular island masks and high-gloss water.

### 03 — Kaldrax / The Obsidian Furnace
A pyroclastic supervolcanic planet with fractured basalt plates, caldera scars and branching molten mantle channels. Instanced volcanic cones add physical skyline detail. Surface language: near-black glass, burnt umber rock, copper ash and orange fissure emission.

### 04 — Vanthris / The Gravity Remnant
A failed planet held together by an unstable gravity knot. Crust plates are separated by glowing violet chasms; large fragments drift above the surface and a fractured debris ring cuts through the orbital plane. Surface language: broken plateaus, sharp exposed edges, cold mineral faces and violet-white anomaly light.

### 05 — Orovane / The Eye of Oru
A super-Jovian gas giant with broad bronze, champagne and indigo atmospheric bands. The Eye of Oru is a massive persistent cyclone. Two distinct ring bands and fine radial gaps give this world its unique orbital silhouette. Surface language: turbulent latitude bands, layered cloud belts, storm eye and atmospheric depth.

### 06 — Iskara / The Sapphire Cryosphere
A frozen ocean world beneath a shifting glacier shell. Sapphire crevasses cut through pale ice shelves; crystal growths and cryovolcanic plumes rise above the polar fractures. Instanced crystal spires give the surface a recognisable skyline. Surface language: luminous ice, deep blue fissures, crystalline ridges and cold cyan emission.

## Renderer implementation

- Dedicated per-world palette, seed, material branch and cloud behavior.
- Multi-octave 3D procedural noise for seamless planetary patterns.
- Vertex displacement to give landforms and crust plates visible silhouette relief.
- High-subdivision sphere geometry for close orbital viewing, with a reduced performance mode.
- Separate moving cloud shell and fresnel atmosphere shell.
- World-specific geometry: volcanic cones, crystal growths, reef beacons, floating crust fragments and multi-layer rings.
- ACES tone mapping, directional sunlight, cool bounce fill and a starfield/nebula backdrop.
- Existing orbit, scan, event and flight interactions are retained.

## Honest production boundary

This is a procedural WebGL planet showcase for the website, not a final Unreal Engine asset pack. The current renderer synthesizes surfaces at runtime; it does not yet ship authored 8K albedo/normal/roughness/displacement texture sets, volumetric cloud simulation, planetary landing terrain or high-poly sculpted production meshes. Those are separate asset-pipeline and engine-integration milestones.
