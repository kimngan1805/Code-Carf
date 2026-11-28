import { Difficulty } from "@prisma/client";

/**
 * Đề thi chặng 4, 5, 6 của "Đảo Kho Báu C++" (khớp với ISLAND_STAGES trong
 * src/features/contest-showcase/catalog.ts). Đề đọc từ stdin, in ra stdout để chấm bằng test case.
 */
export type StageExercise = {
  title: string;
  prompt: string;
  difficulty: Difficulty;
  testCases: { input: string; expected: string; isHidden: boolean }[];
};

const visible = (input: string, expected: string) => ({
  input,
  expected,
  isHidden: false,
});
const hidden = (input: string, expected: string) => ({
  input,
  expected,
  isHidden: true,
});

/** Chặng 4 · Đền hàm: hoàn thành các hàm còn dang dở. */
const TEMPLE_OF_FUNCTIONS: StageExercise[] = [
  {
    title: "Chặng 4 · Bài 1: Giai thừa",
    difficulty: Difficulty.EASY,
    prompt: `Hoàn thành hàm giaiThua để chương trình in ra n!.

long long giaiThua(int n) {
    // TODO: trả về n! (quy ước 0! = 1)
}

int main() {
    int n;
    std::cin >> n;
    std::cout << giaiThua(n);
}

Đầu vào: một số nguyên n (0 ≤ n ≤ 20).
Đầu ra: giá trị n!.`,
    testCases: [
      visible("5", "120"),
      hidden("0", "1"),
      hidden("20", "2432902008176640000"),
    ],
  },
  {
    title: "Chặng 4 · Bài 2: Số nguyên tố",
    difficulty: Difficulty.EASY,
    prompt: `Hoàn thành hàm laSoNguyenTo.

bool laSoNguyenTo(int n) {
    // TODO: trả về true nếu n là số nguyên tố
}

int main() {
    int n;
    std::cin >> n;
    std::cout << (laSoNguyenTo(n) ? "YES" : "NO");
}

Đầu vào: một số nguyên n (1 ≤ n ≤ 10^9).
Đầu ra: YES nếu n là số nguyên tố, ngược lại NO.`,
    testCases: [
      visible("7", "YES"),
      hidden("1", "NO"),
      hidden("1000000007", "YES"),
      hidden("999999999", "NO"),
    ],
  },
  {
    title: "Chặng 4 · Bài 3: Phần tử lớn nhất",
    difficulty: Difficulty.EASY,
    prompt: `Hoàn thành hàm timMax trả về phần tử lớn nhất của mảng.

int timMax(const std::vector<int>& a) {
    // TODO
}

Đầu vào: dòng đầu là n (1 ≤ n ≤ 10^5), dòng sau gồm n số nguyên (|a[i]| ≤ 10^9).
Đầu ra: phần tử lớn nhất.`,
    testCases: [
      visible("5\n3 9 -2 7 9", "9"),
      hidden("1\n-5", "-5"),
      hidden("4\n-8 -3 -10 -4", "-3"),
    ],
  },
  {
    title: "Chặng 4 · Bài 4: Đảo ngược chuỗi",
    difficulty: Difficulty.EASY,
    prompt: `Hoàn thành hàm daoNguoc trả về chuỗi đảo ngược của s.

std::string daoNguoc(const std::string& s) {
    // TODO
}

Đầu vào: một chuỗi s không chứa khoảng trắng (1 ≤ |s| ≤ 1000).
Đầu ra: chuỗi s viết ngược.`,
    testCases: [
      visible("khobau", "uabohk"),
      hidden("a", "a"),
      hidden("CodeCarf2026", "6202fraCedoC"),
    ],
  },
  {
    title: "Chặng 4 · Bài 5: Ước chung lớn nhất",
    difficulty: Difficulty.MEDIUM,
    prompt: `Hoàn thành hàm ucln bằng thuật toán Euclid.

long long ucln(long long a, long long b) {
    // TODO
}

Đầu vào: hai số nguyên dương a, b (≤ 10^18).
Đầu ra: ước chung lớn nhất của a và b.`,
    testCases: [
      visible("12 18", "6"),
      hidden("17 5", "1"),
      hidden("1000000000000000000 250000000000000000", "250000000000000000"),
    ],
  },
];

