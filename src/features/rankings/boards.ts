import {
  CONTEST_FORMATS,
  type ContestFormatKey,
} from "@/features/contest-showcase/catalog";

/**
 * Bảng xếp hạng công khai theo từng hình thức thi đấu.
 * Chỉ là dữ liệu mẫu để dựng giao diện, chưa nối backend.
 */

export type Entrant = "person" | "team" | "class";

export interface BoardColumn {
  key: string;
  label: string;
}

export interface BoardRow {
  rank: number;
  name: string;
  /** Dòng phụ: trường, thành viên đội, giảng viên lớp... */
  detail: string;
  score: string;
  /** Huy hiệu ngắn cạnh tên, ví dụ bậc rank. */
  badge?: string;
  /** Số bậc tăng (+) hay giảm (-) so với kỳ trước. */
  trend: number;
  cells: Record<string, string>;
}

export interface Board {
  format: ContestFormatKey;
  title: string;
  blurb: string;
  /** Cách leo bảng, hiện ở cột bên. */
  rule: string;
  entrant: Entrant;
  metric: string;
  columns: BoardColumn[];
  rows: BoardRow[];
}

const PEOPLE = [
  ["Nguyễn Minh Khôi", "ĐH Bách khoa Đà Nẵng"],
  ["Trần Thảo Vy", "VKU"],
  ["Lê Hoàng Phúc", "ĐH Sư phạm"],
  ["Phạm Gia Hân", "ĐH Duy Tân"],
  ["Võ Đức Anh", "VKU"],
  ["Đặng Ngọc Mai", "ĐH Kinh tế"],
  ["Huỳnh Quốc Bảo", "ĐH Bách khoa Đà Nẵng"],
  ["Bùi Khánh Linh", "ĐH FPT"],
  ["Đỗ Thành Nam", "VKU"],
  ["Ngô Tuệ Nhi", "ĐH Duy Tân"],
] as const;

const TEAMS = [
  ["Bug Busters", "Khôi, Vy, Phúc, Hân"],
  ["Null Pointer", "Đức Anh, Mai, Bảo"],
  ["Stack Overflowers", "Linh, Nam, Nhi, Tú"],
  ["Hello World", "Quân, Trang, Duy"],
  ["Recursion Squad", "Hiếu, My, Khoa, Lan"],
  ["Git Push Force", "Tâm, Long, Yến"],
  ["Byte Me", "Sơn, Hà, Kiên, Thư"],
  ["Semicolon;", "Vinh, Ngân, Đạt"],
  ["404 Not Found", "Phong, Uyên, Lộc"],
  ["Ctrl Alt Win", "Tín, Chi, Hưng, Ly"],
] as const;

const CLASSES = [
  ["21IT1", "GV. Trần Văn Hùng"],
  ["22SE2", "GV. Lê Thị Hoa"],
  ["21AD1", "GV. Nguyễn Văn Bình"],
  ["23IT3", "GV. Phạm Thu Trang"],
  ["22IT1", "GV. Võ Minh Tuấn"],
  ["21SE1", "GV. Đặng Thị Lan"],
  ["23AI1", "GV. Huỳnh Văn Lực"],
  ["22DA2", "GV. Bùi Thị Ngọc"],
  ["23SE1", "GV. Ngô Văn Sang"],
  ["21IT4", "GV. Đỗ Thị Hạnh"],
] as const;

const TRENDS = [0, 2, -1, 1, 3, -2, 0, 1, -1, 4];
const vi = new Intl.NumberFormat("vi-VN");
const num = (value: number) => vi.format(value);

function build(
  pool: readonly (readonly [string, string])[],
  row: (index: number) => Omit<BoardRow, "rank" | "name" | "detail" | "trend">,
): BoardRow[] {
  return pool.map(([name, detail], index) => ({
    rank: index + 1,
    name,
    detail,
    trend: TRENDS[index],
    ...row(index),
  }));
}

const TIERS = [
  "Cao thủ",
  "Cao thủ",
  "Kim cương",
  "Kim cương",
  "Kim cương",
  "Bạch kim",
  "Bạch kim",
  "Bạch kim",
  "Vàng",
  "Vàng",
];

