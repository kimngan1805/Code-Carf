/**
 * Lộ trình mẫu "Cấu trúc dữ liệu và giải thuật": 10 bài học theo khung 12 phần,
 * mỗi bài có video bài giảng (series CTDL & GT của kênh TITV và Ông Dev trên
 * YouTube), một bài trắc nghiệm, hai bài code chấm theo test case và một bài
 * tự luận. Bài code đọc stdin, in stdout nên làm được bằng Python, C++, Java
 * hay JavaScript.
 *
 * Chạy: npm run db:seed:dsa (cần chạy `npm run db:seed` trước để có tài khoản
 * giáo viên, hoặc đặt SEED_TEACHER_EMAIL thành một giáo viên/admin đã có).
 * Chạy lại nhiều lần an toàn. Đáp án test được TÍNH bằng hàm solve, không gõ
 * tay; test lớn sinh bằng bộ số giả ngẫu nhiên cố định nên lần nào cũng giống nhau.
 */
import { Difficulty } from "@prisma/client";
import {
  cases,
  code,
  ints,
  lines,
  pseudoRandom,
  runSeed,
  type RoomSeed,
} from "./seed-path-kit";

/** Hàng rào code block trong markdown, để viết trong template literal. */
const F = "```";
const MOD = 1_000_000_007;

const titv = (id: string, lessonName: string) => ({
  id,
  caption: `TITV · Cấu trúc dữ liệu và giải thuật, ${lessonName}`,
});
const ongDev = (id: string, lessonName: string) => ({
  id,
  caption: `Ông Dev · ${lessonName}`,
});

/** Dãy n số nguyên ngẫu nhiên trong [min, max], cố định theo seed. */
function randomArray(seed: number, n: number, min: number, max: number) {
  const next = pseudoRandom(seed);
  return Array.from({ length: n }, () => next(min, max));
}
const arrayInput = (values: number[], head = String(values.length)) =>
  `${head}\n${values.join(" ")}`;

// ---------- Lời giải dùng để tính đáp án ----------

const sumTo = (input: string) => {
  const n = BigInt(input.trim());
  return ((n * (n + BigInt(1))) / BigInt(2)).toString();
};

const sumArray = (input: string) =>
  ints(lines(input)[1])
    .reduce((total, value) => total + BigInt(value), BigInt(0))
    .toString();

function findPositions(input: string) {
  const [, arrLine, , ...queries] = lines(input);
  const index = new Map(ints(arrLine).map((value, i) => [value, i + 1]));
  return queries.map((q) => String(index.get(Number(q)) ?? -1)).join("\n");
}

function countAtMost(input: string) {
  const [, arrLine, , ...queries] = lines(input);
  const a = ints(arrLine);
  return queries
    .map((q) => {
      const x = Number(q);
      let lo = 0;
      let hi = a.length;
      while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (a[mid] <= x) lo = mid + 1;
        else hi = mid;
      }
      return String(lo);
    })
    .join("\n");
}

function bubbleSwaps(input: string) {
  const a = ints(lines(input)[1]);
  let swaps = 0;
  for (let i = 0; i < a.length; i++)
    for (let j = i + 1; j < a.length; j++) if (a[i] > a[j]) swaps++;
  return String(swaps);
}

const sortAscending = (input: string) =>
  ints(lines(input)[1])
    .sort((x, y) => x - y)
    .join(" ");

function ranking(input: string) {
  const [, ...rows] = lines(input);
  return rows
    .map((row) => {
      const [name, score] = row.trim().split(/\s+/);
      return { name, score: Number(score) };
    })
    .sort((x, y) =>
      x.score !== y.score
        ? y.score - x.score
        : x.name < y.name
          ? -1
          : x.name > y.name
            ? 1
            : 0,
    )
    .map((row) => `${row.name} ${row.score}`)
    .join("\n");
}

function minGap(input: string) {
  const a = ints(lines(input)[1]).sort((x, y) => x - y);
  let best = Infinity;
  for (let i = 1; i < a.length; i++) best = Math.min(best, a[i] - a[i - 1]);
  return String(best);
}

function hanoi(input: string) {
  const n = Number(input.trim());
  const moves: string[] = [];
  const move = (k: number, from: string, to: string, via: string) => {
    if (k === 0) return;
    move(k - 1, from, via, to);
    moves.push(`${from} ${to}`);
    move(k - 1, via, to, from);
  };
  move(n, "A", "C", "B");
  return [String(moves.length), ...moves].join("\n");
}

function powerMod(input: string) {
  const [a, b, m] = input.trim().split(/\s+/).map(BigInt);
  let base = a % m;
  let exp = b;
  let result = BigInt(1) % m;
  while (exp > BigInt(0)) {
    if (exp & BigInt(1)) result = (result * base) % m;
    base = (base * base) % m;
    exp >>= BigInt(1);
  }
  return result.toString();
}

function brackets(input: string) {
  const pair: Record<string, string> = { ")": "(", "]": "[", "}": "{" };
  const stack: string[] = [];
  for (const ch of input.trim()) {
    if ("([{".includes(ch)) stack.push(ch);
    else if (stack.pop() !== pair[ch]) return "NO";
  }
  return stack.length === 0 ? "YES" : "NO";
}

function postfix(input: string) {
  const stack: bigint[] = [];
  for (const token of input.trim().split(/\s+/)) {
    if (["+", "-", "*"].includes(token)) {
      const b = stack.pop()!;
      const a = stack.pop()!;
      stack.push(token === "+" ? a + b : token === "-" ? a - b : a * b);
    } else stack.push(BigInt(token));
  }
  return stack[0].toString();
}

function queueSim(input: string) {
  const [, ...commands] = lines(input);
  const queue: number[] = [];
  let head = 0;
  const out: string[] = [];
  for (const command of commands) {
    const [op, x] = command.trim().split(/\s+/);
    if (op === "PUSH") queue.push(Number(x));
    else if (op === "POP") head = Math.min(head + 1, queue.length);
    else if (op === "FRONT")
      out.push(head < queue.length ? String(queue[head]) : "EMPTY");
    else if (op === "SIZE") out.push(String(queue.length - head));
  }
  return out.join("\n");
}

function josephus(input: string) {
  const [n, k] = ints(input);
  const people = Array.from({ length: n }, (_, i) => i + 1);
  const order: number[] = [];
  let index = 0;
  while (people.length) {
    index = (index + k - 1) % people.length;
    order.push(people.splice(index, 1)[0]);
  }
  return order.join(" ");
}

function listOps(input: string) {
  const [, ...commands] = lines(input);
  const list: number[] = [];
  for (const command of commands) {
    const [op, raw] = command.trim().split(/\s+/);
    const x = Number(raw);
    if (op === "ADD_FIRST") list.unshift(x);
    else if (op === "ADD_LAST") list.push(x);
    else if (op === "REMOVE") {
      const at = list.indexOf(x);
      if (at >= 0) list.splice(at, 1);
    }
  }
  return list.length ? list.join(" ") : "EMPTY";
}

const middle = (input: string) => {
  const a = ints(lines(input)[1]);
  return String(a[Math.floor(a.length / 2)]);
};

function twoSum(input: string) {
  const [head, arrLine] = lines(input);
  const [, k] = ints(head);
  const seen = new Set<number>();
  for (const value of ints(arrLine)) {
    if (seen.has(k - value)) return "YES";
    seen.add(value);
  }
  return "NO";
}

function topWord(input: string) {
  const counts = new Map<string, number>();
  for (const word of input.trim().split(/\s+/))
    counts.set(word, (counts.get(word) ?? 0) + 1);
  const [word, count] = [...counts].sort((x, y) =>
    x[1] !== y[1] ? y[1] - x[1] : x[0] < y[0] ? -1 : 1,
  )[0];
  return `${word} ${count}`;
}

function stairs(input: string) {
  const n = Number(input.trim());
  let prev = 1; // cách lên bậc 0
  let cur = 1; // cách lên bậc 1
  for (let i = 2; i <= n; i++) [prev, cur] = [cur, (prev + cur) % MOD];
  return String(cur);
}

function maxSubarray(input: string) {
  const a = ints(lines(input)[1]);
  let best = a[0];
  let ending = a[0];
  for (const value of a.slice(1)) {
    ending = Math.max(value, ending + value);
    best = Math.max(best, ending);
  }
  return String(best);
}

// ---------- Test lớn sinh tự động ----------

const bigSorted = (() => {
  const values = [...new Set(randomArray(11, 20000, 1, 1_000_000_000))].sort(
    (x, y) => x - y,
  );
  const next = pseudoRandom(12);
  const queries = Array.from({ length: 2000 }, (_, i) =>
    i % 2 ? values[next(0, values.length - 1)] : next(1, 1_000_000_000),
  );
  return `${values.length}\n${values.join(" ")}\n${queries.length}\n${queries.join("\n")}`;
})();

const bigDuplicates = (() => {
  const values = randomArray(21, 20000, 1, 5000).sort((x, y) => x - y);
  const queries = randomArray(22, 2000, 0, 5001);
  return `${values.length}\n${values.join(" ")}\n${queries.length}\n${queries.join("\n")}`;
})();

const bigQueue = (() => {
  const next = pseudoRandom(31);
  const ops = Array.from({ length: 5000 }, () => {
    const r = next(0, 9);
    return r < 5
      ? `PUSH ${next(1, 1_000_000)}`
      : r < 7
        ? "POP"
        : r < 9
          ? "FRONT"
          : "SIZE";
  });
  return `${ops.length}\n${ops.join("\n")}`;
})();

const bigList = (() => {
  const next = pseudoRandom(41);
  const ops = Array.from({ length: 2000 }, () => {
    const r = next(0, 5);
    const x = next(1, 50);
    return r < 2 ? `ADD_FIRST ${x}` : r < 4 ? `ADD_LAST ${x}` : `REMOVE ${x}`;
  });
  return `${ops.length}\n${ops.join("\n")}`;
})();

const bigWords = (() => {
  const next = pseudoRandom(51);
  const vocab = [
    "mot",
    "hai",
    "ba",
    "bon",
    "nam",
    "sau",
    "bay",
    "tam",
    "chin",
    "muoi",
  ];
  return Array.from(
    { length: 3000 },
    () => vocab[next(0, vocab.length - 1)],
  ).join(" ");
})();

