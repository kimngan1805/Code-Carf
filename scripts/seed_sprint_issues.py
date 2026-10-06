#!/usr/bin/env python3
"""
Tạo Epic (F1..F12) + Task con trên GitHub Issues và đưa vào GitHub Project.
Mỗi task có: user story, mô tả, tiêu chí chấp nhận kiểm chứng được, cách kiểm thử,
phụ thuộc, ước lượng (SP), mức ưu tiên, ngày bắt đầu/dự kiến xong, Definition of Done.

NGÀY THÁNG: Có thể bỏ qua khi chưa chốt lịch. Nếu nhập, cần đủ bốn mốc
ngày thật của hai sprint. Script không tự bịa mốc nào.

  gh auth login && gh auth refresh -s project
  python3 seed_sprint_issues.py --repo OWNER/REPO --owner OWNER --project N \
      --dry-run
Bổ sung bốn tham số ngày --s1-start/--s1-end/--s2-start/--s2-end khi đã chốt lịch.
Bỏ --dry-run để tạo thật. Chạy lại an toàn: issue trùng tiêu đề bị bỏ qua.
"""
import argparse
import datetime as dt
import json
import math
import subprocess
import sys
import time

DOD = [
    "Code đã merge qua Pull Request, có ít nhất 1 người khác review",
    "CI xanh (lint, typecheck, test, build)",
    "Có test tự động cho logic chính của task",
    "Commit theo Conventional Commits, chia nhỏ theo bước, không gộp 1 commit lớn",
    "Đã tự chạy thử bằng tay trên môi trường dev, đúng với từng tiêu chí chấp nhận",
    "Không hardcode secret; cập nhật .env.example và README nếu đổi cấu hình",
]

