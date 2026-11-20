# Code Carf — bản chuẩn bị bảo vệ

Bằng chứng ngày 2026-11-19; commit 105a1656158fc9e1a4164f1dffa76302b91f42f4.

**Rubric đã có. Chưa hoàn tất #128: cần hồ sơ thật, điểm tự đánh giá và rà soát nhóm.**

---

## 1. Code Carf · Nhóm 02 · QLDA (5) (0:25)

- Pathway 1 theo slide nhóm; giảng viên: TS. Nguyễn Thanh Tuấn.
- Kim Ngân — PL · Đình Quang — TL · Quỳnh Nhi — Backend.
- Ngọc Sơn — Frontend · Thanh Phúc — QA & Test.
- Nguồn: Charter và slide đã cung cấp; cần chốt tên đề tài/học phần song hành.

**Ghi chú người nói:** Họ tên đầy đủ theo Charter: Nguyễn Ánh Kim Ngân, Trần Đình Quang, Nguyễn Nhã Quỳnh Nhi, Hồ Ngọc Sơn, Phan Thanh Phúc. Pathway 1 được ghi trong PDF cũ; Charter còn liệt kê ba lựa chọn. Không đưa MSSV/mật khẩu vào slide nếu không cần.

- Bằng chứng: supplied-evidence.md
- Bằng chứng: course-requirements.md

---

## 2. Business Case đã ghi trong Charter (0:35)

- Người học đã phải dùng nhiều công cụ rời rạc; giảng viên khó tổng hợp tiến độ và bài nộp.
- Nhóm đã phát triển luồng lộ trình → luyện tập → thi trực tuyến trên một nền tảng.
- Charter đã nêu mục tiêu SMART; số người dùng/lượt nộp thử còn để trống.

**Ghi chú người nói:** Trình bày vấn đề và giải pháp theo Charter/báo cáo, không coi nhận định trong tài liệu là khảo sát khách hàng đã xác nhận. Không tự đặt số người dùng hoặc thời gian tiết kiệm.

- Bằng chứng: supplied-evidence.md
- Bằng chứng: ../../README.md

---

## 3. Kiến trúc và WBS đã lập (0:45)

- Next.js / React / TypeScript → service/repository → Prisma/PostgreSQL.
- Hồ sơ đã mô tả Render và Supabase DB/Storage; có URL triển khai.
- WBS đã có 11 nhánh / 36 gói cấp 2, đầu ra, tiêu chí và truy vết issue.
- Cần chốt baseline và đồng bộ trạng thái với code mới.

**Ghi chú người nói:** WBS không còn thiếu tài liệu: đã đọc file 03. Phân biệt có bản mô tả 100% Rule với đã được stakeholder duyệt. Không khẳng định URL đã được chạy thử thành công từ môi trường thẩm định.

- Bằng chứng: supplied-evidence.md
- Bằng chứng: ../../prisma/schema.prisma

---

## 4. Hybrid và chỉ số thực thi (0:45)

- Báo cáo đã chọn Hybrid: cổng mốc học phần kết hợp thực thi theo sprint.
- Baseline hồ sơ: 260 SP; Sprint 1: 86 SP, Sprint 2: 174 SP — không phải Velocity.
- Snapshot GitHub: 61/105 issue đóng; 51 PR merge trong 12–18/11, mọi nhánh đích.
- PDF cũ có Burndown/99 SP đã đóng tới 15/11; cần đối chiếu dữ liệu board.

**Ghi chú người nói:** Không trộn snapshot 15/11 với cửa sổ GitHub 12–18/11. Các số SP trong hồ sơ là số liệu được cung cấp, chưa xác minh phép tính từ lịch sử Project. PR throughput không thay Velocity.

- Bằng chứng: supplied-evidence.md
- Bằng chứng: evidence.json

---

## 5. Kiểm soát phạm vi — CR-03 (0:45)

- Hồ sơ đã ghi áp lực backlog 12 nhóm chức năng và đề xuất ưu tiên F1–F8, F10 một phần.
- CR-03 đã mô tả cắt F9/F11/F12 và F10-3/F10-4 khỏi scope bàn giao.
- Cột quyết định/người duyệt/ngày duyệt còn trống; chưa gọi là Approved CR.
- Code mới đã có F11/F10-3: cần nhóm đối chiếu baseline và phần làm thêm.

**Ghi chú người nói:** Dùng biến cố quản lý được ghi trong hồ sơ thay vì lấy bug tích hợp làm Approved CR. Nêu rõ quyết định chưa được xác nhận; cần nhóm chốt phạm vi và đối chiếu WBS/backlog/UAT.

