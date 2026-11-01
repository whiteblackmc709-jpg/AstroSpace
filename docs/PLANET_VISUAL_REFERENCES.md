# Planet visual research and art direction

## Research references reviewed

These materials informed the visual language and interaction goals. They are references, not assets copied into the project.

- NASA Scientific Visualization Studio, [Solar System: EIC Display](https://svs.gsfc.nasa.gov/5674) — 2026 widescreen planet tour with 3840×1080 and 7680×2160 deliverables. Useful for planetary scale, orbital spacing and cinematic framing.
- NASA+, [Earth from Space in 4K](https://plus.nasa.gov/video/earth-from-space-in-4k/) — real cloud formations, atmospheric limb, day/night transitions and surface detail.
- NASA Goddard, [360 Video: NASA Simulation Plunges Into a Black Hole](https://www.youtube.com/watch?v=crXGmeWFb9o) — accretion disk, photon rings and a star-field reference during gravitational distortion.
- NASA, [Solar System Treks](https://trek.nasa.gov/) — browser-based surface exploration and flyovers based on mission data; a strong reference for discovery-oriented navigation.
- NASA, [Kepler-1649c artist concept](https://science.nasa.gov/photojournal/kepler-planet-1649c-artists-illustration-from-space/) — surface lighting, distant star scale and exoplanet atmosphere cues.
- NASA raw image, [Cassini view of Saturn's rings](https://solarsystem.nasa.gov/raw_images/228988/) — dense ring banding and fine structure.

## Design translation

### Surface materials
The interactive browser scene uses original procedural GLSL materials generated at render time. Planet type, seed, broad geology and micro-detail alter the visible surface:
- Kharon's Rest: water, continents, polar ice and a moving cloud shell.
- Vespera: deep ocean, island chains, shelf shallows and luminous reef edges.
- Cinderwake: dark basalt and emissive lava fissures.
- Nox Aeterna: fractured violet remnant terrain and gravity-flux accents.
- Aureon: latitudinal gas bands, atmospheric storms and a translucent ring system.
- Glaciera: blue ice, pale frost and cryovolcanic crevasses.

### Lighting and composition
- Directional star light with a cool fill and a restrained atmospheric rim.
- ACES filmic tone mapping and capped device pixel ratio.
- Orbital scale markers and distant planetary silhouettes.
- Dark-side falloff that preserves the silhouette rather than flattening the sphere.

### Interactivity
- Drag to rotate the view; wheel/buttons to zoom.
- Select a planet to change its material, dossier and access profile.
- Deep scan feedback and event lab toggles.
- Flight mode uses WASD, Q/E, Shift boost and Space brake.
- Stellar flare, crust fracture and black-hole visual events can be enabled independently.

## Production caveat

The WebGL experience is a real-time procedural 3D browser prototype, not the final Unreal Engine asset pipeline. It establishes look-development direction and interaction feel. Production-ready 8K texture sets, sculpted displacement/normal/roughness maps, layered volumetric atmosphere, hero environment meshes, authored surface biomes and high-end character/ship models still need dedicated asset creation, review and profiling. Real-time game-quality assets must be built, baked, optimized and tested inside Unreal Engine on target hardware.
