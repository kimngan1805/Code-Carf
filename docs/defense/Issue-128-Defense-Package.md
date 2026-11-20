# Code Carf — Hồ sơ bảo vệ issue #128

Nhóm 02 · Quản trị dự án phần mềm (5) · VKU

Giảng viên: TS. Nguyễn Thanh Tuấn.

Bản tổng hợp ngày 20/11/2026; số liệu kỹ thuật/GitHub vẫn theo snapshot 19/11/2026, không phải lần đo mới.

**Lịch bảo vệ: 6 phút slide + 5 phút Live Demo + 5 phút Q&A = 16 phút.**

**Bản để nhóm rà soát:** điểm tự đánh giá là đề xuất của người soạn; chữ ký, phê duyệt và nghiệm thu còn chờ xác nhận. Không thay thế sign-off của stakeholder.

---

## I. Nội dung thuyết trình — 10 slide / 6 phút

## Code Carf — bản chuẩn bị bảo vệ

Bằng chứng ngày 2026-11-19; commit 105a1656158fc9e1a4164f1dffa76302b91f42f4.

**Rubric đã có. Chưa hoàn tất #128: cần hồ sơ thật, điểm tự đánh giá và rà soát nhóm.**

---

### 1. Code Carf · Nhóm 02 · QLDA (5) (0:25)

- Pathway 1 theo slide nhóm; giảng viên: TS. Nguyễn Thanh Tuấn.
- Kim Ngân — PL · Đình Quang — TL · Quỳnh Nhi — Backend.
- Ngọc Sơn — Frontend · Thanh Phúc — QA & Test.
- Nguồn: Charter và slide đã cung cấp; cần chốt tên đề tài/học phần song hành.

**Ghi chú người nói:** Họ tên đầy đủ theo Charter: Nguyễn Ánh Kim Ngân, Trần Đình Quang, Nguyễn Nhã Quỳnh Nhi, Hồ Ngọc Sơn, Phan Thanh Phúc. Pathway 1 được ghi trong PDF cũ; Charter còn liệt kê ba lựa chọn. Không đưa MSSV/mật khẩu vào slide nếu không cần.

- Bằng chứng: supplied-evidence.md
- Bằng chứng: course-requirements.md

---

### 2. Business Case đã ghi trong Charter (0:35)

- Người học đã phải dùng nhiều công cụ rời rạc; giảng viên khó tổng hợp tiến độ và bài nộp.
- Nhóm đã phát triển luồng lộ trình → luyện tập → thi trực tuyến trên một nền tảng.
- Charter đã nêu mục tiêu SMART; số người dùng/lượt nộp thử còn để trống.

**Ghi chú người nói:** Trình bày vấn đề và giải pháp theo Charter/báo cáo, không coi nhận định trong tài liệu là khảo sát khách hàng đã xác nhận. Không tự đặt số người dùng hoặc thời gian tiết kiệm.

- Bằng chứng: supplied-evidence.md
- Bằng chứng: ../../README.md

---

### 3. Kiến trúc và WBS đã lập (0:45)

- Next.js / React / TypeScript → service/repository → Prisma/PostgreSQL.
- Hồ sơ đã mô tả Render và Supabase DB/Storage; có URL triển khai.
- WBS đã có 11 nhánh / 36 gói cấp 2, đầu ra, tiêu chí và truy vết issue.
- Cần chốt baseline và đồng bộ trạng thái với code mới.

**Ghi chú người nói:** WBS không còn thiếu tài liệu: đã đọc file 03. Phân biệt có bản mô tả 100% Rule với đã được stakeholder duyệt. Không khẳng định URL đã được chạy thử thành công từ môi trường thẩm định.

- Bằng chứng: supplied-evidence.md
- Bằng chứng: ../../prisma/schema.prisma

---

### 4. Hybrid và chỉ số thực thi (0:45)

- Báo cáo đã chọn Hybrid: cổng mốc học phần kết hợp thực thi theo sprint.
- Baseline hồ sơ: 260 SP; Sprint 1: 86 SP, Sprint 2: 174 SP — không phải Velocity.
- Snapshot GitHub: 61/105 issue đóng; 51 PR merge trong 12–18/11, mọi nhánh đích.
- PDF cũ có Burndown/99 SP đã đóng tới 15/11; cần đối chiếu dữ liệu board.

