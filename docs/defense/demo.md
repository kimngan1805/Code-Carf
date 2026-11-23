# Kịch bản bảo vệ — đúng 6 + 5 + 5 phút

Theo mục 8 `Project-Guidelines.md`, toàn bộ buổi bảo vệ có **16 phút**, gồm 6 phút slide, 5 phút Live Demo và 5 phút Q&A. Đây là kịch bản đã chuẩn bị, không phải biên bản diễn tập, UAT hay buổi bảo vệ đã diễn ra.

## Phút 0–6: thuyết trình 10 slide

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

## Phút 6–11: Live Demo 5 phút

| Khoảng trong phần demo | Thao tác                                                        | Điều cần chứng minh                                                        |
| ---------------------- | --------------------------------------------------------------- | -------------------------------------------------------------------------- |
| 0:00–0:40              | Mở https://code-carf.onrender.com, đăng nhập học viên           | URL đã có trong hồ sơ; cần nhóm kiểm chứng core workflow trước buổi bảo vệ |
| 0:40–1:30              | Chọn Path trong danh mục, mở chi tiết và đăng ký                | Luồng trong scope, nội dung đã publish và đăng ký không tạo trùng          |
| 1:30–2:20              | Mở Room đầu và URL trực tiếp của Room sau đang khóa             | Server kiểm tra đăng ký và tiến độ, không chỉ khóa nút UI                  |
| 2:20–3:35              | Mở bài CODE, chọn ngôn ngữ, lưu nháp và nộp                     | Editor, trạng thái nộp và kết quả; nêu rõ đang dùng Judge0 hay mock        |
| 3:35–4:25              | Mở cuộc thi đã chuẩn bị, xem đồng hồ/kết quả theo cấu hình thật | Core workflow cuộc thi; nói rõ mock không chạy code thực                   |
| 4:25–5:00              | Tóm tắt luồng; chuyển quyền hỏi cho Hội đồng                    | Dừng demo ở phút 11, không chiếm phần Q&A                                  |

Mock không chạy code thật và không tự chứng minh bài làm đúng. Không sửa DB giữa demo để giả lập hoàn thành hoặc vượt giới hạn report. Muốn chứng minh chấm code thật cần Judge0 đã chạy thử trước. Bản local là dự phòng, không tự thay điều kiện cloud HTTPS của Cổng chân thực. Charter/CR-03 đã cung cấp ghi F11 ngoài scope bàn giao; chỉ demo tìm kiếm/report như phần bổ sung nếu nhóm xác nhận, không thay luồng chính.

## Phút 11–16: phản biện và hỏi đáp

Để Hội đồng dẫn dắt; các câu dưới là chuẩn bị, không phải danh sách câu hỏi đã diễn ra:

| Câu hỏi có thể gặp                            | Căn cứ trả lời                                                                                    |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Vì sao tách service và repository?            | Service giữ kiểm quyền/logic, repository giữ truy vấn; chỉ đúng một luồng code và test            |
| Người dùng gõ URL Room khóa thì sao?          | Mở `canAccessRoom` và test, không chỉ trình bày trạng thái nút                                    |
| Mock có chấm đúng code không?                 | Không; chỉ mô phỏng tích hợp. Phân biệt với adapter Judge0                                        |
| Nhóm đã dùng Scrum và đạt Velocity bao nhiêu? | Chỉ trả lời khi có kế hoạch, Sprint, Story Point và Retro thật; PR throughput không phải Velocity |
| Stakeholder đã nghiệm thu chưa?               | Mở sign-off/email thật nếu đã được cung cấp; nếu chưa, nói rõ chưa xác nhận                       |
| Scope Change đã được xử lý như thế nào?       | Chỉ dùng hồ sơ CR/CCB thật; không tự đổi tên một bug kỹ thuật thành Approved CR                   |

## Chuẩn bị và dự phòng

1. Chốt commit demo; đối chiếu `evidence.json`. Kiểm tra URL HTTPS trước buổi bảo vệ, không chỉ dựa vào file cấu hình deploy.
2. Bật Docker và chạy `docker compose up -d db`, `npm run db:deploy`, `npx prisma generate`; chạy `npm run dev` hoặc build/start. Không xóa volume/reset DB để chữa lỗi demo.
3. Chuẩn bị dữ liệu sạch bằng seed trước buổi diễn tập; seed có thể đổi lịch contest nên không chạy giữa lượt thi. Tài khoản/mật khẩu và `.env` không đưa vào slide/video công khai.
4. Chuẩn bị hai browser profile nếu cần học viên/giáo viên. Monaco tải chậm thì dùng Editor đơn giản hiện có.
5. Nếu mất mạng, dùng local và slide PDF; nói rõ đây là fallback. Nếu DB không lên sau 30 giây, dùng video thật đã quay trước hoặc mở code/test để giải thích giới hạn. **Video backup hiện chưa được cung cấp.**
6. Giới hạn report 5 phút là hành vi đúng; dùng bài khác đã chuẩn bị hoặc trình bày thông báo, không xóa report để vượt giới hạn.
7. Nhóm cần diễn tập đủ 6+5+5, điền Rubric và rà soát trước khi nộp. Chưa có bằng chứng diễn tập hay xác nhận nhóm trong bộ này.
