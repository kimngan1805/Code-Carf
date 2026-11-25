/**
 * Lộ trình mẫu "Lập trình C++ cơ bản": 12 bài học. 9 bài đầu theo khung 12 phần,
 * mỗi bài có video bài giảng (series "Khóa học lập trình C++ cơ bản" của kênh
 * HowKteam trên YouTube), một bài trắc nghiệm, bài code chấm theo test case và
 * một bài tự luận; 3 bài cuối là ôn tập, mini project và tổng kết.
 *
 * Chạy: npm run db:seed:cpp (cần chạy `npm run db:seed` trước để có tài khoản
 * giáo viên, hoặc đặt SEED_TEACHER_EMAIL thành một giáo viên/admin đã có).
 * Chạy lại nhiều lần an toàn: id bài code giữ nguyên như bản cũ nên bài nộp cũ
 * của học viên vẫn gắn đúng bài. Đáp án test được TÍNH bằng hàm solve, không gõ tay.
 */
import { Difficulty } from "@prisma/client";
import {
  cases,
  code,
  ints,
  lines,
  runSeed,
  type RoomSeed,
} from "./seed-path-kit";

/** Hàng rào code block trong markdown, để viết trong template literal. */
const F = "```";

const big = (value: string) => BigInt(value);
const arrayOf = (input: string) => ints(lines(input)[1]);

const sumTo = (input: string) =>
  ((big(input) * (big(input) + BigInt(1))) / BigInt(2)).toString();
const isPrime = (n: number) => {
  if (n < 2) return false;
  for (let d = 2; d * d <= n; d++) if (n % d === 0) return false;
  return true;
};
const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
const calculate = (input: string) => {
  const [a, op, b] = input.trim().split(/\s+/);
  if (op === "/")
    return Number(b) === 0
      ? "Loi chia cho 0"
      : (Number(a) / Number(b)).toFixed(2);
  const x = big(a);
  const y = big(b);
  return (op === "+" ? x + y : op === "-" ? x - y : x * y).toString();
};

const kteam = (id: string, lessonName: string) => ({
  id,
  caption: `HowKteam · Khóa học lập trình C++ cơ bản, ${lessonName}`,
});