**Ghi chú người nói:** Không trộn snapshot 15/11 với cửa sổ GitHub 12–18/11. Các số SP trong hồ sơ là số liệu được cung cấp, chưa xác minh phép tính từ lịch sử Project. PR throughput không thay Velocity.

- Bằng chứng: supplied-evidence.md
- Bằng chứng: evidence.json

---

### 5. Kiểm soát phạm vi — CR-03 (0:45)

- Hồ sơ đã ghi áp lực backlog 12 nhóm chức năng và đề xuất ưu tiên F1–F8, F10 một phần.
- CR-03 đã mô tả cắt F9/F11/F12 và F10-3/F10-4 khỏi scope bàn giao.
- Cột quyết định/người duyệt/ngày duyệt còn trống; chưa gọi là Approved CR.
- Code mới đã có F11/F10-3: cần nhóm đối chiếu baseline và phần làm thêm.

**Ghi chú người nói:** Dùng biến cố quản lý được ghi trong hồ sơ thay vì lấy bug tích hợp làm Approved CR. Nêu rõ quyết định chưa được xác nhận; cần nhóm chốt phạm vi và đối chiếu WBS/backlog/UAT.

- Bằng chứng: supplied-evidence.md
- Bằng chứng: https://github.com/kimngan1805/Code-Carf/pull/159
- Bằng chứng: https://github.com/kimngan1805/Code-Carf/pull/160

---

### 6. Chất lượng và bằng chứng kỹ thuật (0:35)

- Bản nền đã đạt 704 test / 87 file local có PostgreSQL.
- Lint, TypeScript và production build đã qua kiểm tra.
- Repo đã có CI/PR; main hiện chưa bật Branch Protection.
- Số test không đại diện cho coverage, UAT hay khả năng chịu tải.

**Ghi chú người nói:** Chỉ đúng commit trong evidence.json. Yêu cầu Branch Protection ở mục 4 chưa đạt tại thời điểm đọc GitHub. Merge không tự chứng minh review approval từ người khác.

- Bằng chứng: evidence.json
- Bằng chứng: ../../.github/workflows/ci.yml
- Bằng chứng: course-requirements.md

---

### 7. Stakeholder, UAT và Cổng chân thực (0:35)

- Stakeholder dự kiến: TS. Nguyễn Thanh Tuấn và nhóm sinh viên dùng thử, theo Charter.
- Hồ sơ đã có UAT-01–12 và URL https://code-carf.onrender.com.
- Kết quả/commit/ngày nghiệm thu, quyết định và chữ ký vẫn để trống.
- Chưa kết luận Cổng chân thực đạt; lần kiểm tra HTTPS hiện bị timeout.

**Ghi chú người nói:** Tên Signed/Signoff trong file không chứng minh có chữ ký. Tài liệu UAT là kịch bản chưa điền kết quả, không phải xác nhận đã đạt. Timeout từ môi trường trợ lý không chứng minh website ngừng hoạt động. Cần nhóm kiểm chứng URL và lấy xác nhận stakeholder thật.

- Bằng chứng: supplied-evidence.md
- Bằng chứng: rubric.md

---

### 8. Bài học theo hồ sơ Retro (0:35)

- Phạm vi đã cần đồng bộ giữa Charter, WBS, backlog và UAT.
- Ước lượng đã cần tính cả kiểm thử/tích hợp giữa các mô-đun.
- PR đã hỗ trợ truy vết; vai trò DB và storage đã cần kiểm tra sớm khi deploy.
- Retro đã có nội dung 4Ls; ngày họp, người tham dự và xác nhận còn trống.

**Ghi chú người nói:** Các bài học lấy từ file 05 và report, chưa tuyên bố cuộc họp đã được xác nhận. Không dùng nội dung tổng hợp để tự tạo biên bản có ngày/người dự giả.

- Bằng chứng: supplied-evidence.md
- Bằng chứng: https://github.com/kimngan1805/Code-Carf/pull/113

---

### 9. Tự đánh giá theo Rubric chính thức (0:35)

- Kế hoạch 30% · Phương pháp luận 20% · Thực thi 30% · Trình bày/demo 20%.
- Nhóm đã lập bảng bằng chứng và phần thiếu theo từng tiêu chí.
- Tự đánh giá đề xuất: 5.6/10 trước Cổng chân thực, chưa được nhóm xác nhận.
- Còn chờ phê duyệt hồ sơ, UAT và diễn tập; không phải điểm Hội đồng.

