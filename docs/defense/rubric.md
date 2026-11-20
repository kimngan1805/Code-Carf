# Tự đánh giá theo Rubric chính thức

Nguồn: mục 7 `Project-Guidelines.md`. Hồ sơ nhóm đã được đọc từ `bangchung`; xem `supplied-evidence.md` và hash nguồn trong `evidence.json`. Đồ án trên thang 10, chiếm 50% điểm học phần.

## Cổng chân thực — Pass/Fail, chưa xác nhận đạt

| Điều kiện                                            | Bằng chứng đã có                                                                         | Còn cần xác nhận                                                                                               |
| ---------------------------------------------------- | ---------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Repo thật, commit liên tục 15 tuần từ các thành viên | GitHub và PR có thật; author date quan sát trên main 05/10–18/11/2026                    | Chưa chứng minh đủ 15 tuần; risk R01 và báo cáo có mốc lịch sử khác nhau                                       |
| Sản phẩm cloud HTTPS hoặc APK                        | Charter/UAT/PDF đã ghi `https://code-carf.onrender.com`; có cấu hình deploy và bản local | Lần thẩm định HTTPS bị timeout; nhóm cần kiểm tra URL và core workflow. Không kết luận website ngừng hoạt động |
| Stakeholder thật, có nghiệm thu                      | Charter nêu TS. Nguyễn Thanh Tuấn và sinh viên dùng thử; đã có kịch bản UAT-01–12        | Ngày/commit/kết quả/người nghiệm thu/quyết định/chữ ký chưa điền; chưa có sign-off                             |
| Một biến cố quản lý đã được giải quyết               | Hồ sơ đã có CR-01–04, cắt scope CR-03 và bảng rủi ro                                     | Quyết định/người duyệt/ngày duyệt còn trống; chưa đủ để gọi Approved CR                                        |

Chưa đủ cơ sở tự xác nhận Pass; đây không phải kết luận Hội đồng đã đánh Fail. **Nếu Cổng chân thực không đạt, hướng dẫn giới hạn điểm đồ án tối đa 5.0/10.**

## Điểm tự đánh giá đề xuất để nhóm rà soát

Các điểm dưới là **nhận định tạm thời của người soạn dựa trên bộ hồ sơ đã đọc**, không phải điểm Hội đồng, dự báo kết quả hay xác nhận của cả nhóm. Hướng dẫn chỉ quy định thành phần/trọng số, không có mô tả mức điểm chi tiết; không coi các mức đề xuất là thang chấm chính thức.

| Thành phần                            | Trọng số | Tối đa   | Đề xuất tạm | Căn cứ và phần cần bổ sung                                                                                                                                                                    |
| ------------------------------------- | -------- | -------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Tính đầy đủ & khả thi của kế hoạch | 30%      | 3.0      | **1.8**     | Đã có Charter, WBS 11/36 và risk register. Charter vẫn Draft, SMART còn trống; rủi ro đợt 1 chưa có ngày/người cập nhật; cần chốt baseline và xác nhận                                        |
| 2. Sự phù hợp phương pháp luận        | 20%      | 2.0      | **1.2**     | Báo cáo giải thích Hybrid; Retro có 4Ls/bài học. Ngày, chủ trì, người dự và xác nhận họp còn trống; cần bằng chứng nhịp làm việc thực tế                                                      |
| 3. Bằng chứng thực thi thực tế        | 30%      | 3.0      | **1.8**     | Có PR/CI, 704 test/87 file local, snapshot GitHub và số liệu SP/Burndown trong PDF cũ. Cần đối chiếu nguồn board, commit 15 tuần, peer approval, CR đã duyệt; main chưa bật Branch Protection |
| 4. Thuyết trình, Live Demo & Q&A      | 20%      | 2.0      | **0.8**     | Có slide, demo plan, PDF offline và lịch 6+5+5. Chưa có diễn tập, kiểm chứng cloud/core workflow, video backup hoặc phản biện thực tế; đây chỉ là đánh giá mức chuẩn bị                       |
| **Tổng đề xuất trước Cổng chân thực** | **100%** | **10.0** | **5.6**     | **Chưa được nhóm xác nhận; cần cập nhật sau khi bổ sung hồ sơ và diễn tập**                                                                                                                   |

Không áp trọng số lần nữa vào các số đã tính trên mức tối đa 3–2–3–2. Nếu nhóm chấm bốn thành phần riêng trên thang 10 thì dùng `0.30 × kế hoạch + 0.20 × phương pháp + 0.30 × thực thi + 0.20 × trình bày`. Chỉ áp trần 5.0 khi Cổng chân thực được đánh giá **không đạt**, không tự áp vì một lần probe timeout hoặc chưa nhận hồ sơ xác nhận.

## Việc cần nhóm hoàn thiện

1. Xác nhận cách mô tả Pathway 1 và đề tài/học phần song hành; thông tin thành viên/vai trò đã có từ Charter.
2. Ký/chốt Charter; điền đợt rủi ro, thông tin họp Retro và phê duyệt CR bằng ngày/người thật.
3. Đối chiếu CR-03 với F11/F10-3 đã merge; đồng bộ Charter/WBS/backlog/UAT, không âm thầm đổi baseline.
4. Hoàn tất UAT trên URL thật, lấy sign-off stakeholder; xuất đúng các file 01–08.
5. Rà điểm đề xuất, diễn tập 6+5+5 với Nhi và xác nhận bản cuối. #128 vẫn mở cho tới khi nhóm rà soát.