# Task = (tiêu đề, user story, mô tả, [tiêu chí], cách kiểm thử, [phụ thuộc], SP, ưu tiên)
FLOWS = [
    {"id": "F1", "sprint": 1, "title": "Đăng nhập, đăng ký, phân quyền 4 role",
     "summary": "Người dùng đăng ký/đăng nhập được và hệ thống phân biệt đúng Student, Teacher, Admin, Grader.",
     "tasks": [
        ("Schema User/Role và seed tài khoản mẫu",
         "Là thành viên nhóm phát triển, tôi muốn có sẵn schema người dùng và dữ liệu mẫu để mọi người dev trên cùng một nền.",
         "Thiết kế bảng User, Role trong Prisma; tạo migration và seed.",
         ["Migration chạy sạch trên DB trống bằng 1 lệnh",
          "Seed tạo đủ 4 tài khoản mẫu, mỗi role một tài khoản",
          "Mật khẩu lưu dạng băm, không có plaintext trong DB",
          "Email là duy nhất (ràng buộc ở DB, không chỉ ở code)"],
         "Chạy migrate + seed trên DB mới; truy vấn kiểm tra 4 user; unit test hàm tạo user.",
         [], 2, "P0"),
        ("Đăng ký và đăng nhập (Auth.js Credentials, JWT)",
         "Là người dùng, tôi muốn đăng ký và đăng nhập để vào đúng khu vực theo vai trò của mình.",
         "Form đăng ký/đăng nhập; session dùng JWT; role nằm trong token.",
         ["Email sai định dạng hoặc mật khẩu dưới 8 ký tự bị từ chối kèm thông báo rõ (validate bằng zod)",
          "Đăng ký email đã tồn tại trả lỗi, không tạo bản ghi mới",
          "Đăng nhập sai chỉ báo chung 'sai thông tin', không lộ email có tồn tại hay không",
          "Sau đăng nhập, token chứa role đúng; đăng xuất xóa session"],
         "Test API đăng ký/đăng nhập các trường hợp đúng/sai; thử tay trên trình duyệt.",
         ["F1-1"], 5, "P0"),
        ("Middleware chặn route theo role",
         "Là quản trị hệ thống, tôi muốn người dùng chỉ vào được khu vực đúng vai trò để dữ liệu không bị truy cập trái phép.",
         "Chặn các route group student, teacher, grader, admin theo role.",
         ["Chưa đăng nhập vào route bảo vệ thì chuyển về /login",
          "Student mở URL trang admin nhận 403 hoặc bị chuyển hướng",
          "Mỗi route group có ít nhất 1 test cho trường hợp đúng và sai role",
          "Bám đúng quy ước middleware của bản Next.js đang cài"],
         "Test tự động theo ma trận role x route; thử tay bằng 4 tài khoản seed.",
         ["F1-2"], 3, "P0"),
        ("Kiểm tra quyền ở service layer",
         "Là quản trị hệ thống, tôi muốn quyền được kiểm tra thêm ở tầng nghiệp vụ để lỗi ở middleware không làm lộ dữ liệu.",
         "Helper requireRole dùng trong service; role luôn lấy từ session phía server.",
         ["Gọi API trực tiếp bằng tài khoản sai role trả 403",
          "Không có chỗ nào tin role do client gửi lên",
          "Có test cho ít nhất 3 trường hợp sai quyền"],
         "Test gọi trực tiếp route handler với token từng role.",
         ["F1-2"], 3, "P0"),
     ]},
    {"id": "F2", "sprint": 1, "title": "Teacher tạo Path, Room, bài tập, test case",
     "summary": "Người tạo nội dung xây được lộ trình học hoàn chỉnh kèm độ khó và XP.",
     "tasks": [
        ("CRUD Path",
         "Là Teacher, tôi muốn tạo và quản lý lộ trình học để sắp xếp nội dung theo chủ đề.",
         "Tạo, sửa, xóa mềm, publish/unpublish Path.",
         ["Chỉ chủ sở hữu hoặc Admin sửa/xóa được (người khác nhận 403)",
          "Tên Path bắt buộc, dài tối đa 100 ký tự, báo lỗi rõ",
          "Xóa là xóa mềm, dữ liệu học viên đã học không mất",
          "Danh sách có phân trang"],
         "Test service theo từng role; thử tay tạo, sửa, xóa, publish.",
         ["F1-4"], 3, "P0"),
        ("CRUD Room trong Path",
         "Là Teacher, tôi muốn thêm Room có lý thuyết và sắp xếp thứ tự để học viên học từ dễ đến khó.",
         "Room gồm lý thuyết markdown, thứ tự, cờ bật/tắt mở khóa tuần tự.",
         ["Đổi thứ tự Room được lưu đúng sau khi tải lại",
          "Cờ mở khóa tuần tự lưu đúng theo Path",
          "Markdown chứa thẻ <script> không thực thi khi hiển thị (có test XSS)",
          "Xóa một Room không làm sai thứ tự các Room còn lại"],
         "Test XSS với chuỗi độc; test sắp xếp lại thứ tự.",
         ["F2-1"], 5, "P0"),
        ("CRUD bài tập và bộ test case",
         "Là Teacher, tôi muốn tạo bài tập kèm test case để hệ thống chấm tự động.",
         "Mỗi bài có nhiều test case; gán độ khó và XP.",
         ["Test case có input, expected output và cờ ẩn/hiện",
          "Bài có giới hạn thời gian (ms) và bộ nhớ (MB)",
          "Không lưu được bài tập chưa có test case nào",
          "Độ khó và XP bắt buộc, XP là số nguyên dương"],
         "Test validate; thử tay tạo bài có test ẩn và hiện.",
         ["F2-2"], 5, "P0"),
        ("Xem trước Room như học viên",
         "Là Teacher, tôi muốn xem Room giống học viên thấy trước khi publish để phát hiện lỗi sớm.",
         "Chế độ preview và trạng thái draft/published.",
         ["Preview hiển thị giống giao diện học viên",
          "Nội dung draft học viên không truy cập được, kể cả bằng URL trực tiếp (có test)",
          "Publish và unpublish có hiệu lực ngay"],
         "Test truy cập draft bằng tài khoản Student.",
         ["F2-2"], 2, "P1"),
     ]},
    {"id": "F3", "sprint": 1, "title": "Student xem Path và mở khóa Room tuần tự",
     "summary": "Học viên chọn lộ trình, học đúng trình tự; Room sau chỉ mở khi hoàn thành Room trước.",
     "tasks": [
        ("Danh sách Path và chi tiết Path",
         "Là học viên, tôi muốn xem và đăng ký lộ trình để bắt đầu học theo mục tiêu.",
         "Trang liệt kê Path đã publish, đăng ký học, hiển thị tiến độ.",
         ["Chỉ hiện Path đã publish",
          "Đăng ký một Path hai lần không tạo bản ghi trùng",
          "Phần trăm tiến độ khớp với số Room đã hoàn thành",
          "Dùng được trên màn hình điện thoại 375px"],
         "Test service; kiểm tra tay trên giả lập điện thoại.",
         ["F2-1"], 3, "P0"),
        ("Logic mở khóa Room tuần tự",
         "Là học viên, tôi muốn học theo đúng trình tự để không bỏ sót kiến thức nền.",
         "Room đầu mở sẵn; Room n mở khi Room n-1 hoàn thành.",
         ["Vào thẳng URL Room đang khóa bị server chặn",
          "Path tắt mở khóa tuần tự thì mọi Room đều mở",
          "Hoàn thành Room n thì Room n+1 mở ngay",
          "Có test cho 3 trường hợp: khóa, mở, tắt khóa tuần tự"],
         "Test service mở khóa; thử tay vào URL Room khóa.",
         ["F2-2", "F3-1"], 5, "P0"),
        ("Trang Room cho học viên",
         "Là học viên, tôi muốn thấy lý thuyết và trạng thái từng bài để biết mình đang ở đâu.",
         "Hiển thị lý thuyết, danh sách bài tập, trạng thái từng bài.",
         ["Mỗi bài hiện một trạng thái: chưa làm, đã nộp, đạt",
          "Room khóa hiện rõ lý do khóa",
          "Có trạng thái loading và trạng thái lỗi"],
         "Kiểm tra tay với dữ liệu seed ở cả 3 trạng thái.",
         ["F3-2"], 3, "P1"),
     ]},
    {"id": "F4", "sprint": 1, "title": "Student làm bài: editor, nộp, chấm, cộng XP",
     "summary": "Học viên code trên web, nộp và được chấm ngay; đạt thì cộng XP và mở Room kế tiếp.",
     "tasks": [
        ("Adapter chấm điểm (interface, mock, Judge0)",
         "Là thành viên nhóm, tôi muốn có một lớp chấm trừu tượng để dev không cần Judge0 mà vẫn chạy được toàn bộ luồng.",
         "Interface chấm chung; bản mock cho local; bản Judge0 chọn bằng biến môi trường.",
         ["Đổi giữa mock và Judge0 chỉ bằng biến môi trường, không sửa code",
          "Lỗi biên dịch và quá thời gian trả thông báo dễ hiểu",
          "Chạy được local khi không có Judge0",
          "Có unit test cho adapter mock"],
         "Unit test adapter; chạy app với từng chế độ.",
         [], 5, "P0"),
        ("Giao diện editor Monaco và nút nộp bài",
         "Là học viên, tôi muốn viết code ngay trên web và nộp một lần bấm.",
         "Chọn ngôn ngữ, code mẫu khởi tạo, nộp bài.",
         ["Chọn được ngôn ngữ và có code mẫu ban đầu",
          "Nút nộp bị vô hiệu khi đang chấm, không nộp trùng khi bấm nhanh",
          "Hiển thị trạng thái đang chấm",
          "Tải lại trang không mất code đang viết"],
         "Thử tay bấm nộp liên tiếp và tải lại trang.",
         ["F3-3"], 5, "P0"),
        ("API nộp bài và chạy từng test case",
         "Là học viên, tôi muốn biết bài đúng hay sai ở test nào để sửa.",
         "Lưu Submission, chạy toàn bộ test case, trả kết quả.",
         ["Submission có trạng thái pending, running, done",
          "Test case ẩn không lộ input hay expected cho học viên (có test)",
          "Giới hạn số lần nộp theo thời gian (ví dụ 10 lần mỗi phút)",
          "Kết quả từng test: đúng, sai, quá giờ, lỗi chạy"],
         "Test service với adapter mock; test giới hạn tần suất.",
         ["F4-1", "F2-3"], 8, "P0"),
        ("Hoàn thành Room, cộng XP, mở Room kế",
         "Là học viên, tôi muốn nhận XP và mở Room tiếp theo khi đạt bài.",
         "Cập nhật tiến độ khi đạt toàn bộ bài của Room.",
         ["XP chỉ cộng đúng 1 lần cho mỗi bài, nộp lại không cộng trùng (có test)",
          "Cập nhật tiến độ và XP trong một transaction",
          "Room kế tiếp mở ngay sau khi hoàn thành",
          "Level cập nhật đúng sau khi cộng XP"],
         "Test nộp đạt hai lần liên tiếp, kiểm tra XP; test lỗi giữa transaction.",
         ["F4-3", "F3-2"], 5, "P0"),
        ("Lịch sử nộp bài",
         "Là học viên, tôi muốn xem lại các lần nộp để rút kinh nghiệm.",
         "Danh sách và chi tiết các lần nộp của bản thân.",
         ["Xem được code đã nộp, kết quả và thời gian nộp",
          "Chỉ xem được bài của chính mình, mở bài người khác nhận 403 (có test)",
          "Có phân trang"],
         "Test truy cập chéo giữa hai học viên.",
         ["F4-3"], 2, "P1"),
     ]},
    {"id": "F5", "sprint": 2, "title": "Profile: level, streak, huy hiệu",
     "summary": "Cơ chế tạo động lực: cấp độ, chuỗi ngày học, huy hiệu và trang cá nhân.",
     "tasks": [
        ("Công thức level và ngưỡng XP",
         "Là học viên, tôi muốn thấy cấp độ của mình tăng theo XP để có động lực học.",
         "Cấp: Người mới, Người học việc, Lập trình viên, Cao thủ.",
         ["Ngưỡng cấp nằm trong một file cấu hình duy nhất",
          "Hàm tính level là hàm thuần, có unit test cả giá trị biên",
          "Lên cấp được ghi nhận đúng thời điểm"],
         "Unit test các mốc XP biên.",
         ["F4-4"], 2, "P1"),
        ("Chuỗi ngày học liên tục (streak)",
         "Là học viên, tôi muốn có chuỗi ngày học để duy trì thói quen.",
         "Tính chuỗi theo múi giờ Việt Nam.",
         ["Ngày tính theo múi giờ Asia/Ho_Chi_Minh",
          "Học nhiều lần trong một ngày chỉ tăng chuỗi 1 lần",
          "Bỏ qua một ngày thì chuỗi về 0",
          "Có test cho trường hợp học sát nửa đêm"],
         "Unit test với các mốc thời gian giả lập.",
         ["F4-4"], 3, "P1"),
        ("Huy hiệu và trang cá nhân",
         "Là học viên, tôi muốn xem thành tích của mình ở một nơi.",
         "Cấp huy hiệu theo mốc và hiển thị profile.",
         ["Mỗi huy hiệu chỉ cấp 1 lần cho mỗi người",
          "Có huy hiệu hoàn thành Path và đứng đầu bảng xếp hạng tuần",
          "Profile hiện Path đang học, level, huy hiệu, lịch sử làm bài",
          "Người khác xem profile không thấy thông tin riêng tư"],
         "Test cấp huy hiệu hai lần; kiểm tra tay trang profile.",
         ["F5-1", "F4-5"], 5, "P2"),
     ]},
    {"id": "F6", "sprint": 2, "title": "Admin: quản lý user, nội dung, giám sát hệ thống",
     "summary": "Admin kiểm soát người dùng, nội dung và theo dõi tình trạng hệ thống.",
     "tasks": [
        ("Quản lý người dùng",
         "Là Admin, tôi muốn quản lý tài khoản để kiểm soát ai được làm gì.",
         "Tìm kiếm, đổi role, khóa/mở tài khoản.",
         ["Không tự hạ quyền chính mình và không xóa Admin cuối cùng",
          "Tài khoản bị khóa không đăng nhập được",
          "Mỗi lần đổi role được ghi log: ai, lúc nào, từ role nào sang role nào",
          "Có phân trang và tìm kiếm theo email"],
         "Test các ràng buộc Admin cuối cùng; test đăng nhập tài khoản bị khóa.",
         ["F1-4"], 5, "P0"),
        ("Quản lý nội dung",
         "Là Admin, tôi muốn ẩn nội dung vi phạm mà không làm mất dữ liệu.",
         "Xem, ẩn, gỡ Path/Room.",
         ["Admin ẩn được Path của bất kỳ Teacher",
          "Nội dung bị ẩn học viên không thấy nhưng dữ liệu còn nguyên",
          "Hành động ẩn/gỡ được ghi log"],
         "Test ẩn rồi truy cập bằng Student.",
         ["F2-1"], 3, "P1"),
        ("Giám sát hệ thống",
         "Là Admin, tôi muốn thấy số liệu tổng quan để phát hiện sự cố sớm.",
         "Trang tổng quan và health check.",
         ["Hiện số user, số lượt nộp bài, số contest đang diễn ra",
          "Hiện trạng thái dịch vụ chấm code (hoạt động hay không)",
          "Có endpoint /api/health trả 200 khi hệ thống ổn"],
         "Gọi health check khi tắt thử dịch vụ chấm.",
         ["F4-1"], 3, "P1"),
     ]},
    {"id": "F7", "sprint": 2, "title": "Contest: tạo cuộc thi, gán Grader, thi có đồng hồ",
     "summary": "Teacher tạo cuộc thi, Admin gán Grader rồi mới được public, thí sinh thi trong thời gian giới hạn.",
     "tasks": [
        ("Teacher tạo cuộc thi",
         "Là Teacher, tôi muốn tạo cuộc thi với đề và thời gian riêng để tổ chức kỳ thi.",
         "Contest gồm danh sách đề, giờ bắt đầu/kết thúc, thời lượng làm bài.",
         ["Mỗi đề chọn được loại: code hoặc viết tay",
          "Giờ kết thúc phải sau giờ bắt đầu, báo lỗi rõ",
          "Contest ở trạng thái draft cho tới khi publish",
          "Chỉ chủ contest và Admin sửa được"],
         "Test validate thời gian; test quyền sửa.",
         ["F2-3"], 5, "P0"),
        ("Admin gán Grader và publish",
         "Là Admin, tôi muốn gán Grader cho từng contest trước khi public để bài thi luôn có người chấm.",
         "Bảng ContestGrader; điều kiện publish.",
         ["Không publish được nếu chưa gán Grader nào (có test)",
          "Quan hệ Grader-Contest lưu đúng ở bảng ContestGrader",
          "Grader chỉ thấy các contest được gán cho mình",
          "Gỡ Grader khi contest đang diễn ra bị chặn hoặc có cảnh báo"],
         "Test điều kiện publish; test Grader truy cập contest không được gán.",
         ["F7-1", "F1-4"], 5, "P0"),
        ("Thí sinh đăng ký và vào thi có đồng hồ",
         "Là thí sinh, tôi muốn làm bài trong thời gian giới hạn công bằng với mọi người.",
         "Màn hình làm bài có đếm ngược theo giờ server.",
         ["Đồng hồ tính từ mốc của server, đổi giờ máy không ảnh hưởng",
          "Tải lại trang không làm đồng hồ chạy lại từ đầu",
          "Hết giờ thì chặn nộp bài mới; bài đang làm được tự nộp",
          "Không vào được trước giờ bắt đầu hoặc sau giờ kết thúc"],
         "Test với giờ giả lập; thử tay đổi giờ máy.",
         ["F7-2", "F4-3"], 8, "P0"),
        ("Chốt kết quả và xuất báo cáo",
         "Là Teacher, tôi muốn xuất bảng điểm sau kỳ thi để lưu và công bố.",
         "Chốt điểm và xuất CSV.",
         ["Xuất CSV điểm từng thí sinh, từng câu",
          "Chỉ chốt được khi mọi bài viết tay đã được Grader duyệt",
          "Sửa điểm sau khi chốt phải có log"],
         "Test điều kiện chốt; mở file CSV kiểm tra tay.",
         ["F7-3"], 3, "P1"),
     ]},
    {"id": "F8", "sprint": 2, "title": "Bảng xếp hạng realtime",
     "summary": "Xếp hạng cập nhật liên tục trong lúc thi, kèm bảng xếp hạng tổng và theo Path.",
     "tasks": [
        ("Quy tắc tính điểm và xếp hạng",
         "Là thí sinh, tôi muốn thứ hạng được tính rõ ràng và công bằng.",
         "Xếp theo điểm, đồng điểm thì xét thời gian nộp.",
         ["Quy tắc nằm trong một hàm thuần, có unit test",
          "Có test cho trường hợp đồng điểm và đồng cả thời gian",
          "Quy tắc được ghi trong README"],
         "Unit test các trường hợp đồng hạng.",
         ["F4-3"], 3, "P0"),
        ("Giao diện leaderboard realtime",
         "Là thí sinh, tôi muốn thấy thứ hạng cập nhật liên tục trong lúc thi.",
         "Bảng xếp hạng realtime, tổng và theo Path.",
         ["Cập nhật trong vòng 3 giây sau khi có bài nộp mới, không cần tải lại",
          "Có phương án dự phòng (polling) khi kết nối realtime lỗi",
          "Chỉ thí sinh của contest đó xem được bảng xếp hạng contest",
          "Có bảng xếp hạng tổng và theo từng Path"],
         "Mở hai trình duyệt, nộp ở một bên và quan sát bên kia.",
         ["F8-1", "F7-3"], 5, "P1"),
     ]},
    {"id": "F9", "sprint": 2, "title": "Bài viết tay: nộp ảnh, Gemini chấm, Grader duyệt",
     "summary": "Thí sinh chụp ảnh bài viết tay, Gemini Vision chấm sơ bộ theo rubric, Grader duyệt hoặc sửa điểm.",
     "tasks": [
        ("Upload ảnh bài viết tay",
         "Là thí sinh, tôi muốn nộp ảnh bài làm viết tay cho đề dạng giấy.",
         "Upload ảnh cho đề viết tay.",
         ["Chỉ nhận JPG, PNG, WebP và tối đa 5 MB, báo lỗi rõ",
          "Ảnh lưu ở storage riêng tư, không có link công khai",
          "Thí sinh chỉ xem được ảnh của mình (có test)",
          "Nộp lại trước hạn thì thay thế ảnh cũ đúng cách"],
         "Thử upload file sai định dạng và quá dung lượng; test truy cập chéo.",
         ["F7-1"], 5, "P0"),
        ("Gọi Gemini Vision chấm theo rubric",
         "Là Grader, tôi muốn có điểm sơ bộ do AI chấm để tiết kiệm thời gian.",
         "Gửi ảnh và rubric, nhận điểm và nhận xét.",
         ["Kết quả trả về là JSON và được validate trước khi lưu",
          "Có retry và timeout; lỗi thì đánh dấu 'cần chấm tay'",
          "API key chỉ nằm ở server, không xuất hiện ở client",
          "Lưu điểm, nhận xét, mức độ tin cậy; điểm AI luôn đánh dấu là sơ bộ"],
         "Test với phản hồi mẫu và phản hồi lỗi (mock Gemini).",
         ["F9-1"], 8, "P0"),
        ("Grader duyệt và sửa điểm",
         "Là Grader, tôi muốn xem ảnh, điểm AI và chốt điểm cuối cùng.",
         "Giao diện chấm cho Grader.",
         ["Grader chỉ thấy bài của contest được gán (có test)",
          "Sửa điểm lưu lịch sử: ai sửa, điểm cũ, điểm mới",
          "Bài có trạng thái chờ duyệt và đã duyệt",
          "Bài AI có độ tin cậy thấp được ưu tiên hiển thị"],
         "Test quyền Grader; kiểm tra tay lịch sử sửa điểm.",
         ["F9-2", "F7-2"], 5, "P0"),
        ("Hiển thị kết quả bài viết tay cho thí sinh",
         "Là thí sinh, tôi muốn xem điểm và nhận xét sau khi được chấm.",
         "Trang kết quả cho đề viết tay.",
         ["Chỉ hiện điểm sau khi Grader chốt",
          "Nhận xét hiển thị theo từng tiêu chí của rubric"],
         "Kiểm tra tay trước và sau khi Grader chốt.",
         ["F9-3"], 2, "P1"),
     ]},
    {"id": "F10", "sprint": 2, "title": "Anti-cheat: chuyển tab, dán code, log vi phạm",
     "summary": "Phát hiện hành vi bất thường trong lúc thi và cho người tổ chức xem lại.",
     "tasks": [
        ("Ghi nhận sự kiện chuyển tab và dán code",
         "Là ban tổ chức, tôi muốn ghi nhận hành vi bất thường để đảm bảo công bằng.",
         "Client gửi sự kiện lên server khi đang thi.",
         ["Ghi nhận chuyển tab và thao tác dán kèm thời điểm và độ dài nội dung dán",
          "Gửi log lỗi không làm gián đoạn việc làm bài",
          "Giới hạn tần suất gửi sự kiện để chống spam",
          "Chỉ ghi nhận khi contest đang diễn ra"],
         "Thử tay chuyển tab và dán; kiểm tra bản ghi trong DB.",
         ["F7-3"], 5, "P1"),
        ("Cảnh báo thí sinh và ngưỡng vi phạm",
         "Là thí sinh, tôi muốn được báo khi hành vi của mình bị ghi nhận.",
         "Cảnh báo và cấu hình ngưỡng theo contest.",
         ["Hiện cảnh báo rõ khi chuyển tab",
          "Ngưỡng vi phạm do Teacher cấu hình theo từng contest",
          "Vượt ngưỡng thì gắn cờ bài làm, không tự động hủy bài"],
         "Test vượt ngưỡng; kiểm tra tay hiển thị cảnh báo.",
         ["F10-1"], 3, "P2"),
        ("Dashboard vi phạm cho Teacher",
         "Là Teacher, tôi muốn xem lại hành vi bất thường của từng thí sinh.",
         "Danh sách sự kiện theo thí sinh và thời gian.",
         ["Xem được sự kiện theo thí sinh và theo dòng thời gian",
          "Lọc được thí sinh bị gắn cờ",
          "Chỉ chủ contest và Admin xem được"],
         "Test quyền xem; kiểm tra tay bộ lọc.",
         ["F10-2"], 3, "P2"),
     ]},
    {"id": "F11", "sprint": 2, "title": "Báo lỗi đề và thông báo",
     "summary": "Học viên báo lỗi đề, Teacher xử lý, hệ thống gửi thông báo trong app.",
     "tasks": [
        ("Nút báo lỗi đề cho Student",
         "Là học viên, tôi muốn báo đề sai để được sửa.",
         "Báo đề sai, test sai, đề mơ hồ.",
         ["Chọn loại lỗi và nhập mô tả bắt buộc",
          "Không gửi trùng liên tục cùng một bài (giới hạn)",
          "Report gắn đúng bài tập và Room"],
         "Test giới hạn gửi trùng.",
         ["F4-3"], 3, "P2"),
        ("Teacher xử lý report",
         "Là Teacher, tôi muốn xử lý các báo lỗi để cải thiện nội dung.",
         "Danh sách report theo bài do mình tạo.",
         ["Đổi trạng thái: mới, đang xử lý, đã xử lý",
          "Teacher chỉ thấy report của nội dung mình sở hữu (có test)",
          "Học viên nhận thông báo khi report được xử lý"],
         "Test quyền theo chủ sở hữu.",
         ["F11-1"], 3, "P2"),
        ("Thông báo trong app",
         "Là người dùng, tôi muốn được nhắc các việc quan trọng.",
         "Thông báo bài mới, sắp đến giờ thi, có kết quả.",
         ["Hiển thị số thông báo chưa đọc",
          "Đánh dấu đã đọc được",
          "Chỉ gửi cho đúng đối tượng liên quan"],
         "Kiểm tra tay với hai tài khoản.",
         ["F11-2"], 3, "P2"),
     ]},
    {"id": "F12", "sprint": 2, "title": "Thống kê học tập cho Teacher",
     "summary": "Teacher biết bao nhiêu người đang học, kẹt ở Room nào, tỷ lệ pass.",
     "tasks": [
        ("Thống kê học viên theo Path và Room",
         "Là Teacher, tôi muốn biết bao nhiêu người đang học ở từng Room.",
         "Số người đang học và hoàn thành.",
         ["Chỉ thống kê Path của chính Teacher",
          "Số liệu khớp dữ liệu seed đã biết trước",
          "Truy vấn có index phù hợp"],
         "So sánh số liệu với seed mẫu.",
         ["F4-4"], 3, "P2"),
        ("Phân tích điểm nghẽn và tỷ lệ pass",
         "Là Teacher, tôi muốn biết bài nào quá khó để điều chỉnh.",
         "Tỷ lệ pass và số lần nộp trung bình.",
         ["Hiện tỷ lệ pass và số lần nộp trung bình của từng bài",
          "Đánh dấu bài có tỷ lệ pass dưới 30%",
          "Có biểu đồ đơn giản, dễ đọc"],
         "Kiểm tra tay với dữ liệu seed.",
         ["F12-1"], 3, "P2"),
     ]},
]

