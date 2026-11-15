# AstroSpace — Phase 1A browser baseline

Ngày ghi nhận: 2026-11-15  
Commit được đo: `5234c56eea34c81ef6adfff3ee2f0964dfb2070d`  
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
| Kích thước file ảnh | 1456 × 819 px |
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

## Ảnh chụp

Năm ảnh gốc đã được đính kèm theo yêu cầu trong cuộc hội thoại (theo đúng thứ tự: mid, far, orbit, aether, near). Connector GitHub hiện dùng trong phiên này chỉ tạo được text/base64 blob qua Git data API và không có thao tác nhận file nhị phân trực tiếp từ các tệp đính kèm; do đó **ảnh chưa được commit vào `docs/baseline/`**. Để tránh tạo Markdown image links bị hỏng, phần binary đang được giữ riêng trong bộ đính kèm. Tên file đích đề xuất:

- `baseline-mid.png`
- `baseline-far.png`
- `baseline-orbit.png`
- `baseline-aether.png`
- `baseline-near-aurora-bloom.png`

## Diễn giải và giới hạn

- `renderer.info.memory.geometries` và `renderer.info.memory.textures` là bộ đếm resource của Three.js renderer, **không phải VRAM**.
- Render scale 62% và pixel ratio 0.78 là giá trị hiển thị trên overlay. Ảnh chụp chưa có GPU model/driver hoặc GPU timer-query nên chưa thể kết luận tải GPU thật.
- FPS/frame/P95 là số đọc tại thời điểm chụp từ rolling sample; chưa phải benchmark có kiểm soát warm-up 30 giây và capture 60 giây.
- Aether là bookmark có FPS thấp nhất trong lượt đo này. Cần phân biệt JS update / JS render-submit / GPU timer query trước khi kết luận nguyên nhân.
- Các con số chỉ mô tả lần chụp này trên máy/browser nêu trên, không đại diện mọi cấu hình người chơi.

## Kết quả baseline hiện tại

Baseline 1A đã có số đo trình duyệt thật cho cả năm bookmark, nhưng `near` cần retake để đồng nhất trạng thái event và metadata CPU/GPU còn thiếu. Giữ nguyên deployment được build từ commit `5234c56`; không redeploy hoặc thay đổi URL baseline đó.