**Ghi chú người nói:** Đề xuất nội bộ 1.8/3 + 1.2/2 + 1.8/3 + 0.8/2 = 5.6/10 dựa trên mức chuẩn bị; chưa phải điểm nhóm đã chốt hay dự báo Hội đồng. Không áp trọng số lần nữa. Nếu Cổng chân thực được đánh không đạt, trần là 5.0; hiện chưa kết luận Pass/Fail.

- Bằng chứng: rubric.md
- Bằng chứng: course-requirements.md

---

### 10. Live Demo 5 phút · Q&A 5 phút (0:25)

- 6 phút slide đã kết thúc; bắt đầu demo, dừng phút 11 và hỏi đáp tới phút 16.
- Luồng trọng tâm: Path → Room → bài tập → kết quả; mock không thực thi code thật.
- URL theo hồ sơ: https://code-carf.onrender.com; local/PDF là dự phòng.
- Video backup chưa có trong thư mục đã cung cấp.

**Ghi chú người nói:** Theo scope Charter, luồng học/nộp bài là core; tìm kiếm/report là tính năng đã merge nhưng nằm ngoài scope được ghi trong CR-03, chỉ demo phụ nếu nhóm xác nhận. Không dùng phần bổ sung để thay luồng chính.

- Bằng chứng: demo.md
- Bằng chứng: supplied-evidence.md

---

## II. Bảng tự đánh giá theo Rubric

## Tự đánh giá theo Rubric chính thức

Nguồn: mục 7 `Project-Guidelines.md`. Hồ sơ nhóm đã được đọc từ `bangchung`; xem `supplied-evidence.md` và hash nguồn trong `evidence.json`. Đồ án trên thang 10, chiếm 50% điểm học phần.

### Cổng chân thực — Pass/Fail, chưa xác nhận đạt

| Điều kiện                                            | Bằng chứng đã có                                                                         | Còn cần xác nhận                                                                                               |
| ---------------------------------------------------- | ---------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Repo thật, commit liên tục 15 tuần từ các thành viên | GitHub và PR có thật; author date quan sát trên main 05/10–18/11/2026                    | Chưa chứng minh đủ 15 tuần; risk R01 và báo cáo có mốc lịch sử khác nhau                                       |
| Sản phẩm cloud HTTPS hoặc APK                        | Charter/UAT/PDF đã ghi `https://code-carf.onrender.com`; có cấu hình deploy và bản local | Lần thẩm định HTTPS bị timeout; nhóm cần kiểm tra URL và core workflow. Không kết luận website ngừng hoạt động |
| Stakeholder thật, có nghiệm thu                      | Charter nêu TS. Nguyễn Thanh Tuấn và sinh viên dùng thử; đã có kịch bản UAT-01–12        | Ngày/commit/kết quả/người nghiệm thu/quyết định/chữ ký chưa điền; chưa có sign-off                             |
| Một biến cố quản lý đã được giải quyết               | Hồ sơ đã có CR-01–04, cắt scope CR-03 và bảng rủi ro                                     | Quyết định/người duyệt/ngày duyệt còn trống; chưa đủ để gọi Approved CR                                        |

Chưa đủ cơ sở tự xác nhận Pass; đây không phải kết luận Hội đồng đã đánh Fail. **Nếu Cổng chân thực không đạt, hướng dẫn giới hạn điểm đồ án tối đa 5.0/10.**

### Điểm tự đánh giá đề xuất để nhóm rà soát

Các điểm dưới là **nhận định tạm thời của người soạn dựa trên bộ hồ sơ đã đọc**, không phải điểm Hội đồng, dự báo kết quả hay xác nhận của cả nhóm. Hướng dẫn chỉ quy định thành phần/trọng số, không có mô tả mức điểm chi tiết; không coi các mức đề xuất là thang chấm chính thức.

