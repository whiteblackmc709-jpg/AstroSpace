# AstroSpace: Quantum Awakening — Phase 0 Audit

Ngày audit: 2026-11-14
Repository: whiteblackmc709-jpg/AstroSpace
Base: main / 455056958165bb0bae6cd2a1af171ac7930cf782
Phạm vi: source tree, entrypoints, renderer/gameplay, dữ liệu, docs, CI và live routes.

## Kết luận

Repo có mã game thực tế, không kích hoạt điều kiện dừng README-only. Đây là browser 3D prototype dùng HTML/CSS/JavaScript ES modules và Three.js 0.170.0; không phải Unreal Engine project. Homepage dùng assets/planet-forge.js; playable route dùng play/play.js. Cả hai route trên Vercel trả HTTP 200 trong lần audit, nhưng HTTP 200 không xác nhận WebGL/gameplay đã khởi tạo thành công.

Cây Git có 62 entries, không bị truncate. Những thành phần hiện hữu gồm Planet Forge, PBR procedural maps, 3x3 terrain chunks, instanced biome detail, campaign/progression, local save, A.R.I.A.-07, Aether Flight, settings, touch controls, audio mixer và social adapters.

## Stack và cấu trúc

- Frontend: HTML, CSS, JavaScript ES modules.
- Renderer: Three.js 0.170.0 tải từ jsDelivr.
- Surface/material: assets/pbr-surfaces.js.
- Biome detail: assets/planetary-detail.js.
- Play runtime: play/play.js; world data: play/region-data.js.
- Audio: Web Audio API trong play/audio.js, ba bus music/ambience/sfx.
- Account/social: Supabase JS adapter trong play/auth.js, play/social.js và play/social-ui.js; backend phụ thuộc cấu hình Supabase.
- CMake/C++17 chỉ build reference progression tests, không build game renderer.
- Không thấy package.json hoặc bundler build pipeline trong cây repo.

## Gameplay và dữ liệu

Runtime region-data.js mô tả 6 planet, 24 regions, 5 mandatory tasks mỗi region và 2 optional caches. Contract test xác nhận 120 mandatory missions và 48 caches. Aether Flight mở sau bốn vùng Elyndra; chuyển hành tinh dùng exosuit-powered ascent/deep-space/re-entry, không phải máy bay/teleport.

World definitions bị trùng/khác phiên bản giữa play/region-data.js, assets/planet-forge.js, data/planet_visuals.json và data/sector_01.json. Sector data còn ID/tên cũ và bốn hành tinh. Không migration ID hoặc schema trong Phase 1.

## Đánh giá theo hệ thống

- Planet Forge: 6 orbital identities, PBR map, cloud/atmosphere shells, rings/moons, event preview; chưa có seamless orbit-to-surface LOD.
- Terrain: multi-band noise/fBm, vertex colors, 3x3 chunks và PBR; stitching/LOD/streaming quality còn hạn chế.
- Elyndra vegetation: có thân/cành, leaf cards, grass/fern, flowers và instancing; còn hai forest/decor passes cùng tồn tại ở createWorldDecor và createPlanetaryDetail, chưa có LOD/impostor, Poisson ecology hay wind gust system.
- Water: river ribbon tĩnh; chưa có wave/refraction/foam/ripples.
- Sky: sky dome, starfield, aurora, sun/moon, linear fog, ACES; chưa có gameplay weather/day-night state machine.
- Cosmic events: play runtime chủ yếu sinh event shard markers; chưa có world-state mutation tương ứng.
- Character: procedural robot, third-person movement, jump/flight; chưa thấy skeletal rig/IK.
- Audio/UI: mixer, buses, HUD, settings, touch, save and social adapters hiện hữu; cần giữ compatibility.
- Performance: có FPS readout/render-scale governor; thiếu renderer.info counters trong HUD, URL seed/bookmark và screenshot rig. updateCamera tạo Vector3 mỗi frame; moveRobot tạo Set mới cho mỗi update. disposeWorld đã traverse/dispose resource, terrain chunk recenter hiện sửa geometry tại chỗ.

## Baseline / CI

| Chỉ số | Phase 0 |
|---|---|
| HTTP / và /play/ | 200 |
| FPS, frame-time p50/p95 | Chưa đo |
| renderer calls / triangles | Chưa đo |
| geometry / texture counts | Chưa đo |
| GPU/JS memory | Chưa đo |
| before screenshots | Chưa có |
| URL seed/bookmark | Chưa có |

CI run 42368609466 trên base HEAD kết thúc success: JavaScript syntax, HTML/CSS contracts, 8 Node contract tests, CMake build, CTest 1/1 và JSON validation. CI này không phải browser visual QA hoặc target-GPU benchmark. renderer.info geometry/texture counts là resource counts, không phải VRAM tuyệt đối.

## Các điểm bảo toàn

Không rewrite; giữ Three.js, campaign/task IDs, SAVE_KEY, progression gates, Aether Flight, touch mappings, audio mixer API/buses, Planet Forge, account/social adapters và routes. Không copy asset/IP bên thứ ba. Không coi SwiftShader metrics là GPU thật. Các điểm số workstream trong audit chi tiết được hiểu là mức độ hoàn thiện theo source, không phải điểm cảm quan screenshot.
