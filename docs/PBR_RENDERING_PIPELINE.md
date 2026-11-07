# AstroSpace browser PBR rendering pipeline

This document describes the shared visual pipeline used by the public Planet Forge and the /play/ browser RPG scene.

## Surface map set

assets/pbr-surfaces.js synthesises four deterministic, biome-seeded maps:

- **Albedo (RGBA8, sRGB):** biome colour, coastline/shelf transitions, volcanic emissive fissures, gas-giant bands/storms, rift plates and polar ice.
- **Normal (RGBA8, linear):** tangent-space normals derived from the generated height field.
- **Roughness (RGBA8, linear):** physically meaningful micro-surface response. The grayscale value is written to RGB because Three.js samples the green channel of roughnessMap.
- **Height (R8, linear):** bump detail for ground and bump/displacement detail for the planetary sphere.

Textures use mipmaps and device-supported anisotropy. Albedo is explicitly tagged sRGB; normal, roughness and height remain linear data. The RGBA formats are intentional for the WebGL2 renderer's supported sized formats.

## Adaptive texture tiers

| Profile | Tile maps | Equirectangular planet maps | Intended use |
|---|---:|---:|---|
| Performance | 1024 × 1024 | 1024 × 512 | integrated / lower-memory GPUs |
| Balanced | 2048 × 2048 | 2048 × 1024 | default |
| Cinematic | 4096 × 4096 | 4096 × 2048 | only when reported device memory is at least 8 GB and GPU max texture size permits it |

The final size is clamped to renderer.capabilities.maxTextureSize. A Cinematic label does not override the device limit. The app can scale the WebGL drawing buffer with device pixel ratio independently from the PBR map resolution; actual screen pixels depend on viewport, DPR, GPU and browser compositor.

## Lighting and response

Both scenes use a procedural 1024 × 512 equirectangular environment converted through Three.js PMREM for image-based reflections. The maps are attached to MeshPhysicalMaterial with biome-specific roughness, clearcoat, sheen and height response. This is physically based browser rendering, not ray tracing or a claim of native-game lighting parity.

The homepage uses equirectangular planetary maps, a cloud shell and atmospheric rim. The /play/ ground uses 3 × 3 streamed 900-unit terrain chunks; the four maps are generated once for the active planet/quality and shared by its chunks. Obsolete generation requests cancel at frame-batch boundaries. Quality changes reuse an in-flight request when possible and dispose the previous texture bundle after a replacement has been installed.

## Verification

Run from the repository root:

    node tests/test_campaign.mjs
    node tests/test_pbr_surface.mjs
    PBR_TEST_QUALITY=balanced PBR_TEST_ASPECT=tile node tests/test_pbr_surface.mjs

The PBR contract tests sizing and GPU caps, both map aspect ratios, RGBA formats, roughness green-channel data, height-map attachment, cancellation, all six biome generators and texture disposal. Chromium smoke tests verify the homepage loads its PBR maps and that /play/ can initialise WebGL, open settings, switch to Cinematic and complete a 2K terrain map on a simulated 4 GB device.

The test browser uses SwiftShader software rendering. Its timings are not representative of a discrete GPU. No real-device 4K performance claim is made. Final high-end appearance still requires authored/scanned PBR asset sets, detailed character/ship models, water volumes, volumetric cloud layers and production-grade environment art.
