/**
 * Lộ trình mẫu "Lập trình Python cơ bản": 9 bài học theo khung 12 phần, mỗi bài
 * có video bài giảng (series "Lập trình Python" của kênh TITV trên YouTube),
 * một bài trắc nghiệm và bài tập code chấm theo test case; bài cuối có thêm tự luận.
 *
 * Chạy: npm run db:seed:python (cần chạy `npm run db:seed` trước để có tài khoản
 * giáo viên, hoặc đặt SEED_TEACHER_EMAIL thành một giáo viên/admin đã có).
 * Chạy lại nhiều lần an toàn: upsert theo slug / vị trí / id cố định.
 * Đáp án test case được TÍNH bằng hàm solve, không gõ tay.
 */
import { Difficulty, ExerciseKind, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const PATH_SLUG = "lap-trinh-python-co-ban";

type Case = { input: string; expected: string; isHidden: boolean };
type Question = {
  prompt: string;
  options: string[];
  answer: number;
  explanation: string;
};
type ExerciseSeed =
  | {
      kind: "CODE";
      key: string;
      title: string;
      difficulty: Difficulty;
      points: number;
      prompt: string;
      tests: Case[];
    }
  | {
      kind: "QUIZ";
      key: string;
      title: string;
      points: number;
      prompt: string;
      questions: Question[];
    }
  | {
      kind: "HANDWRITTEN";
      key: string;
      title: string;
      difficulty: Difficulty;
      points: number;
      prompt: string;
      rubric: string;
    };

/** 12 phần theo đúng thứ tự khung bài học hiển thị trên trang lộ trình. */
type Parts = {
  overview: string;
  concept: string;
  characteristics: string;
  classification: string;
  mechanism: string;
  syntax: string;
  example: string;
  application: string;
  prosCons: string;
  errors: string;
  takeaways: string;
  practice: string;
};

type RoomSeed = {
  title: string;
  description: string;
  videos: { id: string; caption: string }[];
  parts: Parts;
  exercises: ExerciseSeed[];
};

const youtube = (id: string) => `https://www.youtube.com/watch?v=${id}`;

function lesson(room: RoomSeed) {
  const p = room.parts;
  const videos = room.videos
    .map((video) => `${youtube(video.id)}\n\n_${video.caption}_`)
    .join("\n\n");
  return [
    `# ${room.title}`,
    `## Tổng quan\n\n${p.overview}`,
    `### Video bài giảng\n\n${videos}`,
    `## Khái niệm\n\n${p.concept}`,
    `## Đặc điểm\n\n${p.characteristics}`,
    `## Phân loại\n\n${p.classification}`,
    `## Cách thức hoạt động\n\n${p.mechanism}`,
    `## Cú pháp\n\n${p.syntax}`,
    `## Ví dụ minh họa\n\n${p.example}`,
    `## Ứng dụng thực tế\n\n${p.application}`,
    `## Ưu và nhược điểm\n\n${p.prosCons}`,
    `## Lỗi thường gặp\n\n${p.errors}`,
    `## Ghi nhớ\n\n${p.takeaways}`,
    `## Luyện tập\n\n${p.practice}`,
  ].join("\n\n");
}

/** Tạo test case từ danh sách đầu vào; `visible` test đầu hiện, còn lại ẩn. */
function cases(
  inputs: string[],
  solve: (input: string) => string,
  visible = 2,
): Case[] {
  return inputs.map((input, index) => ({
    input,
    expected: solve(input),
    isHidden: index >= visible,
  }));
}

const lines = (input: string) => input.trim().split("\n");
const ints = (line: string) => line.trim().split(/\s+/).map(Number);

const ROOMS: RoomSeed[] = [
  {
    title: "Làm quen với Python",
    description:
      "Viết và chạy chương trình đầu tiên, in dữ liệu bằng print() và ghi chú thích.",
    videos: [
      {
        id: "6I_ulPytQIc",
        caption:
          "TITV · Lập trình Python 01: Lập trình cơ bản Python cho người mới bắt đầu",
      },
      {
        id: "16qD3hRRadc",
        caption: "TITV · Lập trình Python 04: Xuất dữ liệu bằng lệnh print",
      },
    ],
    parts: {
      overview:
        "Bài đầu tiên giúp bạn hiểu Python là gì, vì sao Python hợp với người mới, và tự tay chạy chương trình in ra màn hình.\n\n**Mục tiêu:** chạy được file `.py`, dùng `print()` và viết chú thích.",
      concept:
        "**Python** là ngôn ngữ lập trình bậc cao, thông dịch: bạn viết lệnh gần với tiếng Anh, trình thông dịch đọc và chạy từng dòng. Một **chương trình** là danh sách lệnh chạy từ trên xuống dưới.",
      characteristics:
        "- Cú pháp ngắn gọn, dùng **thụt lề** thay cho dấu ngoặc nhọn.\n- Không cần khai báo kiểu cho biến.\n- Thư viện phong phú: web, dữ liệu, AI, tự động hóa.\n- Phân biệt chữ hoa, chữ thường: `print` khác `Print`.",
      classification:
        "Có hai cách chạy Python:\n\n- **Chế độ tương tác** (REPL): gõ `python` rồi nhập từng lệnh, thấy kết quả ngay.\n- **Chạy file**: viết lệnh vào `bai1.py` rồi chạy `python bai1.py`.",
      mechanism:
        "Trình thông dịch đọc file từ dòng đầu, dịch từng lệnh sang mã máy ảo (bytecode) rồi thực thi. Gặp lỗi ở dòng nào thì dừng ở dòng đó và báo lỗi kèm số dòng.",
      syntax:
        '```python\n# Đây là chú thích một dòng, Python bỏ qua\nprint("Xin chào")          # in một chuỗi\nprint("Tổng:", 3 + 4)      # in nhiều giá trị, cách nhau bởi dấu cách\nprint("A", "B", sep="-")   # đổi ký tự ngăn cách: A-B\nprint("Không xuống dòng", end="")\n```',
      example:
        '```python\nprint("Chào mừng đến Code Carf!")\nprint("Năm nay là", 2026)\nprint("1 + 2 =", 1 + 2)\n```\n\nKết quả:\n\n```\nChào mừng đến Code Carf!\nNăm nay là 2026\n1 + 2 = 3\n```',
      application:
        "`print()` là công cụ đầu tiên để xem chương trình đang làm gì: in kết quả cho người dùng, in giá trị biến để tìm lỗi (debug), in báo cáo ra màn hình.",
      prosCons:
        "**Ưu:** dễ đọc, dễ học, viết nhanh.\n\n**Nhược:** chạy chậm hơn C/C++ vì là ngôn ngữ thông dịch; lỗi kiểu dữ liệu chỉ lộ ra khi chạy.",
      errors:
        '- Quên dấu ngoặc: `print "hi"` → `SyntaxError`. Viết đúng: `print("hi")`.\n- Viết hoa sai: `Print("hi")` → `NameError`.\n- Dùng ngoặc kép kiểu Word (“ ”) thay cho `"`.',
      takeaways:
        "- Chương trình chạy từ trên xuống.\n- `print()` in giá trị, mặc định ngăn cách bằng dấu cách và xuống dòng ở cuối.\n- Chú thích bắt đầu bằng `#`.",
      practice:
        "Làm bài trắc nghiệm để ôn khái niệm, sau đó viết chương trình in lời chào đầu tiên của bạn.",
    },
    exercises: [
      {
        kind: "QUIZ",
        key: "intro-quiz",
        title: "Trắc nghiệm: Làm quen với Python",
        points: 30,
        prompt: "Kiểm tra nhanh những gì bạn vừa học về Python và lệnh print.",
        questions: [
          {
            prompt: "Python là ngôn ngữ thuộc loại nào?",
            options: [
              "Biên dịch ra mã máy trước khi chạy",
              "Thông dịch, chạy từng lệnh",
              "Ngôn ngữ đánh dấu như HTML",
              "Ngôn ngữ truy vấn dữ liệu",
            ],
            answer: 1,
            explanation:
              "Python được trình thông dịch đọc và chạy từng lệnh, không cần biên dịch trước.",
          },
          {
            prompt: 'Kết quả của lệnh print("A", "B", sep="-") là gì?',
            options: ["A B", "AB", "A-B", "A - B"],
            answer: 2,
            explanation:
              'Tham số sep thay ký tự ngăn cách mặc định (dấu cách) bằng "-".',
          },
          {
            prompt: "Dòng nào là chú thích trong Python?",
            options: [
              "// ghi chú",
              "# ghi chú",
              "<!-- ghi chú -->",
              "-- ghi chú",
            ],
            answer: 1,
            explanation: "Python dùng # cho chú thích một dòng.",
          },
          {
            prompt: 'Viết Print("hi") sẽ xảy ra điều gì?',
            options: [
              "In ra hi",
              "Lỗi NameError vì Python phân biệt hoa thường",
              "In ra Print hi",
              "Không có gì xảy ra",
            ],
            answer: 1,
            explanation:
              "Hàm tên là print viết thường; Print là một tên chưa được định nghĩa.",
          },
        ],
      },
      {
        kind: "CODE",
        key: "hello",
        title: "Xin chào, tên bạn",
        difficulty: Difficulty.EASY,
        points: 50,
        prompt:
          "Nhập một tên, in ra lời chào theo mẫu.\n\n**Input:** một dòng chứa tên (có thể có dấu cách).\n\n**Output:** `Xin chào, <tên>!`\n\n**Ví dụ**\n\n```\nInput:  Ngân\nOutput: Xin chào, Ngân!\n```",
        tests: cases(
          ["Ngân", "Code Carf", "Python", "Nguyễn Văn A", "x"],
          (input) => `Xin chào, ${input.trim()}!`,
        ),
      },
    ],
  },
  {
    title: "Biến, kiểu dữ liệu và nhập dữ liệu",
    description:
      "Lưu giá trị vào biến, phân biệt int, float, str, bool và đọc dữ liệu bằng input().",
    videos: [
      {
        id: "vSAIkPlm6t8",
        caption: "TITV · Lập trình Python 06: Biến, hằng số và từ khóa",
      },
      {
        id: "vfS2_6nl7AA",
        caption: "TITV · Lập trình Python 07: Kiểu dữ liệu cơ bản",
      },
      {
        id: "ohmzrmh6a50",
        caption: "TITV · Lập trình Python 05: Nhập dữ liệu bằng lệnh input",
      },
    ],
    parts: {
      overview:
        "Chương trình cần nhớ dữ liệu để xử lý. Bài này giới thiệu **biến**, bốn kiểu dữ liệu cơ bản và cách đọc dữ liệu người dùng nhập vào.",
      concept:
        "**Biến** là một cái tên gắn với một giá trị trong bộ nhớ. **Kiểu dữ liệu** cho biết giá trị đó là số nguyên, số thực, chuỗi hay đúng/sai, và quyết định ta làm được gì với nó.",
      characteristics:
        '- Python tự suy ra kiểu từ giá trị (**dynamic typing**): `x = 5` là `int`, `x = "5"` là `str`.\n- Một biến có thể được gán lại giá trị kiểu khác.\n- Tên biến gồm chữ, số, dấu `_`, không bắt đầu bằng số, không trùng từ khóa (`if`, `for`...).',
      classification:
        '| Kiểu | Ý nghĩa | Ví dụ |\n|---|---|---|\n| `int` | số nguyên | `42`, `-7` |\n| `float` | số thực | `3.14`, `2.0` |\n| `str` | chuỗi ký tự | `"Python"` |\n| `bool` | đúng / sai | `True`, `False` |',
      mechanism:
        "Khi gán `x = 5`, Python tạo đối tượng số `5` rồi cho tên `x` trỏ tới nó. `input()` luôn trả về **chuỗi**, nên muốn tính toán phải ép kiểu bằng `int()` hoặc `float()`.",
      syntax:
        "```python\nten = \"Ngân\"            # str\ntuoi = 21               # int\ndiem = 8.5              # float\ndau = True              # bool\nprint(type(diem))       # <class 'float'>\n\nn = int(input())        # đọc một số nguyên\na, b = map(int, input().split())  # đọc hai số trên một dòng\n```",
      example:
        '```python\nnam_sinh = int(input("Năm sinh: "))\ntuoi = 2026 - nam_sinh\nprint("Bạn", tuoi, "tuổi")\n```\n\nNhập `2005` sẽ in `Bạn 21 tuổi`.',
      application:
        "Mọi chương trình đều dùng biến: lưu điểm số, tên người dùng, giỏ hàng, kết quả tính toán. Ép kiểu đúng giúp đọc số từ bàn phím, file hay form web.",
      prosCons:
        '**Ưu:** không phải khai báo kiểu nên viết nhanh, ít dòng.\n\n**Nhược:** dễ nhầm kiểu, ví dụ cộng `"5" + 3` sẽ lỗi lúc chạy chứ không báo trước.',
      errors:
        '- Quên ép kiểu: `input() + 1` → `TypeError` vì đang cộng chuỗi với số.\n- `int("3.5")` → `ValueError`; dùng `float()` cho số thực.\n- Đặt tên biến bắt đầu bằng số: `1ten = 3` → `SyntaxError`.',
      takeaways:
        "- `input()` trả về `str`.\n- Dùng `type()` để xem kiểu của giá trị.\n- Đọc nhiều số trên một dòng: `map(int, input().split())`.",
      practice:
        "Làm trắc nghiệm về kiểu dữ liệu, rồi viết chương trình đọc hai số và in tổng.",
    },
    exercises: [
      {
        kind: "QUIZ",
        key: "types-quiz",
        title: "Trắc nghiệm: Biến và kiểu dữ liệu",
        points: 30,
        prompt: "Năm câu hỏi về biến, kiểu dữ liệu và input().",
        questions: [
          {
            prompt: "type(3.0) trả về kiểu nào?",
            options: ["int", "float", "str", "bool"],
            answer: 1,
            explanation: "Có phần thập phân (dù bằng 0) nên là float.",
          },
          {
            prompt: "Giá trị trả về của input() luôn có kiểu gì?",
            options: ["int", "float", "str", "Tùy người dùng nhập"],
            answer: 2,
            explanation:
              "input() luôn trả về chuỗi; muốn tính toán phải ép kiểu.",
          },
          {
            prompt: "Tên biến nào hợp lệ?",
            options: ["2so", "so-luong", "so_luong", "for"],
            answer: 2,
            explanation:
              "Không bắt đầu bằng số, không có dấu -, không trùng từ khóa như for.",
          },
          {
            prompt: 'Kết quả của int("7") + 3 là gì?',
            options: ["73", "10", "Lỗi TypeError", '"10"'],
            answer: 1,
            explanation: 'int("7") đổi chuỗi thành số 7, cộng 3 được 10.',
          },
          {
            prompt: 'Biểu thức "5" + 3 cho kết quả gì?',
            options: ["8", "53", "Lỗi TypeError", '"8"'],
            answer: 2,
            explanation:
              "Python không tự cộng chuỗi với số; cần ép kiểu một trong hai.",
          },
        ],
      },
      {
        kind: "CODE",
        key: "sum-two",
        title: "Tổng hai số",
        difficulty: Difficulty.EASY,
        points: 60,
        prompt:
          "Đọc hai số nguyên a và b trên cùng một dòng, in ra tổng của chúng.\n\n**Input:** một dòng gồm a và b (|a|, |b| ≤ 10^9).\n\n**Output:** a + b.\n\n```\nInput:  3 4\nOutput: 7\n```",
        tests: cases(
          ["3 4", "-5 12", "0 0", "1000000000 1000000000", "-7 -8", "123 -123"],
          (input) => {
            const [a, b] = ints(input);
            return String(a + b);
          },
        ),
      },
    ],
  },
  {
    title: "Toán tử và biểu thức",
    description:
      "Các phép toán số học, so sánh, logic và thứ tự ưu tiên khi tính biểu thức.",
    videos: [
      {
        id: "EsUFLZcOp2g",
        caption: "TITV · Lập trình Python 09: Các phép toán số học cơ bản",
      },
      {
        id: "95Ual9dXSc0",
        caption: "TITV · Lập trình Python 10: Toán tử so sánh và logic",
      },
    ],
    parts: {
      overview:
        'Toán tử là "động từ" của chương trình: cộng, so sánh, kết hợp điều kiện. Bài này giúp bạn viết đúng biểu thức và hiểu Python tính theo thứ tự nào.',
      concept:
        "**Toán tử** là ký hiệu thực hiện một phép tính trên các **toán hạng**. **Biểu thức** là tổ hợp giá trị, biến và toán tử cho ra một giá trị, ví dụ `a * 2 + 1`.",
      characteristics:
        "- `/` luôn cho số thực: `7 / 2 = 3.5`.\n- `//` chia lấy phần nguyên, `%` lấy phần dư.\n- `**` là lũy thừa: `2 ** 10 = 1024`.\n- So sánh trả về `True` hoặc `False`.",
      classification:
        "- **Số học:** `+ - * / // % **`\n- **So sánh:** `== != < <= > >=`\n- **Logic:** `and or not`\n- **Gán kết hợp:** `+= -= *= //=`",
      mechanism:
        "Python tính theo **độ ưu tiên**: `**` trước, rồi `* / // %`, rồi `+ -`, rồi so sánh, cuối cùng là `not`, `and`, `or`. Cùng mức thì tính từ trái sang phải. Dùng ngoặc `()` khi muốn đổi thứ tự.",
      syntax:
        "```python\nprint(17 // 5, 17 % 5)   # 3 2\nprint(2 + 3 * 4)          # 14\nprint((2 + 3) * 4)        # 20\nx = 10\nx += 5                    # x = 15\nprint(x > 10 and x < 20)  # True\n```",
      example:
        "Đổi tổng số giây ra giờ, phút, giây:\n\n```python\ns = int(input())\nh = s // 3600\nm = s % 3600 // 60\nprint(h, m, s % 60)\n```\n\nNhập `3725` in ra `1 2 5`.",
      application:
        "Tính tiền hóa đơn, đổi đơn vị, kiểm tra số chẵn lẻ (`n % 2 == 0`), kiểm tra năm nhuận, tính điểm trung bình.",
      prosCons:
        "**Ưu:** số nguyên Python không bị tràn, tính được số rất lớn.\n\n**Nhược:** số thực có sai số làm tròn: `0.1 + 0.2` ra `0.30000000000000004`.",
      errors:
        "- Nhầm `=` (gán) với `==` (so sánh).\n- Dùng `/` khi cần số nguyên: `7 / 2` là `3.5`, phải dùng `//`.\n- Chia cho 0 → `ZeroDivisionError`.",
      takeaways:
        "- `//` chia nguyên, `%` chia dư, `**` lũy thừa.\n- Nhân chia trước, cộng trừ sau; ngoặc luôn được tính trước.\n- So sánh số thực nên dùng sai số nhỏ thay vì `==`.",
      practice:
        "Làm trắc nghiệm về độ ưu tiên, rồi viết chương trình đổi giây ra giờ phút giây.",
    },
    exercises: [
      {
        kind: "QUIZ",
        key: "operators-quiz",
        title: "Trắc nghiệm: Toán tử",
        points: 30,
        prompt: "Tính nhẩm kết quả của từng biểu thức.",
        questions: [
          {
            prompt: "17 // 5 bằng bao nhiêu?",
            options: ["3.4", "3", "2", "4"],
            answer: 1,
            explanation: "// lấy phần nguyên của phép chia: 17 = 5·3 + 2.",
          },
          {
            prompt: "17 % 5 bằng bao nhiêu?",
            options: ["2", "3", "3.4", "0"],
            answer: 0,
            explanation: "% lấy phần dư: 17 chia 5 dư 2.",
          },
          {
            prompt: "2 + 3 * 4 ** 2 bằng bao nhiêu?",
            options: ["400", "50", "196", "80"],
            answer: 1,
            explanation:
              "Lũy thừa trước: 4**2 = 16, rồi 3*16 = 48, cộng 2 được 50.",
          },
          {
            prompt: "not (3 > 2 and 2 > 5) cho kết quả gì?",
            options: ["True", "False", "Lỗi", "None"],
            answer: 0,
            explanation:
              "3>2 đúng, 2>5 sai nên and cho False; not False là True.",
          },
        ],
      },
      {
        kind: "CODE",
        key: "seconds",
        title: "Đổi giây ra giờ, phút, giây",
        difficulty: Difficulty.EASY,
        points: 70,
        prompt:
          "Cho số giây s (0 ≤ s ≤ 10^6). In ra số giờ, phút, giây tương ứng, cách nhau bởi dấu cách.\n\n```\nInput:  3725\nOutput: 1 2 5\n```",
        tests: cases(
          ["3725", "0", "59", "3600", "86399", "1000000"],
          (input) => {
            const s = Number(input);
            return `${Math.floor(s / 3600)} ${Math.floor((s % 3600) / 60)} ${s % 60}`;
          },
        ),
      },
    ],
  },
  {
    title: "Câu lệnh điều kiện if, elif, else",
    description:
      "Cho chương trình rẽ nhánh theo điều kiện: xếp loại, kiểm tra số, so sánh giá trị.",
    videos: [
      {
        id: "D3S6uIUKB_w",
        caption: "TITV · Lập trình Python 14: Câu lệnh rẽ nhánh if else",
      },
    ],
    parts: {
      overview:
        "Đến giờ chương trình luôn chạy thẳng một mạch. Câu lệnh điều kiện cho phép **chọn đường đi** tùy dữ liệu, ví dụ đậu hay rớt, chẵn hay lẻ.",
      concept:
        "**Câu lệnh điều kiện** kiểm tra một biểu thức đúng/sai. Nếu đúng thì chạy khối lệnh bên trong, nếu sai thì bỏ qua hoặc chạy nhánh khác.",
      characteristics:
        "- Khối lệnh được xác định bằng **thụt lề** (thường 4 dấu cách).\n- Có thể có nhiều `elif`, tối đa một `else`.\n- Chỉ **một** nhánh được chạy: nhánh đầu tiên có điều kiện đúng.",
      classification:
        "- `if` một nhánh.\n- `if ... else` hai nhánh.\n- `if ... elif ... else` nhiều nhánh.\n- **Toán tử 3 ngôi:** `x if dieu_kien else y`.",
      mechanism:
        "Python tính điều kiện của `if`. Đúng → chạy khối `if` rồi bỏ qua phần còn lại. Sai → thử `elif` kế tiếp. Không điều kiện nào đúng → chạy `else` (nếu có).",
      syntax:
        '```python\nif diem >= 8:\n    print("Giỏi")\nelif diem >= 6.5:\n    print("Khá")\nelif diem >= 5:\n    print("Trung bình")\nelse:\n    print("Yếu")\n\nnhan = "chẵn" if n % 2 == 0 else "lẻ"\n```',
      example:
        'Kiểm tra năm nhuận:\n\n```python\nnam = int(input())\nif (nam % 4 == 0 and nam % 100 != 0) or nam % 400 == 0:\n    print("Nhuận")\nelse:\n    print("Không nhuận")\n```',
      application:
        "Xếp loại học lực, kiểm tra đăng nhập, tính phí ship theo khoảng cách, game kiểm tra thắng thua.",
      prosCons:
        "**Ưu:** dễ đọc, gần với cách nói tự nhiên.\n\n**Nhược:** nhiều `elif` lồng nhau sẽ khó theo dõi; khi đó nên tách thành hàm hoặc dùng bảng tra.",
      errors:
        '- Quên dấu `:` sau điều kiện → `SyntaxError`.\n- Thụt lề không đều → `IndentationError`.\n- Sắp xếp sai thứ tự: kiểm tra `diem >= 5` trước `diem >= 8` thì không bao giờ ra "Giỏi".',
      takeaways:
        "- Điều kiện đầu tiên đúng thắng, các nhánh sau bị bỏ qua.\n- Xếp điều kiện từ chặt đến lỏng.\n- Thụt lề là một phần của cú pháp.",
      practice: "Làm trắc nghiệm, sau đó viết chương trình xếp loại học lực.",
    },
    exercises: [
      {
        kind: "QUIZ",
        key: "if-quiz",
        title: "Trắc nghiệm: Câu lệnh điều kiện",
        points: 30,
        prompt: "Đọc đoạn code và chọn kết quả đúng.",
        questions: [
          {
            prompt:
              'x = 7\nif x > 5:\n    print("A")\nelif x > 3:\n    print("B")\n\nChương trình in ra gì?',
            options: ["A", "B", "A rồi B", "Không in gì"],
            answer: 0,
            explanation: "Chỉ nhánh đầu tiên đúng được chạy.",
          },
          {
            prompt: "Dòng nào viết đúng cú pháp?",
            options: ["if x > 0", "if (x > 0) {", "if x > 0:", "if x > 0 then"],
            answer: 2,
            explanation:
              "Python cần dấu hai chấm sau điều kiện và không dùng ngoặc nhọn.",
          },
          {
            prompt: '"lẻ" if 4 % 2 else "chẵn" cho kết quả gì?',
            options: ['"lẻ"', '"chẵn"', "0", "Lỗi"],
            answer: 1,
            explanation: "4 % 2 = 0 được xem là False, nên lấy nhánh else.",
          },
          {
            prompt: "Năm nào là năm nhuận?",
            options: ["1900", "2100", "2000", "2023"],
            answer: 2,
            explanation:
              "Chia hết cho 400 thì nhuận; 1900 và 2100 chia hết cho 100 nhưng không chia hết cho 400.",
          },
        ],
      },
      {
        kind: "CODE",
        key: "grade",
        title: "Xếp loại học lực",
        difficulty: Difficulty.EASY,
        points: 80,
        prompt:
          "Cho điểm trung bình d (0 ≤ d ≤ 10, số thực). In ra xếp loại:\n\n- d ≥ 8: `Gioi`\n- 6.5 ≤ d < 8: `Kha`\n- 5 ≤ d < 6.5: `Trung binh`\n- d < 5: `Yeu`\n\n```\nInput:  7.2\nOutput: Kha\n```",
        tests: cases(
          ["7.2", "8", "9.75", "6.5", "6.49", "5", "4.9", "0", "10"],
          (input) => {
            const d = Number(input);
            return d >= 8
              ? "Gioi"
              : d >= 6.5
                ? "Kha"
                : d >= 5
                  ? "Trung binh"
                  : "Yeu";
          },
        ),
      },
    ],
  },
  {
    title: "Vòng lặp for và range",
    description:
      "Lặp một khối lệnh với số lần biết trước, duyệt dãy số bằng range().",
    videos: [
      {
        id: "1sixkaqdZNs",
        caption: "TITV · Lập trình Python 18: Giới thiệu vòng lặp for",
      },
      {
        id: "THFdq7T0RRk",
        caption: "TITV · Lập trình Python 19: Vòng lặp lồng nhau",
      },
    ],
    parts: {
      overview:
        "Thay vì viết 100 lệnh `print`, ta viết một vòng lặp. Bài này giới thiệu `for` và `range()`, công cụ dùng nhiều nhất trong các bài thuật toán.",
      concept:
        "**Vòng lặp for** lần lượt lấy từng phần tử của một dãy (range, chuỗi, list...) gán vào biến lặp và chạy khối lệnh với mỗi phần tử.",
      characteristics:
        "- Số lần lặp bằng số phần tử của dãy.\n- `range(a, b)` gồm a, a+1, ..., **b-1** (không gồm b).\n- Có thể lồng vòng lặp trong vòng lặp.",
      classification:
        '- `range(n)`: 0 → n-1\n- `range(a, b)`: a → b-1\n- `range(a, b, buoc)`: nhảy theo bước, ví dụ `range(10, 0, -2)` → 10 8 6 4 2\n- Duyệt chuỗi: `for ch in "abc"`',
      mechanism:
        "Mỗi vòng, Python lấy phần tử kế tiếp gán cho biến lặp rồi chạy khối lệnh. Hết phần tử thì thoát vòng lặp và chạy lệnh tiếp theo sau khối.",
      syntax:
        '```python\nfor i in range(1, 6):\n    print(i, end=" ")   # 1 2 3 4 5\n\ntong = 0\nfor i in range(1, n + 1):\n    tong += i\n```',
      example:
        'In bảng cửu chương 3:\n\n```python\nfor i in range(1, 11):\n    print(f"3 x {i} = {3 * i}")\n```',
      application:
        "Tính tổng, đếm, in bảng, duyệt danh sách sinh viên, xử lý từng dòng trong file.",
      prosCons:
        "**Ưu:** ngắn gọn, khó lặp vô hạn vì số lần đã biết trước.\n\n**Nhược:** vòng lặp lồng nhiều tầng chạy chậm với dữ liệu lớn (n² hoặc n³ phép tính).",
      errors:
        "- Quên rằng `range(1, n)` không gồm n: tính tổng 1..n phải dùng `range(1, n + 1)`.\n- Quên thụt lề khối lệnh bên trong.\n- Khai báo `tong = 0` bên trong vòng lặp làm tổng bị đặt lại mỗi vòng.",
      takeaways:
        '- `range(a, b)` dừng trước b.\n- Biến tích lũy (`tong`, `dem`) khởi tạo **trước** vòng lặp.\n- f-string `f"{x}"` giúp in đẹp hơn.',
      practice:
        "Làm trắc nghiệm về range(), rồi viết chương trình tính tổng 1 đến n và tổng các số chẵn.",
    },
    exercises: [
      {
        kind: "QUIZ",
        key: "for-quiz",
        title: "Trắc nghiệm: Vòng lặp for",
        points: 30,
        prompt: "Chú ý điểm dừng của range().",
        questions: [
          {
            prompt: "list(range(2, 6)) là gì?",
            options: [
              "[2, 3, 4, 5, 6]",
              "[2, 3, 4, 5]",
              "[3, 4, 5, 6]",
              "[2, 6]",
            ],
            answer: 1,
            explanation: "range dừng trước giá trị cuối.",
          },
          {
            prompt: "range(10, 0, -3) sinh ra dãy nào?",
            options: ["10 7 4 1", "10 7 4", "9 6 3", "10 7 4 1 -2"],
            answer: 0,
            explanation: "Bắt đầu từ 10, mỗi lần trừ 3, dừng trước 0.",
          },
          {
            prompt:
              "Vòng for i in range(3): for j in range(4): ... chạy khối trong bao nhiêu lần?",
            options: ["7", "12", "3", "4"],
            answer: 1,
            explanation: "Vòng lồng nhau: 3 × 4 = 12 lần.",
          },
          {
            prompt: "Để tính tổng 1 + 2 + ... + n, nên dùng?",
            options: [
              "range(n)",
              "range(1, n)",
              "range(1, n + 1)",
              "range(0, n - 1)",
            ],
            answer: 2,
            explanation: "Cần gồm cả n nên điểm dừng là n + 1.",
          },
        ],
      },
      {
        kind: "CODE",
        key: "sum-to-n",
        title: "Tổng từ 1 đến n",
        difficulty: Difficulty.EASY,
        points: 60,
        prompt:
          "Cho n (1 ≤ n ≤ 10^6). In ra tổng 1 + 2 + ... + n.\n\n```\nInput:  5\nOutput: 15\n```",
        tests: cases(["5", "1", "10", "100", "999999", "1000000"], (input) => {
          const n = BigInt(input);
          return String((n * (n + BigInt(1))) / BigInt(2));
        }),
      },
      {
        kind: "CODE",
        key: "even-sum",
        title: "Tổng các số chẵn trong đoạn",
        difficulty: Difficulty.MEDIUM,
        points: 80,
        prompt:
          "Cho hai số nguyên a, b (a ≤ b, |a|, |b| ≤ 10^5). In ra tổng các số chẵn trong đoạn [a, b].\n\n```\nInput:  1 10\nOutput: 30\n```",
        tests: cases(
          ["1 10", "2 2", "3 3", "-4 4", "-7 -1", "0 100000"],
          (input) => {
            const [a, b] = ints(input);
            let total = 0;
            for (let i = a; i <= b; i++) if (i % 2 === 0) total += i;
            return String(total);
          },
        ),
      },
    ],
  },
  {
    title: "Vòng lặp while, break và continue",
    description:
      "Lặp khi chưa biết trước số lần, thoát sớm bằng break và bỏ qua vòng bằng continue.",
    videos: [
      {
        id: "jGIkirt7JmE",
        caption: "TITV · Lập trình Python 21: Vòng lặp while",
      },
      {
        id: "5YE3Ofqx0eU",
        caption: "TITV · Lập trình Python 23: Lệnh break và continue",
      },
    ],
    parts: {
      overview:
        "Có những việc không biết trước phải lặp mấy lần: nhập đến khi đúng mật khẩu, chia đến khi hết chữ số. Đó là lúc dùng `while`.",
      concept:
        "**Vòng lặp while** chạy khối lệnh **chừng nào** điều kiện còn đúng. `break` thoát hẳn vòng lặp, `continue` bỏ qua phần còn lại của vòng hiện tại.",
      characteristics:
        "- Điều kiện được kiểm tra **trước** mỗi vòng.\n- Thân vòng lặp phải làm điều kiện thay đổi, nếu không sẽ lặp vô hạn.\n- `while True` kết hợp `break` là mẫu quen thuộc khi đọc dữ liệu.",
      classification:
        "- `while dieu_kien:` lặp có điều kiện.\n- `while True: ... break` lặp đến khi gặp điểm dừng.\n- `continue` để bỏ qua phần tử không hợp lệ.",
      mechanism:
        "Python kiểm tra điều kiện. Đúng → chạy thân rồi quay lại kiểm tra. Sai → thoát. Gặp `break` thì thoát ngay, gặp `continue` thì nhảy về bước kiểm tra.",
      syntax:
        "```python\nn = 1234\ntong = 0\nwhile n > 0:\n    tong += n % 10   # lấy chữ số cuối\n    n //= 10         # bỏ chữ số cuối\nprint(tong)          # 10\n```",
      example:
        'Đoán số:\n\n```python\nbi_mat = 7\nwhile True:\n    x = int(input("Đoán: "))\n    if x == bi_mat:\n        print("Đúng rồi!")\n        break\n    print("Sai, thử lại")\n```',
      application:
        "Menu chương trình chạy đến khi chọn Thoát, xử lý chữ số, thuật toán Euclid tìm ước chung lớn nhất, game loop.",
      prosCons:
        "**Ưu:** linh hoạt, dùng được khi không biết trước số lần lặp.\n\n**Nhược:** dễ lặp vô hạn nếu quên cập nhật biến điều kiện.",
      errors:
        "- Quên `n //= 10` trong vòng lặp tách chữ số → treo chương trình.\n- Dùng `while` khi `for` đơn giản hơn.\n- Đặt `continue` trước lệnh cập nhật biến đếm → lặp vô hạn.",
      takeaways:
        "- `while` cho số lần lặp chưa biết trước.\n- Luôn chắc chắn điều kiện sẽ có lúc sai.\n- `n % 10` lấy chữ số cuối, `n // 10` bỏ chữ số cuối.",
      practice:
        "Làm trắc nghiệm rồi viết chương trình tính tổng chữ số và ước chung lớn nhất.",
    },
    exercises: [
      {
        kind: "QUIZ",
        key: "while-quiz",
        title: "Trắc nghiệm: while, break, continue",
        points: 30,
        prompt: "Theo dõi giá trị biến qua từng vòng lặp.",
        questions: [
          {
            prompt: "i = 0\nwhile i < 3:\n    i += 1\nprint(i)\n\nIn ra gì?",
            options: ["2", "3", "4", "Lặp vô hạn"],
            answer: 1,
            explanation: "Vòng lặp dừng khi i = 3.",
          },
          {
            prompt: "Lệnh nào thoát hẳn khỏi vòng lặp?",
            options: ["continue", "pass", "break", "return 0"],
            answer: 2,
            explanation:
              "break thoát vòng lặp; continue chỉ bỏ qua vòng hiện tại.",
          },
          {
            prompt:
              'for i in range(5):\n    if i == 2:\n        continue\n    print(i, end="")\n\nIn ra gì?',
            options: ["01234", "0134", "01", "234"],
            answer: 1,
            explanation: "Vòng i = 2 bị bỏ qua phần print.",
          },
          {
            prompt: "Biểu thức lấy chữ số cuối của n là?",
            options: ["n // 10", "n % 10", "n / 10", "n ** 10"],
            answer: 1,
            explanation: "Phần dư khi chia 10 chính là chữ số hàng đơn vị.",
          },
        ],
      },
      {
        kind: "CODE",
        key: "digit-sum",
        title: "Tổng các chữ số",
        difficulty: Difficulty.EASY,
        points: 60,
        prompt:
          "Cho số nguyên không âm n (n ≤ 10^18). In ra tổng các chữ số của n.\n\n```\nInput:  1234\nOutput: 10\n```",
        tests: cases(
          ["1234", "0", "9", "1000000", "999999999999999999", "505050"],
          (input) =>
            String([...input.trim()].reduce((sum, ch) => sum + Number(ch), 0)),
        ),
      },
      {
        kind: "CODE",
        key: "gcd",
        title: "Ước chung lớn nhất",
        difficulty: Difficulty.MEDIUM,
        points: 90,
        prompt:
          "Cho hai số nguyên dương a, b (≤ 10^9). In ra ước chung lớn nhất của chúng. Gợi ý: thuật toán Euclid với vòng lặp while.\n\n```\nInput:  12 18\nOutput: 6\n```",
        tests: cases(
          ["12 18", "7 13", "100 10", "1 1", "1000000000 999999999", "48 180"],
          (input) => {
            let [a, b] = ints(input);
            while (b) [a, b] = [b, a % b];
            return String(a);
          },
        ),
      },
    ],
  },
  {
    title: "Chuỗi ký tự (String)",
    description:
      "Truy cập ký tự, cắt chuỗi, các phương thức upper, lower, split, replace và đảo chuỗi.",
    videos: [
      {
        id: "TOSpEvVM1OY",
        caption: "TITV · Lập trình Python 20: Kiểu dữ liệu String",
      },
    ],
    parts: {
      overview:
        "Tên người, tin nhắn, mật khẩu đều là chuỗi. Bài này giúp bạn tách, ghép, cắt và biến đổi chuỗi bằng những công cụ có sẵn của Python.",
      concept:
        "**Chuỗi** (`str`) là dãy ký tự có thứ tự, đặt trong `\"...\"` hoặc `'...'`. Mỗi ký tự có **chỉ số** bắt đầu từ 0; chỉ số âm đếm từ cuối.",
      characteristics:
        '- Chuỗi **bất biến**: không sửa trực tiếp được `s[0] = "A"`, phải tạo chuỗi mới.\n- `len(s)` cho độ dài.\n- Dùng `in` để kiểm tra chuỗi con: `"py" in "python"`.',
      classification:
        '- **Truy cập:** `s[0]`, `s[-1]`\n- **Cắt (slicing):** `s[a:b]`, `s[::-1]`\n- **Phương thức:** `upper()`, `lower()`, `strip()`, `split()`, `replace()`, `count()`, `find()`\n- **Ghép:** `+`, `*`, `" ".join(list)`',
      mechanism:
        "`s[a:b:buoc]` lấy ký tự từ vị trí a đến **trước** b theo bước nhảy. Bỏ trống a là từ đầu, bỏ trống b là đến hết, bước -1 là đi ngược.",
      syntax:
        "```python\ns = \"Python\"\nprint(s[0], s[-1])    # P n\nprint(s[1:4])          # yth\nprint(s[::-1])         # nohtyP\nprint(s.upper())       # PYTHON\nprint(\"a,b,c\".split(\",\"))  # ['a', 'b', 'c']\n```",
      example:
        'Đếm nguyên âm trong câu:\n\n```python\ncau = input().lower()\ndem = 0\nfor ch in cau:\n    if ch in "aeiou":\n        dem += 1\nprint(dem)\n```',
      application:
        "Chuẩn hóa họ tên, kiểm tra mật khẩu, tách dữ liệu CSV, tìm kiếm từ khóa, kiểm tra chuỗi đối xứng.",
      prosCons:
        "**Ưu:** rất nhiều phương thức có sẵn, slicing gọn.\n\n**Nhược:** vì bất biến nên ghép chuỗi liên tục trong vòng lặp lớn sẽ chậm; nên gom vào list rồi `join`.",
      errors:
        '- Truy cập ngoài phạm vi: `s[len(s)]` → `IndexError`.\n- Quên `split()` trả về **list**, không phải chuỗi.\n- Gán `s[0] = "x"` → `TypeError` vì chuỗi bất biến.',
      takeaways:
        "- Chỉ số bắt đầu từ 0, `-1` là ký tự cuối.\n- `s[::-1]` đảo chuỗi.\n- Phương thức trả về chuỗi mới, chuỗi gốc không đổi.",
      practice:
        "Làm trắc nghiệm về slicing, rồi viết chương trình kiểm tra chuỗi đối xứng và chuẩn hóa họ tên.",
    },
    exercises: [
      {
        kind: "QUIZ",
        key: "string-quiz",
        title: "Trắc nghiệm: Chuỗi ký tự",
        points: 30,
        prompt: 'Với s = "CodeCarf", hãy trả lời các câu dưới đây.',
        questions: [
          {
            prompt: "s[2:5] là gì?",
            options: ['"deC"', '"odeC"', '"de"', '"deCa"'],
            answer: 0,
            explanation: "Lấy vị trí 2, 3, 4: d, e, C.",
          },
          {
            prompt: "s[-1] là gì?",
            options: ['"C"', '"f"', '"r"', "Lỗi"],
            answer: 1,
            explanation: "-1 là ký tự cuối cùng.",
          },
          {
            prompt: "len(s) bằng bao nhiêu?",
            options: ["7", "8", "9", "6"],
            answer: 1,
            explanation: "C-o-d-e-C-a-r-f có 8 ký tự.",
          },
          {
            prompt: '"a b  c".split() trả về?',
            options: [
              '["a", "b", "", "c"]',
              '["a", "b", "c"]',
              '"abc"',
              '["a b  c"]',
            ],
            answer: 1,
            explanation:
              "split() không đối số tách theo mọi khoảng trắng và bỏ phần rỗng.",
          },
        ],
      },
      {
        kind: "CODE",
        key: "palindrome",
        title: "Chuỗi đối xứng",
        difficulty: Difficulty.EASY,
        points: 60,
        prompt:
          "Cho một chuỗi chỉ gồm chữ cái thường (độ dài ≤ 1000). In `YES` nếu chuỗi đọc xuôi và ngược giống nhau, ngược lại in `NO`.\n\n```\nInput:  racecar\nOutput: YES\n```",
        tests: cases(
          ["racecar", "python", "a", "abba", "abca", "level"],
          (input) => {
            const s = input.trim();
            return s === [...s].reverse().join("") ? "YES" : "NO";
          },
        ),
      },
      {
        kind: "CODE",
        key: "normalize-name",
        title: "Chuẩn hóa họ tên",
        difficulty: Difficulty.MEDIUM,
        points: 80,
        prompt:
          "Cho một họ tên không dấu có thể thừa khoảng trắng và viết hoa lộn xộn. In ra họ tên chuẩn: các từ cách nhau một dấu cách, mỗi từ viết hoa chữ cái đầu, còn lại viết thường.\n\n```\nInput:    nGUYEN   van  aN\nOutput: Nguyen Van An\n```",
        tests: cases(
          [
            "  nGUYEN   van  aN",
            "tran thi b",
            "LE",
            "  pham   MINH   khoi  ",
            "do Thanh nam",
          ],
          (input) =>
            input
              .trim()
              .split(/\s+/)
              .map(
                (word) => word[0].toUpperCase() + word.slice(1).toLowerCase(),
              )
              .join(" "),
        ),
      },
    ],
  },
  {
    title: "Danh sách (List)",
    description:
      "Lưu nhiều giá trị trong một biến, thêm xóa phần tử, duyệt và tính toán trên list.",
    videos: [
      {
        id: "zhc7RWG-hGk",
        caption: "TITV · Lập trình Python 17: Kiểu dữ liệu List",
      },
    ],
    parts: {
      overview:
        "Khi cần lưu điểm của cả lớp, ta không thể tạo 40 biến. **List** gom nhiều giá trị vào một chỗ và đi kèm nhiều thao tác tiện lợi.",
      concept:
        "**List** là dãy có thứ tự, **thay đổi được**, chứa các phần tử bất kỳ, viết trong ngoặc vuông: `[3, 1, 4]`. Truy cập theo chỉ số giống chuỗi.",
      characteristics:
        "- Thêm, sửa, xóa phần tử được.\n- Có thể chứa nhiều kiểu khác nhau, kể cả list khác.\n- Hỗ trợ slicing như chuỗi.\n- Hàm có sẵn: `len`, `sum`, `max`, `min`, `sorted`.",
      classification:
        "- **Thêm:** `append(x)`, `insert(i, x)`, `extend(list)`\n- **Xóa:** `remove(x)`, `pop(i)`, `del a[i]`\n- **Sắp xếp:** `a.sort()`, `sorted(a)`, `a.reverse()`\n- **Tạo nhanh:** list comprehension `[x * 2 for x in a]`",
      mechanism:
        "List lưu các tham chiếu tới phần tử theo thứ tự. `append` thêm vào cuối rất nhanh; `insert` vào đầu phải dời mọi phần tử nên chậm hơn với list lớn.",
      syntax:
        "```python\na = list(map(int, input().split()))\na.append(10)\nprint(len(a), sum(a), max(a))\nchan = [x for x in a if x % 2 == 0]\na.sort(reverse=True)   # giảm dần\n```",
      example:
        "Tìm điểm cao nhất và vị trí của nó:\n\n```python\ndiem = [7, 9, 6, 9, 8]\ncao_nhat = max(diem)\nvi_tri = diem.index(cao_nhat)   # 1\nprint(cao_nhat, vi_tri)\n```",
      application:
        "Danh sách sinh viên, giỏ hàng, lịch sử điểm, dữ liệu đọc từ file CSV, bảng xếp hạng.",
      prosCons:
        "**Ưu:** linh hoạt, nhiều phương thức có sẵn, dễ duyệt bằng `for`.\n\n**Nhược:** tìm kiếm `x in a` phải duyệt cả list; với dữ liệu lớn nên dùng `set` hoặc `dict`.",
      errors:
        "- `a = a.sort()` làm `a` thành `None` vì `sort()` sửa tại chỗ và trả về `None`.\n- Sửa list trong lúc đang duyệt chính nó.\n- `b = a` không tạo bản sao; dùng `b = a.copy()`.",
      takeaways:
        "- `sort()` sửa tại chỗ, `sorted()` trả về list mới.\n- Đọc dãy số trên một dòng: `list(map(int, input().split()))`.\n- List comprehension giúp lọc và biến đổi gọn.",
      practice:
        "Làm trắc nghiệm về list, rồi viết chương trình tìm số lớn thứ hai và đếm phần tử dương.",
    },
    exercises: [
      {
        kind: "QUIZ",
        key: "list-quiz",
        title: "Trắc nghiệm: List",
        points: 30,
        prompt: "Các thao tác thường gặp với list.",
        questions: [
          {
            prompt: "a = [1, 2, 3]\na.append([4, 5])\nlen(a) bằng?",
            options: ["5", "4", "3", "Lỗi"],
            answer: 1,
            explanation: "append thêm cả list [4, 5] như một phần tử.",
          },
          {
            prompt: "a = [3, 1, 2]\nb = a.sort()\nb là gì?",
            options: ["[1, 2, 3]", "[3, 1, 2]", "None", "Lỗi"],
            answer: 2,
            explanation: "sort() sắp xếp tại chỗ và trả về None.",
          },
          {
            prompt: "[x * x for x in range(4)] là?",
            options: [
              "[1, 4, 9, 16]",
              "[0, 1, 4, 9]",
              "[0, 2, 4, 6]",
              "[0, 1, 2, 3]",
            ],
            answer: 1,
            explanation: "range(4) là 0..3, bình phương từng số.",
          },
          {
            prompt: "Cách tạo bản sao độc lập của list a?",
            options: ["b = a", "b = a.copy()", "b == a", "b = &a"],
            answer: 1,
            explanation: "b = a chỉ tạo thêm tên trỏ cùng list.",
          },
        ],
      },
      {
        kind: "CODE",
        key: "second-max",
        title: "Số lớn thứ hai",
        difficulty: Difficulty.MEDIUM,
        points: 90,
        prompt:
          "Dòng đầu là n (2 ≤ n ≤ 10^5), dòng hai gồm n số nguyên. In ra giá trị lớn thứ hai **khác** giá trị lớn nhất; nếu mọi số bằng nhau in `NONE`.\n\n```\nInput:\n5\n4 9 2 9 7\nOutput: 7\n```",
        tests: cases(
          [
            "5\n4 9 2 9 7",
            "2\n3 3",
            "3\n-1 -5 -3",
            "4\n1 2 3 4",
            "6\n10 10 10 9 10 10",
          ],
          (input) => {
            const values = [...new Set(ints(lines(input)[1]))].sort(
              (x, y) => y - x,
            );
            return values.length < 2 ? "NONE" : String(values[1]);
          },
        ),
      },
    ],
  },
  {
    title: "Hàm (Function)",
    description:
      "Đóng gói đoạn code thành hàm có tham số và giá trị trả về để dùng lại nhiều lần.",
    videos: [
      {
        id: "M5nyWDVK_XU",
        caption: "TITV · Lập trình Python 29: Xây dựng hàm trong Python",
      },
      {
        id: "X8xISutNkVA",
        caption: "TITV · Lập trình Python 30: Lambda function",
      },
    ],
    parts: {
      overview:
        "Khi một đoạn code được dùng nhiều lần, ta đặt cho nó một cái tên: đó là **hàm**. Bài cuối giúp bạn tổ chức chương trình gọn gàng, dễ đọc và dễ sửa.",
      concept:
        "**Hàm** là một khối lệnh có tên, nhận **tham số** đầu vào và có thể **trả về** kết quả bằng `return`. Gọi hàm là chạy khối lệnh đó với giá trị cụ thể.",
      characteristics:
        "- Định nghĩa bằng `def`, gọi bằng tên kèm ngoặc.\n- Biến tạo trong hàm là **biến cục bộ**, bên ngoài không thấy.\n- Không có `return` thì hàm trả về `None`.\n- Tham số có thể có giá trị mặc định.",
      classification:
        "- Hàm không tham số, có tham số, tham số mặc định.\n- Hàm trả về một hoặc nhiều giá trị (`return a, b`).\n- **Hàm lambda:** hàm ngắn một dòng, `lambda x: x * 2`.\n- Hàm có sẵn: `len`, `max`, `abs`, `round`...",
      mechanism:
        "Khi gọi `f(3)`, Python tạo vùng nhớ riêng cho hàm, gán tham số bằng 3, chạy thân hàm. Gặp `return` thì kết thúc hàm ngay và đưa giá trị về chỗ gọi.",
      syntax:
        "```python\ndef la_so_nguyen_to(n):\n    if n < 2:\n        return False\n    i = 2\n    while i * i <= n:\n        if n % i == 0:\n            return False\n        i += 1\n    return True\n\nprint(la_so_nguyen_to(17))   # True\n```",
      example:
        'Hàm với tham số mặc định:\n\n```python\ndef chao(ten, loi="Xin chào"):\n    return f"{loi}, {ten}!"\n\nprint(chao("Ngân"))            # Xin chào, Ngân!\nprint(chao("Vy", "Hello"))     # Hello, Vy!\n```',
      application:
        "Tách chương trình lớn thành các phần nhỏ: hàm đọc dữ liệu, hàm tính toán, hàm in kết quả; viết thư viện dùng chung cho cả nhóm.",
      prosCons:
        "**Ưu:** tránh lặp code, dễ kiểm thử từng phần, dễ đọc.\n\n**Nhược:** chia quá nhỏ hoặc đặt tên mơ hồ khiến khó theo dõi luồng chương trình.",
      errors:
        "- Quên `return`, hàm trả về `None` rồi đem đi tính toán → `TypeError`.\n- Gọi hàm trước khi định nghĩa.\n- Dùng list làm giá trị mặc định (`def f(a=[])`) khiến dữ liệu bị giữ lại giữa các lần gọi.",
      takeaways:
        "- `def ten(tham_so):` rồi thụt lề thân hàm.\n- `return` kết thúc hàm và trả giá trị.\n- Mỗi hàm nên làm đúng một việc, tên hàm nói rõ việc đó.",
      practice:
        "Làm trắc nghiệm, viết hàm đếm số nguyên tố, rồi làm bài tự luận so sánh for và while trên giấy.",
    },
    exercises: [
      {
        kind: "QUIZ",
        key: "function-quiz",
        title: "Trắc nghiệm: Hàm",
        points: 30,
        prompt: "Kiểm tra hiểu biết về định nghĩa và gọi hàm.",
        questions: [
          {
            prompt: "def f(x):\n    x * 2\n\nf(3) trả về?",
            options: ["6", "None", "3", "Lỗi"],
            answer: 1,
            explanation: "Không có return nên hàm trả về None.",
          },
          {
            prompt: "Từ khóa định nghĩa hàm trong Python là?",
            options: ["function", "func", "def", "fn"],
            answer: 2,
            explanation: "Python dùng def.",
          },
          {
            prompt: "(lambda a, b: a + b)(2, 5) bằng?",
            options: ["7", "25", "(2, 5)", "Lỗi"],
            answer: 0,
            explanation: "Lambda nhận hai tham số và trả về tổng.",
          },
          {
            prompt: "def g(n, k=2):\n    return n ** k\n\ng(3) bằng?",
            options: ["6", "9", "8", "3"],
            answer: 1,
            explanation: "k mặc định là 2 nên 3 ** 2 = 9.",
          },
        ],
      },
      {
        kind: "CODE",
        key: "count-primes",
        title: "Đếm số nguyên tố",
        difficulty: Difficulty.MEDIUM,
        points: 100,
        prompt:
          "Viết hàm `la_so_nguyen_to(n)` rồi dùng nó để đếm số nguyên tố trong đoạn [1, n] (1 ≤ n ≤ 10^5).\n\n```\nInput:  10\nOutput: 4\n```\n\n(Các số nguyên tố ≤ 10 là 2, 3, 5, 7.)",
        tests: cases(["10", "1", "2", "100", "1000", "100000"], (input) => {
          const n = Number(input);
          const sieve = new Array(n + 1).fill(true);
          let count = 0;
          for (let i = 2; i <= n; i++) {
            if (!sieve[i]) continue;
            count += 1;
            for (let j = i * i; j <= n; j += i) sieve[j] = false;
          }
          return String(count);
        }),
      },
      {
        kind: "HANDWRITTEN",
        key: "for-vs-while",
        title: "Tự luận: So sánh for và while",
        difficulty: Difficulty.EASY,
        points: 50,
        prompt:
          "Trình bày trên giấy rồi chụp ảnh nộp bài:\n\n1. So sánh vòng lặp `for` và `while` (ít nhất 2 điểm khác nhau).\n2. Viết tay một hàm Python dùng `while` để đảo ngược một số nguyên dương, ví dụ 1234 → 4321.\n3. Cho biết với n = 1200 thì hàm trả về bao nhiêu và giải thích.",
        rubric:
          "Tổng 10 điểm.\n- Câu 1 (4 điểm): for dùng khi biết trước số lần lặp hoặc duyệt dãy; while lặp theo điều kiện, dùng khi chưa biết số lần; while có nguy cơ lặp vô hạn nếu không cập nhật điều kiện. Mỗi ý đúng 2 điểm, tối đa 4.\n- Câu 2 (4 điểm): có def và return (1 điểm); vòng while n > 0 (1 điểm); lấy chữ số cuối bằng n % 10 và ghép kq = kq * 10 + chu_so (1 điểm); bỏ chữ số cuối bằng n //= 10 (1 điểm).\n- Câu 3 (2 điểm): kết quả 21 vì các chữ số 0 ở cuối trở thành 0 ở đầu và bị mất khi biểu diễn dạng số.",
      },
    ],
  },
];

/**
 * Bài tự luận cho từng bài học (theo vị trí trong ROOMS), để mỗi bài đủ cả ba
 * hình thức: trắc nghiệm, code và tự luận. Học viên làm ra giấy rồi chụp ảnh nộp.
 */
const ESSAYS: Record<number, ExerciseSeed> = {
  0: {
    kind: "HANDWRITTEN",
    key: "essay-intro",
    title: "Tự luận: Python và chương trình đầu tiên",
    difficulty: Difficulty.EASY,
    points: 40,
    prompt:
      'Trình bày trên giấy rồi chụp ảnh nộp bài:\n\n1. Ngôn ngữ thông dịch khác ngôn ngữ biên dịch ở điểm nào? Python thuộc loại nào?\n2. Viết tay chương trình in ra 3 dòng: họ tên, lớp và một câu giới thiệu bản thân.\n3. Cho biết `print("A", "B", sep="*", end="!")` in ra gì.',
    rubric:
      "Tổng 10 điểm.\n- Câu 1 (4 điểm): thông dịch chạy từng lệnh khi chạy chương trình, biên dịch dịch toàn bộ ra mã máy trước (2 điểm); Python là ngôn ngữ thông dịch (2 điểm).\n- Câu 2 (4 điểm): 3 lệnh print đúng cú pháp, chuỗi đặt trong dấu nháy (mỗi lệnh khoảng 1,3 điểm).\n- Câu 3 (2 điểm): in ra A*B! và không xuống dòng.",
  },
  1: {
    kind: "HANDWRITTEN",
    key: "essay-types",
    title: "Tự luận: Kiểu dữ liệu và ép kiểu",
    difficulty: Difficulty.EASY,
    points: 40,
    prompt:
      'Trình bày trên giấy rồi chụp ảnh nộp bài:\n\n1. Nêu 4 kiểu dữ liệu cơ bản trong Python, mỗi kiểu một ví dụ.\n2. Vì sao `input()` cần ép kiểu khi muốn tính toán? Viết tay đoạn code đọc chiều dài, chiều rộng (số thực) và in diện tích hình chữ nhật.\n3. Đoán kết quả và giải thích: `int("12") + int("3")` và `"12" + "3"`.',
    rubric:
      'Tổng 10 điểm.\n- Câu 1 (3 điểm): int, float, str, bool kèm ví dụ đúng (mỗi kiểu 0,75 điểm).\n- Câu 2 (4 điểm): input() luôn trả về chuỗi (1 điểm); dùng float(input()) cho hai cạnh (2 điểm); in tích hai cạnh (1 điểm).\n- Câu 3 (3 điểm): 15 vì cộng hai số (1,5 điểm); "123" vì nối chuỗi (1,5 điểm).',
  },
  2: {
    kind: "HANDWRITTEN",
    key: "essay-operators",
    title: "Tự luận: Thứ tự ưu tiên toán tử",
    difficulty: Difficulty.MEDIUM,
    points: 50,
    prompt:
      "Trình bày trên giấy rồi chụp ảnh nộp bài:\n\n1. Tính từng bước và ghi kết quả: `10 - 2 ** 3 // 3 + 7 % 4`.\n2. Phân biệt `/`, `//` và `%`, mỗi toán tử cho một ví dụ.\n3. Viết tay biểu thức kiểm tra số nguyên n vừa chia hết cho 3 vừa không chia hết cho 5.",
    rubric:
      "Tổng 10 điểm.\n- Câu 1 (4 điểm): 2 ** 3 = 8; 8 // 3 = 2; 7 % 4 = 3; 10 - 2 + 3 = 11. Đúng thứ tự từng bước (3 điểm), kết quả 11 (1 điểm).\n- Câu 2 (3 điểm): / chia ra số thực, // chia lấy phần nguyên, % lấy phần dư, ví dụ đúng (mỗi ý 1 điểm).\n- Câu 3 (3 điểm): n % 3 == 0 and n % 5 != 0.",
  },
  3: {
    kind: "HANDWRITTEN",
    key: "essay-if",
    title: "Tự luận: Vẽ lưu đồ cho câu lệnh điều kiện",
    difficulty: Difficulty.MEDIUM,
    points: 50,
    prompt:
      "Trình bày trên giấy rồi chụp ảnh nộp bài:\n\n1. Vẽ lưu đồ (flowchart) cho bài toán: nhập số tiền mua hàng, nếu từ 500.000đ trở lên giảm 10%, từ 200.000đ đến dưới 500.000đ giảm 5%, còn lại không giảm; in số tiền phải trả.\n2. Viết tay chương trình Python tương ứng bằng if / elif / else.\n3. Giải thích vì sao phải xét điều kiện 500.000đ trước 200.000đ.",
    rubric:
      "Tổng 10 điểm.\n- Câu 1 (4 điểm): có khối bắt đầu/kết thúc, khối nhập, hai khối điều kiện hình thoi đúng thứ tự, khối in kết quả.\n- Câu 2 (4 điểm): đọc số bằng float/int (1 điểm), if >= 500000 nhân 0.9 (1 điểm), elif >= 200000 nhân 0.95 (1 điểm), else giữ nguyên và in kết quả (1 điểm).\n- Câu 3 (2 điểm): điều kiện đầu tiên đúng thì các nhánh sau bị bỏ qua; nếu xét 200.000đ trước thì đơn từ 500.000đ chỉ được giảm 5%.",
  },
  4: {
    kind: "HANDWRITTEN",
    key: "essay-for",
    title: "Tự luận: Chạy tay vòng lặp for",
    difficulty: Difficulty.MEDIUM,
    points: 50,
    prompt:
      "Trình bày trên giấy rồi chụp ảnh nộp bài:\n\n1. Lập bảng giá trị của `i` và `s` qua từng vòng cho đoạn code:\n\n```python\ns = 0\nfor i in range(1, 10, 2):\n    s += i * i\nprint(s)\n```\n\n2. Chương trình in ra gì?\n3. Viết tay chương trình in hình tam giác sao với n = 4 (dòng thứ k có k dấu `*`).",
    rubric:
      'Tổng 10 điểm.\n- Câu 1 (4 điểm): i lần lượt 1, 3, 5, 7, 9; s lần lượt 1, 10, 35, 84, 165 (mỗi vòng đúng 0,8 điểm).\n- Câu 2 (2 điểm): in ra 165.\n- Câu 3 (4 điểm): vòng for k chạy 1..n (2 điểm), in "*" * k hoặc vòng lặp lồng đúng (2 điểm).',
  },
  5: {
    kind: "HANDWRITTEN",
    key: "essay-while",
    title: "Tự luận: Thuật toán Euclid",
    difficulty: Difficulty.MEDIUM,
    points: 50,
    prompt:
      "Trình bày trên giấy rồi chụp ảnh nộp bài:\n\n1. Chạy tay thuật toán Euclid tìm UCLN(84, 36): ghi giá trị a, b sau mỗi vòng `while b != 0: a, b = b, a % b`.\n2. Vì sao vòng lặp này chắc chắn dừng?\n3. Từ UCLN, viết công thức và tính BCNN(84, 36).",
    rubric:
      "Tổng 10 điểm.\n- Câu 1 (5 điểm): (84, 36) → (36, 12) → (12, 0); UCLN = 12. Mỗi bước đúng khoảng 1,5 điểm, kết luận đúng 0,5 điểm.\n- Câu 2 (2 điểm): a % b luôn nhỏ hơn b nên b giảm dần và là số không âm, cuối cùng bằng 0.\n- Câu 3 (3 điểm): BCNN = a * b / UCLN (1,5 điểm) = 84 * 36 / 12 = 252 (1,5 điểm).",
  },
  6: {
    kind: "HANDWRITTEN",
    key: "essay-string",
    title: "Tự luận: Cắt chuỗi (slicing)",
    difficulty: Difficulty.EASY,
    points: 40,
    prompt:
      'Cho `s = "LapTrinhPython"`. Trình bày trên giấy rồi chụp ảnh nộp bài:\n\n1. Ghi kết quả của: `s[0:3]`, `s[-6:]`, `s[::2]`, `s[::-1]`.\n2. Vì sao lệnh `s[0] = "l"` báo lỗi? Viết cách đúng để có chuỗi `"lapTrinhPython"`.\n3. Viết tay đoạn code đếm số chữ cái viết hoa trong s.',
    rubric:
      'Tổng 10 điểm.\n- Câu 1 (4 điểm): "Lap", "Python", "LprnPto", "nohtyPhnirTpaL" (mỗi ý 1 điểm).\n- Câu 2 (3 điểm): chuỗi bất biến, không gán từng ký tự (1,5 điểm); tạo chuỗi mới: "l" + s[1:] (1,5 điểm).\n- Câu 3 (3 điểm): duyệt từng ký tự (1 điểm), kiểm tra isupper() hoặc so sánh \'A\' <= ch <= \'Z\' (1 điểm), tăng biến đếm và in (1 điểm). s có 3 chữ hoa.',
  },
  7: {
    kind: "HANDWRITTEN",
    key: "essay-list",
    title: "Tự luận: sort() và sorted()",
    difficulty: Difficulty.MEDIUM,
    points: 50,
    prompt:
      "Trình bày trên giấy rồi chụp ảnh nộp bài:\n\n1. So sánh `a.sort()` và `sorted(a)`: kết quả trả về và ảnh hưởng lên list gốc.\n2. Cho `a = [5, 2, 8]` và `b = a`, sau đó `b.append(1)`. In `a` ra gì? Vì sao? Sửa thế nào để `a` không đổi?\n3. Viết tay list comprehension lấy bình phương các số lẻ trong `[1, 2, 3, 4, 5]`.",
    rubric:
      "Tổng 10 điểm.\n- Câu 1 (4 điểm): sort() sắp xếp tại chỗ và trả về None (2 điểm); sorted() trả về list mới, list gốc giữ nguyên (2 điểm).\n- Câu 2 (3 điểm): in [5, 2, 8, 1] (1 điểm) vì a và b cùng trỏ tới một list (1 điểm); dùng b = a.copy() hoặc a[:] (1 điểm).\n- Câu 3 (3 điểm): [x * x for x in [1, 2, 3, 4, 5] if x % 2 == 1] cho [1, 9, 25].",
  },
};

async function main() {
  // Mặc định dùng giáo viên của seed local; trên deploy đặt SEED_TEACHER_EMAIL
  // thành email một giáo viên (hoặc admin) có thật để lộ trình thuộc về họ.
  const teacherEmail = process.env.SEED_TEACHER_EMAIL ?? "teacher@local.test";
  const teacher = await prisma.user.findUnique({
    where: { email: teacherEmail },
    select: { id: true, role: { select: { name: true } } },
  });
  if (!teacher)
    throw new Error(
      `Chưa có tài khoản ${teacherEmail}. Hãy chạy \`npm run db:seed\` hoặc đặt SEED_TEACHER_EMAIL.`,
    );
  if (!["TEACHER", "ADMIN"].includes(teacher.role.name))
    throw new Error(`${teacherEmail} không phải giáo viên hay admin.`);

  const description =
    "Học Python từ con số 0: biến, toán tử, điều kiện, vòng lặp, chuỗi, list và hàm. Mỗi bài có video bài giảng, trắc nghiệm ôn tập và bài code chấm tự động.";
  const metadata = {
    difficulty: Difficulty.EASY,
    tags: ["Python", "nhập môn"],
    estimatedMinutes: 10 * 60,
    coverTheme: "green",
    deletedAt: null,
  };
  const path = await prisma.path.upsert({
    where: { slug: PATH_SLUG },
    update: {
      title: "Lập trình Python cơ bản",
      description,
      published: true,
      publishedAt: new Date(),
      ...metadata,
    },
    create: {
      slug: PATH_SLUG,
      title: "Lập trình Python cơ bản",
      description,
      published: true,
      publishedAt: new Date(),
      sequentialUnlock: true,
      ...metadata,
      creatorId: teacher.id,
    },
  });

  const counts = { CODE: 0, QUIZ: 0, HANDWRITTEN: 0, tests: 0, questions: 0 };
  for (const [index, room] of ROOMS.entries()) {
    const position = index + 1;
    const data = {
      title: room.title,
      description: room.description,
      content: lesson(room),
      published: true,
    };
    const saved = await prisma.room.upsert({
      where: { pathId_position: { pathId: path.id, position } },
      update: data,
      create: { pathId: path.id, position, ...data },
    });
    const essay = ESSAYS[index];
    for (const item of essay ? [...room.exercises, essay] : room.exercises) {
      const id = `seed-py-${item.key}`;
      const fields = {
        roomId: saved.id,
        title: item.title,
        prompt: item.prompt,
        kind: ExerciseKind[item.kind],
        difficulty: item.kind === "QUIZ" ? Difficulty.EASY : item.difficulty,
        points: item.points,
        timeLimitMs: 2000,
        memoryLimitKb: 256 * 1024,
        rubric: item.kind === "HANDWRITTEN" ? item.rubric : null,
      };
      await prisma.exercise.upsert({
        where: { id },
        update: fields,
        create: { id, ...fields },
      });
      await prisma.testCase.deleteMany({ where: { exerciseId: id } });
      await prisma.quizQuestion.deleteMany({ where: { exerciseId: id } });
      if (item.kind === "CODE") {
        await prisma.testCase.createMany({
          data: item.tests.map((test) => ({ ...test, exerciseId: id })),
        });
        counts.tests += item.tests.length;
      }
      if (item.kind === "QUIZ") {
        await prisma.quizQuestion.createMany({
          data: item.questions.map((question, position) => ({
            ...question,
            position,
            exerciseId: id,
          })),
        });
        counts.questions += item.questions.length;
      }
      counts[item.kind] += 1;
    }
  }
  // Bài học thừa từ lần tạo thử trước (vị trí lớn hơn số bài mẫu) và chưa ai học thì gỡ đi.
  const extra = await prisma.room.findMany({
    where: { pathId: path.id, position: { gt: ROOMS.length } },
    select: { id: true, _count: { select: { progress: true } } },
  });
  for (const room of extra)
    if (room._count.progress === 0)
      await prisma.room.delete({ where: { id: room.id } });

  console.log(
    `Đã seed lộ trình "${PATH_SLUG}": ${ROOMS.length} bài học, ${counts.CODE} bài code (${counts.tests} test case), ${counts.QUIZ} bài trắc nghiệm (${counts.questions} câu), ${counts.HANDWRITTEN} bài tự luận.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
