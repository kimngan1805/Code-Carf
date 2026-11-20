# Bộ chuẩn bị bảo vệ — issue #128

Hai file tổng hợp để đọc/chỉnh sửa là **`Issue-128-Defense-Package.docx`** (Word) và **`Issue-128-Defense-Package.md`** (Markdown). Mỗi file gồm nội dung 10 slide, bảng tự đánh giá và kịch bản demo/Q&A/dự phòng. Tạo lại sau khi sửa nguồn bằng `python docs/defense/export-package.py` (chỉ dùng Python standard library).

- `slides.html`: 10 slide offline; phím trái/phải để chuyển; nút Ghi chú mở lời dẫn và nguồn.
- `slides.pdf`: bản PDF 10 trang; cần xuất lại sau khi sửa nội dung. Khi nhóm hoàn thiện, dùng tên nộp `08_Presentation_Slide_Deck.pdf`.
- `slides.md`: nội dung và ghi chú để rà soát.
- `slides-content.json`: nguồn nội dung và thời lượng từng slide.
- `evidence.json`: snapshot GitHub, commit nền, kết quả local và hash hướng dẫn cùng hồ sơ đã cung cấp.
- `supplied-evidence.md`: đối chiếu 9 file trong `bangchung`, các ô còn trống và chỗ lệch số liệu.
- `course-requirements.md`: đối chiếu mục 1, 4, 5, 7, 8 của hướng dẫn đã nhận.
- `rubric.md`: Cổng chân thực và tự đánh giá đề xuất đúng trọng số **30/20/30/20**; điểm tạm 5.6/10 trước Gate, chưa được nhóm xác nhận.
- `demo.md`: **6 phút slide + 5 phút demo + 5 phút Q&A**, chuẩn bị và dự phòng.

Tạo lại HTML/Markdown sau khi sửa nội dung hoặc số liệu:

```powershell
node docs/defense/build-slides.mjs
```

Script dùng Node built-ins, không cần package mới. Nó kiểm tra 10 slide tổng 360 giây và demo/Q&A mỗi phần 300 giây. Mở HTML rồi in PDF để xuất lại bản offline. HTML/Markdown lấy chung nguồn; PDF phải xuất lại sau khi sửa.

**Trạng thái:** đã có Rubric, thông tin nhóm/vai trò, hồ sơ dự án và thời lượng chính thức. Điểm đề xuất là nhận định của người soạn, cần nhóm rà soát. #128 vẫn cần chốt Pathway/baseline, ký/phê duyệt các mục thật, hoàn tất UAT và diễn tập. Không tự tạo phê duyệt, sign-off, video hoặc lịch sử Sprint.
