import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const folder = path.dirname(fileURLToPath(import.meta.url));
const evidence = JSON.parse(
  readFileSync(path.join(folder, "evidence.json"), "utf8"),
);
const content = JSON.parse(
  readFileSync(path.join(folder, "slides-content.json"), "utf8"),
);
const values = {
  closedIssues: evidence.issues.closed,
  totalIssues: evidence.issues.total,
  mergedWindow: evidence.governanceAudit.mergedPullRequestsInWindow,
  testsPassed: evidence.checks.testsPassed,
  testFilesPassed: evidence.checks.testFilesPassed,
};
const interpolate = (value) =>
  String(value).replace(/\{\{(\w+)\}\}/g, (_match, key) => {
    if (!(key in values)) throw new Error(`Unknown slide variable: ${key}`);
    return values[key];
  });
const slides = content.slides.map((slide) => ({
  ...slide,
  points: slide.points.map(interpolate),
}));
if (
  slides.length !== 10 ||
  slides.reduce((sum, slide) => sum + slide.seconds, 0) !== 360 ||
  content.presentationSeconds !== 360 ||
  content.demoSeconds !== 300 ||
  content.qaSeconds !== 300
)
  throw new Error(
    "Required timing: 10 slides / 6 minutes, 5-minute demo, 5-minute Q&A (16 minutes total).",
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
    "**Rubric đã có. Chưa hoàn tất #128: cần hồ sơ thật, điểm tự đánh giá và rà soát nhóm.**",
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
<footer><span>6 phút slide + 5 phút demo + 5 phút Q&A</span><span>${index + 1} / 10</span></footer>
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
  "Generated 10 slides / 6 minutes + 5-minute demo + 5-minute Q&A: docs/defense/slides.html and slides.md",
);
