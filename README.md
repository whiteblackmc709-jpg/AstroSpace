# AstroSpace — Quantum Awakening

**An exploration-first science-fiction action RPG about a living, evolving universe.**

AstroSpace is being built around discovery, traversal, planetary history and cosmic-scale events. Combat supports exploration; it is not the only reason to visit a world.

## Current milestone

This repository currently contains:
- A deployable static project landing page for Vercel.
- The first-sector world data and exploration access rules.
- A C++17 reference implementation for planetary lifecycle transitions and exploration gates.
- Design documents for planet evolution, cosmic events, art/VFX quality and technical architecture.
- A GitHub Actions validation workflow.

**Important scope note:** this is a foundation milestone, not a finished Unreal Engine game. There is no Unreal .uproject, production 3D asset library, animation set, or dedicated game-server fleet in this commit. The C++ module is engine-independent reference logic intended to be integrated into Unreal Engine after the gameplay architecture is approved.

## Vision

- Explore a galaxy of distinct systems and planets.
- Let planets have histories: formation, geological change, life, civilizations, decline, collapse and remnants.
- Fly through space with six-degree-of-freedom controls and character powers.
- Gate dangerous destinations through story progress, equipment, knowledge and player capability.
- Make black holes, planetary fragmentation, stellar events and anomalies affect the world.
- Make investigation, surveying, discovery, ruins and traversal the primary loop.

## First playable vertical slice

1. Kharon's Rest — the protected starting world.
2. A story-led tutorial that teaches movement, scanning, traversal and the first character power.
3. A launch authorization chain; players cannot leave the starting planet until its story, ship and quantum-drive requirements are met.
4. A small orbital space volume and one accessible destination.
5. One multi-phase cosmic event and one exploration mystery.
6. Persistent character and discovery records.

## Repository map

- `index.html`, `assets/`: Vercel-hosted project landing page.
- `docs/`: game pillars, world systems, art standards and architecture.
- `data/`: validated world and cosmic-event data.
- `src/core/`: engine-independent C++ gameplay rules.
- `tests/`: native unit tests.
- `database/`: planned database notes only; no live Supabase project is modified by this repository.

## Local validation

```bash
cmake -S . -B build
cmake --build build
ctest --test-dir build --output-on-failure
python3 -m json.tool data/sector_01.json >/dev/null
python3 -m json.tool data/cosmic_events.json >/dev/null
```

A C++17 compiler and CMake are required. The GitHub Actions workflow runs the same checks.

## Platform boundaries

- **GitHub:** source of truth, pull requests, version history and CI.
- **Vercel:** the project website and companion web/API surfaces. It does not simulate real-time 3D gameplay.
- **Supabase:** planned persistence for accounts, character profiles, codex discoveries, quest flags and save metadata. A dedicated active AstroSpace Supabase project must be selected before applying schema changes.
- **Unreal Engine + dedicated game servers:** the eventual 3D client and authoritative real-time simulation.

## Art status

The supplied image bundle contains text concept labels, not production PNG/JPG/3D assets. Production character models, planet environments, animation, cinematics, audio and Niagara effects remain art-production work. See `docs/ART_AND_VFX_STANDARD.md`.
