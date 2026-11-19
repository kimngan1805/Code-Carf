# Bộ chuẩn bị bảo vệ — issue #128

- `slides.html`: 10 slide offline, dùng phím trái/phải để chuyển; nút Ghi chú mở lời dẫn và nguồn. In thành PDF bằng trình duyệt.
- `slides.pdf`: bản PDF 10 trang để mở offline hoặc trình chiếu dự phòng; cần xuất lại sau khi sửa slide.
- `slides.md`: cùng nội dung và ghi chú, dễ rà soát/chỉnh sửa.
- `evidence.json`: số liệu GitHub, commit nền và kết quả kiểm tra local tại thời điểm ghi nhận.
- `rubric.md`: bảng đối chiếu bằng chứng, **chưa chấm điểm vì thiếu Rubric chính thức**.
- `demo.md`: kịch bản demo, chuẩn bị môi trường và dự phòng.

Tạo lại HTML/Markdown sau khi sửa dữ liệu hoặc nội dung trong script:

```powershell
node docs/defense/build-slides.mjs
```

Không cần cài thêm package cho script. Các slide có tổng thời gian nói 960 giây (16 phút). Các file được tạo dùng chung nguồn nội dung để tránh sai lệch số liệu.

**Trạng thái:** bản chuẩn bị để nhóm rà soát. #128 chưa đủ điều kiện đóng cho tới khi nhận Rubric học phần, điền tự đánh giá theo tiêu chí thật, phân công người nói và nhóm rà soát. Không có điểm số, kết quả UAT, video dự phòng hay phê duyệt của nhóm nào được tự tạo ra.
