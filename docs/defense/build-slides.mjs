import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const folder = path.dirname(fileURLToPath(import.meta.url));
const evidence = JSON.parse(
  readFileSync(path.join(folder, "evidence.json"), "utf8"),
);
const slides = [
  {
    title: "Code Carf",
    subtitle: "Học theo lộ trình · Luyện tập · Thi lập trình",
    seconds: 45,
    points: [
      "Bản chuẩn bị bảo vệ — chưa chốt theo Rubric học phần",
      `Nhóm đã ghi nhận bằng chứng từ GitHub ngày ${evidence.asOfDate}.`,
      "Mục tiêu trình bày: sản phẩm, cách tổ chức công việc, bằng chứng và giới hạn.",
    ],
    note: "Giới thiệu nhóm và mục tiêu. Bổ sung tên học phần, giảng viên và người trình bày sau khi nhóm xác nhận; không tự suy diễn các thông tin này.",
    sources: ["https://github.com/kimngan1805/Code-Carf"],
  },
  {
    title: "Bài toán và phạm vi đã triển khai",
    seconds: 90,
    points: [
      "Học viên đã có luồng tìm lộ trình, đăng ký, học Room và làm bài tập.",
      "Giáo viên đã có khu vực tạo nội dung và xem thông tin cuộc thi/vi phạm.",
      "Nhóm đã tách đường dẫn /hv, /gv và /admin theo vai trò.",
      "Nhóm chưa coi email thật, AI chấm bài viết tay hay mọi tính năng đang mở là đã hoàn thành.",
    ],
    note: "Nêu đúng phạm vi có bằng chứng. Không khẳng định mọi trang quản trị hoặc mọi luồng cuộc thi đều hoàn chỉnh. Các nhánh chưa merge không đại diện cho bản main.",
    sources: [
      "../../README.md",
      "https://github.com/kimngan1805/Code-Carf/pull/159",
      "https://github.com/kimngan1805/Code-Carf/pull/160",
    ],
  },
  {
    title: "Tổ chức công việc và trạng thái",
    seconds: 90,
    points: [
      `GitHub đã ghi nhận ${evidence.issues.closed}/${evidence.issues.total} issue đóng; ${evidence.issues.open} issue còn mở tại thời điểm chụp.`,
      "Số issue đã bao gồm Epic và kế hoạch; nhóm không quy đổi thành tỷ lệ hoàn thành sản phẩm.",
      "Nhóm đã chia công việc theo issue, branch và Pull Request.",
      "Sơn còn #128 cùng hai Epic #24/#49; task con và trạng thái cần được đối chiếu riêng.",
    ],
    note: "Giải thích khác biệt giữa issue đóng, code đã merge và luồng được nghiệm thu. Không tuyên bố có dữ liệu burn-down, velocity hoặc ngày Sprint nếu chưa có biên bản thật.",
    sources: [
      "evidence.json",
      "https://github.com/users/kimngan1805/projects/2",
    ],
  },
  {
    title: "Kiến trúc đã sử dụng",
    seconds: 90,
    points: [
      "UI và API đã nằm trong ứng dụng Next.js 16 / React 19 / TypeScript.",
      "Service đã kiểm tra vai trò và điều phối; repository đã truy cập PostgreSQL qua Prisma.",
      "Dữ liệu đã liên kết User → Enrollment → Path → Room → Exercise → Submission.",
      "Nhóm đã dùng NextAuth; adapter mock/Judge0 đã tách khỏi luồng nộp bài.",
    ],
    note: "Nêu lý do tách service và repository: kiểm quyền có thể kiểm thử, hạn chế truy vấn trực tiếp từ UI. Nói rõ mock chỉ mô phỏng tích hợp, không thực thi hoặc xác minh code thật.",
    sources: [
      "../../README.md",
      "../../prisma/schema.prisma",
      "../../src/features/grading/adapter.ts",
    ],
  },
  {
    title: "Luồng học viên đã có bằng chứng",
    seconds: 150,
    points: [
      "Đăng nhập → tìm kiếm không dấu → Path đã publish → đăng ký.",
      "Room đã được mở theo đăng ký và tiến độ của Room trước; URL trực tiếp vẫn bị kiểm tra.",
      "Trang bài tập đã có editor, lưu nháp, nộp và hiển thị kết quả.",
      "Học viên đã gửi được báo lỗi; server đã giới hạn gửi liên tục cùng bài.",
    ],
    note: "Dành khoảng 90 giây cho thao tác thực tế, còn lại giải thích. Dùng kịch bản demo.md. Nếu Judge0 không sẵn sàng, nói rõ mock và chỉ chứng minh luồng UI/API; không kết luận bài làm đúng dựa trên mock.",
    sources: [
      "https://github.com/kimngan1805/Code-Carf/pull/101",
      "https://github.com/kimngan1805/Code-Carf/pull/152",
      "https://github.com/kimngan1805/Code-Carf/pull/159",
    ],
  },
  {
    title: "Kiểm chứng chất lượng",
    seconds: 120,
    points: [
      evidence.checks
        ? `Bản kiểm tra đã đạt ${evidence.checks.testsPassed} test / ${evidence.checks.testFilesPassed} file trên máy local có PostgreSQL.`
        : "Số test cần được điền từ lần chạy đã lưu; không tự ước lượng.",
      "Nhóm đã dùng lint, TypeScript, Vitest và production build.",
      "Test đã bao phủ khóa Room, quyền truy cập, token mật khẩu và chống gửi report trùng.",
      "Kết quả local, CI của từng commit và UAT của stakeholder là ba loại bằng chứng khác nhau.",
    ],
    note: "Mở evidence.json và chỉ đúng commit đã kiểm tra. Số test không phải độ bao phủ. Không khẳng định đã đạt UAT, tải lớn hoặc an toàn tuyệt đối khi chưa có báo cáo riêng.",
    sources: [
      "evidence.json",
      "../../docs/testing.md",
      "../../src/features/exercise-reports/service.test.ts",
    ],
  },
  {
    title: "Đóng góp và phối hợp đã ghi nhận",
    seconds: 90,
    points: [
      "Sơn đã có PR về đăng ký Path, mở khóa Room, trang Room, quên mật khẩu, báo lỗi và tìm kiếm.",
      "Bằng chứng đã được liên kết bằng PR #97, #101, #114, #137, #152 và #159.",
      "Nhóm đã dùng Conventional Commits và PR để tích hợp thay đổi.",
      "Tình trạng review phải đọc từ từng PR; việc merge tự nó không chứng minh đã có người khác review.",
    ],
    note: "Chỉ trình bày phần mình giải thích được. Không lấy toàn bộ số commit trên các nhánh backup để tính đóng góp, vì rebase tạo SHA khác cho cùng thay đổi. Mời Nhi bổ sung phần phối hợp theo phân công thật.",
    sources: evidence.mergedPullRequests
      .filter((pr) => pr.number !== 160)
      .map((pr) => pr.url),
  },
  {
    title: "Rủi ro và giới hạn đã nhận diện",
    seconds: 90,
    points: [
      "Local đã dùng PostgreSQL 16 cổng 5433; Docker cần chạy trước migration và integration test.",
      "GRADER_ADAPTER=mock đã giúp demo không cần Judge0, nhưng không chạy code thực.",
      "Email local đã ghi link vào log; email thật vẫn cần tích hợp #109.",
      "Nhóm chưa có bằng chứng trong bộ này cho tải lớn, UAT hay kết quả AI chấm bài viết tay.",
    ],
    note: "Trình bày rủi ro như trạng thái thực tế, không sáng tác một biên bản quản trị rủi ro đã được phê duyệt. Với deploy, Supabase/Render chỉ được trình bày là cấu hình dự án trừ khi có bằng chứng hoạt động thực tế.",
    sources: [
      "../../docs/deployment.md",
      "../../docs/password-reset-development.md",
      "https://github.com/kimngan1805/Code-Carf/issues/109",
    ],
  },
  {
    title: "Tự đánh giá — chờ Rubric chính thức",
    seconds: 105,
    points: [
      "Nhóm đã lập bảng đối chiếu bằng chứng trong rubric.md.",
      "Rubric học phần và trọng số chưa được cung cấp cho bản chuẩn bị này.",
      "Nhóm chưa gán điểm, tỷ lệ hay mức đạt cho tiêu chí không có căn cứ.",
      "Cần đối chiếu Rubric thật, điền điểm có dẫn chứng và để cả nhóm rà soát trước khi nộp.",
    ],
    note: "Trang này là chỗ giữ cho phần đánh giá bắt buộc, chưa phải bảng điểm đã hoàn tất. Khi nhận Rubric phải cập nhật tên tiêu chí, trọng số, giới hạn điểm và bằng chứng tương ứng.",
    sources: [
      "rubric.md",
      "https://github.com/kimngan1805/Code-Carf/issues/128",
    ],
  },
  {
    title: "Kế hoạch hoàn thiện và demo dự phòng",
    seconds: 90,
    points: [
      "Nhóm đã chuẩn bị kịch bản demo theo phút và phương án offline.",
      "Cần rà luồng Teacher xử lý report #47 và thông báo #48; không ghi nhận nhánh chờ merge là đã xong.",
      "Cần hoàn tất Rubric, phân vai nói, chạy thử 16 phút và xác nhận của nhóm.",
      "Bộ hiện tại đã tách bằng chứng đã có khỏi phần chưa được kiểm chứng.",
    ],
    note: "Kết thúc bằng các việc còn thiếu cụ thể. Nếu bị hỏi tính năng chưa xong, mở issue thay vì diễn giải như tính năng đã tồn tại. Dành phần hỏi đáp ngoài 16 phút nếu quy định học phần cho phép.",
    sources: [
      "demo.md",
      "https://github.com/kimngan1805/Code-Carf/issues/47",
      "https://github.com/kimngan1805/Code-Carf/issues/48",
    ],
  },
];