LABELS = {"epic": "5319e7", "sprint-1": "0e8a16", "sprint-2": "1d76db"}


def run(*args, input_text=None):
    return subprocess.run(["gh", *args], input=input_text, capture_output=True, text=True)


def gh(*args, input_text=None):
    r = run(*args, input_text=input_text)
    if r.returncode != 0:
        sys.exit(f"Lỗi gh {' '.join(args[:3])}: {r.stderr.strip()}")
    return r.stdout.strip()


def d(s):
    return dt.date.fromisoformat(s)


def fmt(x):
    return x.strftime("%d/%m") if x else "chưa chốt"


def plan_dates(flow, win):
    """Chia đều ngày của sprint cho các task trong luồng, làm tuần tự trong luồng."""
    start, end = win
    n = len(flow["tasks"])
    days = (end - start).days + 1
    out = []
    for i in range(n):
        s = start + dt.timedelta(days=math.floor(i * days / n))
        e = start + dt.timedelta(days=max(math.ceil((i + 1) * days / n) - 1, math.floor(i * days / n)))
        out.append((s, min(e, end)))
    return out


def checklist(items):
    return "\n".join(f"- [ ] {x}" for x in items)


def task_body(flow, tid, t, dates):
    title, story, desc, ac, test, deps, sp, pri = t
    dep_txt = ", ".join(deps) if deps else "Không có"
    return (
        f"**Luồng:** {flow['id']} · **Sprint:** {flow['sprint']} · **Ưu tiên:** {pri} · "
        f"**Ước lượng:** {sp} SP · **Dự kiến:** {fmt(dates[0])} → {fmt(dates[1])}\n\n"
        f"## User story\n{story}\n\n"
        f"## Mô tả\n{desc}\n\n"
        f"## Tiêu chí chấp nhận\n{checklist(ac)}\n\n"
        f"## Cách kiểm thử\n{test}\n\n"
        f"## Phụ thuộc\n{dep_txt}\n\n"
        f"## Definition of Done\n{checklist(DOD)}\n"
    )


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--repo", required=True)
    p.add_argument("--owner", required=True)
    p.add_argument("--project", required=True, type=int)
    for k in ("s1-start", "s1-end", "s2-start", "s2-end"):
        p.add_argument(f"--{k}", help="YYYY-MM-DD, ngày thật của sprint")
    p.add_argument("--dry-run", action="store_true")
    p.add_argument("--from-flow", help="Tiếp tục từ F1..F12 sau khi GitHub bị gián đoạn")
    a = p.parse_args()

    supplied = [a.s1_start, a.s1_end, a.s2_start, a.s2_end]
    if any(supplied) and not all(supplied):
        sys.exit("Cần đủ 4 mốc ngày, hoặc bỏ trống cả 4")
    wins = {1: (d(a.s1_start), d(a.s1_end)), 2: (d(a.s2_start), d(a.s2_end))} if all(supplied) else None
    if wins:
        for s, (x, y) in wins.items():
            if y <= x:
                sys.exit(f"Sprint {s}: ngày kết thúc phải sau ngày bắt đầu")
        if wins[2][0] <= wins[1][1]:
            sys.exit("Sprint 2 phải bắt đầu sau khi Sprint 1 kết thúc")

    if a.dry_run:
        if wins:
            for s, (x, y) in wins.items():
                print(f"Sprint {s}: {fmt(x)} → {fmt(y)}")
        else:
            print("Sprint 1 và 2: chưa chốt ngày")
        for f in FLOWS:
            ds = plan_dates(f, wins[f["sprint"]]) if wins else [(None, None)] * len(f["tasks"])
            print(f"\n{f['id']}  {f['title']}  (Sprint {f['sprint']})")
            for i, t in enumerate(f["tasks"], 1):
                print(f"   [{f['id']}-{i}] {fmt(ds[i-1][0])}→{fmt(ds[i-1][1])}  "
                      f"{t[6]}SP {t[7]}  {t[0]}")
        total_sp = sum(t[6] for f in FLOWS for t in f["tasks"])
        sp1 = sum(t[6] for f in FLOWS if f["sprint"] == 1 for t in f["tasks"])
        print(f"\nTổng {total_sp} SP (Sprint 1: {sp1}, Sprint 2: {total_sp - sp1}). "
              f"Đối chiếu với năng lực thực tế của nhóm 5 người trước khi chạy thật.")
        return

    for n, c in {**LABELS, **{f["id"].lower(): "c5def5" for f in FLOWS}}.items():
        gh("label", "create", n, "-R", a.repo, "-c", c, "--force")
    ms_existing = json.loads(gh("api", f"repos/{a.repo}/milestones?state=all&per_page=100") or "[]")
    for s in (1, 2):
        title = f"Sprint {s}"
        due = f"{wins[s][1].isoformat()}T23:59:59Z" if wins else None
        found = next((m for m in ms_existing if m["title"] == title), None)
        if found:
            if due:
                gh("api", "-X", "PATCH", f"repos/{a.repo}/milestones/{found['number']}",
                   "-f", f"due_on={due}")
        else:
            args = ["api", f"repos/{a.repo}/milestones", "-f", f"title={title}"]
            if due:
                args += ["-f", f"due_on={due}"]
            gh(*args)

    pj = json.loads(gh("project", "view", str(a.project), "--owner", a.owner, "--format", "json"))
    fields = {f["name"]: f for f in json.loads(
        gh("project", "field-list", str(a.project), "--owner", a.owner, "--format", "json"))["fields"]}

    def set_field(item_id, name, value):
        f = fields.get(name)
        if not f:
            return
        base = ["project", "item-edit", "--id", item_id, "--project-id", pj["id"], "--field-id", f["id"]]
        if f.get("type") == "ProjectV2SingleSelectField":
            opt = next((o for o in f.get("options", []) if o["name"] == str(value)), None)
            if opt:
                gh(*base, "--single-select-option-id", opt["id"])
        elif f.get("type") == "ProjectV2Field" and name in ("Start date", "Target date"):
            gh(*base, "--date", value.isoformat())
        elif f.get("type") == "ProjectV2Field":
            gh(*base, "--number", str(value))

    existing = json.loads(gh("issue", "list", "-R", a.repo, "--state", "all",
                             "--limit", "1000", "--json", "number,title"))
    by_title = {i["title"]: i["number"] for i in existing}
    project_items = json.loads(gh("project", "item-list", str(a.project), "--owner", a.owner,
                                  "--limit", "1000", "--format", "json"))["items"]
    by_url = {i["content"]["url"]: i["id"] for i in project_items
              if i.get("content") and i["content"].get("url")}

    def create(title, body, labels, sprint, start, end, sp, pri):
        if title in by_title:
            number = by_title[title]
            url = f"https://github.com/{a.repo}/issues/{number}"
            print(f"Đã có Issue: {title}")
        else:
            url = gh("issue", "create", "-R", a.repo, "--title", title, "--body-file", "-",
                     "--label", ",".join(labels), "--milestone", f"Sprint {sprint}", input_text=body)
            number = int(url.rstrip("/").rsplit("/", 1)[1])
            by_title[title] = number
        if url in by_url:
            item_id = by_url[url]
        else:
            result = run("project", "item-add", str(a.project), "--owner", a.owner,
                         "--url", url, "--format", "json")
            if result.returncode == 0:
                item_id = json.loads(result.stdout)["id"]
            elif "Content already exists in this project" in result.stderr:
                match = None
                for attempt in range(6):
                    latest = json.loads(gh("project", "item-list", str(a.project), "--owner", a.owner,
                                           "--limit", "1000", "--format", "json"))["items"]
                    match = next((i for i in latest if i.get("content", {}).get("url") == url), None)
                    if match:
                        break
                    time.sleep(2 * (attempt + 1))
                if not match:
                    sys.exit(f"Issue đã vào Project nhưng chưa đọc được item: {url}")
                item_id = match["id"]
            else:
                sys.exit(f"Không thêm được Issue vào Project: {result.stderr.strip()}")
            by_url[url] = item_id
        if start:
            set_field(item_id, "Start date", start)
        if end:
            set_field(item_id, "Target date", end)
        set_field(item_id, "Estimate", sp)
        set_field(item_id, "Priority", pri)
        set_field(item_id, "Status", "Backlog")
        print(f"OK: {title}")
        return number

    for f in FLOWS:
        if a.from_flow and int(f["id"][1:]) < int(a.from_flow[1:]):
            continue
        ds = plan_dates(f, wins[f["sprint"]]) if wins else [(None, None)] * len(f["tasks"])
        fl = f["id"].lower()
        nums = []
        for i, t in enumerate(f["tasks"], 1):
            tid = f"{f['id']}-{i}"
            n = create(f"[{tid}] {t[0]}", task_body(f, tid, t, ds[i - 1]),
                       [f"sprint-{f['sprint']}", fl], f["sprint"],
                       ds[i - 1][0], ds[i - 1][1], t[6], t[7])
            nums.append(n)
        sp_sum = sum(t[6] for t in f["tasks"])
        pri = "P0" if any(t[7] == "P0" for t in f["tasks"]) else \
              ("P1" if any(t[7] == "P1" for t in f["tasks"]) else "P2")
        epic_body = (
            f"## Mục tiêu\n{f['summary']}\n\n"
            f"**Sprint:** {f['sprint']} · **Dự kiến:** {fmt(ds[0][0])} → {fmt(ds[-1][1])} · "
            f"**Tổng ước lượng:** {sp_sum} SP\n\n"
            f"## Task con\n" + "\n".join(f"- [ ] #{n}" for n in nums) +
            "\n\nEpic hoàn thành khi mọi task con đã đóng và luồng chạy được từ đầu đến cuối "
            "trên môi trường dev.\n"
        )
        epic_number = create(f"[EPIC] {f['id']}: {f['title']}", epic_body,
                             ["epic", f"sprint-{f['sprint']}", fl], f["sprint"],
                             ds[0][0], ds[-1][1], sp_sum, pri)
        existing_children = json.loads(gh("api", f"repos/{a.repo}/issues/{epic_number}/sub_issues?per_page=100"))
        linked = {child["number"] for child in existing_children}
        for number in nums:
            if number in linked:
                continue
            child_id = gh("api", f"repos/{a.repo}/issues/{number}", "--jq", ".id")
            gh("api", "-X", "POST", f"repos/{a.repo}/issues/{epic_number}/sub_issues",
               "-F", f"sub_issue_id={child_id}")


if __name__ == "__main__":
    main()
