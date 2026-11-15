# Phase 2A-1 — terrain distance LOD design

Date: 2026-11-15  
Branch: `phase/1a-measurement-harness`  
Design baseline: `5234c56eea34c81ef6adfff3ee2f0964dfb2070d`  
Implementation scope: terrain geometry density and chunk rebuild scheduling only.

## 1. Current bottleneck and invariant

The current terrain is a 3 × 3 grid of 900-unit chunks. Every chunk uses the active legacy quality's full grid resolution; Balanced uses 224 × 224 segments per chunk. The terrain alone therefore contributes:

`9 × 2 × 224² = 903,168` triangles.

The measured scene baseline at the comparable bookmarks is approximately 1.44M triangles. Camera distance does not currently change the terrain segment count. The character, props, vegetation and terrain vertices already query the same deterministic `terrainHeight(x, z, world)` function.

**Invariant:** `terrainHeight(x, z, world)` remains the only world-height source. LOD changes only where the surface is sampled and how those samples are connected. Character grounding, landmarks, vegetation placement and all gameplay coordinates keep calling the same function; no per-LOD height approximation or collision mesh is introduced.

## 2. Chosen strategy — three distance rings over the existing 3 × 3 chunk window

Keep the existing nine 900-unit chunks and their world coverage. Assign resolution by ring around the chunk containing the pilot:

| Ring | Chunks | Segment rule | Balanced (224 base) |
|---|---:|---:|---:|
| Near | 1 center chunk | base segments | 224 |
| Middle | 4 cardinal neighbors | base ÷ 4 | 56 |
| Far | 4 corner neighbors | base ÷ 8 | 28 |

Legacy quality remains authoritative for the near ring and is not renamed or collapsed:

| Legacy quality | Near | Middle | Far |
|---|---:|---:|---:|
| performance | 128 | 32 | 16 |
| balanced | 224 | 56 | 28 |
| cinematic | 320 | 80 | 40 |
| 4k | 384 | 96 | 48 |
| 8k | 448 | 112 | 56 |

The grid is anchored to the nearest 900-unit chunk center so the near chunk remains underneath the pilot as they traverse the world. The 1/4/4 ring topology gives predictable budgets and avoids a temporary multi-chunk high-detail spike at cell boundaries. The ring is based on player/world chunk position, not camera zoom, so the near gameplay surface remains at the existing quality for every camera bookmark.

### Expected Balanced triangle budget (design estimate, not measured output)

- Surface: `2 × (224² + 4 × 56² + 4 × 28²) = 131,712` triangles.
- Four-edge skirts: `8 × (224 + 4 × 56 + 4 × 28) = 4,480` triangles.
- Estimated terrain total: `136,192` triangles, versus `903,168` at baseline.
- Holding the non-terrain baseline workload constant gives an estimated scene total of about `675,772` triangles, or **46.8%** of the 1,442,748-triangle mid/far baseline.

This is an allocation estimate. Actual renderer counters after the implementation and preview are the acceptance evidence; other scene systems may vary independently.

## 3. Crack prevention — shared height samples plus perimeter skirts

All surface vertices at every resolution call the same `terrainHeight` function using absolute world X/Z coordinates. The ring resolutions are integer divisors (4:1 and 2:1), so common edge sample positions are exactly coincident and produce identical Y values.

Add a perimeter skirt to each chunk edge, extending 72 world units below the sampled edge. The skirt is part of the same BufferGeometry/mesh (no additional draw call). It covers the gaps created between non-coincident edge samples where the fine edge's interpolated profile differs from the coarse edge. Skirt normals face outward; skirt vertex color is copied from the source edge. No lighting, terrain albedo, PBR maps, fog, sky or other materials are changed.

The real-Three.js regression will verify:
- common world-space edge samples match exactly across near/middle and middle/far transitions;
- each built chunk has closed skirt strips and finite positions/normals/colors;
- no LOD-specific height sampler exists; gameplay and chunk generation share the exported terrain-height function.

Visual confirmation of seam visibility/flicker still requires the owner's five real browser screenshots.

