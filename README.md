# AstroSpace — Quantum Awakening

**An exploration-first science-fiction action RPG about a living, evolving universe.**

## Current playable experience

The public landing site remains the product/visual introduction. The separate /play/ route is the browser RPG prototype.

The campaign scaffold contains six original planets, four named regions per planet, five mandatory contracts in each region, and two optional hidden caches per region. A player must clear all five contracts to enter the next region; all four regions must be cleared before the next planet is unlocked. The first world is the onboarding arc and flight authorization unlocks only after its four regions are completed.

The five contract types are:
- Story contact and character transmission.
- Signal survey with three scan targets.
- Ancient reliquary/ruin alignment.
- Four relic fragments to recover.
- A regional guardian with four armour nodes.

There are also timed planetary events with collectible anomaly shards, a scan pulse, hidden caches, a regional atlas, a story archive, photo mode and local progress saves.

Visual work in this browser milestone now synthesises biome-specific PBR albedo, normal, roughness and height maps at 1K/2K, with a 4K cinematic tier when reported device memory and GPU texture limits allow it. The landing planet viewer uses equirectangular surface maps and PMREM environment lighting; /play uses streamed 3×3 terrain chunks with the same PBR material pipeline, planet-specific lighting/fog, and custom regional landmarks. The maps are original procedural browser assets, not scanned or hand-authored production PBR source art; this is not ray tracing or final Unreal Engine rendering.

The audio layer generates planet-specific ambient synth beds and sound effects using Web Audio after the player starts audio. Settings cover render profile, FOV, look sensitivity, invert, reduced motion, HUD visibility and audio mix.

Account, cross-device cloud save, profiles, friend requests, direct messages and realtime global/planet/region chat are implemented as a Supabase client adapter with an RLS migration. They remain offline until an AstroSpace-specific Supabase project is configured and the two public environment variables are added to Vercel. Local campaign saves work without those services.

This is still a browser prototype. It is not a production MMORPG, authoritative multiplayer server, final Unreal Engine game, or measured target-device graphics build. See the campaign and social setup notes for exact scope and service prerequisites.

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