export const BOARDS: Record<ContestFormatKey, Board> = {
  solo: {
    format: "solo",
    title: "Thợ săn nhiệm vụ",
    blurb: "Tổng điểm tích lũy từ các nhiệm vụ cá nhân trong mùa.",
    rule: "Mỗi nhiệm vụ hoàn thành cộng điểm theo độ khó. Làm đúng ngay lần đầu được thưởng thêm.",
    entrant: "person",
    metric: "Điểm",
    columns: [
      { key: "done", label: "Nhiệm vụ" },
      { key: "accuracy", label: "Chính xác" },
    ],
    rows: build(PEOPLE, (i) => ({
      score: num(9840 - i * 612 - i * i * 9),
      cells: { done: String(64 - i * 4), accuracy: `${96 - i * 2}%` },
    })),
  },
  duel: {
    format: "duel",
    title: "Đấu sĩ tay đôi",
    blurb: "Xếp theo điểm Elo: thắng người mạnh hơn được cộng nhiều hơn.",
    rule: "Thắng cộng Elo, thua bị trừ. Đối thủ càng mạnh, điểm cộng càng cao.",
    entrant: "person",
    metric: "Elo",
    columns: [
      { key: "record", label: "Thắng - Thua" },
      { key: "rate", label: "Tỉ lệ thắng" },
    ],
    rows: build(PEOPLE, (i) => {
      const win = 48 - i * 3;
      const loss = 9 + i * 2;
      return {
        score: num(2140 - i * 47),
        cells: {
          record: `${win} - ${loss}`,
          rate: `${Math.round((win / (win + loss)) * 100)}%`,
        },
      };
    }),
  },
  team: {
    format: "team",
    title: "Chiến trường đội",
    blurb: "Các đội mạnh nhất qua những trận đấu nhóm trong mùa.",
    rule: "Điểm đội là tổng điểm các trận. Đội thắng trận nhận thêm điểm thưởng.",
    entrant: "team",
    metric: "Điểm đội",
    columns: [
      { key: "wins", label: "Trận thắng" },
      { key: "solved", label: "Bài giải" },
    ],
    rows: build(TEAMS, (i) => ({
      score: num(15200 - i * 980),
      cells: { wins: String(18 - i), solved: String(142 - i * 9) },
    })),
  },
  ranked: {
    format: "ranked",
    title: "Leo hạng",
    blurb: "Bậc rank và điểm LP của mùa này, từ Vàng đến Cao thủ.",
    rule: "Đủ 100 LP thì lên bậc. Cuối mùa ai giữ bậc Cao thủ nhận danh hiệu riêng.",
    entrant: "person",
    metric: "LP",
    columns: [
      { key: "matches", label: "Trận" },
      { key: "winrate", label: "Tỉ lệ thắng" },
    ],
    rows: build(PEOPLE, (i) => ({
      score: num(980 - i * 73),
      badge: TIERS[i],
      cells: { matches: String(120 - i * 7), winrate: `${68 - i * 2}%` },
    })),
  },
  friendly: {
    format: "friendly",
    title: "Giao hữu năng nổ",
    blurb:
      "Giao hữu không tính hạng, bảng này ghi nhận những người chơi nhiều và chơi đẹp.",
    rule: "Mỗi trận giao hữu được tính một lượt. Điểm chơi đẹp do đối thủ đánh giá sau trận.",
    entrant: "person",
    metric: "Trận đã chơi",
    columns: [
      { key: "friends", label: "Bạn đấu" },
      { key: "fair", label: "Chơi đẹp" },
    ],
    rows: build(PEOPLE, (i) => ({
      score: String(86 - i * 6),
      cells: {
        friends: String(34 - i * 2),
        fair: `${(5 - i * 0.1).toFixed(1)}/5`,
      },
    })),
  },
  tournament: {
    format: "tournament",
    title: "Bảng vàng giải đấu",
    blurb: "Thành tích qua các giải đấu nhiều vòng, xếp theo huy chương.",
    rule: "Xếp theo số huy chương vàng, rồi bạc, rồi đồng. Vào chung kết được cộng điểm thành tích.",
    entrant: "person",
    metric: "Điểm thành tích",
    columns: [
      { key: "gold", label: "Vàng" },
      { key: "silver", label: "Bạc" },
      { key: "bronze", label: "Đồng" },
    ],
    rows: build(PEOPLE, (i) => {
      const gold = Math.max(0, 5 - i);
      const silver = Math.max(0, 4 - Math.floor(i / 2));
      const bronze = 2 + (i % 3);
      return {
        score: num(gold * 300 + silver * 180 + bronze * 100),
        cells: {
          gold: String(gold),
          silver: String(silver),
          bronze: String(bronze),
        },
      };
    }),
  },
  daily: {
    format: "daily",
    title: "Chuỗi ngày bền bỉ",
    blurb: "Những người giữ chuỗi thử thách mỗi ngày lâu nhất.",
    rule: "Giải thử thách trong ngày để giữ chuỗi. Bỏ một ngày là chuỗi về 0.",
    entrant: "person",
    metric: "Chuỗi hiện tại",
    columns: [
      { key: "best", label: "Dài nhất" },
      { key: "today", label: "Hôm nay" },
    ],
    rows: build(PEOPLE, (i) => ({
      score: `${214 - i * 19} ngày`,
      cells: {
        best: `${240 - i * 15} ngày`,
        today: i % 4 === 3 ? "Chưa làm" : "Đã xong",
      },
    })),
  },
  classroom: {
    format: "classroom",
    title: "Lớp dẫn đầu",
    blurb: "So tài giữa các lớp qua những bài thi giảng viên tổ chức.",
    rule: "Điểm lớp là điểm trung bình của cả lớp, nên mỗi bạn đều góp phần.",
    entrant: "class",
    metric: "Điểm TB",
    columns: [
      { key: "size", label: "Sĩ số" },
      { key: "completion", label: "Hoàn thành" },
    ],
    rows: build(CLASSES, (i) => ({
      score: (9.2 - i * 0.27).toFixed(1),
      cells: { size: String(42 - (i % 4) * 3), completion: `${98 - i * 3}%` },
    })),
  },
};

export const BOARD_ORDER = Object.keys(CONTEST_FORMATS) as ContestFormatKey[];

export const SEASON = "Mùa giải tháng 11/2026";

export function isBoardKey(value: unknown): value is ContestFormatKey {
  return typeof value === "string" && value in BOARDS;
}
