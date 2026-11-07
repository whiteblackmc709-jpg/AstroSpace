# AstroSpace milestone tracker

## Completed
- [x] Establish exploration-first product direction.
- [x] Define planetary lifecycle and destination access rules.
- [x] Add first-sector data and cosmic-event catalogue.
- [x] Add C++17 reference progression logic and tests.
- [x] Deploy the public interactive Flight Deck with six procedural planet looks.
- [x] Add the separate /play/ browser RPG route.
- [x] Define six original planets and 24 named exploration regions.
- [x] Add five sequential mandatory contracts per region (story, survey, ruins, relic recovery and guardian).
- [x] Lock the next region behind 100% completion of the current region and the next planet behind all four regions.
- [x] Add two optional caches per region, scan pulse and timed planetary shard events.
- [x] Add region atlas, story archive, local campaign save and Aether Flight unlock after the first planet.
- [x] Add shared 1K/2K/4K-adaptive PBR surface maps (albedo, normal, roughness, height), PMREM environment lighting and 3×3 streamed terrain; retain per-world lighting and custom regional ruins.
- [x] Add generated planet-specific ambient audio and interaction sound effects.
- [x] Add settings, photo mode and HUD visibility controls.
- [x] Add account/social client adapters and an RLS-protected Supabase migration (backend provisioning still required).
- [x] Add automated campaign data/progression contract checks and update GitHub Actions validation.

## Next engineering milestones
- [ ] Complete visual QA in supported desktop/mobile browsers; profile WebGL load and frame time on target devices.
- [ ] Select and activate a dedicated AstroSpace Supabase project; apply the migration and configure Vercel environment variables.
- [ ] Design and review the first database schema and RLS ownership policies.
- [ ] Create Unreal Engine project structure and source modules.
- [ ] Implement production third-person movement, traversal powers and scanner.
- [ ] Build Kharon's Rest greybox with one complete exploration chain.
- [ ] Prototype planet state replication and authoritative event phase director.
- [ ] Build orbital flight prototype and homeworld launch sequence in Unreal.
- [ ] Produce hand-authored/scanned production character, ship and planet assets with baked PBR maps; browser maps are procedural placeholders.
- [ ] Profile Nanite, Lumen, Niagara and Chaos on target hardware.

## Release gates
- A browser prototype is not considered a finished playable game.
- No database migration without confirming the dedicated AstroSpace Supabase project.
- No production Unreal gameplay milestone is complete until it has a tested build, reviewed art, accessibility checks and measured performance.