## 4. Rebuild scheduling — sliced work across animation frames

Do not rebuild all nine chunks synchronously. Replace the per-frame nine-chunk rewrite with a prioritized queue:

1. Near chunk first, then the four middle chunks, then the four far chunks.
2. Allocate one replacement BufferGeometry job at a time. Keep the currently visible geometry until its replacement is complete.
3. Slice index generation, height sampling, smooth-normal accumulation/normalization, and vertex-color generation into bounded work units processed by the existing `requestAnimationFrame` loop.
4. Commit the completed geometry/center/LOD metadata atomically; only then release the previous geometry through the existing scene-reference-aware disposal helper.
5. If the player crosses a chunk boundary or quality changes during a build, cancel and dispose the obsolete partial job, discard its queued layout and schedule the newest layout. World teardown cancels outstanding terrain jobs before releasing the world tree.

The scheduler has a small per-frame time budget and a bounded vertex/triangle work quantum. This avoids a single 3 × 3 regeneration spike; it may take several frames for all distant chunks to settle. Existing visible geometry remains until replacement is ready. The initial near surface is prioritized while the loading transition is still completing.

## 5. Risks and trade-offs

- **Skirt visibility:** steep cliffs or very low camera angles may expose a vertical edge. Keep the skirt depth conservative, use the existing terrain material, and inspect 360° at all bookmarks.
- **Distant silhouette loss:** the 28-segment Balanced far corners are intentionally coarse. The near chunk remains 224 segments; orbit/far screenshots must establish whether the transition reads cleanly.
- **Rebuild latency:** a time-sliced queue trades immediate recentering for bounded frame work. Fast Aether movement can invalidate pending jobs; generation tokens prevent stale jobs from installing.
- **Memory during replacement:** old and new geometry coexist for one chunk until swap. Only one new geometry job is active; old geometry is disposed after a successful swap and reference check.
- **Normals:** normal accumulation must remain equivalent to the smooth indexed grid surface. The real Three.js test will assert finite/unit normals; browser screenshots will decide visual acceptance.
- **Non-terrain workload:** this step does not optimize trees, props, draw calls, shaders, or pixel fill rate. The non-terrain portion may keep total FPS below target even when terrain triangles fall.

## 6. Measurable acceptance gates

Using the same seed, Balanced quality, same viewport/DPR and `near`, `mid`, `far`, `orbit`, `aether` bookmarks:

1. **Triangle count:** renderer triangles at each comparable bookmark are at most 50% of the 1A baseline (mid/far baseline: 1,442,748; orbit and aether retain their own recorded comparators). Report exact counts and percentage; do not infer from the design estimate.
2. **Seams/stability:** no visible cracks, flicker or LOD popping during a 360° camera sweep and while crossing chunk boundaries. Owner confirms using real screenshots/video; CI topology checks are not visual proof.
3. **Near detail:** the active near chunk keeps the existing segment count for each legacy quality; no reduction versus current near terrain resolution.
4. **Frame-time tail:** P95 must not be worse than the matching baseline bookmark under the same capture procedure/device. A physical GPU result is not replaced by SwiftShader/CI timing.
5. **Quality compatibility:** `performance`, `balanced`, `cinematic`, `4k` and `8k` each resolve to their documented 1/4/8 ring budgets and remain selectable.
6. **Gameplay alignment:** terrain height samples at common points match across LOD resolutions exactly; avatar grounding, vegetation/rock placement and landmark placement continue to use `terrainHeight` unchanged.
7. **Compatibility:** preserve Three.js 0.170.0, `SAVE_KEY`, mission/task IDs and progression, 24-region order, touch controls, audio mixer/buses, Planet Forge homepage, `/` and `/play/`. Do not change lighting, sky, materials/PBR maps, vegetation, water or post-processing in this step.
8. **Runtime:** full repository CI and real Three.js runtime tests pass; preview deployment is ready for manual visual review.

Phase 2A-1 stops after deployment and owner screenshot review. Phase 2A-2 is not part of this change.
