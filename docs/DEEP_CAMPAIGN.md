# The Quiet Meridian — browser campaign

## Progression shape

The first browser campaign is a linear, exploration-led expedition across six original worlds. Each world has four separately named regions. The 24 regions are ordered in play/region-data.js; save.regionCursor is the authoritative local campaign cursor.

A region is cleared only when all five mandatory contract states are complete:
1. Story contact — reach and speak with the region's named expedition contact.
2. Signal survey — collect three signal traces.
3. Reliquary — align two ruin pylons and open the old archive.
4. Relic recovery — collect four region-specific fragments.
5. Guardian — break four armour nodes and defeat the regional guardian.

A clear writes the region id into completedRegions and presents a region transmission. The next region becomes the only active destination. The next planet is inserted only after the fourth region has been cleared. Aether Flight is authorized after the first planet's final region; it is not available from a fresh save.

## Optional exploration

Every region includes two fixed hidden caches that reward bonus shards. Timed planet events create four temporary anomaly shard targets; each recovered shard grants 90 Quantum Shards. The scanner pulse highlights the nearest unresolved interaction target. These optional systems do not bypass mandatory story gates.

## Visual construction

The current browser version generates biome-seeded albedo, normal, roughness and height textures in JavaScript at 1K/2K, with a 4K cinematic tier when the reported memory class and GPU max texture size support it. The landing planet sphere uses equirectangular PBR maps; /play shares the same PBR generator across a 3×3 set of streamed 900-unit terrain chunks. The scene uses a procedural PMREM environment, planet-specific directional/fill lighting, fog and region landmarks. These procedural browser materials are not ray-traced assets or final Unreal Engine art.

This is an original procedural art direction for a browser prototype. It is not a set of 8K scanned PBR assets, a high-poly production environment, Nanite/Lumen scene, or Unreal Engine content package. Those require a separate asset-production and performance-validation milestone.

## Save and community state

Campaign state is stored in local browser storage. Optional cloud save is keyed by the signed-in Supabase user. The account/social adapter supports profile lookup, friend requests, direct channels and realtime chat for the global universe, current planet and current region. Database ownership and membership controls live in the accompanying RLS migration.

Live accounts, cross-device saves and shared chats are unavailable until a dedicated AstroSpace Supabase project is selected, the migration is applied and Vercel receives the publishable project URL/key. No server-side service-role key is used by the browser.
