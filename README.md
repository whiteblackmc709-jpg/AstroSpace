# AstroSpace — Quantum Awakening

**An exploration-first science-fiction action RPG about a living, evolving universe.**

## Current website

The public site now includes an interactive WebGL Flight Deck with six procedural 3D planet looks, orbital camera controls, a deep-scan interaction, a small flight sandbox and cosmic-event previews.

- Drag to orbit; scroll or use zoom buttons to approach.
- Select Kharon's Rest, Vespera, Cinderwake, Nox Aeterna, Aureon or Glaciera.
- Run a deep scan to reveal signal data.
- Toggle stellar flare, crust fracture or black-hole presentation.
- Engage Flight: WASD to translate, Q/E vertically, Shift to boost and Space to brake.

This is a browser-based visual prototype. It is not the final Unreal Engine game, not multiplayer, and not a production terrain landing system.

## Core game direction

AstroSpace is built around discovery, traversal, planetary history and cosmic-scale events. Combat supports exploration; it is not the only reason to visit a world.

### Design pillars
- Planets have lifecycles: formation, primordial change, stability, biosphere, civilization, decline, collapse and remnants.
- Players explore by flying, scanning, surveying, decoding ruins, solving environmental puzzles and charting routes.
- The first planet is a protected onboarding space. Players cannot leave until they complete the launch authorization story and obtain a ship with a quantum navigation core.
- Later destinations require combinations of story, player capability, scanner knowledge and environmental equipment.
- Black holes, planetary fragmentation, stellar flares and quantum anomalies change routes and world states.

## Repository map

- `index.html`, `assets/planet-explorer.*`: interactive website and procedural Three.js planet viewer.
- `docs/`: gameplay, planetary lifecycle, cosmic events, art standards and research references.
- `data/`: world and event data.
- `src/core/`: C++17 reference gameplay rules.
- `tests/`: native unit tests.
- `.github/workflows/`: CI validation.

## Local validation

```bash
cmake -S . -B build
cmake --build build
ctest --test-dir build --output-on-failure
python3 -m json.tool data/sector_01.json >/dev/null
python3 -m json.tool data/cosmic_events.json >/dev/null
```

The site is static and served by Vercel. Three.js is loaded as a pinned browser ES module from jsDelivr.

## Platform responsibilities

- **GitHub:** source control, pull requests and CI.
- **Vercel:** the website and future companion web/API surfaces.
- **Supabase:** planned persistence for accounts, character profiles, discoveries and progression. No database is modified by the web prototype.
- **Unreal Engine + dedicated game servers:** the eventual 3D game client and authoritative real-time simulation.

## Art status

The browser prototype creates procedural materials at runtime. The supplied image bundle contained text concept labels, not production image or 3D assets. Production PBR texture sets, models, rigs, animation, cinematics, audio and Unreal Niagara effects remain separate art-production work.