const ROOMS: RoomSeed[] = [
  {
    title: "Chương trình C++ đầu tiên",
    description: "Module 1 · Làm quen với C++: hàm main, cout, chú thích.",
    videos: [
      kteam("ILr_rU-lISk", "Bài 1: Giới thiệu về C++"),
      kteam("q8UGqw6Cbnk", "Bài 2-3: Xây dựng chương trình C++ đầu tiên"),
      kteam("IXzH3pYM_bg", "Bài 4: Cấu trúc một chương trình C++"),
    ],
    parts: {
      overview:
        "Bài đầu tiên giúp bạn biết C++ là gì, một chương trình C++ gồm những phần nào và tự viết chương trình in chữ ra màn hình.\n\n**Mục tiêu:** viết được hàm `main`, dùng `cout` và ghi chú thích.",
      concept:
        "**C++** là ngôn ngữ lập trình **biên dịch**: toàn bộ mã nguồn được trình biên dịch (compiler) dịch ra file chạy được trước, rồi mới chạy. Mọi chương trình C++ bắt đầu chạy từ hàm `main`.",
      characteristics:
        "- Chạy rất nhanh, dùng nhiều trong thi lập trình, game, hệ thống.\n- Mỗi câu lệnh kết thúc bằng dấu `;`.\n- Khối lệnh đặt trong cặp ngoặc nhọn `{ }`.\n- Phân biệt chữ hoa, chữ thường: `main` khác `Main`.",
      classification:
        "Một chương trình C++ cơ bản có ba phần:\n\n- **Khai báo thư viện:** `#include <iostream>`.\n- **Không gian tên:** `using namespace std;` để viết `cout` thay vì `std::cout`.\n- **Hàm main:** nơi chương trình bắt đầu và kết thúc.",
      mechanism:
        "Bạn viết file `bai1.cpp` → trình biên dịch (g++) kiểm tra cú pháp và dịch ra file chạy → hệ điều hành chạy file đó từ dòng đầu tiên trong `main`. Có lỗi cú pháp thì **không** tạo được file chạy, trình biên dịch báo lỗi kèm số dòng.",
      syntax: `${F}cpp
#include <iostream>
using namespace std;

int main() {
    // chú thích một dòng
    cout << "Xin chao" << endl;   // in rồi xuống dòng
    cout << "C++" << "\\n";        // "\\n" cũng xuống dòng
    return 0;                       // kết thúc chương trình
}
${F}`,
      example: `${F}cpp
#include <iostream>
using namespace std;

int main() {
    cout << "Chao mung den Code Carf!" << endl;
    cout << "1 + 2 = " << 1 + 2 << endl;
    return 0;
}
${F}

Kết quả:

${F}
Chao mung den Code Carf!
1 + 2 = 3
${F}`,
      application:
        "`cout` là cách đơn giản nhất để chương trình báo kết quả. Trên hệ thống chấm bài, output của bạn được so với đáp án **từng dòng**, nên in đúng chữ, đúng dấu cách là kỹ năng đầu tiên cần có.",
      prosCons:
        "**Ưu:** nhanh, kiểm soát bộ nhớ tốt, cú pháp nền tảng cho Java, C#.\n\n**Nhược:** cú pháp chặt chẽ, quên một dấu `;` là không biên dịch được; phải biên dịch lại mỗi lần sửa.",
      errors:
        "- Quên `;` cuối câu lệnh → `expected ';'`.\n- Thiếu `#include <iostream>` → `'cout' was not declared`.\n- In thêm chữ thừa như `\"Ket qua: \"` khi đề không yêu cầu → sai test.\n- Viết `Cout` hoặc `Main` sai chữ hoa.",
      takeaways:
        '- Chương trình bắt đầu ở `main`.\n- `cout << ...` in ra màn hình, `endl` hoặc `"\\n"` để xuống dòng.\n- Chú thích một dòng bắt đầu bằng `//`.',
      practice:
        "Làm bài trắc nghiệm để ôn lại, sau đó viết hai chương trình in chữ đầu tiên và làm bài tự luận.",
    },
    exercises: [
      {
        kind: "QUIZ",
        key: "quiz-first-program",
        title: "Trắc nghiệm: Chương trình C++ đầu tiên",
        points: 30,
        prompt: "Kiểm tra nhanh cấu trúc một chương trình C++ và lệnh cout.",
        questions: [
          {
            prompt: "Chương trình C++ bắt đầu chạy từ đâu?",
            options: [
              "Dòng #include đầu tiên",
              "Hàm main",
              "Hàm đầu tiên được khai báo",
              "Dòng using namespace std",
            ],
            answer: 1,
            explanation:
              "Hệ điều hành luôn gọi hàm main để bắt đầu chương trình.",
          },
          {
            prompt: "Muốn dùng cout và cin, cần khai báo thư viện nào?",
            options: ["<cmath>", "<string>", "<iostream>", "<vector>"],
            answer: 2,
            explanation: "iostream chứa luồng nhập xuất cin và cout.",
          },
          {
            prompt: "C++ là ngôn ngữ thuộc loại nào?",
            options: [
              "Thông dịch, chạy từng dòng",
              "Biên dịch ra file chạy trước khi chạy",
              "Ngôn ngữ đánh dấu",
              "Ngôn ngữ truy vấn",
            ],
            answer: 1,
            explanation:
              "Trình biên dịch dịch toàn bộ mã nguồn ra file chạy rồi mới thực thi.",
          },
          {
            prompt: "Dòng nào là chú thích một dòng trong C++?",
            options: [
              "# ghi chú",
              "-- ghi chú",
              "// ghi chú",
              "<!-- ghi chú -->",
            ],
            answer: 2,
            explanation:
              "C++ dùng // cho chú thích một dòng và /* */ cho nhiều dòng.",
          },
          {
            prompt: 'cout << "A" << "B" << endl; in ra gì?',
            options: [
              "A B",
              "AB rồi xuống dòng",
              "A rồi B ở dòng mới",
              "Lỗi biên dịch",
            ],
            answer: 1,
            explanation:
              "Toán tử << nối liên tiếp, không tự chèn dấu cách; endl xuống dòng ở cuối.",
          },
        ],
      },
      code(
        "hello-world",
        "Hello world",
        Difficulty.EASY,
        "Viết chương trình in ra đúng dòng chữ `Hello world`.",
        [{ input: "", expected: "Hello world", isHidden: false }],
      ),
      code(
        "two-lines",
        "In hai dòng",
        Difficulty.EASY,
        "In ra hai dòng: dòng thứ nhất là `Xin chao`, dòng thứ hai là `C++`.",
        [{ input: "", expected: "Xin chao\nC++", isHidden: false }],
      ),
      {
        kind: "HANDWRITTEN",
        key: "essay-first-program",
        title: "Tự luận: Cấu trúc chương trình C++",
        difficulty: Difficulty.EASY,
        points: 40,
        prompt:
          "Trình bày trên giấy rồi chụp ảnh nộp bài:\n\n1. Kể tên và nêu vai trò của 3 phần trong chương trình C++ cơ bản.\n2. Ngôn ngữ biên dịch khác ngôn ngữ thông dịch ở điểm nào? Cho một ví dụ mỗi loại.\n3. Viết tay chương trình in ra 3 dòng: họ tên, lớp và môn học yêu thích.",
        rubric:
          'Tổng 10 điểm.\n- Câu 1 (3 điểm): #include khai báo thư viện, using namespace std để dùng tên ngắn, hàm main là nơi chương trình bắt đầu (mỗi ý 1 điểm).\n- Câu 2 (3 điểm): biên dịch dịch toàn bộ ra file chạy trước, thông dịch chạy từng lệnh (2 điểm); ví dụ C++ và Python (1 điểm).\n- Câu 3 (4 điểm): có #include, main, return 0 (1,5 điểm); 3 lệnh cout đúng cú pháp có endl hoặc "\\n" (2,5 điểm).',
      },
    ],
  },
  {
    title: "Biến và kiểu dữ liệu",
    description:
      "Module 1 · Làm quen với C++: int, long long, double, char, string.",
    videos: [
      kteam("i3nJyEt42Y8", "Bài 6: Biến trong C++"),
      kteam("wE3WhKbExN8", "Bài 7: Số tự nhiên và số chấm động"),
      kteam("xt5rScAb9lI", "Bài 8: Kiểu ký tự (char)"),
    ],
    parts: {
      overview:
        "Chương trình cần chỗ để nhớ dữ liệu: điểm số, tên, tổng tiền. Bài này giới thiệu **biến** và các **kiểu dữ liệu** cơ bản của C++.\n\n**Mục tiêu:** khai báo đúng kiểu, biết khi nào cần `long long`.",
      concept:
        "**Biến** là một vùng nhớ có tên, dùng để lưu một giá trị. Trong C++ mỗi biến phải khai báo **kiểu** trước khi dùng, và kiểu đó quyết định biến lưu được gì, chiếm bao nhiêu bộ nhớ.",
      characteristics:
        '- Kiểu được cố định lúc khai báo (kiểu tĩnh).\n- Tên biến gồm chữ, số, dấu `_`, không bắt đầu bằng số, không trùng từ khóa.\n- Biến chưa gán giá trị chứa "rác", nên luôn khởi tạo.\n- `const` tạo hằng, không gán lại được.',
      classification:
        "| Kiểu | Lưu gì | Phạm vi / ví dụ |\n| --- | --- | --- |\n| `int` | số nguyên | khoảng ±2,1 tỷ |\n| `long long` | số nguyên lớn | khoảng ±9,2 × 10¹⁸ |\n| `double` | số thực | `3.14` |\n| `char` | một ký tự | `'A'` |\n| `bool` | đúng/sai | `true`, `false` |\n| `string` | chuỗi | `\"C++\"` |",
      mechanism:
        "Khi gặp `int a = 5;` máy cấp 4 byte bộ nhớ, đặt tên vùng nhớ đó là `a` và ghi số 5 vào. Gán `a = 7;` là ghi đè giá trị mới lên cùng vùng nhớ. Nếu giá trị vượt phạm vi kiểu, số bị **tràn** và cho kết quả sai mà không báo lỗi.",
      syntax: `${F}cpp
int tuoi = 18;
long long danSo = 8000000000LL;
double diem = 8.5;
char xepLoai = 'A';
bool daQua = true;
string ten = "Ngan";     // cần #include <string>
const double PI = 3.14159;
${F}`,
      example: `${F}cpp
int a = 2000000000, b = 2000000000;
cout << a + b << endl;              // tràn int: in số âm sai
long long x = a, y = b;
cout << x + y << endl;              // 4000000000
${F}`,
      application:
        "Chọn kiểu đúng giúp kết quả chính xác: tiền và dân số dùng `long long`, điểm trung bình dùng `double`, giới tính hay trạng thái dùng `bool`. Trong thi lập trình, quên `long long` là lỗi mất điểm phổ biến nhất.",
      prosCons:
        "**Ưu:** kiểu tĩnh giúp trình biên dịch bắt lỗi sớm và chương trình chạy nhanh.\n\n**Nhược:** phải tự lo phạm vi; tràn số không báo lỗi; `double` có sai số làm tròn (0.1 + 0.2 không đúng bằng 0.3).",
      errors:
        "- Dùng `int` cho tổng lớn → tràn số, ra số âm.\n- Dùng biến chưa khởi tạo → giá trị rác.\n- Viết `char c = \"A\";` (ngoặc kép) thay vì `'A'`.\n- So sánh hai `double` bằng `==`.",
      takeaways:
        "- Khai báo: `kiểu tên = giá trị;`.\n- Số lớn hơn khoảng 2 tỷ cần `long long`.\n- `char` dùng nháy đơn, `string` dùng nháy kép.",
      practice:
        "Làm trắc nghiệm về kiểu dữ liệu, bài code khai báo biến, rồi bài tự luận về tràn số.",
    },
    exercises: [
      {
        kind: "QUIZ",
        key: "quiz-variables",
        title: "Trắc nghiệm: Biến và kiểu dữ liệu",
        points: 30,
        prompt: "Ôn lại cách chọn kiểu dữ liệu và khai báo biến.",
        questions: [
          {
            prompt: "Kiểu nào phù hợp để lưu dân số thế giới (khoảng 8 tỷ)?",
            options: ["int", "long long", "char", "bool"],
            answer: 1,
            explanation: "int chỉ tới khoảng 2,1 tỷ; 8 tỷ cần long long.",
          },
          {
            prompt: "Tên biến nào hợp lệ trong C++?",
            options: ["2diem", "diem-tb", "diem_tb", "int"],
            answer: 2,
            explanation:
              "Tên không bắt đầu bằng số, không chứa dấu gạch ngang và không trùng từ khóa.",
          },
          {
            prompt: "Khai báo nào đúng cho một ký tự?",
            options: [
              'char c = "A";',
              "char c = 'A';",
              "char c = A;",
              "string c = 'A';",
            ],
            answer: 1,
            explanation: "Ký tự đơn đặt trong nháy đơn.",
          },
          {
            prompt:
              "Biến khai báo const double PI = 3.14; thì lệnh PI = 3; sẽ…",
            options: [
              "Gán PI bằng 3",
              "Báo lỗi biên dịch",
              "Làm tròn PI thành 3.0",
              "Chạy nhưng không đổi gì",
            ],
            answer: 1,
            explanation:
              "Hằng const không được gán lại, trình biên dịch báo lỗi.",
          },
          {
            prompt: "int a = 2000000000; cout << a + a; có kết quả thế nào?",
            options: [
              "4000000000",
              "Báo lỗi khi biên dịch",
              "Một số sai (thường là số âm) do tràn int",
              "0",
            ],
            answer: 2,
            explanation:
              "Tổng vượt phạm vi int nên bị tràn số, không có thông báo lỗi.",
          },
        ],
      },
      code(
        "variables",
        "Khai báo biến",
        Difficulty.EASY,
        "Khai báo `int a = 5` và `double b = 3.5`, sau đó in `a` ở dòng thứ nhất và `b` ở dòng thứ hai.",
        [{ input: "", expected: "5\n3.5", isHidden: false }],
      ),
      {
        kind: "HANDWRITTEN",
        key: "essay-variables",
        title: "Tự luận: Chọn kiểu dữ liệu và tràn số",
        difficulty: Difficulty.EASY,
        points: 40,
        prompt:
          "Trình bày trên giấy rồi chụp ảnh nộp bài:\n\n1. Chọn kiểu dữ liệu phù hợp và giải thích: tuổi, điểm trung bình, số tiền tiết kiệm (đơn vị đồng) của cả nước, ký hiệu xếp loại, kết quả đậu/rớt.\n2. Tràn số là gì? Vì sao `int a = 50000; cout << a * a;` cho kết quả sai? Sửa thế nào?\n3. Viết tay khai báo hằng số `PI` và đoạn code tính diện tích hình tròn bán kính `r` (số thực).",
        rubric:
          "Tổng 10 điểm.\n- Câu 1 (4 điểm): int, double, long long, char, bool, có giải thích ngắn (mỗi ý 0,8 điểm).\n- Câu 2 (3 điểm): tràn số là giá trị vượt phạm vi kiểu (1 điểm); 50000² = 2,5 tỷ vượt int (1 điểm); dùng long long (1 điểm).\n- Câu 3 (3 điểm): const double PI = 3.14159 (1 điểm); khai báo double r và đọc vào (1 điểm); in PI * r * r (1 điểm).",
      },
    ],
  },
  {
    title: "Nhập xuất dữ liệu",
    description: "Module 1 · Làm quen với C++: cin, getline, định dạng số.",
    videos: [kteam("Xh-gwtPCicU", "Bài 10: Nhập, xuất và định dạng dữ liệu")],
    parts: {
      overview:
        "Chương trình hữu ích khi nhận được dữ liệu từ bên ngoài. Bài này dạy đọc dữ liệu bằng `cin`, `getline` và in số thực đúng định dạng.\n\n**Mục tiêu:** đọc đúng định dạng input của bài chấm tự động.",
      concept:
        "**Nhập** là đưa dữ liệu từ bàn phím (hoặc file test) vào biến, dùng `cin >>`. **Xuất** là đưa dữ liệu ra màn hình bằng `cout <<`. Cả hai là **luồng** (stream): dữ liệu chảy lần lượt theo thứ tự.",
      characteristics:
        "- `cin >>` bỏ qua dấu cách và xuống dòng, đọc tới khi gặp khoảng trắng.\n- Có thể đọc nhiều biến liên tiếp: `cin >> a >> b >> c;`.\n- `getline(cin, s)` đọc cả một dòng, kể cả dấu cách.\n- `fixed << setprecision(k)` in số thực đúng k chữ số thập phân.",
      classification:
        "- **Đọc từng giá trị:** `cin >> x;`\n- **Đọc cả dòng:** `getline(cin, s);`\n- **Xuất thường:** `cout << x;`\n- **Xuất có định dạng:** `cout << fixed << setprecision(2) << x;` (cần `#include <iomanip>`).",
      mechanism:
        'Dữ liệu vào được đặt trong **bộ đệm**. Mỗi lần `cin >>` lấy ra một "từ" tiếp theo và đổi sang kiểu của biến. Sau `cin >> n` ký tự xuống dòng vẫn còn trong bộ đệm, nên gọi `getline` ngay sau đó sẽ đọc được chuỗi rỗng; cần `cin.ignore()` trước.',
      syntax: `${F}cpp
#include <iostream>
#include <iomanip>
#include <string>
using namespace std;

int main() {
    int n; double x; string ten;
    cin >> n >> x;
    cin.ignore();              // bỏ ký tự xuống dòng còn sót
    getline(cin, ten);
    cout << fixed << setprecision(2) << x << "\\n";
}
${F}`,
      example: `${F}cpp
long long a, b;
cin >> a >> b;          // input: 3 5
cout << a + b << "\\n";  // 8
cout << fixed << setprecision(2) << (double)a / b; // 0.60
${F}`,
      application:
        "Mọi bài trên hệ thống chấm đều đọc input chuẩn và so output chuẩn. Đọc đúng định dạng (dòng 1 là n, dòng 2 là n số…) và **không in chữ thừa** như `Nhap a:` là điều kiện để qua test.",
      prosCons:
        "**Ưu:** `cin/cout` dễ dùng, tự đổi kiểu.\n\n**Nhược:** chậm với dữ liệu rất lớn (thêm `ios::sync_with_stdio(false); cin.tie(nullptr);` để tăng tốc); dễ lỗi khi trộn `cin >>` và `getline`.",
      errors:
        "- In thêm lời nhắc `Nhap so:` → sai output.\n- `getline` ngay sau `cin >>` đọc phải dòng rỗng.\n- Quên `fixed` nên `setprecision(2)` chỉ giữ 2 chữ số có nghĩa.\n- Đọc số lớn vào `int` thay vì `long long`.",
      takeaways:
        "- `cin >> a >> b` đọc nhiều giá trị.\n- `getline` đọc cả dòng; nhớ `cin.ignore()` khi trộn.\n- `fixed << setprecision(k)` cho đúng k chữ số thập phân.",
      practice:
        "Làm trắc nghiệm, hai bài code tổng hai số và chu vi, rồi bài tự luận về định dạng nhập xuất.",
    },
    exercises: [
      {
        kind: "QUIZ",
        key: "quiz-io",
        title: "Trắc nghiệm: Nhập xuất dữ liệu",
        points: 30,
        prompt: "Ôn lại cin, getline và định dạng số thực.",
        questions: [
          {
            prompt: 'Input là "Nguyen Van A". cin >> s; thì s bằng gì?',
            options: ["Nguyen Van A", "Nguyen", "A", "Chuỗi rỗng"],
            answer: 1,
            explanation: "cin >> dừng ở khoảng trắng đầu tiên.",
          },
          {
            prompt: "Muốn đọc cả dòng có dấu cách, dùng gì?",
            options: [
              "cin >> s",
              "getline(cin, s)",
              "cout << s",
              'scanf("%d", &s)',
            ],
            answer: 1,
            explanation: "getline đọc đến hết dòng, kể cả dấu cách.",
          },
          {
            prompt: "cout << fixed << setprecision(2) << 3.14159; in ra gì?",
            options: ["3.1", "3.14", "3.14159", "3"],
            answer: 1,
            explanation:
              "fixed kèm setprecision(2) giữ đúng 2 chữ số sau dấu chấm.",
          },
          {
            prompt: 'Vì sao không nên in "Nhap a:" trong bài chấm tự động?',
            options: [
              "Vì cout không in được tiếng Việt",
              "Vì output bị so khớp chính xác với đáp án",
              "Vì chương trình sẽ chạy chậm",
              "Vì sẽ lỗi biên dịch",
            ],
            answer: 1,
            explanation:
              "Mọi chữ thừa đều làm output khác đáp án và bị chấm sai.",
          },
        ],
      },
      code(
        "sum-two",
        "Tổng hai số",
        Difficulty.EASY,
        "Đọc hai số nguyên `a`, `b` (|a|, |b| ≤ 10^9) và in ra tổng `a + b`.\n\n**Gợi ý:** tổng có thể vượt `int`, hãy dùng `long long`.",
        cases(
          [
            "1 2",
            "-5 10",
            "0 0",
            "5 -5",
            "1000000000 1000000000",
            "-1000000000 -1000000000",
            "123456789 987654321",
          ],
          (input) => {
            const [a, b] = input.split(" ");
            return (big(a) + big(b)).toString();
          },
        ),
      ),
      code(
        "perimeter",
        "Chu vi hình chữ nhật",
        Difficulty.EASY,
        "Đọc hai cạnh `a`, `b` (1 ≤ a, b ≤ 10^5) của hình chữ nhật và in ra chu vi.",
        cases(
          ["3 5", "1 1", "10 20", "100000 100000", "7 2", "1 100000"],
          (input) => {
            const [a, b] = ints(input);
            return String(2 * (a + b));
          },
        ),
      ),
      {
        kind: "HANDWRITTEN",
        key: "essay-io",
        title: "Tự luận: Đọc input đúng định dạng",
        difficulty: Difficulty.EASY,
        points: 40,
        prompt:
          "Trình bày trên giấy rồi chụp ảnh nộp bài:\n\n1. Input gồm: dòng 1 là số n, dòng 2 là họ tên đầy đủ có dấu cách. Viết tay đoạn code đọc đúng hai dòng này và giải thích vì sao cần `cin.ignore()`.\n2. Viết tay lệnh in điểm trung bình `dtb` với đúng 1 chữ số thập phân.\n3. Nêu 2 lỗi nhập xuất khiến bài làm bị chấm sai dù thuật toán đúng.",
        rubric:
          "Tổng 10 điểm.\n- Câu 1 (5 điểm): cin >> n (1 điểm); cin.ignore() (1 điểm); getline(cin, ten) (1 điểm); giải thích ký tự xuống dòng còn trong bộ đệm khiến getline đọc dòng rỗng (2 điểm).\n- Câu 2 (2 điểm): cout << fixed << setprecision(1) << dtb, có #include <iomanip>.\n- Câu 3 (3 điểm): mỗi lỗi hợp lý 1,5 điểm (in chữ thừa, sai số chữ số thập phân, đọc thiếu dữ liệu, dùng int bị tràn…).",
      },
    ],
  },
  {
    title: "Toán tử và biểu thức",
    description: "Module 2 · Điều kiện và vòng lặp: số học, so sánh, logic.",
    videos: [
      kteam("y3ZoBtxOYFI", "Bài 12: Toán tử số học, tăng giảm, gán số học"),
      kteam("wd0smCgRszw", "Bài 13: Toán tử quan hệ, logic, bitwise"),
    ],
    parts: {
      overview:
        "Toán tử là cách chương trình tính toán và so sánh. Bài này đi qua toán tử số học, gán, so sánh và logic, đặc biệt là phép chia nguyên và chia lấy dư.\n\n**Mục tiêu:** tính đúng biểu thức, không nhầm `/` nguyên với `/` thực.",
      concept:
        "**Toán tử** là ký hiệu thực hiện một phép tính trên các **toán hạng**. **Biểu thức** là sự kết hợp của biến, hằng và toán tử, cho ra một giá trị, ví dụ `(a + b) * 2`.",
      characteristics:
        "- Hai số nguyên chia nhau cho kết quả nguyên: `7 / 2 == 3`.\n- `%` chỉ dùng cho số nguyên.\n- Có thứ tự ưu tiên: `* / %` trước `+ -`, so sánh trước `&&`, `&&` trước `||`.\n- `a++` tăng a lên 1; `a += 5` là viết tắt của `a = a + 5`.",
      classification:
        "| Nhóm | Toán tử |\n| --- | --- |\n| Số học | `+ - * / %` |\n| Gán | `= += -= *= /= %=` |\n| Tăng giảm | `++ --` |\n| So sánh | `== != < > <= >=` |\n| Logic | `&& \\|\\| !` |",
      mechanism:
        "Máy tính biểu thức theo **thứ tự ưu tiên**, cùng mức thì từ trái sang phải. Nếu hai toán hạng khác kiểu (int và double), giá trị int được đổi sang double trước khi tính, nên `7 / 2.0 == 3.5`.",
      syntax: `${F}cpp
int a = 7, b = 2;
cout << a / b;          // 3
cout << a % b;          // 1
cout << (double)a / b;  // 3.5
a += 3;                 // a = 10
bool ok = (a > 5) && (b != 0);  // true
${F}`,
      example: `${F}cpp
int giay = 3725;
int gio = giay / 3600;          // 1
int phut = giay % 3600 / 60;    // 2
int s = giay % 60;              // 5
cout << gio << ":" << phut << ":" << s;  // 1:2:5
${F}`,
      application:
        "`/` và `%` xuất hiện khắp nơi: đổi đơn vị thời gian, tách chữ số (`n % 10`), kiểm tra chẵn lẻ, chia nhóm, tính số trang. Toán tử logic dùng để ghép điều kiện ở bài if/else tiếp theo.",
      prosCons:
        "**Ưu:** ngắn gọn, chạy rất nhanh.\n\n**Nhược:** dễ nhầm chia nguyên; `=` và `==` chỉ khác một ký tự nhưng nghĩa khác hẳn; số âm `% ` cho kết quả âm (`-7 % 2 == -1`).",
      errors:
        "- `double tb = (a + b) / 2;` với a, b là int → mất phần thập phân. Sửa: `/ 2.0`.\n- Viết `if (a = 5)` thay vì `==`.\n- Chia cho 0 làm chương trình dừng lỗi.\n- Quên ngoặc: `a + b / 2` khác `(a + b) / 2`.",
      takeaways:
        "- `/` hai số nguyên là chia nguyên; `%` lấy dư.\n- Muốn kết quả thực, ít nhất một toán hạng là `double`.\n- Thứ tự ưu tiên: ngoặc → `* / %` → `+ -` → so sánh → `&&` → `||`.",
      practice:
        "Làm trắc nghiệm về thứ tự ưu tiên, bài code thương và số dư, rồi bài tự luận tính tay biểu thức.",
    },
    exercises: [
      {
        kind: "QUIZ",
        key: "quiz-operators",
        title: "Trắc nghiệm: Toán tử",
        points: 30,
        prompt: "Kiểm tra cách C++ tính biểu thức.",
        questions: [
          {
            prompt: "cout << 7 / 2; in ra gì?",
            options: ["3.5", "3", "4", "1"],
            answer: 1,
            explanation: "Hai số nguyên chia nhau cho thương nguyên.",
          },
          {
            prompt: "cout << 17 % 5; in ra gì?",
            options: ["3", "2", "3.4", "5"],
            answer: 1,
            explanation: "17 = 5 × 3 + 2, phần dư là 2.",
          },
          {
            prompt: "Giá trị của 2 + 3 * 4 là?",
            options: ["20", "14", "24", "9"],
            answer: 1,
            explanation: "Nhân trước cộng sau: 2 + 12 = 14.",
          },
          {
            prompt: "Biểu thức nào kiểm tra x nằm trong đoạn [1, 10]?",
            options: [
              "1 <= x <= 10",
              "x >= 1 || x <= 10",
              "x >= 1 && x <= 10",
              "x > 1 && x < 10",
            ],
            answer: 2,
            explanation:
              "C++ không viết chuỗi so sánh kiểu toán học; cần ghép hai điều kiện bằng &&.",
          },
          {
            prompt: "int a = 5; a += a * 2; a bằng bao nhiêu?",
            options: ["10", "15", "20", "25"],
            answer: 1,
            explanation: "a = 5 + 5 × 2 = 15.",
          },
        ],
      },
      code(
        "div-mod",
        "Thương và số dư",
        Difficulty.EASY,
        "Đọc hai số nguyên `a`, `b` (0 ≤ a ≤ 10^9, 1 ≤ b ≤ 10^9). In ra thương và số dư của phép chia `a` cho `b`, cách nhau một dấu cách.",
        cases(
          [
            "7 2",
            "10 5",
            "1 3",
            "0 4",
            "100 7",
            "999999 1000",
            "123456789 12345",
          ],
          (input) => {
            const [a, b] = ints(input);
            return `${Math.floor(a / b)} ${a % b}`;
          },
        ),
      ),
      code(
        "seconds-to-hms",
        "Đổi giây ra giờ phút giây",
        Difficulty.EASY,
        "Đọc số giây `n` (0 ≤ n ≤ 10^9). In ra số giờ, phút, giây tương ứng theo dạng `h m s` (cách nhau một dấu cách, không thêm số 0 ở đầu).",
        cases(
          ["3725", "59", "0", "3600", "86399", "1000000000", "61"],
          (input) => {
            const n = Number(input);
            return `${Math.floor(n / 3600)} ${Math.floor((n % 3600) / 60)} ${n % 60}`;
          },
        ),
      ),
      {
        kind: "HANDWRITTEN",
        key: "essay-operators",
        title: "Tự luận: Tính tay biểu thức C++",
        difficulty: Difficulty.MEDIUM,
        points: 50,
        prompt:
          "Trình bày trên giấy rồi chụp ảnh nộp bài:\n\n1. Với `int a = 17, b = 5;` tính từng bước: `a / b * b + a % b` và `(double)a / b`.\n2. Giải thích vì sao `double tb = (8 + 9) / 2;` cho 8 chứ không phải 8.5, và sửa lại.\n3. Viết tay biểu thức kiểm tra năm `y` là năm nhuận (chia hết cho 400, hoặc chia hết cho 4 nhưng không chia hết cho 100).",
        rubric:
          "Tổng 10 điểm.\n- Câu 1 (4 điểm): 17 / 5 = 3, 3 * 5 = 15, 17 % 5 = 2, tổng 17 (2,5 điểm); (double)17 / 5 = 3.4 (1,5 điểm).\n- Câu 2 (3 điểm): 8 + 9 = 17 là int, 17 / 2 chia nguyên ra 8 rồi mới gán vào double (2 điểm); sửa thành / 2.0 hoặc ép kiểu (1 điểm).\n- Câu 3 (3 điểm): y % 400 == 0 || (y % 4 == 0 && y % 100 != 0).",
      },
    ],
  },
  {
    title: "Câu lệnh if/else",
    description: "Module 2 · Điều kiện và vòng lặp: rẽ nhánh, switch.",
    videos: [
      kteam("3-G-MLXj5n0", "Bài 9: Kiểu Boolean và câu điều kiện If"),
      kteam("QVfTsIEt5G4", "Bài 25: Câu điều kiện If và toán tử điều kiện"),
      kteam("OqadiGNfluQ", "Bài 26: Câu điều kiện Switch"),
    ],
    parts: {
      overview:
        "Chương trình thông minh hơn khi biết **chọn**: đủ tuổi thì cho vào, điểm cao thì xếp loại giỏi. Bài này dạy rẽ nhánh với `if`, `else if`, `else` và `switch`.\n\n**Mục tiêu:** viết đúng điều kiện nhiều nhánh, tránh nhầm `=` và `==`.",
      concept:
        "**Câu lệnh rẽ nhánh** cho phép chạy một khối lệnh chỉ khi điều kiện đúng (`true`). Điều kiện là một biểu thức kiểu `bool`, thường tạo từ toán tử so sánh và logic.",
      characteristics:
        "- Các nhánh `if / else if / else` được xét **từ trên xuống**, gặp nhánh đúng đầu tiên thì bỏ qua phần còn lại.\n- Khối nhiều lệnh phải có `{ }`.\n- `switch` so sánh một giá trị nguyên/ký tự với nhiều hằng `case`.\n- Toán tử ba ngôi `đk ? a : b` là if/else rút gọn.",
      classification:
        "- **if** một nhánh.\n- **if / else** hai nhánh.\n- **if / else if / else** nhiều nhánh.\n- **if lồng nhau**.\n- **switch / case** khi so sánh bằng với nhiều giá trị cố định.",
      mechanism:
        "Máy tính tính giá trị điều kiện. Khác 0 (true) thì chạy khối `if`, bằng 0 (false) thì nhảy tới `else if` kế tiếp hoặc `else`. Với `switch`, máy nhảy thẳng tới `case` khớp và chạy cho đến khi gặp `break`.",
      syntax: `${F}cpp
if (diem >= 8) {
    cout << "Gioi";
} else if (diem >= 6.5) {
    cout << "Kha";
} else {
    cout << "Trung binh";
}

switch (thu) {
    case 7: case 8: cout << "Cuoi tuan"; break;
    default: cout << "Ngay thuong";
}
${F}`,
      example: `${F}cpp
int n;
cin >> n;
if (n % 2 == 0) cout << "chan";
else cout << "le";
// n = -3 → le, n = 0 → chan
${F}`,
      application:
        "Rẽ nhánh có ở mọi phần mềm: kiểm tra đăng nhập đúng mật khẩu, tính phí ship theo khoảng cách, xếp loại học lực, chọn chức năng trong menu (`switch`).",
      prosCons:
        "**Ưu:** dễ hiểu, diễn đạt trực tiếp logic nghiệp vụ.\n\n**Nhược:** quá nhiều if lồng nhau khó đọc, dễ sót trường hợp; `switch` không dùng được với khoảng giá trị hay `string`.",
      errors:
        "- `if (n = 0)` gán thay vì so sánh, luôn sai.\n- Dấu `;` thừa: `if (x > 0);` làm khối sau luôn chạy.\n- Sắp sai thứ tự nhánh: xét `>= 5` trước `>= 8`.\n- Quên `break` trong `switch` nên chạy lan sang case sau.\n- Kiểm tra lẻ bằng `n % 2 == 1` sai với số âm.",
      takeaways:
        "- Nhánh đúng đầu tiên được chạy, các nhánh sau bị bỏ qua.\n- So sánh bằng dùng `==`.\n- Kiểm tra chẵn lẻ bằng `n % 2 == 0`.",
      practice:
        "Làm trắc nghiệm, hai bài code chẵn lẻ và số lớn nhất, rồi vẽ lưu đồ trong bài tự luận.",
    },
    exercises: [
      {
        kind: "QUIZ",
        key: "quiz-if",
        title: "Trắc nghiệm: Câu lệnh điều kiện",
        points: 30,
        prompt: "Ôn lại cách các nhánh if/else và switch được chọn.",
        questions: [
          {
            prompt:
              'int d = 9; if (d >= 5) cout << "TB"; else if (d >= 8) cout << "Gioi"; in ra gì?',
            options: ["Gioi", "TB", "TBGioi", "Không in gì"],
            answer: 1,
            explanation:
              "Nhánh đầu đã đúng nên các nhánh sau bị bỏ qua. Phải xét điều kiện chặt hơn trước.",
          },
          {
            prompt: "Lỗi trong if (x = 0) là gì?",
            options: [
              "Không có lỗi",
              "Dùng phép gán thay vì so sánh ==",
              "Thiếu dấu ;",
              "Không được so sánh với 0",
            ],
            answer: 1,
            explanation:
              "x = 0 gán x bằng 0 và cho giá trị false, nhánh không bao giờ chạy.",
          },
          {
            prompt: "Trong switch, nếu quên break ở một case thì sao?",
            options: [
              "Lỗi biên dịch",
              "Chương trình chạy tiếp sang các case bên dưới",
              "Chỉ case đó chạy",
              "Nhảy về default",
            ],
            answer: 1,
            explanation:
              "Hiện tượng fall-through: chạy tiếp đến khi gặp break.",
          },
          {
            prompt: 'Kết quả của (5 > 3) ? "A" : "B" là?',
            options: ["A", "B", "true", "Lỗi"],
            answer: 0,
            explanation:
              "Điều kiện đúng nên toán tử ba ngôi trả về giá trị đầu.",
          },
          {
            prompt:
              "Cách nào kiểm tra n chẵn đúng với mọi số nguyên, kể cả âm?",
            options: ["n % 2 == 1", "n % 2 == 0", "n / 2 == 0", "n % 2 > 0"],
            answer: 1,
            explanation:
              "-3 % 2 bằng -1 nên kiểm tra lẻ bằng == 1 sẽ sai; kiểm tra chẵn bằng == 0 luôn đúng.",
          },
        ],
      },
      code(
        "even-odd",
        "Chẵn hay lẻ",
        Difficulty.EASY,
        "Đọc số nguyên `n` (|n| ≤ 10^9). In `chan` nếu `n` chẵn, ngược lại in `le`.",
        cases(
          ["7", "10", "0", "-3", "-8", "1000000000", "999999999"],
          (input) => (Number(input) % 2 === 0 ? "chan" : "le"),
        ),
      ),
      code(
        "max-of-three",
        "Số lớn nhất trong ba số",
        Difficulty.EASY,
        "Đọc ba số nguyên `a`, `b`, `c` (|giá trị| ≤ 10^9) và in ra số lớn nhất.",
        cases(
          [
            "1 2 3",
            "10 2 7",
            "5 5 5",
            "-1 -5 -3",
            "0 0 -1",
            "1000000000 -1000000000 0",
            "3 9 9",
          ],
          (input) => String(Math.max(...ints(input))),
        ),
      ),
      {
        kind: "HANDWRITTEN",
        key: "essay-if",
        title: "Tự luận: Lưu đồ tính tiền điện",
        difficulty: Difficulty.MEDIUM,
        points: 50,
        prompt:
          "Trình bày trên giấy rồi chụp ảnh nộp bài:\n\nGiá điện: 50 kWh đầu giá 1.800đ/kWh, từ kWh 51 đến 100 giá 2.000đ/kWh, từ kWh 101 trở đi giá 2.500đ/kWh.\n\n1. Vẽ lưu đồ (flowchart) nhập số kWh và tính tiền điện.\n2. Viết tay chương trình C++ tương ứng bằng if / else if / else.\n3. Tính tay tiền điện cho 120 kWh.",
        rubric:
          "Tổng 10 điểm.\n- Câu 1 (3 điểm): đủ khối bắt đầu/kết thúc, nhập, các khối điều kiện hình thoi đúng thứ tự, khối in.\n- Câu 2 (4 điểm): đọc kWh (0,5 điểm); nhánh <= 50 (1 điểm); nhánh <= 100 tính 50*1800 + (k-50)*2000 (1,5 điểm); nhánh còn lại cộng thêm (k-100)*2500 (1 điểm).\n- Câu 3 (3 điểm): 50*1800 + 50*2000 + 20*2500 = 90.000 + 100.000 + 50.000 = 240.000đ.",
      },
    ],
  },
  {
    title: "Vòng lặp for và while",
    description: "Module 2 · Điều kiện và vòng lặp: lặp lại công việc.",
    videos: [
      kteam("aL59MpOFMe0", "Bài 30: Vòng lặp For"),
      kteam("4i--rEoaMn8", "Bài 28: Vòng lặp While"),
      kteam("ahQV8sg2HsE", "Bài 31: Từ khóa break và continue"),
    ],
    parts: {
      overview:
        "Máy tính mạnh nhất ở chỗ lặp lại hàng triệu lần không mệt. Bài này dạy `for`, `while`, `do while` và cách thoát vòng lặp.\n\n**Mục tiêu:** chọn đúng loại vòng lặp, tránh lặp vô hạn và tràn số.",
      concept:
        "**Vòng lặp** chạy lặp đi lặp lại một khối lệnh khi điều kiện còn đúng. Mỗi lần chạy khối lệnh gọi là một **lần lặp**.",
      characteristics:
        "- `for` gom khởi tạo, điều kiện, bước nhảy vào một dòng.\n- `while` kiểm tra điều kiện **trước** mỗi lần lặp.\n- `do while` chạy ít nhất một lần rồi mới kiểm tra.\n- `break` thoát hẳn vòng lặp, `continue` bỏ qua phần còn lại của lần lặp hiện tại.",
      classification:
        "- **for:** biết trước số lần lặp (duyệt 1..n, duyệt mảng).\n- **while:** lặp tới khi điều kiện sai, chưa biết trước số lần (tách chữ số, Euclid).\n- **do while:** cần chạy ít nhất một lần (menu, nhập lại tới khi hợp lệ).\n- **Vòng lặp lồng nhau:** vẽ hình, duyệt bảng.",
      mechanism:
        "Với `for (int i = 1; i <= n; i++)`: khởi tạo `i = 1` một lần → kiểm tra `i <= n` → đúng thì chạy thân → `i++` → quay lại kiểm tra. Điều kiện sai thì thoát. Nếu biến điều kiện không bao giờ thay đổi, vòng lặp chạy mãi (lặp vô hạn).",
      syntax: `${F}cpp
for (int i = 1; i <= n; i++) {
    // chạy n lần
}

while (n > 0) {
    n /= 10;          // phải làm điều kiện tiến dần tới sai
}

do {
    cin >> x;
} while (x < 0);      // nhập lại tới khi x không âm
${F}`,
      example: `${F}cpp
long long tong = 0;
for (int i = 1; i <= 100; i++) {
    if (i % 3 != 0) continue;  // bỏ số không chia hết cho 3
    tong += i;
}
cout << tong;  // 1683
${F}`,
      application:
        "Vòng lặp có mặt trong mọi thuật toán: tính tổng, đếm, tìm số lớn nhất, duyệt danh sách sản phẩm, xử lý từng điểm ảnh, mô phỏng từng ngày của trò chơi.",
      prosCons:
        "**Ưu:** viết một lần, chạy bao nhiêu lần cũng được.\n\n**Nhược:** dễ sai ở biên (`<` hay `<=`), lặp vô hạn treo chương trình; vòng lồng nhau làm chương trình chậm nhanh chóng (n² lần).",
      errors:
        "- Sai biên: `for (i = 1; i < n; i++)` bỏ sót `n`.\n- Quên cập nhật biến trong `while` → lặp vô hạn.\n- Dấu `;` sau `for (...);` làm thân vòng lặp rỗng.\n- Tổng lớn dùng `int` bị tràn.",
      takeaways:
        "- Biết trước số lần → `for`; lặp theo điều kiện → `while`.\n- `break` thoát, `continue` sang lần lặp kế.\n- Kiểm tra kỹ biên và kiểu của biến tổng.",
      practice:
        "Làm trắc nghiệm, hai bài code tổng 1..n và đếm chữ số, rồi chạy tay vòng lặp trong bài tự luận.",
    },
    exercises: [
      {
        kind: "QUIZ",
        key: "quiz-loops",
        title: "Trắc nghiệm: Vòng lặp",
        points: 30,
        prompt: "Kiểm tra cách vòng lặp chạy và dừng.",
        questions: [
          {
            prompt:
              "for (int i = 0; i < 5; i++) chạy thân vòng lặp bao nhiêu lần?",
            options: ["4", "5", "6", "Vô hạn"],
            answer: 1,
            explanation: "i nhận 0, 1, 2, 3, 4: năm lần.",
          },
          {
            prompt: "Vòng lặp nào luôn chạy thân ít nhất một lần?",
            options: ["for", "while", "do while", "Cả ba"],
            answer: 2,
            explanation: "do while kiểm tra điều kiện sau khi chạy thân.",
          },
          {
            prompt: "Lệnh continue làm gì?",
            options: [
              "Thoát khỏi vòng lặp",
              "Bỏ qua phần còn lại của lần lặp hiện tại, sang lần kế",
              "Dừng chương trình",
              "Lặp lại lần hiện tại",
            ],
            answer: 1,
            explanation: "break mới là lệnh thoát hẳn vòng lặp.",
          },
          {
            prompt:
              "int n = 1234, d = 0; while (n > 0) { n /= 10; d++; } d bằng?",
            options: ["3", "4", "10", "1234"],
            answer: 1,
            explanation: "Mỗi lần bỏ một chữ số cuối, 1234 có 4 chữ số.",
          },
          {
            prompt:
              "Đoạn int i = 0; while (i < 10) { cout << i; } có vấn đề gì?",
            options: [
              "In 0 đến 9",
              "Lặp vô hạn vì i không thay đổi",
              "Không in gì",
              "Lỗi biên dịch",
            ],
            answer: 1,
            explanation: "Thiếu i++ nên điều kiện luôn đúng.",
          },
        ],
      },
      code(
        "sum-1-to-n",
        "Tổng từ 1 đến n",
        Difficulty.MEDIUM,
        "Cho số nguyên dương `n` (1 ≤ n ≤ 100000). In ra tổng `1 + 2 + ... + n`.\n\n**Gợi ý:** tổng lớn nhất khoảng 5×10⁹, nên dùng `long long`.",
        cases(
          [
            "5",
            "1",
            "10",
            "2",
            "100",
            "999",
            "46341",
            "65536",
            "99999",
            "100000",
          ],
          sumTo,
          3,
        ),
        150,
      ),
      code(
        "count-digits",
        "Đếm số chữ số",
        Difficulty.EASY,
        "Cho số nguyên `n` (0 ≤ n ≤ 10^9). In ra số chữ số của `n` (số 0 có 1 chữ số).",
        cases(
          ["12345", "0", "7", "10", "100", "65536", "99999", "1000000000"],
          (input) => String(input.length),
        ),
      ),
      {
        kind: "HANDWRITTEN",
        key: "essay-loops",
        title: "Tự luận: Chạy tay vòng lặp",
        difficulty: Difficulty.MEDIUM,
        points: 50,
        prompt:
          "Trình bày trên giấy rồi chụp ảnh nộp bài:\n\n1. Lập bảng giá trị `i`, `s` sau mỗi lần lặp và cho biết kết quả in ra:\n\n```cpp\nint s = 0;\nfor (int i = 10; i > 0; i -= 3) s += i;\ncout << s;\n```\n\n2. Viết lại đoạn trên bằng `while`.\n3. Viết tay chương trình in tam giác số với n = 4 (dòng k in các số từ 1 đến k, cách nhau dấu cách).",
        rubric:
          "Tổng 10 điểm.\n- Câu 1 (4 điểm): i lần lượt 10, 7, 4, 1; s lần lượt 10, 17, 21, 22; in 22 (mỗi bước đúng khoảng 0,8 điểm, kết quả 0,8 điểm).\n- Câu 2 (3 điểm): khởi tạo i = 10 trước vòng (1 điểm); while (i > 0) (1 điểm); s += i; i -= 3 trong thân (1 điểm).\n- Câu 3 (3 điểm): hai vòng for lồng nhau đúng biên (2 điểm), xuống dòng sau mỗi dòng (1 điểm).",
      },
    ],
  },
  {
    title: "Hàm",
    description: "Module 3 · Hàm và mảng: chia nhỏ bài toán.",
    videos: [
      kteam("So2VJonE32U", "Bài 20: Cơ bản về hàm và giá trị trả về"),
      kteam("A4UffxbyFD4", "Bài 21: Truyền giá trị cho hàm"),
      kteam("aMV7_i3XMj4", "Bài 22: Truyền tham chiếu cho hàm"),
    ],
    parts: {
      overview:
        "Khi chương trình dài ra, ta tách nó thành các **hàm** nhỏ, mỗi hàm làm một việc. Bài này dạy viết hàm, trả về giá trị và hai cách truyền tham số.\n\n**Mục tiêu:** viết được hàm `isPrime`, `gcd` và hiểu khi nào dùng tham chiếu `&`.",
      concept:
        "**Hàm** là một khối lệnh có tên, nhận **tham số** đầu vào và có thể **trả về** một giá trị. Gọi hàm là chạy khối lệnh đó với tham số cụ thể.",
      characteristics:
        "- Khai báo gồm: kiểu trả về, tên hàm, danh sách tham số, thân hàm.\n- `return` kết thúc hàm và trả giá trị.\n- Hàm `void` không trả về gì.\n- Biến khai báo trong hàm là biến cục bộ, chỉ sống trong hàm.\n- Hàm phải được khai báo trước chỗ gọi.",
      classification:
        "- **Truyền giá trị** `int f(int x)`: hàm nhận bản sao, sửa x không ảnh hưởng biến gốc.\n- **Truyền tham chiếu** `void f(int &x)`: hàm làm việc trên chính biến gốc.\n- **Hàm có trả về** (`int`, `bool`, `double`…) và **hàm void**.",
      mechanism:
        "Khi gọi `isPrime(7)`: máy cấp vùng nhớ mới cho tham số `n = 7`, chạy thân hàm, gặp `return` thì trả kết quả về đúng chỗ gọi và giải phóng biến cục bộ. Với tham chiếu `&`, tham số chỉ là tên khác của biến gốc nên không có bản sao.",
      syntax: `${F}cpp
bool isPrime(int n) {
    if (n < 2) return false;
    for (int d = 2; d * d <= n; d++)
        if (n % d == 0) return false;
    return true;
}

void doiCho(int &a, int &b) {   // truyền tham chiếu
    int t = a; a = b; b = t;
}
${F}`,
      example: `${F}cpp
int gcd(int a, int b) {
    while (b != 0) {
        int r = a % b;
        a = b;
        b = r;
    }
    return a;
}

int main() {
    cout << gcd(84, 36);   // 12
}
${F}`,
      application:
        "Hàm giúp tái sử dụng code (kiểm tra số nguyên tố ở nhiều chỗ), chia việc trong nhóm (mỗi người viết một hàm), dễ kiểm thử từng phần. Thư viện chuẩn như `sqrt`, `max`, `sort` đều là hàm.",
      prosCons:
        "**Ưu:** code ngắn, dễ đọc, dễ sửa một chỗ; kiểm tra được riêng từng hàm.\n\n**Nhược:** gọi hàm tốn một chút chi phí; truyền giá trị với dữ liệu lớn (string, vector) tốn bộ nhớ, nên dùng `const &`.",
      errors:
        "- Quên `return` ở hàm có kiểu trả về → kết quả không xác định.\n- Gọi hàm trước khi khai báo.\n- Muốn hàm sửa biến gốc nhưng quên `&`.\n- Kiểm tra nguyên tố bằng vòng tới `n` → quá chậm; dùng `d * d <= n`.",
      takeaways:
        "- `kiểu tên(tham số) { ... return ...; }`.\n- Truyền giá trị tạo bản sao; truyền tham chiếu `&` sửa được biến gốc.\n- Mỗi hàm nên làm đúng một việc.",
      practice:
        "Làm trắc nghiệm, hai bài code số nguyên tố và UCLN, rồi bài tự luận so sánh hai cách truyền tham số.",
    },
    exercises: [
      {
        kind: "QUIZ",
        key: "quiz-functions",
        title: "Trắc nghiệm: Hàm",
        points: 30,
        prompt: "Ôn lại khai báo hàm, return và cách truyền tham số.",
        questions: [
          {
            prompt: "Hàm không trả về giá trị có kiểu trả về là gì?",
            options: ["int", "null", "void", "bool"],
            answer: 2,
            explanation: "void nghĩa là không trả về gì.",
          },
          {
            prompt:
              "void tang(int x) { x++; } int a = 5; tang(a); cout << a; in ra gì?",
            options: ["5", "6", "0", "Lỗi"],
            answer: 0,
            explanation:
              "Truyền giá trị: hàm chỉ tăng bản sao, a giữ nguyên 5.",
          },
          {
            prompt: "Sửa hàm tang thế nào để a thành 6?",
            options: [
              "void tang(int *x)",
              "void tang(int &x)",
              "int tang(int x)",
              "void tang(const int x)",
            ],
            answer: 1,
            explanation: "Tham chiếu & cho phép hàm sửa chính biến gốc.",
          },
          {
            prompt: "Lệnh return trong hàm làm gì?",
            options: [
              "In giá trị ra màn hình",
              "Kết thúc hàm và trả giá trị về chỗ gọi",
              "Lặp lại hàm",
              "Khai báo biến",
            ],
            answer: 1,
            explanation: "return không in gì; nó trả giá trị về nơi gọi hàm.",
          },
        ],
      },
      code(
        "is-prime",
        "Số nguyên tố",
        Difficulty.MEDIUM,
        "Viết hàm `isPrime(n)`. Đọc số nguyên `n` (1 ≤ n ≤ 100000), in `YES` nếu `n` là số nguyên tố, ngược lại in `NO`.",
        cases(
          [
            "7",
            "1",
            "2",
            "4",
            "17",
            "25",
            "97",
            "100",
            "7919",
            "99991",
            "99999",
          ],
          (input) => (isPrime(Number(input)) ? "YES" : "NO"),
        ),
        150,
      ),
      code(
        "gcd-lcm",
        "UCLN và BCNN",
        Difficulty.MEDIUM,
        "Viết hàm `gcd(a, b)`. Đọc hai số nguyên dương `a`, `b` (1 ≤ a, b ≤ 10^9). In ra ước chung lớn nhất và bội chung nhỏ nhất, cách nhau một dấu cách.\n\n**Gợi ý:** BCNN = a / UCLN × b, dùng `long long` vì BCNN có thể tới 10^18.",
        cases(
          [
            "84 36",
            "7 13",
            "1 1",
            "12 12",
            "1000000000 999999999",
            "48 180",
            "17 51",
          ],
          (input) => {
            const [a, b] = ints(input);
            const g = gcd(a, b);
            return `${g} ${(BigInt(a / g) * BigInt(b)).toString()}`;
          },
        ),
        150,
      ),
      {
        kind: "HANDWRITTEN",
        key: "essay-functions",
        title: "Tự luận: Truyền giá trị và truyền tham chiếu",
        difficulty: Difficulty.MEDIUM,
        points: 50,
        prompt:
          'Trình bày trên giấy rồi chụp ảnh nộp bài:\n\n1. So sánh truyền giá trị và truyền tham chiếu (cách hoạt động, khi nào dùng).\n2. Cho biết đoạn sau in ra gì và giải thích:\n\n```cpp\nvoid f(int a, int &b) { a = a * 2; b = b * 2; }\nint x = 3, y = 4; f(x, y); cout << x << " " << y;\n```\n\n3. Viết tay hàm `int tongChuSo(int n)` trả về tổng các chữ số của n.',
        rubric:
          "Tổng 10 điểm.\n- Câu 1 (4 điểm): truyền giá trị tạo bản sao, không đổi biến gốc (1,5 điểm); tham chiếu dùng chính biến gốc (1,5 điểm); nêu được tình huống dùng mỗi loại (1 điểm).\n- Câu 2 (3 điểm): in 3 8 (1 điểm); a là bản sao nên x không đổi, b tham chiếu tới y nên y gấp đôi (2 điểm).\n- Câu 3 (3 điểm): vòng while n > 0 (1 điểm); cộng n % 10 và n /= 10 (1 điểm); return tổng (1 điểm).",
      },
    ],
  },
  {
    title: "Mảng một chiều",
    description: "Module 3 · Hàm và mảng: lưu nhiều giá trị.",
    videos: [
      kteam("cgKiUF98fLo", "Bài 33: Mảng một chiều"),
      kteam("b8-F1w25sVo", "Bài 34: Các thao tác trên mảng một chiều"),
    ],
    parts: {
      overview:
        'Cần lưu điểm của 40 học sinh? Thay vì 40 biến, ta dùng một **mảng**. Bài này dạy khai báo, nhập, duyệt mảng và các thao tác tìm max, đếm, tính tổng.\n\n**Mục tiêu:** đọc input dạng "n rồi n số" và xử lý từng phần tử.',
      concept:
        "**Mảng** là dãy các phần tử **cùng kiểu**, nằm liên tiếp trong bộ nhớ, truy cập bằng **chỉ số** bắt đầu từ 0. Mảng `a` có `n` phần tử thì có `a[0]` đến `a[n - 1]`.",
      characteristics:
        "- Kích thước mảng tĩnh cố định khi khai báo.\n- Truy cập phần tử bất kỳ ngay lập tức qua chỉ số.\n- C++ **không** kiểm tra chỉ số vượt biên: `a[n]` đọc phải vùng nhớ lạ.\n- `vector<int>` là mảng động, tự co giãn, an toàn hơn.",
      classification:
        "- **Mảng tĩnh:** `int a[1000];`\n- **vector:** `vector<int> a(n);`\n- **Mảng một chiều** (bài này) và **mảng hai chiều** `int b[100][100];` (bảng, ma trận).",
      mechanism:
        "Các phần tử nằm sát nhau, nên địa chỉ của `a[i]` = địa chỉ đầu mảng + i × kích thước một phần tử. Nhờ vậy truy cập theo chỉ số mất thời gian như nhau dù i lớn hay nhỏ.",
      syntax: `${F}cpp
int n;
cin >> n;
vector<int> a(n);            // hoặc int a[1000];
for (int i = 0; i < n; i++) cin >> a[i];

int mx = a[0];
for (int i = 1; i < n; i++)
    if (a[i] > mx) mx = a[i];
${F}`,
      example: `${F}cpp
// input: 5 \\n 3 9 2 7 1
long long tong = 0;
int dem = 0;
for (int x : a) {           // duyệt từng phần tử
    tong += x;
    if (x % 2 == 0) dem++;
}
cout << tong << " " << dem;  // 22 1
${F}`,
      application:
        "Mảng lưu danh sách điểm, giá sản phẩm, nhiệt độ từng ngày. Hầu hết bài toán thuật toán đều bắt đầu bằng việc đọc một mảng rồi tìm max, đếm, sắp xếp hoặc tìm kiếm.",
      prosCons:
        "**Ưu:** truy cập theo chỉ số rất nhanh; lưu gọn nhiều giá trị cùng kiểu.\n\n**Nhược:** mảng tĩnh cố định kích thước; chèn/xóa ở giữa phải dời nhiều phần tử; vượt biên gây lỗi khó tìm.",
      errors:
        "- Duyệt `i <= n` → đọc `a[n]` vượt biên.\n- Khởi tạo `mx = 0` khi mảng toàn số âm → max sai. Nên lấy `mx = a[0]`.\n- Khai báo `int a[n]` với n lớn trong hàm → tràn stack; dùng `vector`.\n- Quên đọc dòng `n` trước.",
      takeaways:
        "- Chỉ số từ 0 đến n - 1.\n- Khởi tạo max/min bằng phần tử đầu tiên.\n- Ưu tiên `vector` khi chưa biết trước kích thước.",
      practice:
        "Làm trắc nghiệm, hai bài code tìm max và đếm số chẵn, rồi bài tự luận chạy tay thuật toán trên mảng.",
    },
    exercises: [
      {
        kind: "QUIZ",
        key: "quiz-arrays",
        title: "Trắc nghiệm: Mảng một chiều",
        points: 30,
        prompt: "Ôn lại chỉ số mảng và các thao tác cơ bản.",
        questions: [
          {
            prompt: "Mảng int a[10] có phần tử cuối là?",
            options: ["a[10]", "a[9]", "a[11]", "a[1]"],
            answer: 1,
            explanation: "Chỉ số bắt đầu từ 0 nên phần tử cuối là a[9].",
          },
          {
            prompt: "Mảng toàn số âm, khởi tạo mx = 0 rồi tìm max sẽ thế nào?",
            options: [
              "Cho đúng max",
              "Luôn in 0, sai",
              "Lỗi biên dịch",
              "In phần tử đầu",
            ],
            answer: 1,
            explanation:
              "Không phần tử nào lớn hơn 0 nên mx giữ nguyên 0. Hãy khởi tạo mx = a[0].",
          },
          {
            prompt: "Truy cập a[n] với mảng n phần tử thì C++ làm gì?",
            options: [
              "Báo lỗi biên dịch",
              "Tự động mở rộng mảng",
              "Không kiểm tra, đọc vùng nhớ ngoài mảng (hành vi không xác định)",
              "Trả về 0",
            ],
            answer: 2,
            explanation:
              "C++ không kiểm tra biên của mảng tĩnh; đây là lỗi nguy hiểm.",
          },
          {
            prompt: "vector<int> a(5); thì a.size() bằng?",
            options: ["0", "4", "5", "Không xác định"],
            answer: 2,
            explanation: "vector được tạo sẵn 5 phần tử, mặc định bằng 0.",
          },
        ],
      },
      code(
        "array-max",
        "Phần tử lớn nhất",
        Difficulty.EASY,
        "Dòng 1: số `n` (1 ≤ n ≤ 1000). Dòng 2: `n` số nguyên (|giá trị| ≤ 10^9). In ra phần tử lớn nhất.",
        cases(
          [
            "5\n3 9 2 7 1",
            "1\n42",
            "4\n-5 -2 -9 -1",
            "6\n10 10 10 10 10 10",
            "3\n0 0 0",
            "7\n1 2 3 4 5 6 7",
            "5\n1000000000 5 -7 999999999 3",
            "8\n-3 -3 -3 -2 -3 -3 -3 -3",
          ],
          (input) => String(Math.max(...arrayOf(input))),
        ),
      ),
      code(
        "array-count-even",
        "Đếm số chẵn",
        Difficulty.EASY,
        "Dòng 1: số `n` (1 ≤ n ≤ 1000). Dòng 2: `n` số nguyên (|giá trị| ≤ 10^9). In ra số lượng phần tử chẵn.",
        cases(
          [
            "5\n1 2 3 4 5",
            "1\n7",
            "4\n2 4 6 8",
            "3\n1 3 5",
            "5\n0 -2 -3 -4 9",
            "6\n1000000000 999999999 2 3 4 5",
          ],
          (input) =>
            String(arrayOf(input).filter((value) => value % 2 === 0).length),
        ),
      ),
      {
        kind: "HANDWRITTEN",
        key: "essay-arrays",
        title: "Tự luận: Đảo ngược mảng tại chỗ",
        difficulty: Difficulty.MEDIUM,
        points: 50,
        prompt:
          "Trình bày trên giấy rồi chụp ảnh nộp bài:\n\n1. Viết tay đoạn code đảo ngược mảng `a` gồm `n` phần tử **tại chỗ** (không dùng mảng phụ).\n2. Chạy tay đoạn code với `a = {4, 8, 15, 16, 23}`: ghi mảng sau mỗi lần đổi chỗ.\n3. Vòng lặp của bạn chạy bao nhiêu lần với n phần tử? Vì sao không được chạy tới n?",
        rubric:
          "Tổng 10 điểm.\n- Câu 1 (4 điểm): vòng i từ 0 tới n/2 - 1 (2 điểm); đổi chỗ a[i] với a[n - 1 - i] (2 điểm).\n- Câu 2 (3 điểm): {23, 8, 15, 16, 4} rồi {23, 16, 15, 8, 4}; phần tử giữa giữ nguyên.\n- Câu 3 (3 điểm): n/2 lần (1 điểm); chạy tới n sẽ đổi chỗ thêm lần nữa và mảng trở lại như cũ (2 điểm).",
      },
    ],
  },
  {
    title: "Chuỗi cơ bản",
    description: "Module 3 · Hàm và mảng: string và getline.",
    videos: [kteam("LJ0Ok2JUfgs", "Bài 14: Cơ bản về chuỗi ký tự")],
    parts: {
      overview:
        "Tên, câu, mật khẩu đều là chuỗi. Bài này dạy dùng kiểu `string`: đọc cả dòng, lấy độ dài, duyệt từng ký tự, nối và đảo chuỗi.\n\n**Mục tiêu:** xử lý được chuỗi có dấu cách và biến đổi từng ký tự.",
      concept:
        "**Chuỗi** (`string`) là dãy các ký tự. Có thể coi `string` như một mảng `char` biết tự quản lý độ dài: `s[i]` là ký tự thứ i, bắt đầu từ 0.",
      characteristics:
        "- `s.length()` hoặc `s.size()` cho số ký tự.\n- Nối chuỗi bằng `+`.\n- So sánh chuỗi bằng `==`, `<` theo thứ tự từ điển.\n- Có thể sửa từng ký tự: `s[0] = 'H';`.\n- Ký tự thực chất là số (mã ASCII): `'A'` là 65, `'a'` là 97.",
      classification:
        "- **Đọc một từ:** `cin >> s`.\n- **Đọc cả dòng:** `getline(cin, s)`.\n- **Thao tác:** `substr`, `find`, `push_back`, `erase`.\n- **Kiểm tra ký tự:** `isdigit`, `isalpha`, `isupper`, `toupper`, `tolower` (thư viện `<cctype>`).",
      mechanism:
        "`string` lưu các ký tự liên tiếp trong bộ nhớ và tự cấp phát thêm khi chuỗi dài ra. Phép `+` tạo chuỗi mới chứa ký tự của cả hai chuỗi.",
      syntax: `${F}cpp
string s;
getline(cin, s);
cout << s.length() << "\\n";
for (int i = 0; i < (int)s.length(); i++)
    if (isupper(s[i])) s[i] = tolower(s[i]);
string t = s.substr(0, 3);       // 3 ký tự đầu
string r(s.rbegin(), s.rend());  // chuỗi đảo
${F}`,
      example: `${F}cpp
string s = "Code Carf";
int nguyenAm = 0;
for (char c : s) {
    char x = tolower(c);
    if (x == 'a' || x == 'e' || x == 'i' || x == 'o' || x == 'u') nguyenAm++;
}
cout << nguyenAm;   // 3
${F}`,
      application:
        "Xử lý chuỗi có ở mọi nơi: chuẩn hóa họ tên, kiểm tra mật khẩu đủ mạnh, đếm từ trong văn bản, tìm kiếm từ khóa, kiểm tra chuỗi đối xứng.",
      prosCons:
        "**Ưu:** `string` dễ dùng, tự quản lý bộ nhớ, nhiều hàm có sẵn.\n\n**Nhược:** nối chuỗi liên tục trong vòng lặp lớn có thể chậm; dễ nhầm `cin >>` với `getline`; chuỗi có dấu tiếng Việt (UTF-8) dài hơn số chữ nhìn thấy.",
      errors:
        "- Dùng `cin >> s` khi chuỗi có dấu cách.\n- So sánh `s.length()` (số không dấu) với số âm trong vòng lặp ngược.\n- Truy cập `s[s.length()]` vượt biên.\n- Viết `s == 'a'` (so chuỗi với ký tự).",
      takeaways:
        "- Đọc cả dòng bằng `getline`.\n- `s[i]` là ký tự thứ i, từ 0 tới `s.length() - 1`.\n- Dùng `<cctype>` để kiểm tra và đổi hoa/thường.",
      practice:
        "Làm trắc nghiệm, hai bài code đảo chuỗi và đếm từ, rồi bài tự luận chuẩn hóa họ tên.",
    },
    exercises: [
      {
        kind: "QUIZ",
        key: "quiz-strings",
        title: "Trắc nghiệm: Chuỗi",
        points: 30,
        prompt: "Ôn lại cách đọc và thao tác trên string.",
        questions: [
          {
            prompt: 'string s = "Hello"; s.length() bằng?',
            options: ["4", "5", "6", "Hello"],
            answer: 1,
            explanation: "Chuỗi có 5 ký tự H, e, l, l, o.",
          },
          {
            prompt: 'string s = "C++"; cout << s[1]; in ra gì?',
            options: ["C", "+", "++", "Lỗi"],
            answer: 1,
            explanation: "Chỉ số từ 0: s[0] = 'C', s[1] = '+'.",
          },
          {
            prompt: 'Kết quả của "abc" + string("de") là?',
            options: ["abcde", "abc de", "Lỗi", "5"],
            answer: 0,
            explanation: "Toán tử + nối hai chuỗi.",
          },
          {
            prompt: 'string s = "LapTrinh"; s.substr(3, 5) là?',
            options: ["Trin", "Trinh", "pTrin", "LapTr"],
            answer: 1,
            explanation: "Lấy 5 ký tự bắt đầu từ vị trí 3.",
          },
          {
            prompt: "Hàm nào đổi một ký tự sang chữ hoa?",
            options: ["upper(c)", "toupper(c)", "c.upper()", "isupper(c)"],
            answer: 1,
            explanation: "toupper trong <cctype>; isupper chỉ kiểm tra.",
          },
        ],
      },
      code(
        "reverse-string",
        "Đảo ngược chuỗi",
        Difficulty.EASY,
        "Đọc một dòng chuỗi `s` (1 ≤ độ dài ≤ 1000, có thể chứa dấu cách) và in ra chuỗi đảo ngược.",
        cases(
          [
            "hello",
            "a",
            "CodeCarf",
            "12345",
            "racecar",
            "Xin chao The Gioi",
            "C++ rat vui",
          ],
          (input) => [...input].reverse().join(""),
        ),
      ),
      code(
        "count-words",
        "Đếm số từ",
        Difficulty.MEDIUM,
        "Đọc một dòng chuỗi (độ dài ≤ 1000, chỉ gồm chữ cái không dấu và dấu cách). Các từ có thể cách nhau **nhiều** dấu cách, đầu và cuối dòng cũng có thể có dấu cách. In ra số từ.",
        cases(
          [
            "Xin chao Code Carf",
            "   lap   trinh  C   ",
            "motTu",
            "a b c d e f g",
            "  hai  tu  ",
            "C plus plus rat la thu vi",
          ],
          (input) => String(input.trim().split(/\s+/).filter(Boolean).length),
        ),
        120,
      ),
      {
        kind: "HANDWRITTEN",
        key: "essay-strings",
        title: "Tự luận: Chuẩn hóa họ tên",
        difficulty: Difficulty.MEDIUM,
        points: 50,
        prompt:
          'Trình bày trên giấy rồi chụp ảnh nộp bài:\n\n1. Chuẩn hóa họ tên nghĩa là: bỏ dấu cách thừa, chữ cái đầu mỗi từ viết hoa, còn lại viết thường. Ví dụ `"  nGUYEN   van  a "` thành `"Nguyen Van A"`. Mô tả thuật toán bằng các bước.\n2. Viết tay chương trình C++ thực hiện thuật toán trên.\n3. Vì sao phải dùng `getline` thay vì `cin >>` cho bài này?',
        rubric:
          "Tổng 10 điểm.\n- Câu 1 (3 điểm): tách từ bỏ dấu cách thừa (1 điểm); hoa chữ đầu (1 điểm); thường các chữ còn lại, nối bằng một dấu cách (1 điểm).\n- Câu 2 (5 điểm): đọc bằng getline (1 điểm); tách từ đúng, ví dụ dùng stringstream hoặc duyệt ký tự (2 điểm); toupper/tolower đúng vị trí (1 điểm); in kết quả không thừa dấu cách cuối (1 điểm).\n- Câu 3 (2 điểm): cin >> dừng ở dấu cách nên chỉ đọc được một từ.",
      },
    ],
  },
  {
    title: "Ôn tập tổng hợp",
    description: "Module 4 · Tổng kết: nhìn lại những gì đã học.",
    content: `# Ôn tập tổng hợp

Trước khi làm mini project, hãy tự kiểm tra:

1. Hàm \`main\` dùng để làm gì?
2. Khi nào phải dùng \`long long\` thay cho \`int\`?
3. \`7 / 2\` và \`7 / 2.0\` khác nhau thế nào?
4. \`for\` khác \`while\` ở điểm nào?
5. Mảng có \`n\` phần tử thì chỉ số cuối cùng là bao nhiêu?
6. Làm sao đọc cả một dòng có dấu cách?

Nếu còn mơ hồ câu nào, quay lại bài học tương ứng rồi làm lại bài tập. Sau đó làm bài trắc nghiệm tổng hợp bên dưới.`,
    exercises: [
      {
        kind: "QUIZ",
        key: "quiz-review",
        title: "Trắc nghiệm tổng hợp C++ cơ bản",
        points: 60,
        prompt:
          "Mười câu hỏi bao quát toàn bộ lộ trình. Cần đúng ít nhất 7 câu trước khi sang mini project.",
        questions: [
          {
            prompt: "Thiếu dấu ; ở cuối câu lệnh thì chuyện gì xảy ra?",
            options: [
              "Chạy bình thường",
              "Lỗi biên dịch",
              "Lỗi khi chạy",
              "In ra cảnh báo nhưng vẫn chạy đúng",
            ],
            answer: 1,
            explanation: "Đây là lỗi cú pháp, trình biên dịch dừng lại.",
          },
          {
            prompt: "Tích của hai số cỡ 10^5 nên lưu bằng kiểu nào?",
            options: ["int", "long long", "char", "bool"],
            answer: 1,
            explanation: "10^10 vượt int.",
          },
          {
            prompt: "cout << 9 / 2 * 2; in ra gì?",
            options: ["9", "8", "4", "18"],
            answer: 1,
            explanation: "9 / 2 = 4 (chia nguyên), 4 × 2 = 8.",
          },
          {
            prompt: "Điều kiện nào kiểm tra n là số có hai chữ số (dương)?",
            options: [
              "n > 10 && n < 99",
              "n >= 10 && n <= 99",
              "n >= 10 || n <= 99",
              "10 <= n <= 99",
            ],
            answer: 1,
            explanation: "Cần cả hai biên và ghép bằng &&.",
          },
          {
            prompt: "for (int i = 2; i <= 10; i += 2) chạy bao nhiêu lần?",
            options: ["4", "5", "8", "9"],
            answer: 1,
            explanation: "i = 2, 4, 6, 8, 10.",
          },
          {
            prompt: "Khi nào nên dùng while thay vì for?",
            options: [
              "Khi duyệt mảng",
              "Khi chưa biết trước số lần lặp",
              "Khi cần chạy đúng n lần",
              "Không bao giờ",
            ],
            answer: 1,
            explanation:
              "while phù hợp với lặp theo điều kiện, như tách chữ số.",
          },
          {
            prompt: "Muốn hàm hoán đổi hai biến của nơi gọi, tham số phải là?",
            options: [
              "int a, int b",
              "int &a, int &b",
              "const int a, const int b",
              "void a, void b",
            ],
            answer: 1,
            explanation: "Cần truyền tham chiếu để sửa biến gốc.",
          },
          {
            prompt: "Duyệt mảng n phần tử, điều kiện vòng lặp đúng là?",
            options: ["i <= n", "i < n", "i < n - 1", "i <= n + 1"],
            answer: 1,
            explanation: "Chỉ số hợp lệ từ 0 tới n - 1.",
          },
          {
            prompt: 'Đọc dòng "Le Thi B" vào một biến string cần dùng?',
            options: ["cin >> s", "getline(cin, s)", "cin.get(s)", "cout << s"],
            answer: 1,
            explanation: "getline đọc cả dấu cách.",
          },
          {
            prompt:
              "Kiểm tra số nguyên tố nhanh, vòng lặp chỉ cần chạy d tới đâu?",
            options: ["d < n", "d <= n / 2", "d * d <= n", "d <= 10"],
            answer: 2,
            explanation:
              "Nếu n có ước lớn hơn căn n thì cũng có ước nhỏ hơn căn n.",
          },
        ],
      },
    ],
  },
  {
    title: "Mini project: Máy tính bỏ túi",
    description: "Module 4 · Tổng kết: kết hợp mọi thứ đã học.",
    content: `# Mini project: Máy tính bỏ túi

Bạn sẽ viết một máy tính đơn giản, dùng: nhập xuất, \`if/else\`, kiểu dữ liệu.

## Yêu cầu

- Đọc \`a\`, phép toán \`op\` và \`b\`.
- Phép \`+ - *\` làm việc với số nguyên lớn (dùng \`long long\`).
- Phép \`/\` in kết quả thực với đúng **2 chữ số thập phân**: \`cout << fixed << setprecision(2)\` (cần \`#include <iomanip>\`).
- Chia cho 0 thì in \`Loi chia cho 0\`.

Bộ test có các trường hợp biên: số âm, chia cho 0, kết quả làm tròn.`,
    exercises: [
      code(
        "calculator",
        "Máy tính bỏ túi",
        Difficulty.MEDIUM,
        "Đọc một dòng gồm `a op b` cách nhau bởi dấu cách, với `op` là một trong `+`, `-`, `*`, `/` và |a|, |b| ≤ 10^9.\n\n- Với `+`, `-`, `*`: in kết quả là số nguyên.\n- Với `/`: in kết quả với đúng 2 chữ số thập phân.\n- Nếu chia cho 0: in `Loi chia cho 0`.",
        cases(
          [
            "6 + 4",
            "9 / 2",
            "6 - 10",
            "7 * 8",
            "10 / 0",
            "0 / 5",
            "-3 * -3",
            "100 / 8",
            "7 / 3",
            "1000000000 * 1000000000",
            "2 / 3",
          ],
          calculate,
        ),
        200,
      ),
    ],
  },
  {
    title: "Hoàn thành lộ trình",
    description: "Module 4 · Tổng kết: chúc mừng bạn!",
    videos: [kteam("R6KYxkvg-UQ", "Bài 52: Cơ bản về lớp Vector (học tiếp)")],
    content: `# Chúc mừng bạn!

Bạn đã đi hết lộ trình **Lập trình C++ cơ bản**: từ dòng \`Hello world\` đầu tiên tới một máy tính bỏ túi hoàn chỉnh.

## Tiếp theo nên học gì?

- Cấu trúc dữ liệu: \`vector\`, \`map\`, \`set\` (video bên trên là bước đầu).
- Thuật toán sắp xếp và tìm kiếm: lộ trình **Cấu trúc dữ liệu và giải thuật**.
- Tham gia các cuộc thi trên nền tảng để luyện tập.`,
    exercises: [],
  },
];

runSeed({
  slug: "lap-trinh-cpp-co-ban",
  exercisePrefix: "seed-cpp",
  title: "Lập trình C++ cơ bản",
  description:
    "Từ dòng code đầu tiên đến giải được các bài thuật toán nhập môn: biến, điều kiện, vòng lặp, hàm, mảng và chuỗi. Mỗi bài có video bài giảng, trắc nghiệm, bài code chấm tự động và tự luận.",
  difficulty: Difficulty.EASY,
  tags: ["C++", "nhập môn", "thuật toán"],
  estimatedMinutes: 14 * 60,
  coverTheme: "sky",
  defaultTimeLimitMs: 1000,
  rooms: ROOMS,
});
