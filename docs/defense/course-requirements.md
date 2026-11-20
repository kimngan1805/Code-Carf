# Đối chiếu hướng dẫn học phần

Nguồn: `Project-Guidelines.md` do người dùng cung cấp; SHA-256 trong `evidence.json → officialRequirements.sha256`. Đây là tóm lược phục vụ #128. Các mẫu liên kết như `Milestone-Rubric.md` chưa có cùng thư mục; không suy diễn nội dung mẫu.

- Học phần Quản Trị Dự Án Phần Mềm, Khoa Khoa học Máy tính — VKU; TS. Nguyễn Thanh Tuấn. Theo hồ sơ đã nhận: lớp (5), nhóm 02.
- Đồ án chiếm **50% tổng điểm học phần**. Bốn trọng số dưới đây chỉ tính trên điểm đồ án.
- Mục 7: **kế hoạch 30%, phương pháp luận 20%, thực thi 30%, trình bày/demo/Q&A 20%**, thang 10.
- Cổng chân thực Pass/Fail: repo có lịch sử liên tục 15 tuần, sản phẩm cloud HTTPS/APK, stakeholder thật và một biến cố quản lý đã giải quyết. Nếu không đạt, điểm đồ án bị khống chế tối đa 5.0/10.
- Mục 8: **16 phút = 6 phút slide (8–10 trang) + 5 phút Live Demo + 5 phút Q&A**. Không cộng phần demo/hỏi đáp ngoài 16 phút.
- Slide phản ánh Pathway/thành viên/vai trò, Business Case, kiến trúc/WBS, Velocity/Burndown/PR Throughput, biến cố quản lý, UAT và bài học.
- Mục 4 yêu cầu GitHub Board Backlog/Ready/In Progress/In Review/Done, Burndown, assignee/milestone, Conventional Commits, PR có tự kiểm thử và ít nhất một người khác duyệt, CI và Branch Protection cho main.

## Gói nộp qua một thư mục Google Drive

| Đầu ra chính thức                       | Trạng thái hồ sơ đã cung cấp                                           |
| --------------------------------------- | ---------------------------------------------------------------------- |
| `01_Final_Technical_Report.pdf`         | Có DOCX bảy chương; rà soát số liệu và xuất PDF 15–25 trang            |
| `02_Project_Charter_Signed.pdf`         | Có DOCX 13 mục; vẫn ghi Draft, chữ ký/ngày xác nhận trống              |
| `03_WBS_and_WBS_Dictionary.pdf`         | Có DOCX 11 nhánh/36 gói; cần chốt baseline và xuất PDF                 |
| `04_Risk_Register_Evolution.xlsx`       | Có XLSX chín rủi ro; đợt 1 còn trống                                   |
| `05_Sprint_Retrospectives.pdf`          | Có DOCX; ngày/người dự họp chưa xác nhận                               |
| `06_Scope_Change_Control_Record.pdf`    | Có DOCX CR-01–04; phê duyệt còn trống                                  |
| `07_Stakeholder_Acceptance_Signoff.pdf` | Có DOCX UAT-01–12; kết quả/quyết định/chữ ký chưa điền                 |
| `08_Presentation_Slide_Deck.pdf`        | Có PDF cũ tám trang; bản cập nhật trong repo có 10 trang và lịch 6+5+5 |

Nhóm nộp một lần qua một đại diện. Drive cần quyền **Anyone with the link can view**. Task này chưa upload hoặc đổi quyền thư mục nào. Loại bỏ secret/dữ liệu riêng tư trước khi nhóm xuất gói; không đưa `.env`, mật khẩu hay token vào hồ sơ công khai.

Chi tiết đối chiếu và các điểm lệch giữa tài liệu nằm trong `supplied-evidence.md`. Giữ nguyên các bản gốc ngoài repo. “Chưa xác nhận” là giới hạn bằng chứng, không tự kết luận hoạt động chưa từng diễn ra.