if (
  slides.length !== 10 ||
  slides.reduce((sum, slide) => sum + slide.seconds, 0) !== 960
)
  throw new Error(
    "The deck must have 10 slides and 16 minutes of speaker time.",
  );
const escape = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ],
  );
const timing = (seconds) =>
  `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
const markdown =
  [
    "# Code Carf — bản chuẩn bị bảo vệ",
    "",
    `Bằng chứng ngày ${evidence.asOfDate}; commit ${evidence.baseCommit}.`,
    "",
    "**Chưa hoàn tất #128: cần Rubric chính thức và rà soát của nhóm.**",
    ...slides.flatMap((slide, index) => [
      "",
      "---",
      "",
      `## ${index + 1}. ${slide.title} (${timing(slide.seconds)})`,
      "",
      ...slide.points.map((point) => `- ${point}`),
      "",
      `**Ghi chú người nói:** ${slide.note}`,
      "",
      ...slide.sources.map((source) => `- Bằng chứng: ${source}`),
    ]),
  ].join("\n") + "\n";
writeFileSync(path.join(folder, "slides.md"), markdown);
const sections = slides
  .map(
    (
      slide,
      index,
    ) => `<section class="slide" data-slide="${index}" ${index ? "hidden" : ""}>
<header>CODE CARF <span>BẢN CHUẨN BỊ · ${escape(evidence.asOfDate)}</span></header>
<div class="content"><p class="eyebrow">${String(index + 1).padStart(2, "0")} / 10 · ${timing(slide.seconds)}</p><h1>${escape(slide.title)}</h1>${slide.subtitle ? `<p class="subtitle">${escape(slide.subtitle)}</p>` : ""}<ul>${slide.points.map((point) => `<li>${escape(point)}</li>`).join("")}</ul></div>
<footer><span>Chưa chấm điểm khi chưa có Rubric chính thức</span><span>${index + 1} / 10</span></footer>
<aside class="notes" hidden>${escape(slide.note)}<br>${slide.sources.map((source) => `<a href="${escape(source)}">${escape(source)}</a>`).join("<br>")}</aside></section>`,
  )
  .join("\n");
