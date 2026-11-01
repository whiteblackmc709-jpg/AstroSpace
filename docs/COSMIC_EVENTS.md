# Cosmic events and anomalies

Cosmic events are world-state systems, not decorative skyboxes. They change navigation, environmental hazards, exploration opportunities, audio, lighting and sometimes the future of a planet.

## Event catalogue

### Black-hole proximity
- Accretion disk and gravitational lensing build as the player approaches.
- Navigation instruments show tidal stress and safe-distance bands.
- Nearby debris, light paths and ship trajectories react to the field.
- A close encounter can reveal a hidden signal or a temporary route, but crossing the critical envelope is a high-risk decision.

### Planetary fragmentation
- Cracks and seismic readings appear first.
- Fault lines, atmosphere and orbital debris evolve in staged phases.
- Players can study the event, rescue stranded explorers or evacuate.
- After the event, debris fields and remnant expeditions replace ordinary surface access.

### Stellar flare and radiation storm
- The star produces visible activity and a measurable radiation front.
- Ships and surface equipment need shielding, shelter or route planning.
- The event changes resource availability and can expose otherwise hidden signals.

### Quantum rift
- A spatial distortion opens between known coordinates.
- Scanners detect a signature before the rift becomes traversable.
- The rift can lead to a hidden region, a short-lived route, a puzzle space or a boss encounter.
- Boss combat is optional unless it is explicitly part of a story gate.

### Stellar genesis
- A nebula condenses over a multi-stage schedule.
- New stellar objects, orbital hazards and resource opportunities emerge.
- Player observations contribute to a persistent star-system record.

## Event architecture

Every event has a stable ID, type, seed, target world/system, phase, start/end times, revision, participant rules and reward/aftermath policy. The authoritative event director publishes phase changes. Clients render local effects from replicated state.

## Presentation requirements

- At least one early visual tell, one escalation beat and one unmistakable peak.
- Distinct sound motifs and navigation/UI signals.
- Weather, lighting and ambient NPC behavior respond to event phase.
- Boss attack VFX communicate shape, timing and counterplay.
- Reduced-flash mode and lower-cost VFX tiers preserve readability and performance.