/** Chặng 5 · Hang con trỏ: tìm và sửa lỗi con trỏ, tham chiếu, cấp phát bộ nhớ. */
const POINTER_CAVE: StageExercise[] = [
  {
    title: "Chặng 5 · Bài 1: Hoán đổi không thành",
    difficulty: Difficulty.EASY,
    prompt: `Đoạn code dưới đây muốn hoán đổi hai số nhưng in ra sai. Hãy sửa lỗi.

void hoanDoi(int a, int b) {
    int t = a;
    a = b;
    b = t;
}

int main() {
    int x, y;
    std::cin >> x >> y;
    hoanDoi(x, y);
    std::cout << x << " " << y;
}

Đầu vào: hai số nguyên x, y.
Đầu ra: y và x (sau khi đã hoán đổi), cách nhau một dấu cách.`,
    testCases: [
      visible("3 8", "8 3"),
      hidden("-1 0", "0 -1"),
      hidden("5 5", "5 5"),
    ],
  },
  {
    title: "Chặng 5 · Bài 2: Con trỏ đi quá xa",
    difficulty: Difficulty.EASY,
    prompt: `Hàm tinhTong dùng con trỏ để cộng các phần tử nhưng đọc lố ra ngoài mảng. Hãy sửa lỗi.

long long tinhTong(int* p, int n) {
    long long tong = 0;
    for (int i = 0; i <= n; i++) {
        tong += *(p + i);
    }
    return tong;
}

Đầu vào: dòng đầu là n (1 ≤ n ≤ 10^5), dòng sau gồm n số nguyên.
Đầu ra: tổng các phần tử.`,
    testCases: [
      visible("3\n1 2 3", "6"),
      hidden("1\n-7", "-7"),
      hidden("4\n1000000000 1000000000 1000000000 1000000000", "4000000000"),
    ],
  },
  {
    title: "Chặng 5 · Bài 3: Mảng động in ngược",
    difficulty: Difficulty.MEDIUM,
    prompt: `Chương trình cấp phát mảng động rồi in ngược nhưng bị lỗi kích thước và rò rỉ bộ nhớ. Hãy sửa lỗi.

int main() {
    int n;
    std::cin >> n;
    int* a = new int[n - 1];
    for (int i = 0; i < n; i++) std::cin >> a[i];
    for (int i = n; i > 0; i--) std::cout << a[i] << " ";
    // quên giải phóng bộ nhớ
}

Đầu vào: dòng đầu là n (1 ≤ n ≤ 10^5), dòng sau gồm n số nguyên.
Đầu ra: các phần tử theo thứ tự ngược lại, cách nhau một dấu cách.`,
    testCases: [
      visible("4\n1 2 3 4", "4 3 2 1"),
      hidden("1\n9", "9"),
      hidden("5\n-1 0 1 0 -1", "-1 0 1 0 -1"),
    ],
  },
  {
    title: "Chặng 5 · Bài 4: Tham chiếu bị bỏ quên",
    difficulty: Difficulty.MEDIUM,
    prompt: `Hàm congDon cần cộng k vào biến x của hàm main, nhưng x không đổi. Hãy sửa lỗi.

void congDon(int x, int k) {
    x += k;
}

int main() {
    int x, k;
    std::cin >> x >> k;
    congDon(x, k);
    std::cout << x;
}

Đầu vào: hai số nguyên x, k.
Đầu ra: giá trị của x sau khi gọi congDon.`,
    testCases: [
      visible("10 5", "15"),
      hidden("0 0", "0"),
      hidden("-20 7", "-13"),
    ],
  },
];

/** Chặng 6 · Tượng đá OOP: thiết kế lớp, kế thừa và đa hình. */
const OOP_STATUE: StageExercise[] = [
  {
    title: "Chặng 6 · Bài 1: Lớp hình chữ nhật",
    difficulty: Difficulty.MEDIUM,
    prompt: `Viết lớp HinhChuNhat có hai thuộc tính rộng, dài và hai phương thức dienTich(), chuVi().

class HinhChuNhat {
    // TODO: thuộc tính, hàm khởi tạo, dienTich(), chuVi()
};

Đầu vào: hai số nguyên dương rộng, dài (≤ 10^4).
Đầu ra: diện tích và chu vi, cách nhau một dấu cách.`,
    testCases: [
      visible("3 4", "12 14"),
      hidden("1 1", "1 4"),
      hidden("10000 10000", "100000000 40000"),
    ],
  },
  {
    title: "Chặng 6 · Bài 2: Vườn hình học đa hình",
    difficulty: Difficulty.HARD,
    prompt: `Xây dựng lớp cơ sở Hinh có phương thức ảo dienTich(), và hai lớp con HinhTron (bán kính r), HinhVuong (cạnh a).
Đọc danh sách hình, lưu bằng con trỏ lớp cơ sở và in diện tích từng hình.

class Hinh {
public:
    virtual double dienTich() const = 0;
    virtual ~Hinh() = default;
};

Đầu vào: dòng đầu là n (1 ≤ n ≤ 100). Mỗi dòng sau là "C r" (hình tròn) hoặc "S a" (hình vuông).
Đầu ra: diện tích từng hình trên một dòng, làm tròn 2 chữ số thập phân. Dùng π = 3.14159265358979.`,
    testCases: [
      visible("2\nC 1\nS 2", "3.14\n4.00"),
      hidden("1\nC 10", "314.16"),
      hidden("3\nS 1\nC 2\nS 5", "1.00\n12.57\n25.00"),
    ],
  },
];

export type SeedStage = {
  /** Số chặng trên bản đồ (khớp ISLAND_STAGES). */
  number: number;
  name: string;
  /** Thời gian làm chặng, tính từ lúc thí sinh vào chặng. */
  durationMinutes: number;
  exercises: StageExercise[];
};

/** Các chặng có đề, làm lần lượt; mỗi chặng có đồng hồ riêng. */
export const TREASURE_ISLAND_STAGES: SeedStage[] = [
  {
    number: 4,
    name: "Đền hàm",
    durationMinutes: 30,
    exercises: TEMPLE_OF_FUNCTIONS,
  },
  {
    number: 5,
    name: "Hang con trỏ",
    durationMinutes: 25,
    exercises: POINTER_CAVE,
  },
  {
    number: 6,
    name: "Tượng đá OOP",
    durationMinutes: 40,
    exercises: OOP_STATUE,
  },
];

/** Thứ tự làm bài: hết chặng 4 rồi đến chặng 5, chặng 6. */
export const TREASURE_ISLAND_EXERCISES: StageExercise[] =
  TREASURE_ISLAND_STAGES.flatMap((stage) => stage.exercises);

export const TREASURE_ISLAND_SLUG = "dao-kho-bau-cpp";