| Thành phần                            | Trọng số | Tối đa   | Đề xuất tạm | Căn cứ và phần cần bổ sung                                                                                                                                                                    |
| ------------------------------------- | -------- | -------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Tính đầy đủ & khả thi của kế hoạch | 30%      | 3.0      | **1.8**     | Đã có Charter, WBS 11/36 và risk register. Charter vẫn Draft, SMART còn trống; rủi ro đợt 1 chưa có ngày/người cập nhật; cần chốt baseline và xác nhận                                        |
| 2. Sự phù hợp phương pháp luận        | 20%      | 2.0      | **1.2**     | Báo cáo giải thích Hybrid; Retro có 4Ls/bài học. Ngày, chủ trì, người dự và xác nhận họp còn trống; cần bằng chứng nhịp làm việc thực tế                                                      |
| 3. Bằng chứng thực thi thực tế        | 30%      | 3.0      | **1.8**     | Có PR/CI, 704 test/87 file local, snapshot GitHub và số liệu SP/Burndown trong PDF cũ. Cần đối chiếu nguồn board, commit 15 tuần, peer approval, CR đã duyệt; main chưa bật Branch Protection |
| 4. Thuyết trình, Live Demo & Q&A      | 20%      | 2.0      | **0.8**     | Có slide, demo plan, PDF offline và lịch 6+5+5. Chưa có diễn tập, kiểm chứng cloud/core workflow, video backup hoặc phản biện thực tế; đây chỉ là đánh giá mức chuẩn bị                       |
| **Tổng đề xuất trước Cổng chân thực** | **100%** | **10.0** | **5.6**     | **Chưa được nhóm xác nhận; cần cập nhật sau khi bổ sung hồ sơ và diễn tập**                                                                                                                   |

Không áp trọng số lần nữa vào các số đã tính trên mức tối đa 3–2–3–2. Nếu nhóm chấm bốn thành phần riêng trên thang 10 thì dùng `0.30 × kế hoạch + 0.20 × phương pháp + 0.30 × thực thi + 0.20 × trình bày`. Chỉ áp trần 5.0 khi Cổng chân thực được đánh giá **không đạt**, không tự áp vì một lần probe timeout hoặc chưa nhận hồ sơ xác nhận.

### Việc cần nhóm hoàn thiện

1. Xác nhận cách mô tả Pathway 1 và đề tài/học phần song hành; thông tin thành viên/vai trò đã có từ Charter.
2. Ký/chốt Charter; điền đợt rủi ro, thông tin họp Retro và phê duyệt CR bằng ngày/người thật.
3. Đối chiếu CR-03 với F11/F10-3 đã merge; đồng bộ Charter/WBS/backlog/UAT, không âm thầm đổi baseline.
4. Hoàn tất UAT trên URL thật, lấy sign-off stakeholder; xuất đúng các file 01–08.
5. Rà điểm đề xuất, diễn tập 6+5+5 với Nhi và xác nhận bản cuối. #128 vẫn mở cho tới khi nhóm rà soát.

---

## III. Kịch bản Live Demo, Q&A và dự phòng

## Kịch bản bảo vệ — đúng 6 + 5 + 5 phút

Theo mục 8 `Project-Guidelines.md`, toàn bộ buổi bảo vệ có **16 phút**, gồm 6 phút slide, 5 phút Live Demo và 5 phút Q&A. Đây là kịch bản đã chuẩn bị, không phải biên bản diễn tập, UAT hay buổi bảo vệ đã diễn ra.

### Phút 0–6: thuyết trình 10 slide

| Slide | Nội dung                     | Giây | Mốc kết thúc |
| ----- | ---------------------------- | ---- | ------------ |
| 1     | Dự án, Pathway và vai trò    | 25   | 0:25         |
| 2     | Vấn đề và Business Case      | 35   | 1:00         |
| 3     | Kiến trúc và WBS             | 45   | 1:45         |
| 4     | Phương pháp luận và chỉ số   | 45   | 2:30         |
| 5     | Thách thức quản lý           | 45   | 3:15         |
| 6     | Chất lượng và bằng chứng     | 35   | 3:50         |
| 7     | Nghiệm thu và Cổng chân thực | 35   | 4:25         |
| 8     | Bài học                      | 35   | 5:00         |
| 9     | Tự đánh giá Rubric           | 35   | 5:35         |
| 10    | Chuyển sang demo             | 25   | 6:00         |

Người nói từng phần cần được nhóm phân công dù đã có danh sách vai trò. Không dành cả 16 phút để đọc slide.

### Phút 6–11: Live Demo 5 phút

