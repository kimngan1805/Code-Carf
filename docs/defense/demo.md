# Kịch bản demo và phương án dự phòng

Đây là kịch bản đã chuẩn bị, chưa phải biên bản buổi bảo vệ/UAT đã diễn ra. Toàn bộ lịch nói của 10 slide là 16 phút; phần thao tác nằm trong 2 phút 30 giây của slide 5. Người trình bày từng slide cần được nhóm phân công trước khi nộp.

## Chuẩn bị trước buổi bảo vệ

1. Ghi commit đang dùng bằng `git rev-parse HEAD`, đối chiếu `evidence.json`; kiểm tra lại nếu code đã đổi.
2. Bật Docker, chạy `docker compose up -d db`, `npm run db:deploy`, `npx prisma generate`. Không xóa volume hoặc reset database để sửa lỗi demo.
3. Chuẩn bị dữ liệu local bằng `npm run db:seed` khi cần. Seed có thể thay đổi lịch thi/demo nên chỉ chạy trước buổi diễn tập, không chạy giữa một lượt thi đang làm.
4. Chạy `npm run dev` hoặc `npm run build` rồi `npm start`. Mở hai browser profile cho học viên và giáo viên; chuẩn bị sẵn tài khoản seed. Mật khẩu nằm ngoài slide, không đưa `.env`/token vào video.
5. Với `GRADER_ADAPTER=mock`, nói rõ hệ thống chỉ mô phỏng kết quả tích hợp, không thực thi code. Muốn chứng minh chấm code thật cần Judge0 hoạt động và chạy thử trước.
6. Quay video thao tác thực tế, lưu ngoài Git nếu có dữ liệu người dùng. Chưa có video nào được ghi nhận trong bộ này; không coi dòng hướng dẫn này là video đã tồn tại.

## Slide 5 — thao tác 2 phút 30 giây

| Khoảng thời gian | Thao tác                                                                   | Điều cần chứng minh                                                             |
| ---------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| 0:00–0:25        | Đăng nhập học viên, mở tìm kiếm ở header                                   | Đúng vai trò, có tìm kiếm thật                                                  |
| 0:25–0:50        | Tìm tên Path đã seed, mở chi tiết và đăng ký                               | Chỉ nội dung publish; đăng ký không tạo bản ghi trùng                           |
| 0:50–1:15        | Mở Room đầu; mở trực tiếp URL Room sau đang khóa                           | Server giữ điều kiện đăng ký và tiến độ                                         |
| 1:15–1:50        | Mở một bài CODE, dùng editor đơn giản nếu Monaco tải chậm; lưu nháp và nộp | Bản nháp được giữ; nút nộp và trạng thái phản hồi hoạt động; nêu rõ mock/Judge0 |
| 1:50–2:15        | Gửi báo lỗi có loại lỗi và mô tả; gửi lại cùng bài                         | Thành công lần đầu và giới hạn chống gửi liên tục                               |
| 2:15–2:30        | Quay về slide và nêu giới hạn                                              | Không lẫn phần đang làm của Teacher/thông báo với tính năng đã có               |

Không cố hoàn thành Room bằng adapter mock nếu chưa biết chính xác kết quả trả về. Dùng bản ghi/test được kiểm chứng để giải thích quy tắc mở khóa; không sửa tiến độ trực tiếp trong DB giữa demo để giả lập hoàn thành.

## Dự phòng theo tình huống

| Tình huống                       | Cách xử lý đã chuẩn bị                                               | Không tuyên bố                               |
| -------------------------------- | -------------------------------------------------------------------- | -------------------------------------------- |
| Mất Internet / site deploy chậm  | Mở bản local và slide HTML/PDF; dùng video thật nếu đã quay trước    | Bản deploy đã chạy ổn định nếu chưa kiểm tra |
| Docker/DB không lên sau 30 giây  | Chuyển sang video đã chuẩn bị; mở code và test cho cơ chế quyền/khóa | Video/screenshot chưa có là bằng chứng đã có |
| Judge0 không sẵn sàng            | Demo mock và nói rõ giới hạn; mở test adapter                        | Mock đã thực thi/chấm đúng code              |
| Monaco tải CDN chậm              | Dùng nút Editor đơn giản hiện có                                     | Mất dữ liệu bản nháp khi chưa kiểm tra       |
| Tìm không có kết quả             | Dùng tên Path thật trong seed; trình bày empty state nếu phù hợp     | Gõ tên không tồn tại rồi nói search hỏng     |
| Form báo lỗi báo giới hạn 5 phút | Dùng bài khác đã chuẩn bị hoặc trình bày đây là hành vi đúng         | Xóa report thật để vượt giới hạn giữa demo   |

Trước khi nộp #128, nhóm cần chạy thử trọn 16 phút, hoàn tất Rubric và xác nhận bộ bằng chứng. Chưa có bằng chứng diễn tập hay xác nhận của nhóm trong bản chuẩn bị này.
