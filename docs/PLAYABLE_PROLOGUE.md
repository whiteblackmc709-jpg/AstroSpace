# AstroSpace Playable Prologue

## Product split

- The root route remains the discovery and world-building website.
- The /play/ route is the separate playable browser prologue and is linked from the marketing header and hero call-to-action.

## Prologue loop

1. Start on Elyndra as A.R.I.A.-07, an original procedural humanoid explorer robot.
2. Walk, run, jump and inspect the environment in third person.
3. Find and synchronise three ancient planetary relays.
4. Return to the landing craft and install the Aether Drive.
5. Unlock Aether Flight (toggle with G) and the Star Atlas (M).
6. Travel to Nerith, Kaldrax, Vanthris, Orovane and Iskara; scan each world's anomaly to archive its signature and earn data shards.

## Controls

- WASD / arrows: move.
- Shift: sprint or flight boost.
- Space: jump on foot; ascend while Aether Flight is active.
- Ctrl: descend while flying.
- E: interact with a nearby relay, anomaly or landing craft.
- G: toggle Aether Flight after earning the drive.
- M: open the Star Atlas after earning the drive.
- Drag the 3D view to orbit the third-person camera; mouse wheel adjusts follow distance.

Touch controls are available on narrow/mobile viewports.

## Visual implementation

The play scene uses original runtime-generated Three.js geometry and materials: a sculpted procedural terrain mesh with vertex-color strata, distant mountain ranges, stars, a moon, aurora ribbons on Elyndra, biome props, custom relay obelisks, a landing shuttle and a bespoke articulated A.R.I.A.-07 robot model. The six planetary destinations switch their lighting, fog, terrain palette, geology props and anomaly markers.

## Save behavior

Prologue progress (relay state, Aether Drive, visited worlds, archived anomalies and shards) is stored locally in the browser under astrospace-prologue-v1. Clearing browser site data resets the save.

## Production boundary

This is a playable browser vertical slice, not the complete online RPG. The prologue currently has no account backend, cloud save, multiplayer, combat loop, voice acting, production motion-captured animations, authored high-resolution PBR texture package or final Unreal Engine build. Those require separate production systems and asset work.
