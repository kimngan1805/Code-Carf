/**
 * Lộ trình mẫu "Lập trình C++ cơ bản": 12 bài học, 15 bài tập code có test case.
 * Chạy: npm run db:seed:cpp (cần chạy `npm run db:seed` trước để có tài khoản giáo viên).
 * Chạy lại nhiều lần an toàn: mọi thứ upsert theo slug / id cố định, test case được ghi lại.
 * Đáp án của từng test được TÍNH bằng hàm solve bên dưới, không gõ tay, để tránh sai số.
 */
import { Difficulty, ExerciseKind, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const PATH_SLUG = "lap-trinh-cpp-co-ban";

type Case = { input: string; expected: string; isHidden: boolean };
type ExerciseSeed = {
  key: string;
  title: string;
  difficulty: Difficulty;
  points: number;
  prompt: string;
  tests: Case[];
  timeLimitMs?: number;
};
type RoomSeed = {
  title: string;
  description: string;
  content: string;
  exercises: ExerciseSeed[];
};

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

/** Thêm mục "Ví dụ" (lấy từ test hiện đầu tiên) vào cuối đề bài. */
function withExample(prompt: string, tests: Case[]) {
  const sample = tests.find((test) => !test.isHidden) ?? tests[0];
  const input = sample.input
    ? `\`\`\`\n${sample.input}\n\`\`\``
    : "_(không có đầu vào)_";
  return `${prompt}\n\n### Ví dụ\n\n**Đầu vào**\n\n${input}\n\n**Đầu ra**\n\n\`\`\`\n${sample.expected}\n\`\`\``;
}

function exercise(
  key: string,
  title: string,
  difficulty: Difficulty,
  prompt: string,
  tests: Case[],
  points = 100,
): ExerciseSeed {
  return {
    key,
    title,
    difficulty,
    points,
    prompt: withExample(prompt, tests),
    tests,
  };
}

const ints = (input: string) => input.trim().split(/\s+/).map(Number);
const big = (value: string) => BigInt(value);
const arrayOf = (input: string) => ints(input.split("\n")[1]);

const sumTo = (input: string) =>
  ((big(input) * (big(input) + BigInt(1))) / BigInt(2)).toString();
const isPrime = (n: number) => {
  if (n < 2) return false;
  for (let d = 2; d * d <= n; d++) if (n % d === 0) return false;
  return true;
};
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

const ROOMS: RoomSeed[] = [
  {
    title: "Chương trình C++ đầu tiên",
    description: "Module 1 · Làm quen với C++ — hàm main, cout, chú thích.",
    content: `# Chương trình C++ đầu tiên

Mọi chương trình C++ bắt đầu chạy từ hàm \`main\`. Để in chữ ra màn hình ta dùng \`cout\` trong thư viện \`iostream\`.

\`\`\`cpp
#include <iostream>
using namespace std;

int main() {
    cout << "Xin chao";
    return 0;
}
\`\`\`

## Cần nhớ

- \`#include <iostream>\` cho phép dùng \`cout\` và \`cin\`.
- Mỗi câu lệnh kết thúc bằng dấu \`;\`.
- Xuống dòng bằng \`endl\` hoặc \`"\\n"\`.
- Chú thích một dòng bắt đầu bằng \`//\`.

> Hệ thống so sánh output từng dòng, nên in đúng chữ, đúng dấu cách và đúng chữ hoa/thường.`,
    exercises: [
      exercise(
        "hello-world",
        "Hello world",
        Difficulty.EASY,
        "Viết chương trình in ra đúng dòng chữ `Hello world`.",
        [{ input: "", expected: "Hello world", isHidden: false }],
      ),
      exercise(
        "two-lines",
        "In hai dòng",
        Difficulty.EASY,
        "In ra hai dòng: dòng thứ nhất là `Xin chao`, dòng thứ hai là `C++`.",
        [{ input: "", expected: "Xin chao\nC++", isHidden: false }],
      ),
    ],
  },
  {
    title: "Biến và kiểu dữ liệu",
    description: "Module 1 · Làm quen với C++ — int, double, char, string.",
    content: `# Biến và kiểu dữ liệu

Biến là chỗ lưu một giá trị. Mỗi biến có một **kiểu**.

| Kiểu | Lưu gì | Ví dụ |
| --- | --- | --- |
| \`int\` | số nguyên nhỏ | \`int a = 5;\` |
| \`long long\` | số nguyên lớn | \`long long s = 5000050000;\` |
| \`double\` | số thực | \`double b = 3.5;\` |
| \`char\` | một ký tự | \`char c = 'A';\` |
| \`string\` | chuỗi | \`string s = "C++";\` |

\`\`\`cpp
int a = 5;
double b = 3.5;
cout << a << endl << b << endl;
\`\`\`

**Lưu ý:** \`int\` chỉ chứa tới khoảng 2,1 tỷ. Tổng hoặc tích lớn hơn cần \`long long\`.`,
    exercises: [
      exercise(
        "variables",
        "Khai báo biến",
        Difficulty.EASY,
        "Khai báo `int a = 5` và `double b = 3.5`, sau đó in `a` ở dòng thứ nhất và `b` ở dòng thứ hai.",
        [{ input: "", expected: "5\n3.5", isHidden: false }],
      ),
    ],
  },
  {
    title: "Nhập xuất dữ liệu",
    description: "Module 1 · Làm quen với C++ — cin, đọc nhiều giá trị.",
    content: `# Nhập xuất dữ liệu

\`cin\` đọc dữ liệu người dùng (hoặc test) đưa vào.

\`\`\`cpp
int a, b;
cin >> a >> b;
cout << a + b;
\`\`\`

## Cần nhớ

- \`cin >> a >> b\` đọc hai giá trị cách nhau bởi dấu cách hoặc xuống dòng.
- Đọc cả dòng có dấu cách dùng \`getline(cin, s)\`.
- Không in thêm chữ thừa như "Nhap a:" vì hệ thống so sánh output chính xác.`,
    exercises: [
      exercise(
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
          2,
        ),
      ),
      exercise(
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
          2,
        ),
      ),
    ],
  },
  {
    title: "Toán tử và biểu thức",
    description: "Module 2 · Điều kiện và vòng lặp — + - * / %.",
    content: `# Toán tử và biểu thức

| Toán tử | Ý nghĩa |
| --- | --- |
| \`+ - *\` | cộng, trừ, nhân |
| \`/\` | chia (hai số nguyên thì chia nguyên) |
| \`%\` | lấy phần dư |

\`\`\`cpp
cout << 7 / 2;   // 3 (chia nguyên)
cout << 7 % 2;   // 1
cout << 7 / 2.0; // 3.5
\`\`\`

Muốn chia ra số thực, ít nhất một trong hai số phải là \`double\`.`,
    exercises: [
      exercise(
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
          2,
        ),
      ),
    ],
  },
  {
    title: "Câu lệnh if/else",
    description: "Module 2 · Điều kiện và vòng lặp — rẽ nhánh.",
    content: `# Câu lệnh if/else

\`\`\`cpp
if (n % 2 == 0) {
    cout << "chan";
} else {
    cout << "le";
}
\`\`\`

- So sánh: \`==  !=  <  >  <=  >=\`. Đừng nhầm \`==\` (so sánh) với \`=\` (gán).
- Kết hợp điều kiện: \`&&\` (và), \`||\` (hoặc), \`!\` (phủ định).
- Nhiều nhánh: \`if ... else if ... else\`.
- Số âm: \`-3 % 2\` bằng \`-1\`, nên kiểm tra chẵn bằng \`n % 2 == 0\` thay vì \`n % 2 == 1\` cho lẻ.`,
    exercises: [
      exercise(
        "even-odd",
        "Chẵn hay lẻ",
        Difficulty.EASY,
        "Đọc số nguyên `n` (|n| ≤ 10^9). In `chan` nếu `n` chẵn, ngược lại in `le`.",
        cases(
          ["7", "10", "0", "-3", "-8", "1000000000", "999999999"],
          (input) => (Number(input) % 2 === 0 ? "chan" : "le"),
          2,
        ),
      ),
      exercise(
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
          2,
        ),
      ),
    ],
  },
  {
    title: "Vòng lặp for và while",
    description: "Module 2 · Điều kiện và vòng lặp — lặp lại công việc.",
    content: `# Vòng lặp for và while

\`\`\`cpp
long long sum = 0;
for (int i = 1; i <= n; i++) {
    sum += i;
}
cout << sum;
\`\`\`

\`\`\`cpp
while (n > 0) {
    n /= 10;   // bỏ chữ số cuối
}
\`\`\`

- \`for\` dùng khi biết trước số lần lặp, \`while\` dùng khi lặp đến khi điều kiện sai.
- \`break\` thoát vòng lặp, \`continue\` bỏ qua lượt hiện tại.
- Cẩn thận vòng lặp vô hạn: biến điều kiện phải thay đổi trong thân vòng.
- Tổng lớn cần \`long long\`. Bài sau sẽ có test để kiểm tra điều này.`,
    exercises: [
      exercise(
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
      exercise(
        "count-digits",
        "Đếm số chữ số",
        Difficulty.EASY,
        "Cho số nguyên `n` (0 ≤ n ≤ 10^9). In ra số chữ số của `n` (số 0 có 1 chữ số).",
        cases(
          ["12345", "0", "7", "10", "100", "65536", "99999", "1000000000"],
          (input) => String(input.length),
          2,
        ),
      ),
    ],
  },
  {
    title: "Hàm",
    description: "Module 3 · Hàm và mảng — chia nhỏ bài toán.",
    content: `# Hàm

Hàm giúp gom một đoạn code để dùng lại.

\`\`\`cpp
bool isPrime(int n) {
    if (n < 2) return false;
    for (int d = 2; d * d <= n; d++)
        if (n % d == 0) return false;
    return true;
}

int main() {
    int n;
    cin >> n;
    cout << (isPrime(n) ? "YES" : "NO");
}
\`\`\`

- Kiểu trả về đứng trước tên hàm (\`bool\`, \`int\`, \`void\`...).
- Tham số truyền vào nằm trong ngoặc.
- Hàm phải được khai báo **trước** chỗ gọi nó.
- \`d * d <= n\` là mẹo để kiểm tra số nguyên tố nhanh.`,
    exercises: [
      exercise(
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
          2,
        ),
        150,
      ),
    ],
  },
  {
    title: "Mảng một chiều",
    description: "Module 3 · Hàm và mảng — lưu nhiều giá trị.",
    content: `# Mảng một chiều

\`\`\`cpp
int n;
cin >> n;
int a[1000];
for (int i = 0; i < n; i++) cin >> a[i];
\`\`\`

- Chỉ số bắt đầu từ **0**, phần tử cuối là \`a[n - 1]\`.
- Khai báo mảng đủ lớn so với đề (hoặc dùng \`vector<int>\`).
- Duyệt mảng bằng \`for\`, nhớ đừng vượt quá \`n - 1\`.

Định dạng input các bài mảng: dòng 1 là \`n\`, dòng 2 là \`n\` số cách nhau bởi dấu cách.`,
    exercises: [
      exercise(
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
          2,
        ),
      ),
      exercise(
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
          2,
        ),
      ),
    ],
  },
  {
    title: "Chuỗi cơ bản",
    description: "Module 3 · Hàm và mảng — string và getline.",
    content: `# Chuỗi cơ bản

\`\`\`cpp
string s;
getline(cin, s);          // đọc cả dòng, kể cả dấu cách
cout << s.length();       // độ dài
cout << s[0];             // ký tự đầu
for (int i = s.length() - 1; i >= 0; i--) cout << s[i];
\`\`\`

- \`cin >> s\` dừng ở dấu cách, \`getline\` đọc cả dòng.
- \`s.length()\` trả về số ký tự, chỉ số bắt đầu từ 0.
- Duyệt ngược để đảo chuỗi.`,
    exercises: [
      exercise(
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
          2,
        ),
      ),
    ],
  },
  {
    title: "Ôn tập tổng hợp",
    description: "Module 4 · Tổng kết — nhìn lại những gì đã học.",
    content: `# Ôn tập tổng hợp

Trước khi làm mini project, hãy tự kiểm tra:

1. Hàm \`main\` dùng để làm gì?
2. Khi nào phải dùng \`long long\` thay cho \`int\`?
3. \`7 / 2\` và \`7 / 2.0\` khác nhau thế nào?
4. \`for\` khác \`while\` ở điểm nào?
5. Mảng có \`n\` phần tử thì chỉ số cuối cùng là bao nhiêu?
6. Làm sao đọc cả một dòng có dấu cách?

Nếu còn mơ hồ câu nào, quay lại bài học tương ứng rồi làm lại bài tập.`,
    exercises: [],
  },
  {
    title: "Mini project: Máy tính bỏ túi",
    description: "Module 4 · Tổng kết — kết hợp mọi thứ đã học.",
    content: `# Mini project: Máy tính bỏ túi

Bạn sẽ viết một máy tính đơn giản, dùng: nhập xuất, \`if/else\`, kiểu dữ liệu.

## Yêu cầu

- Đọc \`a\`, phép toán \`op\` và \`b\`.
- Phép \`+ - *\` làm việc với số nguyên lớn (dùng \`long long\`).
- Phép \`/\` in kết quả thực với đúng **2 chữ số thập phân**: \`cout << fixed << setprecision(2)\` (cần \`#include <iomanip>\`).
- Chia cho 0 thì in \`Loi chia cho 0\`.

Bộ test có các trường hợp biên: số âm, chia cho 0, kết quả làm tròn.`,
    exercises: [
      exercise(
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
          2,
        ),
        200,
      ),
    ],
  },
  {
    title: "Hoàn thành lộ trình",
    description: "Module 4 · Tổng kết — chúc mừng bạn!",
    content: `# Chúc mừng bạn!

Bạn đã đi hết lộ trình **Lập trình C++ cơ bản**: từ dòng \`Hello world\` đầu tiên tới một máy tính bỏ túi hoàn chỉnh.

## Tiếp theo nên học gì?

- Cấu trúc dữ liệu: \`vector\`, \`map\`, \`set\`.
- Thuật toán sắp xếp và tìm kiếm.
- Tham gia các cuộc thi trên nền tảng để luyện tập.`,
    exercises: [],
  },
];