const ROOMS: RoomSeed[] = [
  {
    title: "Thuật toán và độ phức tạp",
    description:
      "Thuật toán là gì, cách đo tốc độ bằng Big-O và vì sao O(1) thắng O(n).",
    videos: [
      titv(
        "V85332IZVs0",
        "Bài 01: Giới thiệu về thuật toán, giải thuật lập trình",
      ),
      ongDev(
        "gIF1WzVvoqk",
        "Cấu trúc dữ liệu và thuật toán #3: BigO Notation và ví dụ",
      ),
    ],
    parts: {
      overview:
        "Hai chương trình cùng cho kết quả đúng nhưng một cái chạy 0,01 giây, cái kia chạy 10 phút. Bài mở đầu này giúp bạn hiểu **thuật toán** và cách ước lượng tốc độ của nó trước khi viết code.\n\n**Mục tiêu:** đọc và tính được độ phức tạp Big-O của các đoạn code đơn giản.",
      concept:
        "**Thuật toán** là dãy hữu hạn các bước rõ ràng để giải một bài toán. **Cấu trúc dữ liệu** là cách tổ chức dữ liệu trong bộ nhớ để thuật toán thao tác hiệu quả. **Độ phức tạp thời gian** cho biết số phép tính tăng thế nào khi kích thước dữ liệu `n` tăng, viết bằng ký hiệu **Big-O**.",
      characteristics:
        "Một thuật toán tốt có:\n\n- **Tính đúng:** cho kết quả đúng với mọi input hợp lệ.\n- **Tính dừng:** kết thúc sau hữu hạn bước.\n- **Tính xác định:** mỗi bước rõ ràng, không mơ hồ.\n- **Hiệu quả:** dùng ít thời gian và bộ nhớ.\n\nBig-O bỏ qua hằng số và giữ lại thành phần tăng nhanh nhất: `3n² + 5n + 2` là `O(n²)`.",
      classification:
        "| Big-O | Tên gọi | Ví dụ | n = 10⁶ |\n| --- | --- | --- | --- |\n| `O(1)` | hằng số | công thức tổng 1..n | 1 bước |\n| `O(log n)` | logarit | tìm kiếm nhị phân | ~20 bước |\n| `O(n)` | tuyến tính | duyệt mảng | 10⁶ bước |\n| `O(n log n)` | | merge sort | ~2×10⁷ bước |\n| `O(n²)` | bình phương | hai vòng lặp lồng | 10¹² bước, quá chậm |\n| `O(2ⁿ)` | mũ | thử mọi tập con | không khả thi |",
      mechanism:
        "Ước lượng bằng cách đếm số lần câu lệnh trong cùng được chạy: một vòng lặp `n` lần là `O(n)`, hai vòng lồng nhau là `O(n²)`, mỗi bước chia đôi dữ liệu là `O(log n)`. Quy tắc nhanh cho hệ thống chấm: máy chạy khoảng **10⁸ phép tính mỗi giây**, nên với n = 10⁵ thì `O(n²)` = 10¹⁰ sẽ quá thời gian.",
      syntax: `Giả mã (pseudocode) và Big-O tương ứng:

${F}
tong = 0                      // O(1)
for i = 1..n:                 // O(n)
    tong += i

for i = 1..n:                 // O(n²)
    for j = 1..n:
        dem += 1

while n > 1:                  // O(log n)
    n = n / 2
${F}`,
      example: `Tính 1 + 2 + … + n theo hai cách:

${F}python
# Cách 1: O(n), n = 2·10⁹ thì quá chậm
tong = 0
for i in range(1, n + 1):
    tong += i

# Cách 2: O(1), dùng công thức Gauss
tong = n * (n + 1) // 2
${F}`,
      application:
        "Big-O giúp chọn thuật toán **trước khi** viết code: nhìn giới hạn đề bài (n ≤ 10³, 10⁵ hay 10⁹) là biết cần `O(n²)`, `O(n log n)` hay `O(1)`. Trong thực tế, nó quyết định trang web tải trong 0,1 giây hay 10 giây khi có hàng triệu người dùng.",
      prosCons:
        "**Ưu:** so sánh thuật toán không phụ thuộc máy, ngôn ngữ; dự đoán được khi dữ liệu lớn lên.\n\n**Nhược:** bỏ qua hằng số nên với n nhỏ, thuật toán `O(n²)` đơn giản đôi khi nhanh hơn; chỉ mô tả trường hợp xấu nhất nếu không nói rõ.",
      errors:
        "- Nghĩ vòng lặp lồng nhau luôn `O(n²)`: nếu vòng trong chạy cố định 26 lần thì vẫn là `O(n)`.\n- Quên chi phí của hàm có sẵn: `list.index`, `in` trên list, `erase` giữa mảng đều tốn `O(n)`.\n- Dùng `int` cho kết quả lớn, như n(n+1)/2 với n = 2×10⁹.",
      takeaways:
        "- Big-O đo tốc độ tăng theo n, bỏ hằng số.\n- Khoảng 10⁸ phép tính mỗi giây.\n- Đọc giới hạn n để chọn độ phức tạp phù hợp.",
      practice:
        "Làm trắc nghiệm Big-O, rồi giải hai bài code: một bài bắt buộc dùng công thức `O(1)`, một bài duyệt mảng `O(n)`.",
    },
    exercises: [
      {
        kind: "QUIZ",
        key: "quiz-complexity",
        title: "Trắc nghiệm: Độ phức tạp thuật toán",
        points: 30,
        prompt: "Kiểm tra khả năng ước lượng Big-O.",
        questions: [
          {
            prompt: "Độ phức tạp của 5n³ + 100n² + 7 là?",
            options: ["O(n²)", "O(n³)", "O(5n³)", "O(100n²)"],
            answer: 1,
            explanation: "Giữ thành phần tăng nhanh nhất và bỏ hằng số.",
          },
          {
            prompt:
              "Đoạn code: for i = 1..n: for j = 1..10: dem++ có độ phức tạp?",
            options: ["O(n²)", "O(10)", "O(n)", "O(log n)"],
            answer: 2,
            explanation:
              "Vòng trong chạy cố định 10 lần, tổng 10n phép tính là O(n).",
          },
          {
            prompt: "Vòng while n > 1: n = n / 2 chạy khoảng bao nhiêu lần?",
            options: ["n", "n / 2", "log₂ n", "n²"],
            answer: 2,
            explanation: "Mỗi lần chia đôi, sau log₂ n lần thì n còn 1.",
          },
          {
            prompt: "Đề cho n ≤ 10⁵, thời gian 1 giây. Thuật toán nào an toàn?",
            options: ["O(n²)", "O(n log n)", "O(2ⁿ)", "O(n³)"],
            answer: 1,
            explanation: "n log n ≈ 1,7×10⁶ phép tính; n² = 10¹⁰ quá chậm.",
          },
          {
            prompt: "Tính chất nào KHÔNG bắt buộc với một thuật toán?",
            options: [
              "Tính dừng",
              "Tính đúng",
              "Tính xác định",
              "Phải viết bằng C++",
            ],
            answer: 3,
            explanation: "Thuật toán độc lập với ngôn ngữ lập trình.",
          },
        ],
      },
      code(
        "sum-formula",
        "Tổng từ 1 đến n (O(1))",
        Difficulty.EASY,
        "Cho số nguyên `n` (1 ≤ n ≤ 2·10⁹). In ra `1 + 2 + … + n`.\n\nGiới hạn thời gian 1 giây: vòng lặp tới 2·10⁹ sẽ quá thời gian, hãy dùng công thức. Kết quả có thể tới khoảng 2·10¹⁸, cần kiểu số nguyên 64 bit (`long long` trong C++, `long` trong Java).",
        cases(
          ["10", "1", "100", "2000000000", "1999999999", "123456789", "65536"],
          sumTo,
        ),
        100,
        1000,
      ),
      code(
        "sum-array",
        "Tổng dãy số",
        Difficulty.EASY,
        "Dòng 1: số `n` (1 ≤ n ≤ 2·10⁴). Dòng 2: `n` số nguyên (|giá trị| ≤ 10⁹). In ra tổng các số.\n\nTổng có thể vượt 2·10⁹, cần số nguyên 64 bit.",
        cases(
          [
            "5\n1 2 3 4 5",
            "3\n-1 -2 3",
            "1\n1000000000",
            "4\n1000000000 1000000000 1000000000 1000000000",
            arrayInput(randomArray(1, 20000, -1_000_000_000, 1_000_000_000)),
            arrayInput(randomArray(2, 20000, 999_000_000, 1_000_000_000)),
          ],
          sumArray,
        ),
      ),
      {
        kind: "HANDWRITTEN",
        key: "essay-complexity",
        title: "Tự luận: Phân tích độ phức tạp",
        difficulty: Difficulty.MEDIUM,
        points: 50,
        prompt:
          "Trình bày trên giấy rồi chụp ảnh nộp bài:\n\n1. Xác định Big-O và giải thích cho từng đoạn:\n\n```\n(a) for i = 1..n: for j = i..n: dem++\n(b) i = 1; while i < n: i = i * 3\n(c) for i = 1..n: for j = 1..100: dem++\n```\n\n2. Với n = 10⁵ và máy chạy 10⁸ phép tính/giây, ước lượng thời gian chạy của đoạn (a).\n3. Nêu 4 tính chất của một thuật toán, mỗi tính chất một câu giải thích.",
        rubric:
          "Tổng 10 điểm.\n- Câu 1 (5 điểm): (a) O(n²) vì tổng n + (n-1) + … + 1 = n(n+1)/2 (2 điểm); (b) O(log n) cơ số 3 (1,5 điểm); (c) O(n) vì vòng trong cố định (1,5 điểm).\n- Câu 2 (2 điểm): khoảng 5×10⁹ phép tính, tức khoảng 50 giây.\n- Câu 3 (3 điểm): tính đúng, dừng, xác định, hiệu quả (hoặc tính tổng quát), mỗi ý 0,75 điểm.",
      },
    ],
  },
  {
    title: "Tìm kiếm tuần tự và nhị phân",
    description:
      "Tìm phần tử trong mảng: duyệt từng phần tử O(n) và chia đôi O(log n) trên mảng đã sắp xếp.",
    videos: [
      titv(
        "mDpJMTQcvrA",
        "Bài 03: Thuật toán tìm kiếm tuần tự (Linear Search)",
      ),
      titv(
        "kfJCPlIpZL4",
        "Bài 05: Thuật toán tìm kiếm nhị phân (Binary Search)",
      ),
    ],
    parts: {
      overview:
        "Tìm một cái tên trong danh bạ 1 triệu số: lật từng trang hay mở giữa cuốn rồi chia đôi? Bài này so sánh **tìm kiếm tuần tự** và **tìm kiếm nhị phân**.\n\n**Mục tiêu:** cài đặt đúng tìm kiếm nhị phân, kể cả biến thể đếm số phần tử ≤ x.",
      concept:
        "**Tìm kiếm tuần tự** (linear search) so sánh lần lượt từng phần tử với giá trị cần tìm. **Tìm kiếm nhị phân** (binary search) chỉ dùng trên mảng **đã sắp xếp**: so với phần tử ở giữa, rồi loại bỏ một nửa không thể chứa đáp án.",
      characteristics:
        "- Tuần tự: `O(n)`, chạy trên mọi mảng, không cần sắp xếp.\n- Nhị phân: `O(log n)`, bắt buộc mảng đã sắp xếp.\n- Với n = 10⁶: tuần tự tối đa 10⁶ phép so sánh, nhị phân chỉ khoảng 20.\n- Nhị phân có nhiều biến thể: tìm vị trí đầu tiên ≥ x (lower bound), đầu tiên > x (upper bound).",
      classification:
        "- **Tìm kiếm tuần tự:** duyệt từ đầu đến cuối.\n- **Tìm kiếm nhị phân cổ điển:** trả về vị trí hoặc -1.\n- **Lower bound / upper bound:** đếm số phần tử nhỏ hơn, nhỏ hơn hoặc bằng x.\n- **Tìm kiếm nhảy** (jump search): nhảy theo bước √n rồi tìm tuần tự trong đoạn.",
      mechanism:
        "Giữ đoạn `[lo, hi]` có thể chứa đáp án. Lấy `mid = (lo + hi) / 2`:\n\n- `a[mid] == x`: tìm thấy.\n- `a[mid] < x`: đáp án nằm bên phải, đặt `lo = mid + 1`.\n- `a[mid] > x`: đáp án nằm bên trái, đặt `hi = mid - 1`.\n\nMỗi bước đoạn còn một nửa, nên sau `log₂ n` bước đoạn rỗng.",
      syntax: `${F}cpp
int binarySearch(const vector<int>& a, int x) {
    int lo = 0, hi = (int)a.size() - 1;
    while (lo <= hi) {
        int mid = lo + (hi - lo) / 2;   // tránh tràn số
        if (a[mid] == x) return mid;
        if (a[mid] < x) lo = mid + 1;
        else hi = mid - 1;
    }
    return -1;
}
${F}`,
      example: `Tìm 23 trong \`[2, 5, 8, 12, 16, 23, 38, 56, 72, 91]\`:

| Bước | lo | hi | mid | a[mid] | Quyết định |
| --- | --- | --- | --- | --- | --- |
| 1 | 0 | 9 | 4 | 16 | 16 < 23 → sang phải |
| 2 | 5 | 9 | 7 | 56 | 56 > 23 → sang trái |
| 3 | 5 | 6 | 5 | 23 | tìm thấy ở vị trí 5 |

${F}python
from bisect import bisect_right
dem = bisect_right(a, x)   # số phần tử <= x
${F}`,
      application:
        "Tra từ điển, tìm sản phẩm theo giá, tìm phiên bản gây lỗi trong git (`git bisect`), tìm đáp án nhỏ nhất thỏa điều kiện (chặt nhị phân đáp án) trong các bài thi.",
      prosCons:
        "**Ưu (nhị phân):** cực nhanh, `O(log n)`.\n\n**Nhược:** phải sắp xếp trước (`O(n log n)`); khó cài đúng các biên; không dùng được trên danh sách liên kết vì không truy cập giữa nhanh được.",
      errors:
        "- Dùng nhị phân trên mảng **chưa** sắp xếp.\n- Vòng lặp vô hạn do cập nhật `lo = mid` thay vì `mid + 1`.\n- `mid = (lo + hi) / 2` có thể tràn `int` khi lo, hi lớn; dùng `lo + (hi - lo) / 2`.\n- Nhầm vị trí bắt đầu từ 0 với đề yêu cầu đếm từ 1.",
      takeaways:
        "- Tuần tự `O(n)`, nhị phân `O(log n)` nhưng cần mảng sắp xếp.\n- Mỗi bước bỏ một nửa đoạn tìm kiếm.\n- Biết dùng hàm có sẵn: `lower_bound`, `upper_bound` (C++), `bisect` (Python).",
      practice:
        "Làm trắc nghiệm, rồi hai bài code có tới 2000 truy vấn: tìm kiếm tuần tự cho mỗi truy vấn vẫn qua, nhưng hãy luyện viết nhị phân.",
    },
    exercises: [
      {
        kind: "QUIZ",
        key: "quiz-search",
        title: "Trắc nghiệm: Tìm kiếm",
        points: 30,
        prompt: "Ôn lại điều kiện và cách hoạt động của tìm kiếm nhị phân.",
        questions: [
          {
            prompt: "Điều kiện bắt buộc để dùng tìm kiếm nhị phân là?",
            options: [
              "Mảng có ít hơn 1000 phần tử",
              "Mảng đã được sắp xếp",
              "Mảng không có số âm",
              "Mảng không có phần tử trùng",
            ],
            answer: 1,
            explanation:
              "Chỉ khi mảng đã sắp xếp mới loại được một nửa sau mỗi lần so sánh.",
          },
          {
            prompt:
              "Mảng 1.000.000 phần tử, nhị phân cần tối đa khoảng bao nhiêu lần so sánh?",
            options: ["20", "1000", "500000", "1000000"],
            answer: 0,
            explanation: "log₂(10⁶) ≈ 20.",
          },
          {
            prompt: "Khi a[mid] < x, bước tiếp theo đúng là?",
            options: ["hi = mid - 1", "lo = mid + 1", "lo = mid", "Dừng lại"],
            answer: 1,
            explanation: "Mọi phần tử từ mid trở về trái đều nhỏ hơn x.",
          },
          {
            prompt: "Vì sao nên viết mid = lo + (hi - lo) / 2?",
            options: [
              "Để chạy nhanh hơn",
              "Để tránh tràn số khi lo + hi quá lớn",
              "Để mid luôn là số chẵn",
              "Bắt buộc theo cú pháp",
            ],
            answer: 1,
            explanation: "lo + hi có thể vượt giới hạn int.",
          },
          {
            prompt: "Tìm kiếm tuần tự có độ phức tạp?",
            options: ["O(1)", "O(log n)", "O(n)", "O(n²)"],
            answer: 2,
            explanation: "Xấu nhất phải xem hết n phần tử.",
          },
        ],
      },
      code(
        "binary-search-position",
        "Tìm vị trí trong dãy tăng",
        Difficulty.MEDIUM,
        "Dòng 1: `n` (1 ≤ n ≤ 2·10⁴). Dòng 2: `n` số nguyên **tăng dần, khác nhau** (1 ≤ giá trị ≤ 10⁹). Dòng 3: `q` (1 ≤ q ≤ 2000). `q` dòng tiếp theo, mỗi dòng một số `x`.\n\nVới mỗi `x`, in trên một dòng vị trí của `x` trong dãy (đánh số từ **1**), hoặc `-1` nếu không có.",
        cases(
          [
            "10\n2 5 8 12 16 23 38 56 72 91\n3\n23\n2\n40",
            "1\n7\n2\n7\n8",
            "5\n1 3 5 7 9\n5\n1\n9\n0\n10\n6",
            bigSorted,
          ],
          findPositions,
        ),
        120,
      ),
      code(
        "count-at-most",
        "Đếm số phần tử không vượt quá x",
        Difficulty.MEDIUM,
        "Dòng 1: `n` (1 ≤ n ≤ 2·10⁴). Dòng 2: `n` số nguyên **không giảm** (có thể trùng, 1 ≤ giá trị ≤ 10⁹). Dòng 3: `q` (1 ≤ q ≤ 2000). `q` dòng tiếp theo, mỗi dòng một số `x`.\n\nVới mỗi `x`, in trên một dòng số phần tử của dãy **nhỏ hơn hoặc bằng** `x`.",
        cases(
          [
            "7\n1 2 2 2 5 8 8\n4\n2\n0\n8\n6",
            "3\n5 5 5\n3\n4\n5\n6",
            "1\n10\n2\n10\n9",
            bigDuplicates,
          ],
          countAtMost,
        ),
        120,
      ),
      {
        kind: "HANDWRITTEN",
        key: "essay-search",
        title: "Tự luận: Chạy tay tìm kiếm nhị phân",
        difficulty: Difficulty.MEDIUM,
        points: 50,
        prompt:
          "Cho mảng `a = [3, 7, 11, 15, 19, 24, 30, 42, 57]` (chỉ số từ 0). Trình bày trên giấy rồi chụp ảnh nộp bài:\n\n1. Lập bảng lo, hi, mid, a[mid] qua từng bước khi tìm `x = 42` và khi tìm `x = 20`.\n2. Tìm kiếm tuần tự cần bao nhiêu lần so sánh cho mỗi trường hợp trên?\n3. Viết giả mã hàm trả về số phần tử nhỏ hơn hoặc bằng x trong mảng đã sắp xếp (có thể có phần tử trùng).",
        rubric:
          "Tổng 10 điểm.\n- Câu 1 (5 điểm): x = 42: (0,8,4,19) → (5,8,6,30) → (7,8,7,42) tìm thấy ở chỉ số 7 (2,5 điểm). x = 20: (0,8,4,19) → (5,8,6,30) → (5,5,5,24) → lo = 5 > hi = 4, không tìm thấy (2,5 điểm).\n- Câu 2 (2 điểm): 8 lần với 42; 9 lần với 20 (phải duyệt hết).\n- Câu 3 (3 điểm): tìm vị trí đầu tiên có a[i] > x bằng nhị phân, trả về vị trí đó (đúng ý tưởng 1,5 điểm, đúng biên và điều kiện dừng 1,5 điểm).",
      },
    ],
  },
  {
    title: "Sắp xếp cơ bản",
    description:
      "Bubble sort, selection sort, insertion sort: ba thuật toán O(n²) kinh điển.",
    videos: [
      titv("BFuaErJVhgk", "Bài 08: Thuật toán sắp xếp nổi bọt (Bubble Sort)"),
      titv("XnwIziGYOFY", "Bài 07: Thuật toán sắp xếp chọn (Selection Sort)"),
      titv("R5IcI6Ni8IY", "Bài 06: Thuật toán sắp xếp chèn (Insertion Sort)"),
    ],
    parts: {
      overview:
        "Sắp xếp là bài toán nền của khoa học máy tính: có thứ tự thì mới tìm nhanh, xếp hạng và loại trùng được. Bài này học ba thuật toán đơn giản nhất.\n\n**Mục tiêu:** chạy tay và cài đặt được bubble, selection, insertion sort; hiểu vì sao chúng là `O(n²)`.",
      concept:
        "**Sắp xếp** là đổi chỗ các phần tử để dãy theo thứ tự tăng (hoặc giảm). Một **nghịch thế** là cặp `i < j` mà `a[i] > a[j]`; dãy đã sắp xếp không có nghịch thế nào.",
      characteristics:
        "- Cả ba đều sắp xếp **tại chỗ**, chỉ tốn `O(1)` bộ nhớ phụ.\n- Thời gian xấu nhất `O(n²)`.\n- Bubble và insertion là **ổn định** (giữ thứ tự các phần tử bằng nhau); selection thì không.\n- Insertion sort chạy gần `O(n)` khi dãy gần như đã sắp xếp.",
      classification:
        '- **Bubble sort:** đổi chỗ hai phần tử kề nhau nếu sai thứ tự; phần tử lớn "nổi" dần về cuối.\n- **Selection sort:** mỗi lượt chọn phần tử nhỏ nhất của phần chưa sắp, đưa lên đầu.\n- **Insertion sort:** lấy từng phần tử, chèn vào đúng chỗ trong phần đã sắp phía trước (như xếp bài trên tay).',
      mechanism:
        "Bubble sort: mỗi lượt duyệt từ đầu, so sánh `a[j]` với `a[j+1]`, sai thứ tự thì đổi. Sau lượt thứ k, k phần tử lớn nhất đã nằm đúng chỗ ở cuối. Mỗi lần đổi chỗ hai phần tử kề nhau xóa đúng **một** nghịch thế, nên số lần đổi chỗ bằng số nghịch thế của dãy.",
      syntax: `${F}cpp
void bubbleSort(vector<int>& a) {
    int n = a.size();
    for (int i = 0; i < n - 1; i++)
        for (int j = 0; j < n - 1 - i; j++)
            if (a[j] > a[j + 1]) swap(a[j], a[j + 1]);
}

void insertionSort(vector<int>& a) {
    for (int i = 1; i < (int)a.size(); i++) {
        int key = a[i], j = i - 1;
        while (j >= 0 && a[j] > key) { a[j + 1] = a[j]; j--; }
        a[j + 1] = key;
    }
}
${F}`,
      example: `Bubble sort trên \`[5, 1, 4, 2]\`:

| Lượt | Dãy sau lượt | Số lần đổi |
| --- | --- | --- |
| 1 | 1 4 2 **5** | 3 |
| 2 | 1 2 **4 5** | 1 |
| 3 | **1 2 4 5** | 0 |

Tổng 4 lần đổi chỗ, đúng bằng 4 nghịch thế (5,1), (5,4), (5,2), (4,2).`,
      application:
        'Dùng khi dữ liệu nhỏ hoặc gần như đã sắp xếp (insertion sort được thư viện chuẩn dùng cho đoạn ngắn bên trong thuật toán lớn). Số nghịch thế đo độ "lộn xộn" của bảng xếp hạng, ví dụ so sánh hai danh sách yêu thích.',
      prosCons:
        "**Ưu:** dễ hiểu, dễ cài, không tốn bộ nhớ phụ.\n\n**Nhược:** `O(n²)` quá chậm với n từ 10⁵ trở lên; khi đó cần merge sort, quick sort ở bài sau hoặc hàm `sort` có sẵn.",
      errors:
        "- Vòng trong chạy tới `n - 1` rồi truy cập `a[j + 1]` vượt biên.\n- Insertion sort quên lưu `key` trước khi dời phần tử.\n- Selection sort đổi chỗ trong vòng trong thay vì sau khi tìm được min.\n- Nghĩ selection sort ổn định.",
      takeaways:
        "- Ba thuật toán đều `O(n²)`, tại chỗ.\n- Bubble: đổi kề nhau; Selection: chọn min; Insertion: chèn vào phần đã sắp.\n- Số lần đổi chỗ của bubble sort = số nghịch thế.",
      practice:
        "Làm trắc nghiệm, đếm số lần đổi chỗ của bubble sort, tự cài một thuật toán sắp xếp (không dùng hàm có sẵn để luyện tập) và bài tự luận chạy tay.",
    },
    exercises: [
      {
        kind: "QUIZ",
        key: "quiz-basic-sort",
        title: "Trắc nghiệm: Sắp xếp cơ bản",
        points: 30,
        prompt: "Phân biệt ba thuật toán sắp xếp cơ bản.",
        questions: [
          {
            prompt:
              "Thuật toán nào chạy nhanh nhất trên dãy gần như đã sắp xếp?",
            options: [
              "Selection sort",
              "Insertion sort",
              "Cả hai như nhau",
              "Không có cái nào",
            ],
            answer: 1,
            explanation:
              "Insertion sort gần O(n) vì mỗi phần tử chỉ dời rất ít.",
          },
          {
            prompt:
              "Sau lượt đầu tiên của bubble sort (tăng dần), phần tử nào chắc chắn đúng chỗ?",
            options: [
              "Nhỏ nhất ở đầu",
              "Lớn nhất ở cuối",
              "Phần tử giữa",
              "Không phần tử nào",
            ],
            answer: 1,
            explanation: "Phần tử lớn nhất bị đẩy dần về cuối dãy.",
          },
          {
            prompt: "Dãy [3, 2, 1] có bao nhiêu nghịch thế?",
            options: ["1", "2", "3", "6"],
            answer: 2,
            explanation: "(3,2), (3,1), (2,1).",
          },
          {
            prompt: "Thuật toán nào KHÔNG ổn định?",
            options: [
              "Bubble sort",
              "Insertion sort",
              "Selection sort",
              "Cả ba đều ổn định",
            ],
            answer: 2,
            explanation:
              "Selection sort đổi chỗ xa nên có thể đảo thứ tự hai phần tử bằng nhau.",
          },
          {
            prompt: "Độ phức tạp xấu nhất của cả ba thuật toán là?",
            options: ["O(n)", "O(n log n)", "O(n²)", "O(2ⁿ)"],
            answer: 2,
            explanation: "Hai vòng lặp lồng nhau trên n phần tử.",
          },
        ],
      },
      code(
        "bubble-swaps",
        "Đếm số lần đổi chỗ",
        Difficulty.MEDIUM,
        "Dòng 1: `n` (1 ≤ n ≤ 1000). Dòng 2: `n` số nguyên (|giá trị| ≤ 10⁹).\n\nNếu sắp xếp dãy tăng dần bằng **bubble sort** (chỉ đổi chỗ hai phần tử kề nhau khi phần tử trước **lớn hơn** phần tử sau), cần bao nhiêu lần đổi chỗ? In ra con số đó.",
        cases(
          [
            "4\n5 1 4 2",
            "3\n1 2 3",
            "3\n3 2 1",
            "5\n2 2 1 1 3",
            "1\n42",
            arrayInput(randomArray(61, 1000, -1_000_000_000, 1_000_000_000)),
            arrayInput(Array.from({ length: 1000 }, (_, i) => 1000 - i)),
          ],
          bubbleSwaps,
        ),
        120,
      ),
      code(
        "sort-ascending",
        "Tự cài sắp xếp tăng dần",
        Difficulty.EASY,
        "Dòng 1: `n` (1 ≤ n ≤ 1000). Dòng 2: `n` số nguyên (|giá trị| ≤ 10⁹). In dãy sau khi sắp xếp tăng dần, cách nhau một dấu cách.\n\nĐể luyện tập, hãy tự cài bubble, selection hoặc insertion sort thay vì gọi hàm sắp xếp có sẵn.",
        cases(
          [
            "5\n5 1 4 2 8",
            "1\n7",
            "4\n-3 -3 0 -10",
            "6\n1 2 3 4 5 6",
            arrayInput(randomArray(62, 1000, -1_000_000_000, 1_000_000_000)),
          ],
          sortAscending,
        ),
      ),
      {
        kind: "HANDWRITTEN",
        key: "essay-basic-sort",
        title: "Tự luận: Chạy tay ba thuật toán sắp xếp",
        difficulty: Difficulty.MEDIUM,
        points: 50,
        prompt:
          'Cho dãy `[29, 10, 14, 37, 13]`. Trình bày trên giấy rồi chụp ảnh nộp bài:\n\n1. Ghi trạng thái dãy sau **mỗi lượt** của selection sort và của insertion sort.\n2. Đếm số nghịch thế của dãy, từ đó suy ra bubble sort cần bao nhiêu lần đổi chỗ.\n3. Giải thích "ổn định" là gì và cho ví dụ dãy mà selection sort làm mất tính ổn định.',
        rubric:
          "Tổng 10 điểm.\n- Câu 1 (5 điểm): Selection: [10,29,14,37,13] → [10,13,14,37,29] → [10,13,14,37,29] → [10,13,14,29,37] (2,5 điểm). Insertion: [10,29,14,37,13] → [10,14,29,37,13] → [10,14,29,37,13] → [10,13,14,29,37] (2,5 điểm).\n- Câu 2 (2 điểm): các nghịch thế (29,10), (29,14), (29,13), (14,13), (37,13) nên 5 lần đổi chỗ.\n- Câu 3 (3 điểm): ổn định là phần tử bằng nhau giữ nguyên thứ tự ban đầu (1 điểm); ví dụ đúng như [2a, 2b, 1] → selection đổi 2a với 1 thành [1, 2b, 2a] (2 điểm).",
      },
    ],
  },
  {
    title: "Sắp xếp nâng cao: Merge sort và Quick sort",
    description:
      "Chia để trị, O(n log n) và cách dùng hàm sắp xếp có sẵn với nhiều tiêu chí.",
    videos: [
      titv("EvmFg_wZMD8", "Bài 17: Thuật toán sắp xếp trộn (Merge Sort)"),
      titv("n0dYgxhDLpY", "Bài 18: Thuật toán sắp xếp nhanh (Quick Sort)"),
      ongDev(
        "kaohwCX9__0",
        "Tổng hợp các thuật toán sắp xếp: phân tích và so sánh",
      ),
    ],
    parts: {
      overview:
        "Với 1 triệu phần tử, `O(n²)` cần 10¹² phép tính, còn `O(n log n)` chỉ khoảng 2×10⁷. Bài này học hai thuật toán **chia để trị** nhanh nhất và cách sắp xếp theo nhiều tiêu chí.\n\n**Mục tiêu:** hiểu merge sort, quick sort và dùng thành thạo hàm `sort` với hàm so sánh tự viết.",
      concept:
        "**Chia để trị** (divide and conquer): chia bài toán thành các bài nhỏ cùng dạng, giải đệ quy, rồi gộp kết quả. **Merge sort** chia đôi dãy, sắp mỗi nửa rồi **trộn** hai nửa đã sắp. **Quick sort** chọn một **chốt** (pivot), đưa phần tử nhỏ hơn sang trái, lớn hơn sang phải, rồi sắp hai phần.",
      characteristics:
        "- Merge sort: luôn `O(n log n)`, ổn định, cần `O(n)` bộ nhớ phụ.\n- Quick sort: trung bình `O(n log n)`, xấu nhất `O(n²)` khi chọn chốt tệ, sắp tại chỗ, thường nhanh nhất trong thực tế.\n- Hàm `sort` của C++ (introsort), `sorted` của Python (Timsort) đều `O(n log n)`.",
      classification:
        "| Thuật toán | Trung bình | Xấu nhất | Bộ nhớ | Ổn định |\n| --- | --- | --- | --- | --- |\n| Merge sort | n log n | n log n | O(n) | Có |\n| Quick sort | n log n | n² | O(log n) | Không |\n| Heap sort | n log n | n log n | O(1) | Không |\n| Bubble/Insertion | n² | n² | O(1) | Có |",
      mechanism:
        "Merge sort trên n phần tử: chia đôi liên tục được `log n` tầng, mỗi tầng trộn tổng cộng n phần tử, nên tổng `O(n log n)`. Bước trộn dùng hai con trỏ, mỗi lần lấy phần tử nhỏ hơn ở đầu hai nửa.",
      syntax: `${F}cpp
// Sắp xếp theo nhiều tiêu chí: điểm giảm dần, cùng điểm thì tên tăng dần
sort(ds.begin(), ds.end(), [](const HocVien& x, const HocVien& y) {
    if (x.diem != y.diem) return x.diem > y.diem;
    return x.ten < y.ten;
});
${F}

${F}python
ds.sort(key=lambda hv: (-hv.diem, hv.ten))
${F}`,
      example: `Trộn hai nửa đã sắp \`[1, 4, 9]\` và \`[2, 3, 10]\`:

${F}
so 1 với 2 → lấy 1      [1]
so 4 với 2 → lấy 2      [1, 2]
so 4 với 3 → lấy 3      [1, 2, 3]
so 4 với 10 → lấy 4     [1, 2, 3, 4]
so 9 với 10 → lấy 9     [1, 2, 3, 4, 9]
còn lại 10              [1, 2, 3, 4, 9, 10]
${F}`,
      application:
        "Xếp hạng bảng thi đấu (điểm giảm dần, thời gian tăng dần), sắp xếp đơn hàng theo ngày, gộp hai danh sách đã sắp (bước trộn của merge sort), sắp xếp dữ liệu lớn không vừa bộ nhớ (external merge sort).",
      prosCons:
        "**Ưu:** nhanh với dữ liệu lớn; merge sort ổn định và có thời gian đảm bảo.\n\n**Nhược:** merge sort tốn bộ nhớ phụ; quick sort có trường hợp xấu `O(n²)` và không ổn định; cài đặt đệ quy dễ sai biên hơn các thuật toán cơ bản.",
      errors:
        "- Hàm so sánh trả về `<=` thay vì `<` trong C++ → lỗi khi chạy.\n- Quick sort chọn chốt là phần tử đầu trên dãy đã sắp → `O(n²)`.\n- Quên tiêu chí phụ khi điểm bằng nhau → thứ tự không xác định, sai test.\n- So sánh tên có chữ hoa và chữ thường mà không để ý mã ASCII ('Z' < 'a').",
      takeaways:
        "- Chia để trị: chia, giải đệ quy, gộp.\n- Merge sort, quick sort, hàm sort có sẵn đều `O(n log n)`.\n- Sắp xếp nhiều tiêu chí bằng hàm so sánh hoặc key dạng bộ.",
      practice:
        "Làm trắc nghiệm, bài xếp hạng nhiều tiêu chí và bài tìm khoảng cách nhỏ nhất (sắp xếp rồi xét các cặp kề nhau).",
    },
    exercises: [
      {
        kind: "QUIZ",
        key: "quiz-advanced-sort",
        title: "Trắc nghiệm: Merge sort và Quick sort",
        points: 30,
        prompt: "So sánh các thuật toán sắp xếp O(n log n).",
        questions: [
          {
            prompt: "Merge sort có độ phức tạp xấu nhất là?",
            options: ["O(n)", "O(n log n)", "O(n²)", "O(log n)"],
            answer: 1,
            explanation: "log n tầng chia, mỗi tầng trộn n phần tử.",
          },
          {
            prompt: "Khi nào quick sort rơi vào O(n²)?",
            options: [
              "Khi dãy ngẫu nhiên",
              "Khi chốt luôn chia dãy rất lệch, ví dụ chốt là phần tử nhỏ nhất",
              "Khi n là số chẵn",
              "Không bao giờ",
            ],
            answer: 1,
            explanation:
              "Mỗi lần chỉ loại được một phần tử nên có n tầng đệ quy.",
          },
          {
            prompt: "Thuật toán nào cần thêm O(n) bộ nhớ phụ khi trộn?",
            options: [
              "Quick sort",
              "Merge sort",
              "Insertion sort",
              "Selection sort",
            ],
            answer: 1,
            explanation: "Bước trộn cần mảng tạm chứa kết quả.",
          },
          {
            prompt:
              "Trộn [2, 7] và [3, 5] thành dãy tăng cần bao nhiêu lần so sánh?",
            options: ["1", "2", "3", "4"],
            answer: 2,
            explanation:
              "2–3 lấy 2, 7–3 lấy 3, 7–5 lấy 5, còn lại 7 không cần so sánh.",
          },
          {
            prompt:
              "Python: sắp danh sách theo điểm giảm dần rồi tên tăng dần, key nào đúng?",
            options: [
              "key=lambda x: (x.diem, x.ten)",
              "key=lambda x: (-x.diem, x.ten)",
              "key=lambda x: (x.ten, -x.diem)",
              "key=lambda x: -x.diem",
            ],
            answer: 1,
            explanation: "Đổi dấu điểm để thành giảm dần, tên là tiêu chí phụ.",
          },
        ],
      },
      code(
        "ranking",
        "Bảng xếp hạng",
        Difficulty.MEDIUM,
        "Dòng 1: `n` (1 ≤ n ≤ 1000). `n` dòng tiếp theo, mỗi dòng gồm tên (chỉ chữ cái và số, không dấu cách, dài ≤ 20) và điểm (0 ≤ điểm ≤ 1000), các tên khác nhau.\n\nIn bảng xếp hạng: điểm **giảm dần**; cùng điểm thì tên **tăng dần theo thứ tự từ điển** (so sánh theo mã ASCII, chữ hoa đứng trước chữ thường). Mỗi dòng in `tên điểm`.",
        cases(
          [
            "4\nan 90\nbinh 75\nchi 90\ndung 100",
            "3\nZed 50\nalice 50\nBob 50",
            "1\nsolo 0",
            (() => {
              const next = pseudoRandom(71);
              const rows = Array.from(
                { length: 1000 },
                (_, i) => `hv${(i * 7919) % 1000} ${next(0, 100) * 10}`,
              );
              return `${rows.length}\n${rows.join("\n")}`;
            })(),
          ],
          ranking,
        ),
        120,
      ),
      code(
        "min-gap",
        "Khoảng cách nhỏ nhất",
        Difficulty.MEDIUM,
        "Dòng 1: `n` (2 ≤ n ≤ 2·10⁴). Dòng 2: `n` số nguyên (0 ≤ giá trị ≤ 10⁹). In ra giá trị nhỏ nhất của `|a[i] - a[j]|` với `i ≠ j`.\n\n**Gợi ý:** sau khi sắp xếp, cặp gần nhau nhất luôn đứng kề nhau. Hai vòng lặp lồng nhau `O(n²)` sẽ quá thời gian ở test lớn.",
        cases(
          [
            "5\n10 3 25 7 18",
            "2\n5 5",
            "3\n1 1000000000 500000000",
            "4\n100 1 50 49",
            arrayInput(randomArray(72, 20000, 0, 1_000_000_000)),
            arrayInput(randomArray(73, 20000, 0, 100_000_000)),
          ],
          minGap,
        ),
        120,
      ),
      {
        kind: "HANDWRITTEN",
        key: "essay-advanced-sort",
        title: "Tự luận: Chạy tay merge sort",
        difficulty: Difficulty.MEDIUM,
        points: 50,
        prompt:
          "Cho dãy `[38, 27, 43, 3, 9, 82, 10]`. Trình bày trên giấy rồi chụp ảnh nộp bài:\n\n1. Vẽ cây chia đôi và cây trộn của merge sort cho dãy trên.\n2. Giải thích vì sao merge sort luôn là `O(n log n)`.\n3. So sánh merge sort và quick sort theo 3 tiêu chí: thời gian xấu nhất, bộ nhớ phụ, tính ổn định.",
        rubric:
          "Tổng 10 điểm.\n- Câu 1 (4 điểm): chia [38,27,43,3] và [9,82,10] tới từng phần tử (2 điểm); trộn ra [27,38], [3,43], [3,27,38,43], [9,82], [9,10,82], kết quả [3,9,10,27,38,43,82] (2 điểm).\n- Câu 2 (3 điểm): chia đôi được log n tầng (1,5 điểm), mỗi tầng trộn tổng n phần tử (1,5 điểm).\n- Câu 3 (3 điểm): merge n log n / quick n²; merge O(n) / quick O(log n); merge ổn định / quick không (mỗi tiêu chí 1 điểm).",
      },
    ],
  },
  {
    title: "Đệ quy",
    description:
      "Hàm tự gọi chính nó: điều kiện dừng, tháp Hà Nội và lũy thừa nhanh.",
    videos: [
      ongDev(
        "S9QvQ56t9xo",
        "Cấu trúc dữ liệu và thuật toán #9: Đệ quy (Recursion)",
      ),
      titv("zRPfxI3ggVU", "Bài 15: Giải bài toán tháp Hà Nội bằng đệ quy"),
      titv("iFiOGoKDKfA", "Bài 14: Tìm kiếm nhị phân bằng đệ quy"),
    ],
    parts: {
      overview:
        "Có những bài toán tự nhiên được định nghĩa bằng chính nó: giai thừa, cây thư mục, tháp Hà Nội. **Đệ quy** là công cụ để viết lời giải cho chúng một cách ngắn gọn.\n\n**Mục tiêu:** viết hàm đệ quy có điều kiện dừng đúng và giải được tháp Hà Nội, lũy thừa nhanh.",
      concept:
        "**Đệ quy** là khi một hàm gọi lại chính nó với dữ liệu nhỏ hơn. Mỗi hàm đệ quy gồm hai phần: **trường hợp cơ sở** (điều kiện dừng, trả lời trực tiếp) và **bước đệ quy** (đưa bài toán về bài nhỏ hơn).",
      characteristics:
        "- Mỗi lần gọi tạo một khung mới trên **ngăn xếp lời gọi** (call stack).\n- Thiếu điều kiện dừng → gọi mãi tới khi tràn stack.\n- Lời giải thường ngắn, sát với định nghĩa toán học.\n- Có thể tính lại một bài con nhiều lần (Fibonacci đệ quy thuần là `O(2ⁿ)`).",
      classification:
        "- **Đệ quy tuyến tính:** gọi một lần (giai thừa, tổng chữ số).\n- **Đệ quy nhị phân:** gọi hai lần (Fibonacci, tháp Hà Nội, merge sort).\n- **Đệ quy đuôi:** lời gọi đệ quy là lệnh cuối cùng.\n- **Chia để trị:** chia đôi dữ liệu mỗi lần (tìm kiếm nhị phân, lũy thừa nhanh).",
      mechanism:
        "Gọi `giaiThua(3)` → cần `giaiThua(2)` → cần `giaiThua(1)` → trường hợp cơ sở trả 1. Sau đó các khung trên stack lần lượt **quay lui**: 2 × 1 = 2, rồi 3 × 2 = 6. Tháp Hà Nội n đĩa: chuyển n−1 đĩa sang cọc trung gian, chuyển đĩa lớn nhất sang đích, rồi chuyển n−1 đĩa từ trung gian sang đích. Số bước `T(n) = 2T(n−1) + 1 = 2ⁿ − 1`.",
      syntax: `${F}cpp
void hanoi(int n, char from, char to, char via) {
    if (n == 0) return;                 // trường hợp cơ sở
    hanoi(n - 1, from, via, to);
    cout << from << " " << to << "\\n";
    hanoi(n - 1, via, to, from);
}
${F}`,
      example: `Lũy thừa nhanh: \`aᵇ = (a^(b/2))²\`, nhân thêm a nếu b lẻ. Chỉ cần khoảng \`log₂ b\` lần gọi.

${F}python
def power(a, b, m):
    if b == 0:
        return 1 % m
    half = power(a, b // 2, m)
    result = half * half % m
    return result * a % m if b % 2 else result
${F}`,
      application:
        "Duyệt cây thư mục, duyệt cây DOM của trang web, sinh hoán vị và tổ hợp (quay lui), các thuật toán chia để trị (merge sort, quick sort), mã hóa RSA dùng lũy thừa nhanh theo modulo.",
      prosCons:
        "**Ưu:** code ngắn, dễ suy luận đúng sai bằng quy nạp.\n\n**Nhược:** tốn bộ nhớ stack; độ sâu lớn (khoảng 10⁴ trở lên trong Python) dễ tràn; có thể tính lặp bài con nếu không ghi nhớ.",
      errors:
        "- Quên hoặc viết sai điều kiện dừng → `RecursionError` / `stack overflow`.\n- Bước đệ quy không làm bài toán nhỏ đi (ví dụ gọi `f(n)` trong `f(n)`).\n- Lũy thừa nhanh gọi `power(a, b/2)` **hai lần** thay vì lưu lại → mất hết lợi thế.\n- Quên lấy modulo sau mỗi phép nhân → tràn số.",
      takeaways:
        "- Đệ quy = trường hợp cơ sở + bước đệ quy về bài nhỏ hơn.\n- Tháp Hà Nội cần `2ⁿ − 1` bước.\n- Lũy thừa nhanh `O(log b)`.",
      practice:
        "Làm trắc nghiệm, in lời giải tháp Hà Nội và cài lũy thừa nhanh với số mũ tới 10¹⁸.",
    },
    exercises: [
      {
        kind: "QUIZ",
        key: "quiz-recursion",
        title: "Trắc nghiệm: Đệ quy",
        points: 30,
        prompt: "Ôn lại cấu trúc hàm đệ quy và chi phí của nó.",
        questions: [
          {
            prompt: "Thành phần nào bắt buộc để hàm đệ quy dừng?",
            options: [
              "Vòng lặp for",
              "Trường hợp cơ sở",
              "Biến toàn cục",
              "Lệnh break",
            ],
            answer: 1,
            explanation:
              "Trường hợp cơ sở trả lời trực tiếp mà không gọi đệ quy nữa.",
          },
          {
            prompt: "Tháp Hà Nội 5 đĩa cần tối thiểu bao nhiêu bước?",
            options: ["10", "25", "31", "32"],
            answer: 2,
            explanation: "2⁵ − 1 = 31.",
          },
          {
            prompt:
              "f(n) = f(n−1) + f(n−2) cài đệ quy thuần, không ghi nhớ, có độ phức tạp khoảng?",
            options: ["O(n)", "O(n log n)", "O(n²)", "O(2ⁿ)"],
            answer: 3,
            explanation:
              "Mỗi lời gọi sinh hai lời gọi, các bài con bị tính lại rất nhiều lần.",
          },
          {
            prompt: "Lũy thừa nhanh tính a^b cần khoảng bao nhiêu phép nhân?",
            options: ["b", "b / 2", "log₂ b", "√b"],
            answer: 2,
            explanation: "Mỗi bước số mũ giảm một nửa.",
          },
          {
            prompt: "Lỗi stack overflow khi chạy đệ quy thường do?",
            options: [
              "Dùng quá nhiều biến",
              "Độ sâu đệ quy quá lớn hoặc thiếu điều kiện dừng",
              "Mảng quá lớn",
              "Chia cho 0",
            ],
            answer: 1,
            explanation: "Mỗi lời gọi chiếm một khung stack có giới hạn.",
          },
        ],
      },
      code(
        "hanoi",
        "Tháp Hà Nội",
        Difficulty.MEDIUM,
        "Có 3 cọc `A`, `B`, `C`; cọc `A` có `n` đĩa (1 ≤ n ≤ 10) xếp nhỏ trên lớn. Chuyển hết sang cọc `C`, mỗi lần chuyển một đĩa trên cùng và không đặt đĩa lớn lên đĩa nhỏ.\n\nDòng đầu in số bước tối thiểu. Các dòng sau in từng bước theo dạng `X Y` (chuyển đĩa trên cùng của cọc X sang cọc Y), theo đúng lời giải tối thiểu (lời giải tối thiểu là duy nhất).",
        cases(["2", "1", "3", "5", "8", "10"], hanoi),
        150,
      ),
      code(
        "fast-power",
        "Lũy thừa nhanh",
        Difficulty.MEDIUM,
        "Đọc ba số nguyên `a b m` (0 ≤ a ≤ 10⁹, 0 ≤ b ≤ 10¹⁸, 1 ≤ m ≤ 10⁹). In ra `aᵇ mod m`.\n\nVòng lặp nhân b lần sẽ quá thời gian; hãy dùng lũy thừa nhanh và lấy modulo sau mỗi phép nhân (tích hai số nhỏ hơn 10⁹ vẫn vừa số nguyên 64 bit).",
        cases(
          [
            "2 10 1000",
            "3 0 7",
            "5 3 1",
            "2 1000000000000000000 1000000007",
            "123456789 987654321987654321 998244353",
            "0 0 13",
            "0 5 13",
            "1000000000 1000000000000000000 999999937",
          ],
          powerMod,
        ),
        150,
      ),
      {
        kind: "HANDWRITTEN",
        key: "essay-recursion",
        title: "Tự luận: Cây lời gọi đệ quy",
        difficulty: Difficulty.MEDIUM,
        points: 50,
        prompt:
          "Trình bày trên giấy rồi chụp ảnh nộp bài:\n\n1. Vẽ cây lời gọi của `fib(5)` với `fib(n) = fib(n-1) + fib(n-2)`, `fib(0) = 0`, `fib(1) = 1`. Có bao nhiêu lời gọi? `fib(2)` bị tính bao nhiêu lần?\n2. Liệt kê 7 bước giải tháp Hà Nội với 3 đĩa (từ A sang C).\n3. Chứng minh bằng quy nạp rằng tháp Hà Nội n đĩa cần đúng `2ⁿ − 1` bước theo lời giải đệ quy.",
        rubric:
          "Tổng 10 điểm.\n- Câu 1 (4 điểm): cây đúng (2 điểm); 15 lời gọi (1 điểm); fib(2) bị tính 3 lần (1 điểm).\n- Câu 2 (3 điểm): A C, A B, C B, A C, B A, B C, A C.\n- Câu 3 (3 điểm): cơ sở n = 1 cần 1 bước (1 điểm); giả sử T(n−1) = 2ⁿ⁻¹ − 1 thì T(n) = 2T(n−1) + 1 = 2ⁿ − 1 (2 điểm).",
      },
    ],
  },
  {
    title: "Ngăn xếp (Stack)",
    description:
      "Cấu trúc vào sau ra trước: kiểm tra dấu ngoặc và tính biểu thức hậu tố.",
    videos: [
      ongDev("BxxG5aFEtBE", "Cấu trúc dữ liệu và thuật toán #10: Stack"),
      ongDev(
        "bLafmb5KeWE",
        "Cấu trúc dữ liệu và thuật toán #11: Stack Implementations",
      ),
    ],
    parts: {
      overview:
        "Nút Undo, nút Back của trình duyệt và cách máy tính hiểu biểu thức `(1 + 2) * 3` đều dựa trên **ngăn xếp**. Bài này học stack và hai ứng dụng kinh điển.\n\n**Mục tiêu:** dùng stack để kiểm tra dấu ngoặc và tính biểu thức hậu tố.",
      concept:
        "**Ngăn xếp** (stack) là cấu trúc dữ liệu hoạt động theo nguyên tắc **LIFO** (Last In, First Out): phần tử vào sau cùng được lấy ra trước tiên, giống chồng đĩa.",
      characteristics:
        "- Chỉ thao tác ở **đỉnh** (top).\n- `push` (thêm), `pop` (lấy ra), `top`/`peek` (xem đỉnh), `empty` đều `O(1)`.\n- Không truy cập trực tiếp phần tử ở giữa.\n- Gọi `pop` khi rỗng là lỗi, phải kiểm tra trước.",
      classification:
        "- **Cài bằng mảng động:** `vector` trong C++, `list` trong Python (`append` / `pop`).\n- **Cài bằng danh sách liên kết:** thêm/xóa ở đầu danh sách.\n- **Thư viện:** `stack<int>` (C++), `ArrayDeque` (Java), mảng với `push`/`pop` (JavaScript).",
      mechanism:
        "Kiểm tra dấu ngoặc: duyệt từng ký tự; gặp ngoặc mở thì `push`; gặp ngoặc đóng thì đỉnh stack phải là ngoặc mở **cùng loại**, đúng thì `pop`, sai hoặc stack rỗng thì kết luận không hợp lệ. Hết chuỗi mà stack còn phần tử cũng không hợp lệ.\n\nBiểu thức hậu tố `3 4 + 2 *`: gặp số thì `push`; gặp toán tử thì `pop` hai số b rồi a, tính `a op b` và `push` kết quả.",
      syntax: `${F}cpp
stack<char> st;
st.push('(');
if (!st.empty()) {
    char c = st.top();
    st.pop();
}
${F}

${F}python
st = []
st.append('(')
if st:
    c = st.pop()
${F}`,
      example: `Tính \`5 1 2 + 4 * + 3 -\`:

| Token | Stack sau bước |
| --- | --- |
| 5, 1, 2 | 5 1 2 |
| + | 5 3 |
| 4 | 5 3 4 |
| * | 5 12 |
| + | 17 |
| 3 | 17 3 |
| - | **14** |`,
      application:
        "Undo/Redo trong trình soạn thảo, lịch sử Back của trình duyệt, kiểm tra cú pháp HTML/JSON, call stack khi chạy đệ quy, chuyển biểu thức trung tố sang hậu tố trong trình biên dịch.",
      prosCons:
        "**Ưu:** mọi thao tác `O(1)`, cài đặt đơn giản.\n\n**Nhược:** chỉ truy cập được đỉnh; tìm một phần tử bất kỳ phải lấy ra lần lượt.",
      errors:
        "- `pop` hoặc `top` khi stack rỗng.\n- Lấy toán hạng sai thứ tự: với `-` phải là `a - b`, trong đó b là phần tử pop ra **trước**.\n- Chỉ đếm số ngoặc mở/đóng bằng nhau mà không kiểm tra loại và thứ tự: `([)]` không hợp lệ.\n- Quên kiểm tra stack rỗng ở cuối.",
      takeaways:
        "- Stack: LIFO, thao tác ở đỉnh, `O(1)`.\n- Ngoặc mở push, ngoặc đóng so với đỉnh.\n- Hậu tố: số thì push, toán tử thì pop hai số.",
      practice:
        "Làm trắc nghiệm, rồi hai bài code kinh điển: dấu ngoặc hợp lệ và tính biểu thức hậu tố.",
    },
    exercises: [
      {
        kind: "QUIZ",
        key: "quiz-stack",
        title: "Trắc nghiệm: Stack",
        points: 30,
        prompt: "Ôn lại nguyên tắc LIFO và các ứng dụng của stack.",
        questions: [
          {
            prompt: "Push 1, 2, 3 rồi pop hai lần. Phần tử còn lại ở đỉnh là?",
            options: ["1", "2", "3", "Stack rỗng"],
            answer: 0,
            explanation: "Pop lấy 3 rồi 2, còn lại 1.",
          },
          {
            prompt: "Chuỗi ngoặc nào hợp lệ?",
            options: ["([)]", "(()", "{[()]}", "())("],
            answer: 2,
            explanation: "Mỗi ngoặc đóng khớp đúng loại với ngoặc mở gần nhất.",
          },
          {
            prompt: "Giá trị của biểu thức hậu tố 6 2 / 3 + là?",
            options: ["1", "6", "3", "9"],
            answer: 1,
            explanation: "6 / 2 = 3, rồi 3 + 3 = 6.",
          },
          {
            prompt: "Tính năng nào KHÔNG dùng stack một cách tự nhiên?",
            options: [
              "Undo",
              "Nút Back của trình duyệt",
              "Hàng đợi in tài liệu",
              "Call stack của đệ quy",
            ],
            answer: 2,
            explanation: "Hàng đợi in tài liệu là vào trước ra trước (queue).",
          },
          {
            prompt: "Thao tác push và pop của stack có độ phức tạp?",
            options: ["O(1)", "O(log n)", "O(n)", "O(n²)"],
            answer: 0,
            explanation: "Chỉ làm việc ở đỉnh.",
          },
        ],
      },
      code(
        "valid-brackets",
        "Dấu ngoặc hợp lệ",
        Difficulty.MEDIUM,
        "Đọc một dòng chỉ gồm các ký tự `()[]{}` (độ dài 1 đến 10⁵). In `YES` nếu dãy ngoặc hợp lệ (mỗi ngoặc đóng khớp đúng loại với ngoặc mở gần nhất chưa đóng, và mọi ngoặc đều được đóng), ngược lại in `NO`.",
        cases(
          [
            "{[()]}",
            "([)]",
            "(",
            ")(",
            "()[]{}",
            "((((((((()))))))))",
            "[".repeat(50000) + "]".repeat(50000),
            "(".repeat(50000) + "]".repeat(50000),
            "{}".repeat(40000) + "(",
          ],
          brackets,
        ),
        120,
      ),
      code(
        "postfix-eval",
        "Tính biểu thức hậu tố",
        Difficulty.MEDIUM,
        "Đọc một dòng là biểu thức hậu tố hợp lệ, các phần tử cách nhau một dấu cách. Toán hạng là số nguyên không âm ≤ 10⁴, toán tử là `+`, `-`, `*`. Có tối đa 200 phần tử và mọi kết quả trung gian có giá trị tuyệt đối không quá 10¹⁸.\n\nIn ra giá trị của biểu thức.",
        cases(
          [
            "3 4 + 2 *",
            "5 1 2 + 4 * + 3 -",
            "42",
            "2 3 4 * -",
            "10000 10000 * 10000 * 10000 *",
            "1 2 - 3 - 4 - 5 -",
            "7 8 9 * + 6 5 - 4 * -",
          ],
          postfix,
        ),
        120,
      ),
      {
        kind: "HANDWRITTEN",
        key: "essay-stack",
        title: "Tự luận: Mô phỏng stack",
        difficulty: Difficulty.MEDIUM,
        points: 50,
        prompt:
          "Trình bày trên giấy rồi chụp ảnh nộp bài:\n\n1. Vẽ trạng thái stack sau từng ký tự khi kiểm tra chuỗi `{[()()]}` và chuỗi `[(])`. Kết luận mỗi chuỗi hợp lệ hay không.\n2. Lập bảng stack khi tính biểu thức hậu tố `8 2 3 * - 4 +`.\n3. Chuyển biểu thức trung tố `(2 + 3) * (7 - 4)` sang hậu tố và giải thích vì sao dạng hậu tố không cần dấu ngoặc.",
        rubric:
          "Tổng 10 điểm.\n- Câu 1 (4 điểm): trạng thái từng bước đúng cho chuỗi 1, kết luận hợp lệ (2 điểm); chuỗi 2 sai khi gặp ] mà đỉnh là (, không hợp lệ (2 điểm).\n- Câu 2 (3 điểm): 8 | 8 2 | 8 2 3 | 8 6 | 2 | 2 4 | 6, kết quả 6.\n- Câu 3 (3 điểm): 2 3 + 7 4 - * (2 điểm); thứ tự toán tử trong dãy đã quyết định thứ tự tính (1 điểm).",
      },
    ],
  },
  {
    title: "Hàng đợi (Queue)",
    description:
      "Cấu trúc vào trước ra trước: mô phỏng hàng đợi và bài toán Josephus.",
    videos: [
      ongDev("qpqSiYjS9-4", "Cấu trúc dữ liệu và thuật toán #13: Queue"),
      ongDev(
        "EFdvAXaPYVY",
        "Cấu trúc dữ liệu và thuật toán #14: Queue Implementations",
      ),
    ],
    parts: {
      overview:
        "Xếp hàng mua trà sữa, hàng đợi in tài liệu, tin nhắn chờ gửi: ai đến trước được phục vụ trước. Đó là **hàng đợi**.\n\n**Mục tiêu:** dùng queue để mô phỏng các quá trình theo thứ tự đến, và giải bài toán Josephus.",
      concept:
        "**Hàng đợi** (queue) là cấu trúc dữ liệu theo nguyên tắc **FIFO** (First In, First Out): thêm vào ở **cuối** (rear), lấy ra ở **đầu** (front).",
      characteristics:
        "- `enqueue`/`push` thêm vào cuối, `dequeue`/`pop` lấy ở đầu, `front` xem đầu; đều `O(1)` nếu cài đúng.\n- Không truy cập phần tử ở giữa.\n- Lấy ra khi rỗng là lỗi.\n- Dùng `list.pop(0)` trong Python là `O(n)`, phải dùng `collections.deque`.",
      classification:
        "- **Queue thường:** FIFO.\n- **Hàng đợi vòng** (circular queue): mảng cố định, hai chỉ số đầu/cuối quay vòng.\n- **Deque:** thêm/xóa được ở cả hai đầu.\n- **Hàng đợi ưu tiên** (priority queue): lấy ra phần tử ưu tiên nhất, không theo thứ tự đến.",
      mechanism:
        "Cài bằng mảng với hai chỉ số `head` và `tail`: thêm thì ghi vào `a[tail]` rồi tăng `tail`; lấy ra thì đọc `a[head]` rồi tăng `head`. Kích thước là `tail − head`. Không phải dời phần tử nên mọi thao tác đều `O(1)`.\n\nJosephus với queue: lần lượt lấy người ở đầu chuyển xuống cuối `k − 1` lần, người thứ k bị loại.",
      syntax: `${F}cpp
queue<int> q;
q.push(5);          // thêm vào cuối
int x = q.front();  // xem đầu
q.pop();            // bỏ phần tử đầu
q.size(); q.empty();
${F}

${F}python
from collections import deque
q = deque()
q.append(5)
x = q.popleft()
${F}`,
      example: `Josephus n = 5, k = 2 (đếm 1, 2, người đếm 2 bị loại):

| Hàng đợi | Bị loại |
| --- | --- |
| 1 2 3 4 5 | 2 |
| 3 4 5 1 | 4 |
| 5 1 3 | 1 |
| 3 5 | 5 |
| 3 | 3 |

Thứ tự bị loại: \`2 4 1 5 3\`.`,
      application:
        "Hàng đợi in, hàng đợi tác vụ của server (message queue), bộ đệm phát video, thuật toán duyệt đồ thị theo chiều rộng (BFS), mô phỏng quầy thu ngân.",
      prosCons:
        "**Ưu:** giữ đúng thứ tự đến, thao tác `O(1)`.\n\n**Nhược:** chỉ truy cập hai đầu; cài bằng mảng đơn giản mà không quay vòng sẽ lãng phí chỗ phía đầu mảng.",
      errors:
        "- Dùng `list.pop(0)` hoặc `shift()` trên mảng lớn → `O(n)` mỗi lần, quá thời gian.\n- `front`/`pop` khi hàng đợi rỗng.\n- Nhầm queue với stack: lấy ra ở cuối.\n- Josephus: sai chỉ số khi đếm vòng (dùng `% số người còn lại`).",
      takeaways:
        "- Queue: FIFO, thêm cuối, lấy đầu.\n- Python dùng `deque`, C++ dùng `queue`.\n- Queue là nền tảng của BFS.",
      practice:
        "Làm trắc nghiệm, mô phỏng hàng đợi theo lệnh và giải bài toán Josephus.",
    },
    exercises: [
      {
        kind: "QUIZ",
        key: "quiz-queue",
        title: "Trắc nghiệm: Queue",
        points: 30,
        prompt: "Phân biệt queue với stack và các biến thể của queue.",
        questions: [
          {
            prompt:
              "Enqueue 1, 2, 3 rồi dequeue một lần. Phần tử ở đầu hàng đợi là?",
            options: ["1", "2", "3", "Rỗng"],
            answer: 1,
            explanation: "1 vào trước nên ra trước, còn 2 ở đầu.",
          },
          {
            prompt: "Trong Python, cấu trúc nào lấy phần tử đầu với O(1)?",
            options: [
              "list.pop(0)",
              "collections.deque.popleft()",
              "list.remove(x)",
              "str.split()",
            ],
            answer: 1,
            explanation: "list.pop(0) phải dời toàn bộ phần tử, mất O(n).",
          },
          {
            prompt: "Hàng đợi ưu tiên lấy ra phần tử nào?",
            options: [
              "Phần tử vào trước nhất",
              "Phần tử vào sau nhất",
              "Phần tử có độ ưu tiên cao nhất",
              "Phần tử ngẫu nhiên",
            ],
            answer: 2,
            explanation: "Không theo thứ tự đến mà theo độ ưu tiên.",
          },
          {
            prompt: "Thuật toán nào dùng queue làm cấu trúc chính?",
            options: ["DFS", "BFS", "Merge sort", "Tìm kiếm nhị phân"],
            answer: 1,
            explanation:
              "BFS duyệt theo từng lớp, đỉnh phát hiện trước được xét trước.",
          },
        ],
      },
      code(
        "queue-sim",
        "Mô phỏng hàng đợi",
        Difficulty.MEDIUM,
        "Dòng 1: `q` (1 ≤ q ≤ 5000). `q` dòng tiếp theo, mỗi dòng một lệnh:\n\n- `PUSH x`: thêm `x` (1 ≤ x ≤ 10⁶) vào cuối hàng đợi.\n- `POP`: bỏ phần tử đầu; nếu hàng đợi rỗng thì không làm gì.\n- `FRONT`: in phần tử đầu, hoặc `EMPTY` nếu rỗng.\n- `SIZE`: in số phần tử.\n\nMỗi kết quả của `FRONT` và `SIZE` in trên một dòng. Đề đảm bảo có ít nhất một lệnh `FRONT` hoặc `SIZE`.",
        cases(
          [
            "6\nPUSH 3\nPUSH 7\nFRONT\nPOP\nFRONT\nSIZE",
            "4\nFRONT\nPOP\nSIZE\nPUSH 1",
            "5\nPUSH 1\nPOP\nPOP\nFRONT\nSIZE",
            bigQueue,
          ],
          queueSim,
        ),
        120,
      ),
      code(
        "josephus",
        "Bài toán Josephus",
        Difficulty.MEDIUM,
        "`n` người đứng thành vòng tròn, đánh số 1 đến `n`. Bắt đầu từ người số 1, đếm 1, 2, …, `k`; người đếm tới `k` bị loại, người kế tiếp bắt đầu đếm lại từ 1. Lặp tới khi hết người.\n\nĐọc `n k` (1 ≤ n ≤ 1000, 1 ≤ k ≤ 1000). In thứ tự bị loại trên một dòng, cách nhau dấu cách.",
        cases(
          ["5 2", "7 3", "1 1", "6 1", "4 10", "1000 7", "1000 1000"],
          josephus,
        ),
        120,
      ),
      {
        kind: "HANDWRITTEN",
        key: "essay-queue",
        title: "Tự luận: Hàng đợi vòng bằng mảng",
        difficulty: Difficulty.MEDIUM,
        points: 50,
        prompt:
          "Trình bày trên giấy rồi chụp ảnh nộp bài:\n\n1. Mô phỏng hàng đợi vòng kích thước 4 (mảng `a[0..3]`, chỉ số `head`, `tail`, số phần tử `size`) qua các lệnh: push 1, push 2, push 3, pop, push 4, push 5, push 6, pop. Ghi mảng, head, tail sau mỗi lệnh; lệnh nào thất bại vì đầy?\n2. Viết giả mã hàm `push` và `pop` cho hàng đợi vòng.\n3. So sánh stack và queue: nguyên tắc, nơi thêm/lấy, hai ứng dụng mỗi loại.",
        rubric:
          "Tổng 10 điểm.\n- Câu 1 (4 điểm): theo dõi đúng chỉ số quay vòng bằng % 4 (3 điểm); push 5 ghi vào a[0] nhờ quay vòng; push 6 thất bại vì hàng đợi đã đủ 4 phần tử (2, 3, 4, 5); pop cuối lấy ra 2, head = 2 (1 điểm).\n- Câu 2 (3 điểm): push ghi a[tail], tail = (tail + 1) % cap, size++ và kiểm tra đầy (1,5 điểm); pop đọc a[head], head = (head + 1) % cap, size-- và kiểm tra rỗng (1,5 điểm).\n- Câu 3 (3 điểm): LIFO/FIFO (1 điểm), vị trí thêm/lấy (1 điểm), ứng dụng hợp lý (1 điểm).",
      },
    ],
  },
  {
    title: "Danh sách liên kết",
    description:
      "Các nút nối nhau bằng con trỏ: thêm, xóa và tìm phần tử giữa.",
    videos: [
      ongDev(
        "XduwHI8bbcA",
        "Cấu trúc dữ liệu và thuật toán #6: Giới thiệu Linked List",
      ),
      ongDev(
        "ZaG5n_6ehIw",
        "Cấu trúc dữ liệu và thuật toán #7: Linked List phần 2",
      ),
    ],
    parts: {
      overview:
        "Mảng chèn một phần tử vào đầu phải dời cả dãy. **Danh sách liên kết** giải quyết điều đó bằng cách nối các phần tử bằng con trỏ.\n\n**Mục tiêu:** hiểu cấu trúc nút, thêm/xóa ở đầu và cuối, và kỹ thuật hai con trỏ nhanh-chậm.",
      concept:
        "**Danh sách liên kết** (linked list) là dãy các **nút** (node); mỗi nút chứa dữ liệu và một **con trỏ** `next` trỏ tới nút kế tiếp. Nút đầu gọi là `head`, nút cuối có `next = null`.",
      characteristics:
        "- Các nút nằm rải rác trong bộ nhớ, không liên tiếp như mảng.\n- Thêm/xóa ở đầu `O(1)`; thêm ở cuối `O(1)` nếu giữ con trỏ `tail`.\n- Truy cập phần tử thứ i phải đi từ `head`: `O(n)`.\n- Tốn thêm bộ nhớ cho con trỏ.",
      classification:
        "- **Danh sách liên kết đơn:** mỗi nút có `next`.\n- **Danh sách liên kết đôi:** có cả `prev` và `next`, xóa một nút đã biết trong `O(1)`.\n- **Danh sách liên kết vòng:** nút cuối trỏ lại `head`.\n- Thư viện: `list` (C++), `LinkedList` (Java).",
      mechanism:
        "Thêm vào đầu: tạo nút mới, cho `moi.next = head`, rồi `head = moi`. Xóa nút có giá trị x: đi tìm nút **trước** nó (`prev`), đặt `prev.next = prev.next.next`. Tìm nút giữa trong một lần duyệt: con trỏ `chậm` đi 1 bước, con trỏ `nhanh` đi 2 bước; khi `nhanh` tới cuối thì `chậm` ở giữa.",
      syntax: `${F}cpp
struct Node {
    int val;
    Node* next;
    Node(int v) : val(v), next(nullptr) {}
};

Node* addFirst(Node* head, int x) {
    Node* moi = new Node(x);
    moi->next = head;
    return moi;   // head mới
}
${F}`,
      example: `${F}python
class Node:
    def __init__(self, val, next=None):
        self.val, self.next = val, next

def middle(head):
    slow = fast = head
    while fast and fast.next:
        slow, fast = slow.next, fast.next.next
    return slow.val      # 1→2→3→4→5 cho 3; 1→2→3→4 cho 3
${F}`,
      application:
        "Danh sách phát nhạc (bài trước/bài sau với danh sách đôi), lịch sử trình duyệt, cài đặt stack/queue, bộ nhớ đệm LRU (danh sách đôi kết hợp bảng băm), quản lý vùng nhớ trống trong hệ điều hành.",
      prosCons:
        "**Ưu:** chèn/xóa ở đầu hoặc tại nút đã biết rất nhanh; kích thước linh hoạt.\n\n**Nhược:** không truy cập ngẫu nhiên; tốn bộ nhớ con trỏ; dữ liệu rải rác nên chạy chậm hơn mảng do bộ nhớ đệm CPU.",
      errors:
        "- Mất `head` khi xóa nút đầu mà không cập nhật.\n- Truy cập `node->next` khi `node` là `null`.\n- Quên cập nhật `tail` khi xóa nút cuối.\n- Rò rỉ bộ nhớ trong C++ do quên `delete` nút đã xóa.",
      takeaways:
        "- Nút = dữ liệu + con trỏ `next`.\n- Thêm/xóa đầu `O(1)`, truy cập thứ i `O(n)`.\n- Hai con trỏ nhanh-chậm tìm được nút giữa trong một lần duyệt.",
      practice:
        "Làm trắc nghiệm, mô phỏng các thao tác trên danh sách và tìm phần tử giữa. Hãy thử tự cài bằng nút và con trỏ trước khi dùng cấu trúc có sẵn.",
    },
    exercises: [
      {
        kind: "QUIZ",
        key: "quiz-linked-list",
        title: "Trắc nghiệm: Danh sách liên kết",
        points: 30,
        prompt: "So sánh danh sách liên kết với mảng.",
        questions: [
          {
            prompt:
              "Truy cập phần tử thứ i trong danh sách liên kết đơn có độ phức tạp?",
            options: ["O(1)", "O(log n)", "O(i) hay O(n)", "O(n²)"],
            answer: 2,
            explanation: "Phải đi lần lượt từ head qua i nút.",
          },
          {
            prompt: "Thêm phần tử vào ĐẦU, cấu trúc nào nhanh hơn?",
            options: [
              "Mảng",
              "Danh sách liên kết",
              "Như nhau",
              "Không thêm được",
            ],
            answer: 1,
            explanation:
              "Danh sách liên kết chỉ đổi hai con trỏ; mảng phải dời n phần tử.",
          },
          {
            prompt: "Xóa nút B trong A → B → C cần làm gì?",
            options: ["A.next = C", "B.next = A", "C.next = A", "head = C"],
            answer: 0,
            explanation: "Cho nút trước B trỏ thẳng tới nút sau B.",
          },
          {
            prompt:
              "Con trỏ nhanh đi 2 bước, chậm đi 1 bước. Khi nhanh tới cuối thì chậm ở đâu?",
            options: [
              "Đầu danh sách",
              "Giữa danh sách",
              "Cuối danh sách",
              "Ngoài danh sách",
            ],
            answer: 1,
            explanation: "Chậm đi được nửa quãng đường của nhanh.",
          },
        ],
      },
      code(
        "list-ops",
        "Thao tác trên danh sách",
        Difficulty.MEDIUM,
        "Ban đầu danh sách rỗng. Dòng 1: `q` (1 ≤ q ≤ 2000). `q` dòng tiếp theo, mỗi dòng một lệnh:\n\n- `ADD_FIRST x`: thêm `x` vào đầu.\n- `ADD_LAST x`: thêm `x` vào cuối.\n- `REMOVE x`: xóa phần tử **đầu tiên** (tính từ đầu danh sách) có giá trị `x`; không có thì bỏ qua.\n\nVới 1 ≤ x ≤ 100. Sau cùng in danh sách từ đầu đến cuối, cách nhau dấu cách, hoặc `EMPTY` nếu rỗng.",
        cases(
          [
            "5\nADD_LAST 1\nADD_LAST 2\nADD_FIRST 3\nREMOVE 1\nADD_LAST 3",
            "3\nADD_FIRST 5\nREMOVE 5\nREMOVE 5",
            "4\nADD_LAST 2\nADD_LAST 2\nADD_FIRST 2\nREMOVE 2",
            bigList,
          ],
          listOps,
        ),
        120,
      ),
      code(
        "list-middle",
        "Phần tử ở giữa",
        Difficulty.EASY,
        "Dòng 1: `n` (1 ≤ n ≤ 2·10⁴). Dòng 2: `n` số nguyên là các nút của danh sách liên kết theo thứ tự. In giá trị nút ở giữa; nếu `n` chẵn thì có hai nút giữa, in nút **thứ hai**.\n\nVí dụ `1 2 3 4` thì in `3`.",
        cases(
          [
            "5\n1 2 3 4 5",
            "4\n1 2 3 4",
            "1\n9",
            "2\n7 8",
            arrayInput(randomArray(81, 20000, -1000, 1000)),
            arrayInput(randomArray(82, 19999, -1000, 1000)),
          ],
          middle,
        ),
      ),
      {
        kind: "HANDWRITTEN",
        key: "essay-linked-list",
        title: "Tự luận: Đảo ngược danh sách liên kết",
        difficulty: Difficulty.HARD,
        points: 60,
        prompt:
          "Trình bày trên giấy rồi chụp ảnh nộp bài:\n\n1. Vẽ hình minh họa (ô nút và mũi tên) các bước đảo ngược danh sách `1 → 2 → 3 → 4` bằng ba con trỏ `prev`, `cur`, `next`.\n2. Viết giả mã hàm đảo ngược danh sách liên kết đơn trong `O(n)` thời gian và `O(1)` bộ nhớ phụ.\n3. Lập bảng so sánh mảng và danh sách liên kết với 4 thao tác: truy cập thứ i, thêm đầu, thêm cuối, xóa ở giữa (khi đã biết nút trước).",
        rubric:
          "Tổng 10 điểm.\n- Câu 1 (3 điểm): hình đúng các bước đổi chiều mũi tên, kết thúc 4 → 3 → 2 → 1.\n- Câu 2 (4 điểm): khởi tạo prev = null, cur = head (1 điểm); trong vòng lặp lưu next, đổi cur.next = prev, dời prev và cur (2 điểm); trả về prev làm head mới (1 điểm).\n- Câu 3 (3 điểm): mảng O(1)/O(n)/O(1) khấu hao/O(n); danh sách O(n)/O(1)/O(1) nếu có tail/O(1). Mỗi cột đúng 1,5 điểm.",
      },
    ],
  },
  {
    title: "Bảng băm (Hash Table)",
    description:
      "Tra cứu trung bình O(1): set, map, đếm tần suất và bài toán hai số có tổng k.",
    videos: [
      ongDev(
        "uKIFNzqX2a8",
        "Cấu trúc dữ liệu và thuật toán #20: Hash Table, Hash Function",
      ),
      ongDev(
        "kBS3xQTVzVg",
        "Cấu trúc dữ liệu và thuật toán #21: Hashtable Separate Chaining",
      ),
    ],
    parts: {
      overview:
        "Làm sao tra một từ trong từ điển 1 triệu từ chỉ trong một bước? **Bảng băm** biến khóa thành chỉ số mảng nhờ **hàm băm**.\n\n**Mục tiêu:** dùng thành thạo set/map để đếm tần suất và tìm cặp trong `O(n)`.",
      concept:
        "**Bảng băm** lưu các cặp **khóa → giá trị**. **Hàm băm** `h(khóa)` tính ra chỉ số ô trong mảng nơi lưu khóa đó. Hai khóa khác nhau rơi vào cùng ô gọi là **đụng độ** (collision).",
      characteristics:
        "- Thêm, tìm, xóa trung bình `O(1)`, xấu nhất `O(n)` khi đụng độ nhiều.\n- Không giữ thứ tự khóa (khác với cây tìm kiếm).\n- Hàm băm tốt phân bố khóa đều trên các ô.\n- Khi quá đầy, bảng **mở rộng** và băm lại toàn bộ.",
      classification:
        "- **Xử lý đụng độ bằng nối chuỗi** (separate chaining): mỗi ô là một danh sách.\n- **Địa chỉ mở** (open addressing): tìm ô trống khác bằng dò tuyến tính, dò bậc hai, băm kép.\n- Thư viện: `unordered_set`/`unordered_map` (C++), `set`/`dict` (Python), `HashSet`/`HashMap` (Java), `Set`/`Map` (JavaScript).",
      mechanism:
        'Thêm khóa `"an"`: tính `h("an") % số_ô` ra chỉ số, ví dụ 3, đặt vào ô 3. Tìm `"an"`: tính lại đúng chỉ số 3 và chỉ xét ô đó thay vì cả bảng.\n\nHai số có tổng k: duyệt từng `x`; nếu `k − x` đã có trong set thì tìm thấy; nếu không, thêm `x` vào set. Mỗi bước `O(1)`, tổng `O(n)`.',
      syntax: `${F}cpp
unordered_map<string, int> dem;
dem["an"]++;
if (dem.count("binh")) { /* có khóa */ }

unordered_set<int> daGap;
daGap.insert(5);
${F}

${F}python
from collections import Counter
dem = Counter(text.split())
da_gap = set()
${F}`,
      example: `Đếm tần suất từ trong \`"to be or not to be"\`:

| Từ | Số lần |
| --- | --- |
| to | 2 |
| be | 2 |
| or | 1 |
| not | 1 |

Từ xuất hiện nhiều nhất, khi hòa thì lấy theo thứ tự từ điển: \`be 2\`.`,
      application:
        "Từ điển tra cứu, bộ nhớ đệm (cache), đếm lượt truy cập theo IP, phát hiện trùng lặp, lưu phiên đăng nhập theo token, chỉ mục cơ sở dữ liệu, kiểm tra mật khẩu đã lộ.",
      prosCons:
        "**Ưu:** tra cứu, thêm, xóa trung bình `O(1)`.\n\n**Nhược:** không có thứ tự; tốn bộ nhớ hơn mảng; trường hợp xấu `O(n)`; hàm băm kém hoặc dữ liệu cố ý gây đụng độ làm chậm hệ thống.",
      errors:
        "- Tìm phần tử bằng `x in list` (`O(n)`) thay vì `set` (`O(1)`).\n- Dùng `map[key]` trong C++ để kiểm tra tồn tại → vô tình tạo khóa mới.\n- Bài hai số tổng k: dùng cùng một phần tử hai lần khi `x = k/2` (phải kiểm tra trước khi thêm).\n- Giả định map giữ thứ tự thêm vào.",
      takeaways:
        "- Bảng băm: khóa → ô qua hàm băm, trung bình `O(1)`.\n- Set để kiểm tra có/không, map để đếm hoặc gắn giá trị.\n- Nhiều bài `O(n²)` hạ được về `O(n)` nhờ bảng băm.",
      practice:
        "Làm trắc nghiệm, giải bài hai số có tổng k trong `O(n)` và tìm từ xuất hiện nhiều nhất.",
    },
    exercises: [
      {
        kind: "QUIZ",
        key: "quiz-hash",
        title: "Trắc nghiệm: Bảng băm",
        points: 30,
        prompt: "Ôn lại hàm băm, đụng độ và cách dùng set/map.",
        questions: [
          {
            prompt:
              "Thao tác tìm kiếm trung bình trong bảng băm có độ phức tạp?",
            options: ["O(1)", "O(log n)", "O(n)", "O(n log n)"],
            answer: 0,
            explanation: "Hàm băm chỉ thẳng tới ô cần xét.",
          },
          {
            prompt: "Đụng độ (collision) xảy ra khi?",
            options: [
              "Bảng băm rỗng",
              "Hai khóa khác nhau có cùng giá trị băm",
              "Một khóa được thêm hai lần",
              "Xóa khóa không tồn tại",
            ],
            answer: 1,
            explanation: "Hai khóa cùng rơi vào một ô.",
          },
          {
            prompt: "Separate chaining xử lý đụng độ bằng cách nào?",
            options: [
              "Bỏ khóa mới",
              "Mỗi ô lưu một danh sách các khóa",
              "Tìm ô trống kế tiếp",
              "Tăng gấp đôi khóa",
            ],
            answer: 1,
            explanation:
              "Dò ô trống kế tiếp là open addressing (linear probing).",
          },
          {
            prompt: "Cần biết từ nào xuất hiện bao nhiêu lần, nên dùng?",
            options: ["Set", "Map/dict từ → số lần", "Stack", "Queue"],
            answer: 1,
            explanation: "Map gắn mỗi khóa với một giá trị đếm.",
          },
          {
            prompt:
              "Bài hai số có tổng k: kiểm tra k − x trong set có độ phức tạp tổng?",
            options: ["O(n²)", "O(n log n)", "O(n)", "O(1)"],
            answer: 2,
            explanation: "Duyệt n phần tử, mỗi lần tra set O(1).",
          },
        ],
      },
      code(
        "two-sum",
        "Hai số có tổng bằng k",
        Difficulty.MEDIUM,
        "Dòng 1: `n k` (2 ≤ n ≤ 2·10⁴, |k| ≤ 2·10⁹). Dòng 2: `n` số nguyên (|giá trị| ≤ 10⁹). In `YES` nếu có hai vị trí **khác nhau** `i ≠ j` mà `a[i] + a[j] = k`, ngược lại in `NO`.",
        cases(
          [
            "5 9\n2 7 11 15 1",
            "3 10\n5 1 2",
            "2 10\n5 5",
            "4 0\n-3 1 3 7",
            arrayInput(
              randomArray(91, 20000, 1, 1_000_000_000).map((v) => v * 2),
              "20000 999999999",
            ),
            (() => {
              const a = randomArray(92, 20000, -1_000_000_000, 1_000_000_000);
              return arrayInput(a, `20000 ${a[123] + a[19876]}`);
            })(),
          ],
          twoSum,
        ),
        120,
      ),
      code(
        "top-word",
        "Từ xuất hiện nhiều nhất",
        Difficulty.MEDIUM,
        "Đọc một dòng gồm các từ chữ thường không dấu, cách nhau một hoặc nhiều dấu cách (tối đa 3000 từ, mỗi từ dài ≤ 20). In ra từ xuất hiện nhiều nhất và số lần, cách nhau một dấu cách. Nếu nhiều từ cùng số lần, in từ nhỏ nhất theo thứ tự từ điển.",
        cases(
          [
            "to be or not to be",
            "mot",
            "b a c a b",
            "xin   chao   xin chao   ban",
            bigWords,
          ],
          topWord,
        ),
        120,
      ),
      {
        kind: "HANDWRITTEN",
        key: "essay-hash",
        title: "Tự luận: Mô phỏng bảng băm",
        difficulty: Difficulty.MEDIUM,
        points: 50,
        prompt:
          "Bảng băm có 7 ô (0 đến 6), hàm băm `h(x) = x mod 7`. Trình bày trên giấy rồi chụp ảnh nộp bài:\n\n1. Lần lượt thêm các khóa `10, 22, 31, 4, 15, 28, 17` theo cách **nối chuỗi**. Vẽ bảng kết quả.\n2. Thêm cùng các khóa đó theo cách **dò tuyến tính** (đụng độ thì thử ô kế tiếp, quay vòng). Vẽ bảng và ghi số lần dò của mỗi khóa.\n3. Viết giả mã giải bài hai số có tổng k trong `O(n)` và giải thích vì sao phải kiểm tra trước rồi mới thêm phần tử vào set.",
        rubric:
          "Tổng 10 điểm.\n- Câu 1 (3 điểm): ô 0: 28; ô 1: 22, 15; ô 3: 10, 31, 17; ô 4: 4 (thiếu/sai mỗi ô trừ 0,75 điểm).\n- Câu 2 (4 điểm): 10→3, 22→1, 31→3 đụng nên 4, 4→4 đụng nên 5, 15→1 đụng nên 2, 28→0, 17→3 dò 4, 5 rồi 6 (đúng vị trí 3 điểm, đúng số lần dò 1 điểm).\n- Câu 3 (3 điểm): giả mã đúng (2 điểm); kiểm tra trước để không ghép một phần tử với chính nó khi x = k/2 (1 điểm).",
      },
    ],
  },
  {
    title: "Quy hoạch động nhập môn",
    description:
      "Lưu lại kết quả bài con: leo cầu thang và dãy con liên tiếp có tổng lớn nhất.",
    videos: [
      ongDev("aMU6j0qb5U8", "Dynamic Programming: ví dụ Fibonacci tối ưu"),
      titv(
        "N1KcC25nDSg",
        "Bài 11: Thuật toán tìm dãy con liên tục có tổng lớn nhất",
      ),
    ],
    parts: {
      overview:
        "Fibonacci đệ quy thuần tính `fib(40)` mất vài giây vì lặp lại cùng một việc hàng triệu lần. **Quy hoạch động** nhớ lại kết quả để mỗi bài con chỉ giải một lần.\n\n**Mục tiêu:** nhận ra bài con, viết công thức truy hồi và cài bằng mảng hoặc hai biến.",
      concept:
        "**Quy hoạch động** (dynamic programming, DP) giải bài toán lớn bằng cách kết hợp lời giải của các **bài toán con chồng lấp**, mỗi bài con được tính một lần và **lưu lại**. Bài toán phải có **cấu trúc con tối ưu**: lời giải tối ưu được tạo từ lời giải tối ưu của bài con.",
      characteristics:
        "- Cần xác định: **trạng thái** (`dp[i]` nghĩa là gì), **công thức truy hồi**, **trường hợp cơ sở**, **thứ tự tính**.\n- Đổi thời gian lấy bộ nhớ: lưu bảng kết quả.\n- Thường giảm từ `O(2ⁿ)` xuống `O(n)` hoặc `O(n²)`.\n- Khi `dp[i]` chỉ phụ thuộc vài giá trị trước, có thể bỏ mảng, giữ vài biến.",
      classification:
        "- **Top-down (ghi nhớ, memoization):** đệ quy + lưu kết quả vào bảng.\n- **Bottom-up (lập bảng, tabulation):** vòng lặp tính từ bài nhỏ nhất lên.\n- Dạng bài nhập môn: đếm số cách (leo cầu thang), tối ưu (dãy con tổng lớn nhất, cái túi), chuỗi (dãy con chung dài nhất).",
      mechanism:
        "Leo cầu thang mỗi lần 1 hoặc 2 bậc: để đứng ở bậc i, bước cuối xuất phát từ bậc i−1 hoặc i−2, nên `dp[i] = dp[i−1] + dp[i−2]`, `dp[0] = dp[1] = 1`.\n\nDãy con liên tiếp tổng lớn nhất (thuật toán Kadane): gọi `cur` là tổng lớn nhất của dãy con **kết thúc tại i**; `cur = max(a[i], cur + a[i])`, đáp án là `max` mọi `cur`.",
      syntax: `${F}cpp
const long long MOD = 1e9 + 7;
vector<long long> dp(n + 1);
dp[0] = dp[1] = 1;
for (int i = 2; i <= n; i++)
    dp[i] = (dp[i - 1] + dp[i - 2]) % MOD;
${F}`,
      example: `Kadane trên \`[-2, 1, -3, 4, -1, 2, 1, -5, 4]\`:

| a[i] | -2 | 1 | -3 | 4 | -1 | 2 | 1 | -5 | 4 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| cur | -2 | 1 | -2 | 4 | 3 | 5 | **6** | 1 | 5 |

Đáp án 6, ứng với dãy con \`[4, -1, 2, 1]\`.

${F}python
best = cur = a[0]
for x in a[1:]:
    cur = max(x, cur + x)
    best = max(best, cur)
${F}`,
      application:
        "Tối ưu lợi nhuận đầu tư theo ngày, chọn hàng cho vào balo (bài toán cái túi), so sánh hai đoạn văn bản (diff, sửa lỗi chính tả), tìm đường đi ngắn nhất trên lưới, nhận dạng giọng nói.",
      prosCons:
        "**Ưu:** biến bài toán mũ thành đa thức; lời giải ngắn khi đã tìm ra công thức.\n\n**Nhược:** khó nhận ra trạng thái và công thức; tốn bộ nhớ cho bảng; sai trường hợp cơ sở là sai toàn bộ.",
      errors:
        "- Sai trường hợp cơ sở, ví dụ `dp[0] = 0` trong bài leo cầu thang.\n- Quên lấy modulo, kết quả tràn số.\n- Kadane khởi tạo `best = 0` → sai khi mọi phần tử đều âm.\n- Tính theo thứ tự sai: dùng `dp[i]` trước khi nó được tính.",
      takeaways:
        "- DP = bài con chồng lấp + lưu kết quả.\n- Bốn bước: trạng thái, truy hồi, cơ sở, thứ tự tính.\n- Kadane tìm dãy con liên tiếp tổng lớn nhất trong `O(n)`.",
      practice:
        "Làm trắc nghiệm, giải bài leo cầu thang (n tới 10⁵, lấy modulo) và dãy con liên tiếp tổng lớn nhất.",
    },
    exercises: [
      {
        kind: "QUIZ",
        key: "quiz-dp",
        title: "Trắc nghiệm: Quy hoạch động",
        points: 30,
        prompt: "Nhận diện và xây dựng lời giải quy hoạch động.",
        questions: [
          {
            prompt:
              "Hai đặc điểm của bài toán giải được bằng quy hoạch động là?",
            options: [
              "Dữ liệu đã sắp xếp và không trùng",
              "Bài con chồng lấp và cấu trúc con tối ưu",
              "Dùng stack và queue",
              "Chỉ có số nguyên dương",
            ],
            answer: 1,
            explanation:
              "Bài con lặp lại nhiều lần và lời giải tối ưu ghép từ lời giải con tối ưu.",
          },
          {
            prompt: "Leo cầu thang 1 hoặc 2 bậc, có bao nhiêu cách lên bậc 5?",
            options: ["5", "7", "8", "13"],
            answer: 2,
            explanation: "dp = 1, 1, 2, 3, 5, 8.",
          },
          {
            prompt: "Fibonacci dùng ghi nhớ (memoization) có độ phức tạp?",
            options: ["O(2ⁿ)", "O(n)", "O(n²)", "O(log n)"],
            answer: 1,
            explanation: "Mỗi fib(i) chỉ tính một lần.",
          },
          {
            prompt: "Kadane với dãy [-5, -2, -8], đáp án đúng là?",
            options: ["0", "-2", "-5", "-15"],
            answer: 1,
            explanation:
              "Dãy con phải khác rỗng; lớn nhất là chính phần tử -2.",
          },
          {
            prompt: "Bottom-up khác top-down ở điểm nào?",
            options: [
              "Bottom-up dùng vòng lặp từ bài nhỏ lên, top-down dùng đệ quy có ghi nhớ",
              "Bottom-up luôn sai",
              "Top-down không lưu kết quả",
              "Không khác gì",
            ],
            answer: 0,
            explanation:
              "Cả hai đều lưu kết quả bài con, chỉ khác thứ tự tính.",
          },
        ],
      },
      code(
        "climb-stairs",
        "Leo cầu thang",
        Difficulty.MEDIUM,
        "Cầu thang có `n` bậc (1 ≤ n ≤ 10⁵). Mỗi bước bạn leo 1 hoặc 2 bậc. Có bao nhiêu cách leo lên đúng bậc `n`? In kết quả **modulo 10⁹ + 7**.",
        cases(["3", "1", "2", "5", "10", "45", "1000", "100000"], stairs),
        120,
      ),
      code(
        "max-subarray",
        "Dãy con liên tiếp tổng lớn nhất",
        Difficulty.MEDIUM,
        "Dòng 1: `n` (1 ≤ n ≤ 2·10⁴). Dòng 2: `n` số nguyên (|giá trị| ≤ 10⁹). In ra tổng lớn nhất của một dãy con **liên tiếp, khác rỗng**.\n\nTổng có thể vượt 2·10⁹, cần số nguyên 64 bit. Thử mọi đoạn `O(n²)` sẽ quá thời gian ở test lớn.",
        cases(
          [
            "9\n-2 1 -3 4 -1 2 1 -5 4",
            "3\n-5 -2 -8",
            "1\n7",
            "5\n1 2 3 4 5",
            arrayInput(randomArray(101, 20000, -1_000_000_000, 1_000_000_000)),
            arrayInput(randomArray(102, 20000, -1_000_000_000, 990_000_000)),
          ],
          maxSubarray,
        ),
        150,
      ),
      {
        kind: "HANDWRITTEN",
        key: "essay-dp",
        title: "Tự luận: Xây dựng công thức quy hoạch động",
        difficulty: Difficulty.HARD,
        points: 60,
        prompt:
          "Trình bày trên giấy rồi chụp ảnh nộp bài:\n\nCó các đồng xu mệnh giá `1, 3, 4`. Cần đổi số tiền `n` với **ít đồng xu nhất**.\n\n1. Thuật toán tham lam (luôn lấy đồng lớn nhất có thể) cho n = 6 ra mấy đồng? Có tối ưu không?\n2. Định nghĩa trạng thái `dp[i]`, viết công thức truy hồi và trường hợp cơ sở.\n3. Lập bảng `dp[0..10]` và cho biết `dp[10]`.",
        rubric:
          "Tổng 10 điểm.\n- Câu 1 (2 điểm): tham lam lấy 4 + 1 + 1 = 3 đồng, không tối ưu vì 3 + 3 = 2 đồng.\n- Câu 2 (4 điểm): dp[i] là số đồng ít nhất để đổi i (1 điểm); dp[i] = 1 + min(dp[i−1], dp[i−3], dp[i−4]) với chỉ số không âm (2 điểm); dp[0] = 0 (1 điểm).\n- Câu 3 (4 điểm): dp = 0, 1, 2, 1, 1, 2, 2, 2, 2, 3, 3 (3 điểm); dp[10] = 3, ví dụ 4 + 3 + 3 (1 điểm).",
      },
    ],
  },
  {
    title: "Tổng kết và học tiếp",
    description:
      "Ôn lại toàn bộ lộ trình và định hướng phần nâng cao: cây, đồ thị.",
    videos: [
      ongDev(
        "eHoATJEDtww",
        "Cấu trúc dữ liệu và thuật toán #16: Tree (học tiếp)",
      ),
      ongDev(
        "8TD0imC-Y-E",
        "Cấu trúc dữ liệu và thuật toán #29: Giới thiệu đồ thị (học tiếp)",
      ),
    ],
    content: `# Tổng kết và học tiếp

Bạn đã đi qua 9 chủ đề nền tảng của **Cấu trúc dữ liệu và giải thuật**.

## Bảng tóm tắt

| Chủ đề | Ý chính | Độ phức tạp tiêu biểu |
| --- | --- | --- |
| Độ phức tạp | Big-O, 10⁸ phép tính/giây | |
| Tìm kiếm | Tuần tự, nhị phân | O(n), O(log n) |
| Sắp xếp cơ bản | Bubble, selection, insertion | O(n²) |
| Sắp xếp nâng cao | Merge, quick, hàm sort | O(n log n) |
| Đệ quy | Cơ sở + bước đệ quy | Tùy bài |
| Stack | LIFO | O(1) mỗi thao tác |
| Queue | FIFO | O(1) mỗi thao tác |
| Danh sách liên kết | Nút + con trỏ | Thêm đầu O(1), truy cập O(n) |
| Bảng băm | Khóa → ô | Trung bình O(1) |
| Quy hoạch động | Lưu kết quả bài con | Thường O(n) hoặc O(n²) |

## Học tiếp

- **Cây:** cây nhị phân, cây tìm kiếm nhị phân, heap.
- **Đồ thị:** biểu diễn, BFS, DFS, đường đi ngắn nhất.
- Tham gia các cuộc thi trên nền tảng để luyện phản xạ chọn cấu trúc dữ liệu.

Làm bài trắc nghiệm tổng hợp bên dưới để hoàn thành lộ trình.`,
    exercises: [
      {
        kind: "QUIZ",
        key: "quiz-final",
        title: "Trắc nghiệm tổng hợp CTDL & giải thuật",
        points: 60,
        prompt:
          "Mười câu chọn cấu trúc dữ liệu và thuật toán cho tình huống thực tế.",
        questions: [
          {
            prompt:
              "Cần kiểm tra nhanh một email đã đăng ký hay chưa trong 10 triệu email. Dùng?",
            options: [
              "Mảng và tìm tuần tự",
              "Bảng băm (set)",
              "Stack",
              "Danh sách liên kết",
            ],
            answer: 1,
            explanation: "Set tra cứu trung bình O(1).",
          },
          {
            prompt: "Tính năng Undo của trình soạn thảo nên dùng?",
            options: ["Queue", "Stack", "Bảng băm", "Mảng đã sắp xếp"],
            answer: 1,
            explanation: "Thao tác gần nhất được hoàn tác trước: LIFO.",
          },
          {
            prompt:
              "Máy in nhận lệnh in từ nhiều người, in theo thứ tự gửi. Dùng?",
            options: ["Stack", "Queue", "Cây", "Bảng băm"],
            answer: 1,
            explanation: "Ai gửi trước in trước: FIFO.",
          },
          {
            prompt:
              'Mảng 10⁶ số đã sắp xếp, cần trả lời 10⁵ truy vấn "x có trong mảng không". Cách nào?',
            options: [
              "Tìm tuần tự mỗi truy vấn",
              "Tìm kiếm nhị phân mỗi truy vấn",
              "Sắp xếp lại mỗi truy vấn",
              "Bubble sort",
            ],
            answer: 1,
            explanation: "10⁵ × 20 phép so sánh, thay vì 10¹¹.",
          },
          {
            prompt:
              "n ≤ 10⁵, thời gian 1 giây. Độ phức tạp nào KHÔNG chấp nhận được?",
            options: ["O(n)", "O(n log n)", "O(n²)", "O(n √n)"],
            answer: 2,
            explanation: "10¹⁰ phép tính quá chậm.",
          },
          {
            prompt:
              "Sắp xếp danh sách học viên theo điểm, cần giữ thứ tự đăng ký khi bằng điểm. Chọn?",
            options: [
              "Quick sort",
              "Selection sort",
              "Merge sort",
              "Heap sort",
            ],
            answer: 2,
            explanation: "Merge sort ổn định và O(n log n).",
          },
          {
            prompt: "Hàm đệ quy bị stack overflow. Nguyên nhân hợp lý nhất?",
            options: [
              "Thiếu điều kiện dừng",
              "Dùng nhiều biến",
              "Mảng chưa sắp xếp",
              "Dùng bảng băm",
            ],
            answer: 0,
            explanation: "Không có điểm dừng nên gọi mãi.",
          },
          {
            prompt:
              "Thêm và xóa liên tục ở đầu dãy, ít khi truy cập theo chỉ số. Cấu trúc phù hợp?",
            options: [
              "Mảng tĩnh",
              "Danh sách liên kết",
              "Mảng đã sắp xếp",
              "Ma trận",
            ],
            answer: 1,
            explanation: "Thêm/xóa đầu O(1).",
          },
          {
            prompt: "Fibonacci thứ 50 tính nhanh bằng cách nào?",
            options: [
              "Đệ quy thuần",
              "Quy hoạch động lưu kết quả",
              "Tìm kiếm nhị phân",
              "Sắp xếp",
            ],
            answer: 1,
            explanation: "Mỗi số tính một lần: O(n).",
          },
          {
            prompt:
              "Tìm đường đi ít bước nhất trong mê cung dạng lưới nên dùng?",
            options: [
              "DFS với stack",
              "BFS với queue",
              "Bubble sort",
              "Bảng băm",
            ],
            answer: 1,
            explanation:
              "BFS duyệt theo lớp nên lần đầu tới đích là đường ngắn nhất (học ở phần đồ thị).",
          },
        ],
      },
    ],
  },
];

runSeed({
  slug: "cau-truc-du-lieu-giai-thuat",
  exercisePrefix: "seed-dsa",
  title: "Cấu trúc dữ liệu và giải thuật",
  description:
    "Từ Big-O đến quy hoạch động: tìm kiếm, sắp xếp, đệ quy, stack, queue, danh sách liên kết, bảng băm. Mỗi bài có video bài giảng, trắc nghiệm, bài code chấm tự động (làm bằng Python, C++, Java hoặc JavaScript) và tự luận.",
  difficulty: Difficulty.MEDIUM,
  tags: ["CTDL", "giải thuật", "thuật toán"],
  estimatedMinutes: 20 * 60,
  coverTheme: "orange",
  rooms: ROOMS,
});