- Bằng chứng: supplied-evidence.md
- Bằng chứng: https://github.com/kimngan1805/Code-Carf/pull/159
- Bằng chứng: https://github.com/kimngan1805/Code-Carf/pull/160

---

## 6. Chất lượng và bằng chứng kỹ thuật (0:35)

- Bản nền đã đạt 704 test / 87 file local có PostgreSQL.
- Lint, TypeScript và production build đã qua kiểm tra.
- Repo đã có CI/PR; main hiện chưa bật Branch Protection.
- Số test không đại diện cho coverage, UAT hay khả năng chịu tải.

**Ghi chú người nói:** Chỉ đúng commit trong evidence.json. Yêu cầu Branch Protection ở mục 4 chưa đạt tại thời điểm đọc GitHub. Merge không tự chứng minh review approval từ người khác.

- Bằng chứng: evidence.json
- Bằng chứng: ../../.github/workflows/ci.yml
- Bằng chứng: course-requirements.md

---

## 7. Stakeholder, UAT và Cổng chân thực (0:35)

- Stakeholder dự kiến: TS. Nguyễn Thanh Tuấn và nhóm sinh viên dùng thử, theo Charter.
- Hồ sơ đã có UAT-01–12 và URL https://code-carf.onrender.com.
- Kết quả/commit/ngày nghiệm thu, quyết định và chữ ký vẫn để trống.
- Chưa kết luận Cổng chân thực đạt; lần kiểm tra HTTPS hiện bị timeout.

**Ghi chú người nói:** Tên Signed/Signoff trong file không chứng minh có chữ ký. Tài liệu UAT là kịch bản chưa điền kết quả, không phải xác nhận đã đạt. Timeout từ môi trường trợ lý không chứng minh website ngừng hoạt động. Cần nhóm kiểm chứng URL và lấy xác nhận stakeholder thật.

- Bằng chứng: supplied-evidence.md
- Bằng chứng: rubric.md

---

## 8. Bài học theo hồ sơ Retro (0:35)

- Phạm vi đã cần đồng bộ giữa Charter, WBS, backlog và UAT.
- Ước lượng đã cần tính cả kiểm thử/tích hợp giữa các mô-đun.
- PR đã hỗ trợ truy vết; vai trò DB và storage đã cần kiểm tra sớm khi deploy.
- Retro đã có nội dung 4Ls; ngày họp, người tham dự và xác nhận còn trống.

**Ghi chú người nói:** Các bài học lấy từ file 05 và report, chưa tuyên bố cuộc họp đã được xác nhận. Không dùng nội dung tổng hợp để tự tạo biên bản có ngày/người dự giả.

- Bằng chứng: supplied-evidence.md
- Bằng chứng: https://github.com/kimngan1805/Code-Carf/pull/113

---

## 9. Tự đánh giá theo Rubric chính thức (0:35)

- Kế hoạch 30% · Phương pháp luận 20% · Thực thi 30% · Trình bày/demo 20%.
- Nhóm đã lập bảng bằng chứng và phần thiếu theo từng tiêu chí.
- Tự đánh giá đề xuất: 5.6/10 trước Cổng chân thực, chưa được nhóm xác nhận.
- Còn chờ phê duyệt hồ sơ, UAT và diễn tập; không phải điểm Hội đồng.

**Ghi chú người nói:** Đề xuất nội bộ 1.8/3 + 1.2/2 + 1.8/3 + 0.8/2 = 5.6/10 dựa trên mức chuẩn bị; chưa phải điểm nhóm đã chốt hay dự báo Hội đồng. Không áp trọng số lần nữa. Nếu Cổng chân thực được đánh không đạt, trần là 5.0; hiện chưa kết luận Pass/Fail.

- Bằng chứng: rubric.md
- Bằng chứng: course-requirements.md

---

## 10. Live Demo 5 phút · Q&A 5 phút (0:25)

- 6 phút slide đã kết thúc; bắt đầu demo, dừng phút 11 và hỏi đáp tới phút 16.
- Luồng trọng tâm: Path → Room → bài tập → kết quả; mock không thực thi code thật.
- URL theo hồ sơ: https://code-carf.onrender.com; local/PDF là dự phòng.
- Video backup chưa có trong thư mục đã cung cấp.

**Ghi chú người nói:** Theo scope Charter, luồng học/nộp bài là core; tìm kiếm/report là tính năng đã merge nhưng nằm ngoài scope được ghi trong CR-03, chỉ demo phụ nếu nhóm xác nhận. Không dùng phần bổ sung để thay luồng chính.

- Bằng chứng: demo.md
- Bằng chứng: supplied-evidence.md
