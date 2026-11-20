# Đối chiếu hồ sơ nhóm đã cung cấp

Nguồn: thư mục `bangchung` do người dùng cung cấp. Hash từng file nằm trong `evidence.json → suppliedDocuments`. Các bản gốc được giữ nguyên ngoài repo; task này chỉ tóm tắt thông tin cần thiết cho slide. Có 9 file gồm 8 đầu mục nộp và một mô tả dự án bổ sung.

## Thông tin đã đọc được

- Dự án **Code Carf / CODE-CARF**, nhóm **02**, học phần **Quản trị dự án phần mềm (5)**.
- Slide cũ ghi **Pathway 1**. Charter còn liệt kê cả ba lựa chọn; cách mô tả Pathway 1 là “song hành học phần QLDA”, cần nhóm xác nhận đề tài/học phần chuyên ngành song hành theo định nghĩa của hướng dẫn. Không tự đổi thành Pathway 2/3.
- Theo Charter: Nguyễn Ánh Kim Ngân — Project Lead; Trần Đình Quang — Technical Lead; Nguyễn Nhã Quỳnh Nhi — Backend Engineer; Hồ Ngọc Sơn — Frontend Engineer; Phan Thanh Phúc — QA & Test Engineer.
- Báo cáo tổng kết mô tả **Hybrid**, kết hợp mốc học phần và thực thi theo sprint. Có phân công chức năng chi tiết, khác góc nhìn vai trò chuẩn; không dùng tỷ trọng commit thay tỷ lệ đóng góp được nhóm thống nhất.
- WBS đã có **11 nhánh cấp 1, 36 gói cấp 2**, từ điển đầu ra/tiêu chí và truy vết issue. Bản này đối chiếu trạng thái tới 15–16/11/2026, chưa mặc định phản ánh main mới nhất.
- Báo cáo ghi baseline **77 đầu việc / 260 SP**, Sprint 1 **86 SP**, Sprint 2 **174 SP**. Đây là khối lượng kế hoạch trong hồ sơ, không phải Velocity thực tế.
- Slide cũ ghi **99 SP đã đóng** tới 15/11 và các điểm SP còn lại **235, 234, 215, 161** ngày 12–15/11. Chưa có bản xuất lịch sử board/nguồn tính từng điểm; giữ như số liệu hồ sơ chờ đối chiếu, không trộn với snapshot GitHub mới.
- URL triển khai được ghi trong Charter/UAT: **https://code-carf.onrender.com**. Lần truy cập thẩm định từ môi trường trợ lý bị timeout; chưa kết luận website ngừng hoạt động hoặc đã kiểm chứng luồng HTTPS thành công.

## Trạng thái từng đầu mục

| File gốc                                 | Đã có                                                        | Còn cần nhóm xác nhận/hoàn thiện                                                                                      |
| ---------------------------------------- | ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| `01_Final_Technical_Report.docx`         | Bảy chương, Hybrid, vai trò, WBS/CPM và số liệu lịch sử      | Các mốc/số liệu chưa nhất quán với risk register; cập nhật số liệu đúng thời điểm và xuất PDF cuối                    |
| `02_Project_Charter_Signed.docx`         | 13 mục, nhóm/vai trò, phạm vi, URL, stakeholder dự kiến      | Nội dung ghi Draft; SMART số người dùng/lượt nộp, ngày thực tế và chữ ký còn trống; tên Signed không chứng minh đã ký |
| `03_WBS_and_WBS_Dictionary.docx`         | 11 nhánh/36 gói, đầu ra, tiêu chí và issue mapping           | Chốt baseline/ước lượng/phân công và đồng bộ trạng thái mới; không tự tuyên bố đã nghiệm thu 100% Rule                |
| `04_Risk_Register_Evolution.xlsx`        | Chín dòng R01–R09, biện pháp và trạng thái                   | Đợt 1 còn trống; đợt 2 ghi R01–R10 nhưng chỉ có chín dòng; R07 review chưa có biện pháp                               |
| `05_Sprint_Retrospectives.docx`          | Nội dung 4Ls và bài học, đề xuất cải tiến                    | Ngày/hình thức/người dự họp chưa điền; chưa là biên bản họp được xác nhận                                             |
| `06_Scope_Change_Control_Record.docx`    | CR-01 GUEST, CR-02 URL, CR-03 cắt phạm vi, CR-04 storage     | Quyết định, người duyệt và ngày duyệt để trống; CR-03 chưa có ngày đề xuất; chưa thể gọi là Approved CR               |
| `07_Stakeholder_Acceptance_Signoff.docx` | Kịch bản UAT-01–12, URL, mẫu quyết định/email mời            | Ngày/commit/người tiếp nhận, kết quả từng ca, quyết định và chữ ký chưa điền; chưa phải sign-off                      |
| `08_Presentation_Slide_Deck.pdf`         | Tám slide, Pathway, nhóm, WBS, số liệu tới 15/11 và URL demo | Khung ảnh và UAT sign-off còn chừa trống; bản cập nhật trong repo có 10 slide, lịch 6+5+5 và số liệu phân nguồn       |

## Các chỗ cần đối chiếu trước khi tự chấm

1. Risk R01 ghi commit đầu 10/11; báo cáo và lịch sử main quan sát có mốc 05/10. Không sửa timestamp Git để làm khớp tài liệu.
2. CR-01 dẫn chiếu rủi ro token là R03, nhưng workbook ghi lỗi token là R02; CR-03 còn thiếu phê duyệt.
3. Charter/CR-03 ghi F11 và F10-3 ngoài phạm vi, trong khi #46/#69/#44 đã có code merge. Cần nhóm chốt phạm vi bàn giao hoặc ghi thay đổi có phê duyệt, không âm thầm đổi baseline trên slide.
4. Số 132 commit, 33 PR/32 merge trong báo cáo là snapshot lịch sử 15/11; không dùng thay số liệu GitHub của cửa sổ 12–18/11. PR qua mọi nhánh đích khác PR vào main.
5. Chưa có bằng chứng đủ 15 tuần, approval của từng PR, lịch sử Burndown, diễn tập và UAT đã ký. Có hồ sơ mẫu không đồng nghĩa các hoạt động đó đã diễn ra.
