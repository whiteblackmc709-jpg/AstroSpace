# AstroSpace: Quantum Awakening — Upgrade Plan

Cơ sở: Phase 0 Audit 2026-11-14 và các chỉnh sửa được chủ dự án duyệt 2026-11-14.
Repository: whiteblackmc709-jpg/AstroSpace
Base: main / 455056958165bb0bae6cd2a1af171ac7930cf782
Branch: phase/1a-measurement-harness
Trạng thái: Phase 1A đang triển khai; chưa bắt đầu thay đổi hình ảnh.

## 1. Nguyên tắc bất biến

- Nâng cấp trên Three.js 0.170.0 hiện hữu, không rewrite/đổi engine.
- Giữ nguyên SAVE_KEY, task/mission IDs, progression gates, thứ tự 24 vùng, Aether Flight unlock, touch mappings, mixer/audio bus API, Planet Forge, social/auth adapter và hai route.
- Không dùng placeholder hoặc primitive đơn giản làm cây/đá/hero art; không bố trí theo lưới đều; không bỏ TODO hoặc magic constants.
- Chỉ dùng procedural/original assets hoặc CC0 có attribution. Không sao chép asset/IP của Nghịch Thủy Hàn hoặc NASA.
- Commit nhỏ, build/test và chạy được sau mỗi phase. Không merge/production deploy khi chưa được chủ dự án duyệt.
- Không tuyên bố đạt FPS từ CI hoặc SwiftShader. Nêu rõ giới hạn đo và cấu hình thiết bị.

## 2. Kiến trúc chuyển tiếp

Giữ play/play.js làm composition root; chỉ tách module khi cần. Các lớp đích về sau gồm Core, Terrain, Vegetation, Water, SkyWeather, Events, PostFX, Character, Audio, UI và Orbital. Không tạo kiến trúc song song.

Schema JSON, canonical ID migration, legacy data migration, Web Workers/OffscreenCanvas và module extraction lớn bị hoãn. Chỉ mở khi một feature Elyndra cần thật hoặc benchmark chỉ ra bottleneck. Không đổi planet/region/task IDs trong các bước hiện tại.

## 3. Phase 1 — Measurement harness và performance foundation tối thiểu

### 1A — Baseline harness (commit tiền-baseline chỉ đo đạc)

- Cho phép một commit chỉ bổ sung instrumentation và reproducibility controls; không đổi material, lighting, geometry, vegetation, fog, postFX hay appearance mặc định.
- URL: /play/?debug=1&seed=<integer>&bookmark=<id>.
- Bookmarks: near, mid, far, orbit, aether. Pose camera/player xác định; không sửa save/progression. Aether trong debug harness là pose tạm, không ghi quyền mở khóa vào save.
- Seed deterministic cho terrain, biome detail/vegetation, landmarks/props và event selection/placement khi seed được cung cấp. Không có seed param thì giữ default seed/look.
- Overlay chỉ hiện với debug=1, không chiếm layout và pointer-events:none. Hiển thị FPS, frame time, renderer.info.render.calls, triangles, renderer.info.memory.geometries, textures, render scale, quality, seed và bookmark.
- Resource counts không phải VRAM. FPS/frame time dùng rolling sample, không tạo object lớn mỗi frame.
- Không đổi SAVE_KEY, task IDs, controls, audio, event timing hoặc gameplay behavior mặc định.
- Sau commit này, dừng để chủ dự án mở game, chụp 5 bookmark và gửi số liệu/device metadata làm baseline chính thức.

### 1C — Phần nhẹ (chỉ sau khi nhận baseline)

- QualityProfile adapter cho legacy quality values; mapping phải giữ đúng pixel ratio, max pixel budget, shadow size, exposure và profile đang lưu.
- Tái sử dụng scratch Vector3/Matrix4/Color trong update path, không đổi kết quả camera/movement.
- Bảo đảm chunk/world dispose geometry/material/texture đúng ownership, idempotent và không dispose resource dùng chung còn tham chiếu.
- Không đổi governor trước khi baseline chứng minh vấn đề.

### Gate Phase 1

Boot / và /play/, debug overlay đọc counters đúng, seed/bookmark tái lập, debug tắt không hiển thị overlay, CI/build/contracts pass. Baseline hiệu năng chính thức được xác lập từ ảnh/số liệu do chủ dự án gửi sau 1A.

## 4. Phase 2 — Elyndra / Asterfall Expanse: bốn cổng duyệt

Sau mỗi cổng phải dừng và chờ chủ dự án duyệt before/after screenshots cùng seed, bookmark, viewport, DPR và quality. Không tự chạy cổng kế tiếp.

### 2A — Lighting/sky/atmosphere/fog/tone mapping + terrain/material