| Khoảng trong phần demo | Thao tác                                                        | Điều cần chứng minh                                                        |
| ---------------------- | --------------------------------------------------------------- | -------------------------------------------------------------------------- |
| 0:00–0:40              | Mở https://code-carf.onrender.com, đăng nhập học viên           | URL đã có trong hồ sơ; cần nhóm kiểm chứng core workflow trước buổi bảo vệ |
| 0:40–1:30              | Chọn Path trong danh mục, mở chi tiết và đăng ký                | Luồng trong scope, nội dung đã publish và đăng ký không tạo trùng          |
| 1:30–2:20              | Mở Room đầu và URL trực tiếp của Room sau đang khóa             | Server kiểm tra đăng ký và tiến độ, không chỉ khóa nút UI                  |
| 2:20–3:35              | Mở bài CODE, chọn ngôn ngữ, lưu nháp và nộp                     | Editor, trạng thái nộp và kết quả; nêu rõ đang dùng Judge0 hay mock        |
| 3:35–4:25              | Mở cuộc thi đã chuẩn bị, xem đồng hồ/kết quả theo cấu hình thật | Core workflow cuộc thi; nói rõ mock không chạy code thực                   |
| 4:25–5:00              | Tóm tắt luồng; chuyển quyền hỏi cho Hội đồng                    | Dừng demo ở phút 11, không chiếm phần Q&A                                  |

Mock không chạy code thật và không tự chứng minh bài làm đúng. Không sửa DB giữa demo để giả lập hoàn thành hoặc vượt giới hạn report. Muốn chứng minh chấm code thật cần Judge0 đã chạy thử trước. Bản local là dự phòng, không tự thay điều kiện cloud HTTPS của Cổng chân thực. Charter/CR-03 đã cung cấp ghi F11 ngoài scope bàn giao; chỉ demo tìm kiếm/report như phần bổ sung nếu nhóm xác nhận, không thay luồng chính.

### Phút 11–16: phản biện và hỏi đáp

Để Hội đồng dẫn dắt; các câu dưới là chuẩn bị, không phải danh sách câu hỏi đã diễn ra:

| Câu hỏi có thể gặp                            | Căn cứ trả lời                                                                                    |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Vì sao tách service và repository?            | Service giữ kiểm quyền/logic, repository giữ truy vấn; chỉ đúng một luồng code và test            |
| Người dùng gõ URL Room khóa thì sao?          | Mở `canAccessRoom` và test, không chỉ trình bày trạng thái nút                                    |
| Mock có chấm đúng code không?                 | Không; chỉ mô phỏng tích hợp. Phân biệt với adapter Judge0                                        |
| Nhóm đã dùng Scrum và đạt Velocity bao nhiêu? | Chỉ trả lời khi có kế hoạch, Sprint, Story Point và Retro thật; PR throughput không phải Velocity |
| Stakeholder đã nghiệm thu chưa?               | Mở sign-off/email thật nếu đã được cung cấp; nếu chưa, nói rõ chưa xác nhận                       |
| Scope Change đã được xử lý như thế nào?       | Chỉ dùng hồ sơ CR/CCB thật; không tự đổi tên một bug kỹ thuật thành Approved CR                   |

### Chuẩn bị và dự phòng

1. Chốt commit demo; đối chiếu `evidence.json`. Kiểm tra URL HTTPS trước buổi bảo vệ, không chỉ dựa vào file cấu hình deploy.
2. Bật Docker và chạy `docker compose up -d db`, `npm run db:deploy`, `npx prisma generate`; chạy `npm run dev` hoặc build/start. Không xóa volume/reset DB để chữa lỗi demo.
3. Chuẩn bị dữ liệu sạch bằng seed trước buổi diễn tập; seed có thể đổi lịch contest nên không chạy giữa lượt thi. Tài khoản/mật khẩu và `.env` không đưa vào slide/video công khai.
4. Chuẩn bị hai browser profile nếu cần học viên/giáo viên. Monaco tải chậm thì dùng Editor đơn giản hiện có.
5. Nếu mất mạng, dùng local và slide PDF; nói rõ đây là fallback. Nếu DB không lên sau 30 giây, dùng video thật đã quay trước hoặc mở code/test để giải thích giới hạn. **Video backup hiện chưa được cung cấp.**
6. Giới hạn report 5 phút là hành vi đúng; dùng bài khác đã chuẩn bị hoặc trình bày thông báo, không xóa report để vượt giới hạn.
7. Nhóm cần diễn tập đủ 6+5+5, điền Rubric và rà soát trước khi nộp. Chưa có bằng chứng diễn tập hay xác nhận nhóm trong bộ này.
