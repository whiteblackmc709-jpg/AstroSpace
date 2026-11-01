# Interactive website milestone

## Purpose

The public site is now a playable visual companion for AstroSpace rather than a static pitch page. The Flight Deck presents a live WebGL planetary scene and a small exploratory sandbox.

## Controls

- Drag on the scene to orbit the camera.
- Mouse wheel or the zoom controls to approach/recede.
- Select any world in the Planet Atlas to load its procedural material and field dossier.
- Use Deep Scan to reveal a signal-readout state.
- Enable Stellar Flare, Crust Fracture or Black Hole to preview event presentation.
- Engage Flight and use WASD to translate, Q/E for vertical movement, Shift to boost and Space to brake.
- Double-click the scene for a close orbital approach; Reset returns to the orbital view.

## Technical implementation

- Static HTML/CSS with a pinned Three.js module import.
- Procedural GLSL surface, cloud, atmosphere and ring shaders.
- Instanced debris and a custom-built low-poly preview ship.
- Responsive overlay HUD and accessible HTML controls.
- A fallback state appears when the browser cannot initialize WebGL.

## Scope boundaries

The flight mode is a browser sandbox, not the authoritative game client. It has no multiplayer, persistent save, server physics, true terrain landing or Unreal Engine gameplay integration. Planet names and unlock criteria are illustrative design content. The full 3D RPG remains a separate Unreal Engine development track.