async function main() {
  const teacher = await prisma.user.findUnique({
    where: { email: "teacher@local.test" },
  });
  if (!teacher)
    throw new Error(
      "Chưa có teacher@local.test. Hãy chạy `npm run db:seed` trước.",
    );

  const description =
    "Từ dòng code đầu tiên đến giải được các bài thuật toán nhập môn: biến, điều kiện, vòng lặp, hàm, mảng và chuỗi. Dành cho người chưa từng lập trình, khoảng 12 giờ học.";
  const path = await prisma.path.upsert({
    where: { slug: PATH_SLUG },
    update: { title: "Lập trình C++ cơ bản", description, published: true },
    create: {
      slug: PATH_SLUG,
      title: "Lập trình C++ cơ bản",
      description,
      published: true,
      sequentialUnlock: true,
      creatorId: teacher.id,
    },
  });

  let exerciseCount = 0;
  let testCount = 0;
  for (const [index, room] of ROOMS.entries()) {
    const position = index + 1;
    const data = {
      title: room.title,
      description: room.description,
      content: room.content,
    };
    const saved = await prisma.room.upsert({
      where: { pathId_position: { pathId: path.id, position } },
      update: data,
      create: { pathId: path.id, position, ...data },
    });
    for (const item of room.exercises) {
      const id = `seed-cpp-${item.key}`;
      const fields = {
        roomId: saved.id,
        title: item.title,
        prompt: item.prompt,
        kind: ExerciseKind.CODE,
        difficulty: item.difficulty,
        points: item.points,
        timeLimitMs: item.timeLimitMs ?? 1000,
        memoryLimitKb: 256 * 1024,
      };
      await prisma.exercise.upsert({
        where: { id },
        update: fields,
        create: { id, ...fields },
      });
      await prisma.testCase.deleteMany({ where: { exerciseId: id } });
      await prisma.testCase.createMany({
        data: item.tests.map((test) => ({ ...test, exerciseId: id })),
      });
      exerciseCount += 1;
      testCount += item.tests.length;
    }
  }
  console.log(
    `Đã seed lộ trình "${PATH_SLUG}": ${ROOMS.length} bài học, ${exerciseCount} bài tập, ${testCount} test case.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
