# Planetary lifecycle and persistent world states

## Design intent

Planets are not static maps. Each world has a lifecycle, a current environmental state, a history and a set of discoverable consequences. Its phase can change through simulation schedules, cosmic events and explicitly authored narrative triggers.

## Canonical lifecycle

1. **Formation** — dust, debris and proto-planetary material gather around a young star. No surface gameplay.
2. **Primordial** — the crust and atmosphere stabilize; oceans, volcanoes and impact scars may form.
3. **Stable** — a mature world with repeatable orbital and environmental conditions.
4. **Biosphere** — life appears and diversifies. Flora, fauna and food webs become exploration content.
5. **Civilized** — intelligent societies leave settlements, infrastructure, signals and cultural records.
6. **Declining** — ecological, geological, stellar or artificial instability threatens the world.
7. **Collapse warning** — the world announces a specific, readable countdown and evacuation/research windows.
8. **Collapsing** — the surface, atmosphere and orbit react in staged phases. The server owns the authoritative phase.
9. **Remnant** — the original surface may be inaccessible; debris fields, orbital wreckage and core fragments become a new expedition space.

Not every planet reaches every phase. Some remain sterile, some never develop civilization, and some are already remnants when discovered. A world can enter the lifecycle at any authored phase.

## World record

A planet record should include:
- Stable ID, name, star/system ID and procedural seed.
- Biome, gravity, atmosphere, day length, orbital parameters and hazard profile.
- Current lifecycle phase, stability score, revision and event schedule.
- Discovered locations, ruins, species, resources and quest/story flags.
- Access requirements and emergency evacuation policy.
- Art/lighting/audio profiles and streaming/LOD metadata.

Persistent world-state changes are versioned. Clients may predict visual detail, but must never decide the authoritative lifecycle or permanent discovery state.

## Collapse event stages

**Foreshadowing:** instruments report unusual readings; wildlife migrates; NPCs change behavior; sky and audio cues evolve.

**Warning:** global and local alerts appear. The player may rescue researchers, recover records, map safe corridors or observe rare phenomena.

**Instability:** quakes, storms, gravity anomalies and surface fractures increase. Navigation changes and optional challenges open.

**Cataclysm:** the world transitions through authored destruction beats. Gameplay offers clear evacuation and observation choices.

**Aftermath:** a remnant field is generated or activated. Wreckage, debris, rare samples and historical records can remain discoverable for a limited or persistent period.

## Design guardrails

- Never destroy a player's unique quest item or permanently delete paid/earned inventory.
- Never use an invisible timer to remove a player without warning.
- Preserve a discovery log when a planet changes phase.
- Use deterministic seeds and server-authoritative event revisions.
- Avoid full voxel simulation as the default. Prefer deterministic fractured meshes, staged destruction, Niagara, Chaos and authored hero sequences.
- Provide photosensitivity options, reduced camera shake, reduced flash and a readable safe route.