- Directional key/fill light, atmospheric depth, aurora, sky layering, fog/aerial perspective và exposure/ACES ổn định.
- Terrain multi-octave, ridged/derivative noise + domain warp liền biên hoặc heightfield chung có margin.
- Không mô phỏng erosion lặp độc lập theo từng chunk: quá nặng và có nguy cơ nứt biên.
- Material blend theo elevation, slope, moisture, wetness, shoreline và macro variation.
- Giữ stitching/skirt; kiểm tra seam, normals, shadows và culling 360 độ.
- Gate: ảnh thật năm bookmarks trước/sau cùng seed; metrics, console, trade-offs; dừng chờ duyệt.

### 2B — Elyndra vegetation/ecology

- Tối thiểu sáu silhouette species khác nhau; thân/cành cong, phân nhánh, leaf cards/clusters, fern, grass, ground cover và bioluminescence tinh tế.
- 3–4 LOD tiers + impostor xa; cross-fade/dither, spatial cells, instancing và culling.
- Placement Poisson-disk/blue-noise + ecological masks/noise; lọc theo elevation, slope, moisture, water distance và mission area; không grid đều.
- Shared wind field: base wind/gust; bending theo thân/cành/lá/cỏ; grass response gần nhân vật; pooled spores.
- Gộp forest/decor pass cũ trong createWorldDecor() vào vegetation mới: một owner, một density/instance budget, một lifecycle/dispose, không double forest/overdraw.
- Gate: 5 bookmark cùng seed, ảnh cận ít nhất 3 species và ảnh far/impostor; báo calls/triangles/instances; dừng chờ duyệt.

### 2C — Water/weather/day-night

- Multi-wave/Gerstner nhẹ, depth tint, Fresnel/refraction có giới hạn, shoreline foam và ripples từ nhân vật/mưa.
- Weather states Elyndra ảnh hưởng fog/cloud, wetness/roughness, particles, wind và audio cues.
- Key-time dawn/day/golden hour/blue hour/night với interpolation deterministic.
- Mobile/Low fallbacks.
- Gate: ảnh thật theo key-time/weather combinations, cùng seed/bookmark; dừng chờ duyệt.

### 2D — PostFX/character-camera/audio/UI

- Quality-tiered bloom/AO approximation/grading/vignette; không blur/cháy highlight, có Low/mobile fallback.
- Controller/camera/contact/animation polish, giữ mapping điều khiển, SAVE_KEY và progression.
- Relay/signal nodes/landing craft thành hero props rõ silhouette.
- Audio state layers nhưng giữ API, ba bus và mixer.
- HUD/UI chỉ đổi khi screenshot chứng minh cần; giữ touch, settings, character editor, social/chat/account.
- Gate: ảnh/video thật, campaign/save/load, touch, mixer, character, settings, social fallback, traversal và console; dừng chờ duyệt Elyndra.

## 5. Screenshot policy

- Chỉ screenshot render thật từ /play/, không mockup/concept art/ảnh HTML tĩnh.
- So sánh cùng seed/bookmark/viewport/DPR/quality/time/weather.
- Nếu Chromium headless + SwiftShader chạy được, tự chụp và gắn nhãn software rendering; không dùng FPS/timing của SwiftShader làm GPU benchmark.
- Nếu browser hoặc WebGL không chạy/không truy cập được preview, nói rõ và yêu cầu chủ dự án chụp tay.

## 6. Sau Elyndra (chưa được bắt đầu)

Phase 3 cosmic events/Aether Flight world effects; Phase 4 Planet Forge/Star Atlas; Phase 5 năm hành tinh còn lại; Phase 6 optimization/docs/release. Chỉ bắt đầu khi Elyndra được duyệt. Giữ flight bằng exosuit thrusters, không máy bay/teleport.

## 7. Targets và đo đạc

Mục tiêu sản phẩm (chưa phải kết quả): desktop tầm trung 60 FPS tại 1080p; mobile tối thiểu 30 FPS. Warm-up 30s, capture 60s mỗi bookmark, báo FPS/frame-time p50/p95 và 1% low nếu đủ mẫu. Ghi CPU/GPU/driver/OS/browser, viewport/DPR/quality/seed/bookmark/power mode. Đọc renderer.info calls/triangles/points/lines/geometries/textures; JS heap/GC qua browser tooling nếu có. Renderer resource counts không phải VRAM; SwiftShader không đại diện GPU vật lý. Test 10 phút để phát hiện resource accumulation.

## 8. Commit và phê duyệt

- Tạo feature branch từ base đã xác minh, không commit trực tiếp main.
- Commit tiền-baseline chỉ chứa measurement/reproducibility harness và không đổi appearance mặc định.
- Sau khi nhận baseline, mới làm phần nhẹ 1C.
- 2A/2B/2C/2D là bốn cổng duyệt độc lập. Không chuyển cổng khi chưa được duyệt.
- PR phải ghi file, tests, screenshot, metrics, limits, trade-offs và rollback. Không merge/production deploy khi chưa có duyệt.

## 9. Hoãn có chủ đích

Schema/config JSON, canonical ID migration, Workers/OffscreenCanvas và modularization lớn không thuộc Phase 1. Chỉ lập lại phạm vi khi Elyndra thực sự cần hoặc benchmark chứng minh cần thiết.
