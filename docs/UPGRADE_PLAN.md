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

### 1C — Phần nhẹ (đã hoàn tất; baseline cố định bằng commit SHA)

- QualityProfile adapter: `performance → Low`, `balanced → Medium`, `cinematic → High`, `4k/8k → Ultra`. Giữ nguyên legacy quality string (bao gồm phân biệt 4K và 8K) trong `astrospace-settings-v2`, vì các mức đó vẫn quyết định pixel ratio, max pixel budget, shadow size, exposure, terrain segments, biome/PBR và foliage budgets.
- Tái sử dụng scratch `Vector3` trong `updateCamera()` và `Color` trong `updateInterplanetaryTravel()`; `moveRobot()` query hai input Set trực tiếp thay vì tạo Set/array mới; `nearestInteractable()` quét hai mảng riêng thay vì tạo merged array. Không có `new THREE.Matrix4()` trong animation path; giữ nguyên ma trận do các `Object3D` dummy sở hữu và tái sử dụng khi dựng InstancedMesh.
- Chuẩn hóa chunk/world/biome detail/transit disposal bằng scene-scope reference checks; geometry/material/texture dùng chung chỉ được dispose sau tham chiếu cuối cùng; idempotent. Regression chạy với real Three.js 0.170.0.
- Không đổi governor, camera/movement math, material, lighting, geometry, density hoặc chất lượng hình ảnh mặc định trong 1C. Baseline được cố định trực tiếp bằng commit SHA `5234c56eea34c81ef6adfff3ee2f0964dfb2070d` cùng ảnh/số liệu tại `docs/BASELINE.md`; không cần Git tag.

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



### Baseline evidence received — 2026-11-15

**Số liệu trực tiếp từ ảnh runtime overlay (Balanced, seed 1, render scale 62%, pixel ratio 0.78):**

- `mid` và `far` có cùng `1,442,748` triangles và 90 calls; `orbit` có `1,342,396`; `aether` có `1,442,892`. Triangle count thay đổi ít theo các bookmark camera trong lượt đo này. `near` có `1,444,420`, nhưng đang có Aurora Bloom nên không dùng làm đối chứng sạch.
- FPS: mid 26.8, far 26.3, orbit 27.2, aether 20.3. Near 29.2 nhưng đang có event và cần retake.
- P95 của cả năm ảnh nằm trong khoảng 45.80–96.70 ms. Đây là dấu hiệu frame-time tail/spike cần chẩn đoán; ảnh tĩnh không xác định được nguồn spike.
- Geometries dao động 117–128 và textures là 14. Đây là renderer counters, không phải VRAM.
- Aether là bookmark yếu nhất trong lượt này: 20.3 FPS, frame 49.36 ms, P95 62.60 ms.

**Suy luận/giả thuyết cần kiểm chứng, không phải kết quả đã chứng minh:**

- Mid/far có triangle count trùng khít là dấu hiệu terrain/scene có thể chưa có camera-distance LOD hoặc culling hiệu quả. Số liệu renderer không tự nó chứng minh toàn bộ culling đang thiếu.
- `createTerrain()` đặt Balanced ở 224 segments và tạo lưới 3×3 chunk. Theo phép tính (224 × 224 × 2 × 9), riêng mặt terrain có khoảng 903,168 triangles lý thuyết. So với tổng 1,442,748 triangles tại mid, tỷ lệ trực tiếp là khoảng 62.60%, không phải 73%; tỷ lệ 73% cần mẫu số/định nghĩa khác và chưa xác minh.
- Dù render scale đã 62%, FPS vẫn dưới 30 ở mid/far/orbit/aether. Giả thuyết bottleneck có thể nằm ở CPU/scene geometry/draw workload hơn là pixel fill-rate; cần phân biệt bằng JS update, JS render-submit và GPU timer query.
- Governor hiện tại giảm adaptive render scale; nó không tự giảm terrain segment count/density khi FPS thấp. Hạ resolution thêm có nguy cơ làm ảnh mờ mà không xử lý bottleneck hình học/CPU. Đề xuất 2A: ưu tiên đánh giá geometry/instance density trước khi hạ resolution dưới ngưỡng chất lượng chấp nhận được.
- P95 cao hơn frame trung bình gợi ý spike; các ứng viên cần đo gồm allocation trong frame loop, rebuild/recenter chunk đồng bộ và spawn/clear event. Chưa có bằng chứng quy kết spike cho một ứng viên cụ thể.
- Aether flight cần benchmark riêng; ảnh cho thấy FPS thấp nhất, chưa chứng minh nguyên nhân.

### 2A — Ưu tiên benchmark và thiết kế LOD (không triển khai trong bước này)

1. Terrain LOD theo vòng khoảng cách: gần dày, xa thưa; thiết kế stitching/skirt/transition để không xuất hiện seam hoặc crack.
2. Chunk variant/build phải tránh tái tạo đồng bộ trong cùng frame; đo chi phí update/rebuild trước khi chọn chiến lược.
3. Xác định thứ tự governor: giảm geometry/instance density hoặc chọn LOD trước; chỉ giảm render scale khi cần thiết và phù hợp với bottleneck.
4. Điều tra Aether flight bằng cùng seed/bookmark, ghi riêng JS update, JS render-submit, GPU timer query và triangle/call counts.
5. Retake bookmark near khi không có Aurora Bloom; ghi CPU/GPU/driver, viewport CSS/DPR, warm-up và thời lượng sampling.

**Gate:** phần trên chỉ là baseline review và đề xuất điều tra. Phase 2A chưa được bắt đầu hoặc thay đổi hình ảnh cho tới khi chủ dự án duyệt.


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


## 10. Kết quả baseline 1A ngày 2026-11-15

Xem [BASELINE.md](BASELINE.md). Năm ảnh gốc được gửi trong cuộc hội thoại; tệp nhị phân chưa được ghi vào Git do giới hạn upload của connector hiện tại. Bookmark `near` đang có Aurora Bloom nên chưa đồng điều kiện. CPU/GPU timings chưa có; không bắt đầu 2A trước khi có duyệt.


### Instrumentation timing follow-up

Commit `5d58b9f` adds debug-only JS update and JS renderer-submit timing plus optional asynchronous WebGL2 timer query. Commit `793b518` moves the debug panel below the HUD. Commit `6a09ce5` fixes the cache-bust contract test. These are measurement/UI-only changes; they do not change game world geometry, materials, lighting or default quality.


### Phase 1C / allocation inventory

`updateCamera()` previously allocated one `THREE.Vector3` per frame; `moveRobot()` created one `Set` and a temporary merged input array per frame; `nearestInteractable()` allocated one merged entity array per scan (currently called on the HUD prompt cadence). No explicit `new THREE.Matrix4()` was found in the animation/update path; the existing instanced-mesh `Object3D` dummies own and reuse their matrices during construction. Other `Color` creation sites are world/sky/geometry construction or event setup, not per-frame animation.


### Phase 1C completion record — 2026-11-15

Ba mục Phase 1C đã hoàn tất theo ba commit riêng biệt trên branch này. Regression mới gồm QualityProfile mapping/storage compatibility, hot-path allocation contract và real Three.js resource ownership (shared geometry/material/texture, LOD replacement, world disposal idempotence). Full GitHub Actions workflow, real Three.js 0.170.0 scenes, browser/gameplay contracts, CMake build và CTest đều PASS. Default world rendering settings và game-world visuals không thay đổi. Dừng tại đây; Phase 2A chưa bắt đầu và vẫn yêu cầu owner approval.