const html = `<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Code Carf — bảo vệ (bản chuẩn bị)</title><style>
*{box-sizing:border-box}body{margin:0;background:#101d33;color:#162d4d;font-family:'Segoe UI',Arial,sans-serif}.slide{position:relative;background:#f4f8fc;width:1280px;height:720px;margin:24px auto;overflow:hidden;border-top:12px solid #004da9}.slide[hidden]{display:none}header,footer{display:flex;justify-content:space-between;gap:24px;margin:0 64px;font-size:15px;color:#526784}header{padding-top:30px;font-weight:700;letter-spacing:2px}header span{font-weight:400;letter-spacing:0}.content{padding:35px 64px}.eyebrow{font-size:15px;letter-spacing:2px;color:#0064bd;margin:0 0 14px}h1{font-size:43px;line-height:1.14;margin:0 0 22px;max-width:1100px;color:#004da9}.subtitle{font-size:24px;margin:0 0 20px}ul{padding-left:28px;margin:0;max-width:1080px}li{font-size:25px;line-height:1.4;margin:12px 0}li::marker{color:#0064bd}footer{position:absolute;bottom:24px;left:0;right:0;border-top:1px solid #cedbe8;padding-top:15px}.controls{position:fixed;bottom:5px;left:50%;transform:translateX(-50%);display:flex;gap:12px;z-index:10}button{padding:10px 18px;border:1px solid #c5d8ed;border-radius:8px;color:#004da9;background:white;font:inherit;cursor:pointer}button:focus-visible{outline:3px solid #f66625}.notes:not([hidden]){position:absolute;inset:auto 35px 70px;background:white;border:2px solid #004da9;padding:20px;font-size:18px;max-height:220px;overflow:auto;box-shadow:0 8px 30px #162d4d30}.notes a{overflow-wrap:anywhere} @media(max-width:1300px){.slide{zoom:calc((100vw - 24px)/1280)}}@page{size:1280px 720px;margin:0}@media print{body{background:white}.slide,.slide[hidden]{display:block!important;zoom:1!important;margin:0;break-after:page;page-break-after:always;print-color-adjust:exact}.slide:last-of-type{break-after:auto;page-break-after:auto}.notes,.controls{display:none!important}}
</style>${sections}<nav class="controls" aria-label="Điều khiển slide"><button id="previous" type="button">← Trước</button><button id="notes" type="button">Ghi chú</button><button id="next" type="button">Sau →</button></nav><script>
const slides=[...document.querySelectorAll('.slide')];let current=0;function show(index){current=Math.max(0,Math.min(slides.length-1,index));slides.forEach((slide,i)=>{slide.hidden=i!==current});document.getElementById('previous').disabled=current===0;document.getElementById('next').disabled=current===slides.length-1;location.hash=String(current+1)}document.getElementById('previous').onclick=()=>show(current-1);document.getElementById('next').onclick=()=>show(current+1);document.getElementById('notes').onclick=()=>{const notes=slides[current].querySelector('.notes');notes.hidden=!notes.hidden};document.addEventListener('keydown',event=>{if(event.key==='ArrowRight'){event.preventDefault();show(current+1)}if(event.key==='ArrowLeft'){event.preventDefault();show(current-1)}});show((Number(location.hash.slice(1))||1)-1);
</script></html>`;
writeFileSync(path.join(folder, "slides.html"), html);
console.log(
  "Generated 10 slides / 16 minutes: docs/defense/slides.html and slides.md",
);
