# AstroSpace — Phase 1A browser baseline

Ngày ghi nhận: 2026-11-15  
**Baseline freeze / immutable commit:** `5234c56eea34c81ef6adfff3ee2f0964dfb2070d`  
Branch/preview được mở: `phase/1a-measurement-harness`  
URL mẫu: `/play/?debug=1&seed=1&bookmark=<bookmark>`

## Cấu hình chụp

| Thuộc tính | Giá trị |
|---|---|
| Trình duyệt | Google Chrome trên Windows |
| Display scaling | 125% |
| Chế độ cửa sổ | Toàn màn hình theo người đo; ảnh chụp vẫn hiển thị Chrome UI và taskbar |
| Quality | Balanced |
| Seed | 1 |
| **Độ phân giải ảnh gốc** | **1920 × 1080 px** |
| Render scale | 62% DPR |
| Renderer pixel ratio | 0.78 |
| GPU / driver | Chưa được cung cấp |
| CPU / RAM / OS build | Chưa được cung cấp |
| Warm-up / thời lượng lấy mẫu | Chưa ghi nhận; overlay dùng rolling sample tối đa 120 frame |

## Số liệu theo bookmark

Các giá trị dưới đây được chép nguyên văn từ runtime debug overlay, không làm tròn lại.

| Bookmark | FPS | Frame (ms) | P95 (ms) | Calls | Triangles | Geometries | Textures | Điều kiện |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| mid | 26.8 | 37.25 | 48.30 | 90 | 1442748 | 117 | 14 | Balanced, seed 1 |
| far | 26.3 | 38.07 | 59.00 | 90 | 1442748 | 117 | 14 | Balanced, seed 1 |
| orbit | 27.2 | 36.76 | 45.80 | 89 | 1342396 | 117 | 14 | Balanced, seed 1 |
| aether | 20.3 | 49.36 | 62.60 | 92 | 1442892 | 119 | 14 | Aether flight, Balanced, seed 1 |
| near | 29.2 | 34.29 | 96.70 | 95 | 1444420 | 128 | 14 | **Không cùng điều kiện:** Aurora Bloom event đang chạy; cần chụp lại |

**Lưu ý về near:** ảnh near được chụp khi sự kiện *Aurora Bloom* đang hoạt động. Giữ lại ảnh/số liệu làm bằng chứng lượt đo này, nhưng không dùng làm đối chứng ngang hàng với bốn bookmark còn lại cho tới khi retake trong điều kiện sự kiện tương đương.

## Ảnh chụp và nơi lưu

Archive `baseline-images-phase1a.zip` được cung cấp kèm cuộc hội thoại có đủ năm ảnh PNG gốc; đã kiểm tra từng ảnh có độ phân giải **1920 × 1080 px** (RGB). Ảnh nhị phân **chưa được commit vào Git**. Chủ dự án sẽ upload thủ công vào `docs/baseline/` bằng đúng tên đích:

- `docs/baseline/baseline-mid.png`
- `docs/baseline/baseline-far.png`
- `docs/baseline/baseline-orbit.png`
- `docs/baseline/baseline-aether.png`
- `docs/baseline/baseline-near-aurora-bloom.png`

Tên file trong archive hiện tại lần lượt gồm `baseline-mid.png`, `baseline-far.png`, `baseline-orbit.png`, `baseline-aether.png` và `baseline-near-aurora-bloom.png`; không đổi nội dung ảnh khi upload. Bảng số liệu và điều kiện chụp nằm trong tài liệu này. Không dùng ảnh near làm đối chứng cùng điều kiện vì Aurora Bloom đang hoạt động.

## Diễn giải và giới hạn

- `renderer.info.memory.geometries` và `renderer.info.memory.textures` là bộ đếm resource của Three.js renderer, **không phải VRAM**.
- Render scale 62% và pixel ratio 0.78 là giá trị hiển thị trên overlay. Ảnh chụp chưa có GPU model/driver hoặc GPU timer-query nên chưa thể kết luận tải GPU thật.
- FPS/frame/P95 là số đọc tại thời điểm chụp từ rolling sample; chưa phải benchmark có kiểm soát warm-up 30 giây và capture 60 giây.
- Aether là bookmark có FPS thấp nhất trong lượt đo này. Cần phân biệt JS update / JS render-submit / GPU timer query trước khi kết luận nguyên nhân.
- Các con số chỉ mô tả lần chụp này trên máy/browser nêu trên, không đại diện mọi cấu hình người chơi.

## Kết quả baseline hiện tại

Baseline 1A được cố định trực tiếp bằng SHA commit `5234c56eea34c81ef6adfff3ee2f0964dfb2070d` (không yêu cầu Git tag); tài liệu này cùng ảnh và số liệu là hồ sơ baseline. Có số đo trình duyệt thật cho cả năm bookmark, nhưng `near` cần retake để đồng nhất trạng thái event và metadata CPU/GPU còn thiếu. Giữ nguyên deployment được build từ commit `5234c56`; không redeploy hoặc thay đổi URL baseline đó.

## Bổ sung instrumentation CPU/GPU (Phase 1A)

Debug overlay trong các commit tiếp theo của nhánh đo đạc hiển thị:

- **JS UPDATE (ms):** thời gian CPU-side của JavaScript từ đầu phần update trong `animate()` tới trước `renderer.render()`. Bao gồm các bước movement/camera, terrain update, event/animation, UI cadence và governor trong frame đó.
- **JS RENDER SUBMIT (ms):** thời gian CPU-side nằm bên trong lời gọi `renderer.render(scene, camera)`. Đây là thời gian JS/driver submit render work, không phải GPU execution time.
- **GPU (ms):** chỉ có số khi WebGL2 hỗ trợ `EXT_disjoint_timer_query_webgl2`; đọc kết quả bất đồng bộ, không chờ/block frame. Mẫu disjoint bị loại; khi API/extension không có hoặc chưa có mẫu hợp lệ thì overlay hiển thị `n/a`.

Hai số JS là thời lượng thực thi trên luồng JavaScript, không phải VRAM, GPU utilization hoặc thời gian GPU thực thi. Chỉ dòng GPU timer query mới là thời gian GPU, và vẫn có giới hạn/phạm vi do timer-query extension cung cấp. Đo debug chỉ bật với `?debug=1`; không gọi `performance.now()` trong vòng lặp bình thường khi debug tắt.
