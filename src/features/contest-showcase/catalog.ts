/**
 * Bộ khung thông tin cuộc thi cho trang giới thiệu công khai.
 *
 * Giai đoạn UI: loại cuộc thi, hình thức, cấu trúc đề và phần thưởng chưa có trong
 * cơ sở dữ liệu, nên được khai báo ở đây. Cuộc thi thật nhận một hồ sơ mặc định suy ra
 * từ dữ liệu có sẵn; các cuộc thi mẫu (`sample: true`) chỉ để duyệt giao diện.
 * `npm run db:seed` tạo các cuộc thi mẫu này thành cuộc thi thật (cùng slug) để học viên
 * đăng ký được; khi đó trang giới thiệu dùng dữ liệu thật kèm hồ sơ của mẫu.
 */
import {
  getContestPhase,
  getExamPhase,
  type ContestPhase,
} from "@/features/contests/time";
import type { PublicContest } from "./service";

export const CONTEST_TYPES = {
  coding: {
    name: "Coding Contest",
    label: "Thi lập trình",
    art: "💻",
    description:
      "Giải các bài toán bằng C++, Java, Python... trong thời gian giới hạn. Hệ thống tự động chấm dựa trên test case.",
    criteria: "Độ chính xác, thời gian, hiệu suất",
    tone: "bg-brand-sky-light",
  },
  quiz: {
    name: "Knowledge Battle",
    label: "Đấu trường kiến thức",
    art: "🧠",
    description:
      "Thi trắc nghiệm về OOP, Database, Networking, hệ điều hành, Git và kiến thức lập trình.",
    criteria: "Số câu đúng và tốc độ trả lời",
    tone: "bg-brand-orange/25",
  },
  debug: {
    name: "Debug Challenge",
    label: "Thử thách sửa lỗi",
    art: "🐞",
    description:
      "Nhận một đoạn code có lỗi, tìm nguyên nhân và sửa để chương trình hoạt động đúng.",
    criteria: "Số lỗi sửa đúng và thời gian hoàn thành",
    tone: "bg-brand-sky/35",
  },
  sql: {
    name: "SQL Challenge",
    label: "Thử thách cơ sở dữ liệu",
    art: "🗄️",
    description:
      "Viết truy vấn SQL trên bộ dữ liệu cho sẵn để tìm kiếm, thống kê hoặc xử lý dữ liệu.",
    criteria: "Kết quả truy vấn và hiệu suất",
    tone: "bg-brand-blue/15",
  },
  frontend: {
    name: "Frontend Challenge",
    label: "Thử thách giao diện",
    art: "🎨",
    description: "Dựng lại một giao diện mẫu bằng HTML, CSS và JavaScript.",
    criteria: "Độ tương đồng, chức năng, responsive",
    tone: "bg-brand-orange/25",
  },
  ctf: {
    name: "CTF",
    label: "Thử thách an toàn thông tin",
    art: "🚩",
    description:
      "Giải thử thách bảo mật, mật mã, phân tích dữ liệu trong môi trường mô phỏng được cấp phép.",
    criteria: "Số flag tìm được và độ khó",
    tone: "bg-brand-sky-light",
  },
  hackathon: {
    name: "Hackathon",
    label: "Phát triển sản phẩm",
    art: "🚀",
    description:
      "Cá nhân hoặc đội nhóm xây dựng sản phẩm giải quyết một vấn đề thực tế trong thời gian quy định.",
    criteria: "Ý tưởng, kỹ thuật, tính ứng dụng, sản phẩm",
    tone: "bg-brand-sky/35",
  },
  "system-design": {
    name: "System Design",
    label: "Thiết kế hệ thống",
    art: "🏗️",
    description:
      "Thiết kế database, kiến trúc, API hoặc luồng xử lý cho một bài toán thực tế.",
    criteria: "Tính hợp lý, khả năng mở rộng, tối ưu",
    tone: "bg-brand-blue/15",
  },
} as const;
export type ContestTypeKey = keyof typeof CONTEST_TYPES;

export const CONTEST_FORMATS = {
  solo: {
    label: "Solo",
    name: "Nhiệm vụ cá nhân",
    art: "🎯",
    description: "Cá nhân tham gia và tích lũy điểm",
    tone: "bg-brand-sky-light",
  },
  duel: {
    label: "1vs1 Battle",
    name: "Đấu tay đôi",
    art: "⚔️",
    description: "Hai người đối đầu trực tiếp",
    tone: "bg-brand-orange/25",
  },
  team: {
    label: "Team Battle",
    name: "Chiến trường đội",
    art: "🛡️",
    description: "Hai hoặc nhiều đội thi với nhau",
    tone: "bg-brand-sky/35",
  },
  ranked: {
    label: "Ranked Match",
    name: "Leo hạng",
    art: "🏆",
    description: "Thi để tăng điểm xếp hạng",
    tone: "bg-brand-orange/25",
  },
  friendly: {
    label: "Friendly Match",
    name: "Giao hữu",
    art: "🤝",
    description: "Giao hữu, không ảnh hưởng xếp hạng",
    tone: "bg-brand-sky-light",
  },
  tournament: {
    label: "Tournament",
    name: "Giải đấu",
    art: "🏟️",
    description: "Giải đấu nhiều người hoặc nhiều vòng",
    tone: "bg-brand-blue/15",
  },
  daily: {
    label: "Daily Challenge",
    name: "Thử thách mỗi ngày",
    art: "📅",
    description: "Mỗi ngày một thử thách, giữ chuỗi liên tục",
    tone: "bg-brand-orange/25",
  },
  classroom: {
    label: "Classroom Contest",
    name: "Thi trong lớp",
    art: "🏫",
    description: "Giảng viên tổ chức riêng cho lớp",
    tone: "bg-brand-sky/35",
  },
} as const;
export type ContestFormatKey = keyof typeof CONTEST_FORMATS;

export const QUESTION_TYPES = {
  single: "Trắc nghiệm một đáp án",
  multiple: "Trắc nghiệm nhiều đáp án",
  "true-false": "Đúng / Sai",
  blank: "Điền vào chỗ trống",
  output: "Dự đoán kết quả code",
  completion: "Hoàn thành đoạn code",
  coding: "Viết chương trình",
  debugging: "Tìm và sửa lỗi",
  sql: "Viết truy vấn SQL",
  matching: "Nối tương ứng",
  ordering: "Sắp xếp thứ tự",
  submission: "Nộp sản phẩm",
} as const;
export type QuestionTypeKey = keyof typeof QUESTION_TYPES;

export const CONTEST_LEVELS = {
  EASY: "Cơ bản",
  MEDIUM: "Trung cấp",
  HARD: "Nâng cao",
} as const;
export type ContestLevel = keyof typeof CONTEST_LEVELS;

export type ContestSection = {
  title: string;
  questionType: QuestionTypeKey;
  count: number;
  points?: number;
};

export type ContestReward = {
  kind: "xp" | "badge" | "certificate" | "prize";
  title: string;
  note: string;
};

/** Một chặng trên bản đồ đảo; vượt qua chặng có `title` sẽ nhận danh hiệu đó. */
export type JourneyStage = {
  name: string;
  landmark: string;
  questionType: QuestionTypeKey;
  count: number;
  description: string;
  title?: string;
  /** Thời gian làm chặng (phút), có khi chặng đã có đề thật. */
  minutes?: number;
};

/**
 * Cuộc thi tổ chức theo hành trình: các chặng mở lần lượt trên bản đồ đảo.
 * Chỉ một số cuộc thi dùng cách này. `currentStage` là chặng đầu tiên có đề thật; các chặng
 * trước đó coi như đã qua. Với thí sinh, `journeyForLearner` dời chặng hiện tại theo tiến độ.
 */
export type ContestJourney = {
  island: string;
  currentStage: number;
  stages: JourneyStage[];
};

export type ContestProfile = {
  type: ContestTypeKey;
  format: ContestFormatKey;
  level?: ContestLevel;
  topics: string[];
  goals: string[];
  audience: string;
  requirements: string[];
  sections: ContestSection[];
  rounds: string[];
  rules: string[];
  scoring: string[];
  ranking: string[];
  rewards: ContestReward[];
  organizer: string;
  totalPoints?: number;
  journey?: ContestJourney;
};

export type ShowcaseEntry = {
  name: string;
  school: string;
  score?: number;
  time?: string;
};

export type ShowcaseContest = PublicContest & {
  profile: ContestProfile;
  /** Cuộc thi mẫu chỉ để duyệt giao diện, chưa có trong cơ sở dữ liệu. */
  sample: boolean;
  people: ShowcaseEntry[];
};

/** Hồ sơ mặc định cho cuộc thi thật: chỉ nói những gì hệ thống hiện đang làm. */
export function defaultProfile(contest: PublicContest): ContestProfile {
  return {
    type: "coding",
    format: "solo",
    topics: [],
    goals: [
      "Rèn tư duy giải thuật và kỹ năng viết code dưới áp lực thời gian",
      "Làm quen với cách chấm tự động bằng test case",
    ],
    audience: "Học viên Code Carf",
    requirements: ["Có tài khoản học viên", "Đăng ký trong thời gian mở"],
    sections: [
      {
        title: "Bài lập trình",
        questionType: "coding",
        count: contest.exercises,
      },
    ],
    rounds: [],
    rules: [
      "Mỗi thí sinh có một lượt thi; đồng hồ riêng bắt đầu khi bấm bắt đầu làm bài.",
      "Bài làm tự nộp khi hết giờ hoặc khi đóng làm bài.",
      "Không rời khỏi màn hình thi; vi phạm nhiều lần có thể bị dừng lượt thi.",
    ],
    scoring: [
      "Mỗi bài được chấm tự động theo test case, kể cả test ẩn.",
      "Mỗi lần nộp sai bị cộng thêm thời gian phạt.",
    ],
    ranking: [
      "Xếp theo tổng điểm từ cao xuống thấp.",
      "Bằng điểm: ít thời gian (kể cả phạt) hơn đứng trên.",
    ],
    rewards: [
      { kind: "xp", title: "XP", note: "Cộng XP theo kết quả bài làm" },
    ],
    organizer: "Code Carf",
  };
}

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

type SampleSeed = {
  slug: string;
  title: string;
  description: string;
  /** Mốc mở đăng ký và giờ bắt đầu thi, tính từ hiện tại. */
  opensIn: number;
  examIn: number;
  durationMinutes: number;
  participants: number;
  profile: ContestProfile;
};

const SAMPLE_PEOPLE: ShowcaseEntry[] = [
  { name: "Minh Anh", school: "ĐH Bách khoa", score: 96, time: "21:14" },
  {
    name: "Quốc Huy",
    school: "ĐH Khoa học Tự nhiên",
    score: 92,
    time: "24:03",
  },
  { name: "Thảo Vy", school: "ĐH Sư phạm", score: 92, time: "26:40" },
  {
    name: "Gia Bảo",
    school: "ĐH Công nghệ Thông tin",
    score: 85,
    time: "19:55",
  },
  { name: "Ngọc Hân", school: "ĐH Cần Thơ", score: 78, time: "28:12" },
];

const ISLAND_STAGES: JourneyStage[] = [
  {
    name: "Bến cảng khởi hành",
    landmark: "⚓",
    questionType: "single",
    count: 10,
    description: "Làm quen cú pháp C++: biến, kiểu dữ liệu, toán tử.",
  },
  {
    name: "Rừng biến số",
    landmark: "🌴",
    questionType: "blank",
    count: 8,
    description: "Điền vào chỗ trống để hoàn thiện khai báo và biểu thức.",
    title: "Tân thủ",
  },
  {
    name: "Hồ vòng lặp",
    landmark: "🐊",
    questionType: "output",
    count: 6,
    description: "Đọc code có for, while và đoán kết quả in ra.",
  },
  {
    name: "Đền hàm",
    landmark: "🛕",
    questionType: "completion",
    count: 5,
    description: "Hoàn thành các hàm còn dang dở sao cho chạy đúng test.",
    title: "Nhà thám hiểm",
  },
  {
    name: "Hang con trỏ",
    landmark: "🦇",
    questionType: "debugging",
    count: 4,
    description: "Tìm và sửa lỗi con trỏ, tham chiếu và cấp phát bộ nhớ.",
  },
  {
    name: "Tượng đá OOP",
    landmark: "🗿",
    questionType: "coding",
    count: 2,
    description: "Thiết kế lớp, kế thừa và đa hình cho bài toán nhỏ.",
    title: "Thợ săn bug",
  },
  {
    name: "Kim tự tháp thuật toán",
    landmark: "🏛️",
    questionType: "coding",
    count: 2,
    description: "Giải bài sắp xếp, tìm kiếm với giới hạn thời gian chặt.",
  },
  {
    name: "Núi lửa trùm cuối",
    landmark: "🌋",
    questionType: "coding",
    count: 1,
    description:
      "Bài tổng hợp mọi kiến thức trên đảo. Vượt qua để làm chủ đảo!",
    title: "Chúa đảo C++",
  },
];

const SAMPLES: SampleSeed[] = [
  {
    slug: "git-moi-ngay",
    title: "Git mỗi ngày",
    description:
      "Mỗi ngày 5 câu hỏi về Git. Giữ chuỗi 7 ngày để nhận huy hiệu.",
    opensIn: -6 * DAY,
    examIn: -5 * DAY,
    durationMinutes: 30 * 24 * 60,
    participants: 486,
    profile: {
      type: "quiz",
      format: "daily",
      level: "EASY",
      topics: ["Git"],
      goals: ["Biến Git thành thói quen qua những câu hỏi ngắn mỗi ngày"],
      audience: "Mọi học viên",
      requirements: [],
      sections: [
        {
          title: "Câu hỏi trong ngày",
          questionType: "single",
          count: 3,
          points: 30,
        },
        {
          title: "Sắp xếp lệnh Git",
          questionType: "ordering",
          count: 1,
          points: 10,
        },
        {
          title: "Đúng hay sai",
          questionType: "true-false",
          count: 1,
          points: 10,
        },
      ],
      rounds: [],
      rules: ["Thử thách mới mở lúc 0 giờ mỗi ngày.", "Mỗi ngày làm một lần."],
      scoring: [
        "10 điểm mỗi câu đúng.",
        "Trả lời trong 1 phút được thêm 2 điểm.",
      ],
      ranking: ["Xếp theo chuỗi ngày liên tục, rồi tổng điểm."],
      rewards: [
        { kind: "xp", title: "50 XP / ngày", note: "Khi hoàn thành thử thách" },
        { kind: "badge", title: "Git Streak", note: "Giữ chuỗi 7 ngày" },
      ],
      organizer: "Code Carf",
      totalPoints: 50,
    },
  },
  {
    slug: "giao-huu-python",
    title: "Giao hữu Python cuối tuần",
    description:
      "Rủ bạn bè vào phòng, giải 3 bài Python vui. Không tính hạng, chỉ tính vui.",
    opensIn: -DAY,
    examIn: DAY,
    durationMinutes: 40,
    participants: 4,
    profile: {
      type: "coding",
      format: "friendly",
      level: "EASY",
      topics: ["Python"],
      goals: ["Luyện tập thoải mái cùng bạn bè"],
      audience: "Nhóm bạn 2 đến 6 người",
      requirements: ["Tối đa 6 người mỗi phòng"],
      sections: [
        {
          title: "Bài Python vui",
          questionType: "coding",
          count: 3,
          points: 30,
        },
      ],
      rounds: [],
      rules: [
        "Chủ phòng bấm bắt đầu khi đủ người.",
        "Kết quả không ảnh hưởng điểm xếp hạng.",
      ],
      scoring: ["10 điểm mỗi bài đúng."],
      ranking: ["Ai giải nhanh hơn đứng trên."],
      rewards: [{ kind: "xp", title: "30 XP", note: "Cho mọi người chơi" }],
      organizer: "Do học viên tạo phòng",
      totalPoints: 30,
    },
  },
  {
    slug: "vo-dich-thuat-toan",
    title: "Giải vô địch Thuật toán Sinh viên",
    description:
      "16 thí sinh, đấu loại trực tiếp qua 4 vòng để tìm nhà vô địch.",
    opensIn: -9 * DAY,
    examIn: -2 * DAY,
    durationMinutes: 4 * 24 * 60,
    participants: 16,
    profile: {
      type: "coding",
      format: "tournament",
      level: "HARD",
      topics: ["Thuật toán", "C++"],
      goals: ["Thi đấu áp lực cao theo thể thức loại trực tiếp"],
      audience: "Top 16 bảng xếp hạng mùa",
      requirements: ["Lọt top 16 bảng xếp hạng mùa"],
      sections: [
        {
          title: "Bài đối kháng mỗi trận",
          questionType: "coding",
          count: 2,
          points: 200,
        },
      ],
      rounds: ["Vòng 1/8", "Tứ kết", "Bán kết", "Chung kết"],
      rules: ["Mỗi trận hai người cùng giải 2 bài trong 45 phút."],
      scoring: ["Thắng trận khi nhiều điểm hơn; bằng điểm xét thời gian."],
      ranking: ["Người thắng đi tiếp, người thua bị loại."],
      rewards: [
        { kind: "prize", title: "Cúp vô địch", note: "Kèm 2.000 XP" },
        { kind: "badge", title: "Algo Champion", note: "Cho nhà vô địch" },
      ],
      organizer: "Khoa Công nghệ Thông tin",
      totalPoints: 200,
    },
  },
  {
    slug: "ctf-mat-ma",
    title: "CTF: Giải mã kho báu",
    description:
      "Các đội săn flag qua thử thách mật mã, web và phân tích dữ liệu trong môi trường cấp phép.",
    opensIn: -DAY,
    examIn: 4 * DAY,
    durationMinutes: 6 * 60,
    participants: 72,
    profile: {
      type: "ctf",
      format: "team",
      level: "MEDIUM",
      topics: ["Bảo mật", "Mật mã", "Web"],
      goals: ["Hiểu lỗ hổng phổ biến và cách phòng tránh"],
      audience: "Đội 2 đến 4 người",
      requirements: ["Đội 2 đến 4 người", "Chỉ tấn công máy chủ thi được cấp"],
      sections: [
        { title: "Mật mã", questionType: "blank", count: 4, points: 400 },
        { title: "Web", questionType: "blank", count: 3, points: 450 },
        {
          title: "Phân tích dữ liệu",
          questionType: "blank",
          count: 3,
          points: 350,
        },
      ],
      rounds: [],
      rules: [
        "Không tấn công hạ tầng ngoài phạm vi.",
        "Không chia sẻ flag giữa các đội.",
      ],
      scoring: [
        "Flag khó nhiều điểm hơn.",
        "Đội giải đầu tiên được thưởng thêm.",
      ],
      ranking: ["Tổng điểm; bằng điểm, đội nộp flag cuối sớm hơn đứng trên."],
      rewards: [{ kind: "badge", title: "Flag Hunter", note: "Top 3 đội" }],
      organizer: "CLB An toàn thông tin",
      totalPoints: 1200,
    },
  },
  {
    slug: "thiet-ke-rut-gon-link",
    title: "Thiết kế dịch vụ rút gọn link",
    description:
      "Thiết kế database, API và kiến trúc cho một dịch vụ rút gọn link triệu người dùng.",
    opensIn: 2 * DAY,
    examIn: 9 * DAY,
    durationMinutes: 90,
    participants: 0,
    profile: {
      type: "system-design",
      format: "solo",
      level: "HARD",
      topics: ["System Design", "Database", "API"],
      goals: ["Tập tư duy thiết kế hệ thống có khả năng mở rộng"],
      audience: "Sinh viên năm 3 trở lên",
      requirements: ["Đã học Cơ sở dữ liệu và Mạng máy tính"],
      sections: [
        {
          title: "Thiết kế database",
          questionType: "submission",
          count: 1,
          points: 30,
        },
        {
          title: "Thiết kế API",
          questionType: "submission",
          count: 1,
          points: 30,
        },
        {
          title: "Kiến trúc và mở rộng",
          questionType: "submission",
          count: 1,
          points: 40,
        },
      ],
      rounds: [],
      rules: ["Nộp sơ đồ và mô tả trong thời gian thi."],
      scoring: ["Tính hợp lý, khả năng mở rộng, tối ưu."],
      ranking: ["Điểm giám khảo."],
      rewards: [
        { kind: "certificate", title: "Chứng nhận", note: "Đạt từ 70 điểm" },
      ],
      organizer: "Khoa Công nghệ Thông tin",
      totalPoints: 100,
    },
  },
  {
    slug: "dao-kho-bau-cpp",
    title: "Đảo Kho Báu C++",
    description:
      "Hành trình 8 chặng quanh hòn đảo C++: vượt qua từng chặng để mở chặng tiếp theo và nhận danh hiệu.",
    opensIn: -3 * DAY,
    examIn: -DAY,
    durationMinutes: 7 * 24 * 60,
    participants: 215,
    profile: {
      type: "coding",
      format: "tournament",
      level: "EASY",
      topics: ["C++", "OOP", "Thuật toán"],
      goals: [
        "Đi hết kiến thức C++ nền tảng theo từng chặng nhỏ",
        "Vừa học vừa chơi: mỗi chặng là một dạng thử thách khác nhau",
      ],
      audience: "Người mới học C++",
      requirements: ["Vượt qua chặng trước mới mở chặng sau"],
      sections: ISLAND_STAGES.map((stage) => ({
        title: stage.name,
        questionType: stage.questionType,
        count: stage.count,
      })),
      rounds: [],
      rules: [
        "Các chặng mở lần lượt trên bản đồ.",
        "Mỗi chặng cần đạt từ 70% điểm để qua.",
        "Được làm lại chặng chưa qua sau 30 phút.",
      ],
      scoring: [
        "Điểm hành trình là tổng điểm cao nhất của từng chặng.",
        "Qua chặng có cờ danh hiệu sẽ nhận danh hiệu tương ứng.",
      ],
      ranking: [
        "Xếp theo số chặng đã qua, rồi tổng điểm.",
        "Bằng nhau: ai về đích trước đứng trên.",
      ],
      rewards: [
        {
          kind: "xp",
          title: "Đến 1.000 XP",
          note: "50 XP mỗi chặng, thưởng thêm khi về đích",
        },
        {
          kind: "badge",
          title: "Chúa đảo C++",
          note: "Danh hiệu khi vượt núi lửa",
        },
        {
          kind: "certificate",
          title: "Chứng nhận",
          note: "Hoàn thành cả 8 chặng",
        },
      ],
      organizer: "Code Carf",
      journey: {
        island: "Đảo Kho Báu C++",
        currentStage: 3,
        stages: ISLAND_STAGES,
      },
    },
  },
  {
    slug: "cpp-knowledge-arena",
    title: "C++ Knowledge Arena",
    description: "Thử thách kiến thức và tư duy lập trình C++.",
    opensIn: -2 * DAY,
    examIn: 3 * DAY,
    durationMinutes: 30,
    participants: 128,
    profile: {
      type: "quiz",
      format: "solo",
      level: "EASY",
      topics: ["C++", "OOP"],
      goals: [
        "Kiểm tra kiến thức nền tảng về biến, kiểu dữ liệu, vòng lặp, hàm",
        "Củng cố tư duy lập trình hướng đối tượng trong C++",
      ],
      audience: "Sinh viên năm nhất, người mới học C++",
      requirements: ["Đã học xong phần cơ bản của C++", "Tối đa 500 thí sinh"],
      sections: [
        {
          title: "Kiến thức lý thuyết",
          questionType: "single",
          count: 10,
          points: 40,
        },
        {
          title: "Đọc hiểu kết quả code",
          questionType: "output",
          count: 5,
          points: 25,
        },
        {
          title: "Tìm và sửa lỗi",
          questionType: "debugging",
          count: 3,
          points: 21,
        },
        {
          title: "Hoàn thành đoạn code",
          questionType: "completion",
          count: 2,
          points: 14,
        },
      ],
      rounds: [],
      rules: [
        "Mỗi thí sinh có một lượt tham gia.",
        "Bài thi tự động nộp khi hết thời gian.",
        "Không được quay lại câu đã nộp.",
      ],
      scoring: [
        "Trắc nghiệm: đúng được đủ điểm, sai không bị trừ.",
        "Sửa lỗi và hoàn thành code: chấm theo test case.",
      ],
      ranking: [
        "Xếp hạng theo tổng điểm.",
        "Bằng điểm: người hoàn thành sớm hơn được ưu tiên.",
      ],
      rewards: [
        { kind: "xp", title: "200 XP", note: "Cho mọi thí sinh hoàn thành" },
        {
          kind: "badge",
          title: "C++ Champion",
          note: "Huy hiệu cho người đứng đầu",
        },
        { kind: "certificate", title: "Chứng nhận", note: "Cho top 10" },
      ],
      organizer: "Khoa Công nghệ Thông tin",
      totalPoints: 100,
    },
  },
  {
    slug: "weekly-algo-sprint",
    title: "Weekly Algo Sprint",
    description:
      "Ba bài thuật toán trong 90 phút, chấm tự động theo test case.",
    opensIn: -5 * DAY,
    examIn: -HOUR / 2,
    durationMinutes: 90,
    participants: 342,
    profile: {
      type: "coding",
      format: "ranked",
      level: "MEDIUM",
      topics: ["Thuật toán", "C++", "Python"],
      goals: ["Luyện tốc độ giải bài và tối ưu độ phức tạp"],
      audience: "Người đã quen cấu trúc dữ liệu cơ bản",
      requirements: ["Đạt hạng Đồng trở lên"],
      sections: [
        { title: "Bài dễ", questionType: "coding", count: 1, points: 100 },
        {
          title: "Bài trung bình",
          questionType: "coding",
          count: 1,
          points: 200,
        },
        { title: "Bài khó", questionType: "coding", count: 1, points: 300 },
      ],
      rounds: [],
      rules: [
        "Được nộp nhiều lần, lấy lần cao nhất.",
        "Chỉ dùng thư viện chuẩn.",
      ],
      scoring: ["Điểm theo số test đúng.", "Mỗi lần nộp sai phạt 20 phút."],
      ranking: ["Tổng điểm, rồi tổng thời gian kể cả phạt."],
      rewards: [
        { kind: "xp", title: "Đến 500 XP", note: "Theo thứ hạng" },
        { kind: "badge", title: "Sprinter", note: "Top 3 tuần" },
      ],
      organizer: "Code Carf",
      totalPoints: 600,
    },
  },
  {
    slug: "bug-hunt-java",
    title: "Bug Hunt: Java",
    description: "Năm đoạn code Java có lỗi đang chờ bạn tìm ra và sửa.",
    opensIn: DAY,
    examIn: 6 * DAY,
    durationMinutes: 45,
    participants: 0,
    profile: {
      type: "debug",
      format: "duel",
      level: "MEDIUM",
      topics: ["Java", "OOP"],
      goals: ["Rèn kỹ năng đọc code và tìm nguyên nhân lỗi"],
      audience: "Sinh viên đã học Java",
      requirements: ["Ghép cặp ngẫu nhiên theo hạng"],
      sections: [
        {
          title: "Đoạn code lỗi",
          questionType: "debugging",
          count: 5,
          points: 100,
        },
      ],
      rounds: [],
      rules: ["Hai người làm cùng bộ đề cùng lúc."],
      scoring: ["Mỗi lỗi sửa đúng được 20 điểm."],
      ranking: ["Ai nhiều điểm hơn thắng; bằng điểm xét thời gian."],
      rewards: [{ kind: "xp", title: "150 XP", note: "Cho người thắng" }],
      organizer: "CLB Lập trình",
      totalPoints: 100,
    },
  },
  {
    slug: "sql-detective",
    title: "SQL Detective",
    description:
      "Lần theo dữ liệu bán hàng để trả lời 8 câu hỏi bằng truy vấn SQL.",
    opensIn: -DAY,
    examIn: 2 * DAY,
    durationMinutes: 60,
    participants: 76,
    profile: {
      type: "sql",
      format: "classroom",
      level: "EASY",
      topics: ["SQL", "Database"],
      goals: ["Thành thạo SELECT, JOIN, GROUP BY trên dữ liệu thật"],
      audience: "Lớp Cơ sở dữ liệu",
      requirements: ["Thuộc lớp do giảng viên tạo"],
      sections: [
        {
          title: "Câu hỏi truy vấn",
          questionType: "sql",
          count: 8,
          points: 80,
        },
      ],
      rounds: [],
      rules: ["Làm bài trên bộ dữ liệu chỉ đọc."],
      scoring: ["So khớp kết quả truy vấn với đáp án."],
      ranking: ["Tổng điểm, rồi thời gian."],
      rewards: [
        {
          kind: "certificate",
          title: "Chứng nhận lớp",
          note: "Đạt từ 60 điểm",
        },
      ],
      organizer: "Giảng viên lớp CSDL",
      totalPoints: 80,
    },
  },
  {
    slug: "pixel-perfect",
    title: "Pixel Perfect",
    description:
      "Dựng lại một landing page theo bản thiết kế, càng giống càng tốt.",
    opensIn: -10 * DAY,
    examIn: -6 * DAY,
    durationMinutes: 120,
    participants: 54,
    profile: {
      type: "frontend",
      format: "solo",
      level: "MEDIUM",
      topics: ["HTML", "CSS", "JavaScript"],
      goals: ["Chuyển thiết kế thành giao diện chạy được, responsive"],
      audience: "Người học web",
      requirements: [],
      sections: [
        {
          title: "Dựng giao diện",
          questionType: "submission",
          count: 1,
          points: 100,
        },
      ],
      rounds: [],
      rules: ["Không dùng framework CSS."],
      scoring: ["Độ tương đồng 50%, chức năng 30%, responsive 20%."],
      ranking: ["Tổng điểm do giám khảo chấm."],
      rewards: [{ kind: "badge", title: "Pixel Master", note: "Top 3" }],
      organizer: "Code Carf",
      totalPoints: 100,
    },
  },
  {
    slug: "team-hackathon-2026",
    title: "Code Carf Hackathon 2026",
    description: "48 giờ xây dựng sản phẩm giải quyết một vấn đề giáo dục.",
    opensIn: 3 * DAY,
    examIn: 14 * DAY,
    durationMinutes: 48 * 60,
    participants: 0,
    profile: {
      type: "hackathon",
      format: "team",
      level: "HARD",
      topics: ["Web", "AI", "Product"],
      goals: ["Làm việc nhóm, đi từ ý tưởng đến sản phẩm chạy được"],
      audience: "Đội 3 đến 5 sinh viên",
      requirements: ["Đội 3 đến 5 người", "Tối đa 30 đội"],
      sections: [
        {
          title: "Sản phẩm và bài thuyết trình",
          questionType: "submission",
          count: 1,
        },
      ],
      rounds: [
        "Vòng ý tưởng",
        "Vòng phát triển 48 giờ",
        "Chung kết thuyết trình",
      ],
      rules: ["Mã nguồn viết trong thời gian thi."],
      scoring: ["Ý tưởng, kỹ thuật, tính ứng dụng, trình bày."],
      ranking: ["Điểm trung bình của ban giám khảo."],
      rewards: [
        { kind: "prize", title: "Giải Nhất", note: "Kèm cơ hội thực tập" },
        {
          kind: "certificate",
          title: "Chứng nhận",
          note: "Cho mọi đội hoàn thành",
        },
      ],
      organizer: "Khoa Công nghệ Thông tin",
    },
  },
];

function toIso(time: number) {
  return new Date(time).toISOString();
}

/** Lịch của cuộc thi mẫu tính từ `now`; dùng chung cho giao diện và seed. */
export function sampleSchedule(
  seed: Pick<SampleSeed, "opensIn" | "examIn" | "durationMinutes">,
  now: number,
) {
  const exam = now + seed.examIn;
  return {
    startsAt: new Date(now + seed.opensIn),
    endsAt: new Date(exam - HOUR),
    examStartsAt: new Date(exam),
    examEndsAt: new Date(exam + seed.durationMinutes * 60 * 1000),
  };
}

/** Dữ liệu để seed các cuộc thi mẫu thành cuộc thi thật trong cơ sở dữ liệu. */
export function sampleContestSeeds(now = Date.now()) {
  return SAMPLES.map((seed) => ({
    slug: seed.slug,
    title: seed.title,
    description: seed.description,
    durationMinutes: seed.durationMinutes,
    ...sampleSchedule(seed, now),
  }));
}

/** Hồ sơ giới thiệu của cuộc thi mẫu cùng slug, nếu có. */
export function sampleProfile(slug: string) {
  return SAMPLES.find((seed) => seed.slug === slug)?.profile;
}

function buildSample(seed: SampleSeed, now: number): ShowcaseContest {
  const schedule = sampleSchedule(seed, now);
  return {
    slug: seed.slug,
    title: seed.title,
    description: seed.description,
    registrationOpensAt: toIso(+schedule.startsAt),
    registrationClosesAt: toIso(+schedule.endsAt),
    examStartsAt: toIso(+schedule.examStartsAt),
    examEndsAt: toIso(+schedule.examEndsAt),
    durationMinutes: seed.durationMinutes,
    exercises: seed.profile.sections.reduce((sum, s) => sum + s.count, 0),
    participants: seed.participants,
    phase: getExamPhase(schedule, now) as ContestPhase,
    registrationPhase: getContestPhase(schedule, now) as ContestPhase,
    profile: seed.profile,
    sample: true,
    people: seed.participants > 0 ? SAMPLE_PEOPLE : [],
  };
}

export function sampleContests(now = Date.now()) {
  return SAMPLES.map((seed) => buildSample(seed, now));
}

export function withProfile(contest: PublicContest): ShowcaseContest {
  const fallback = defaultProfile(contest);
  const sample = sampleProfile(contest.slug);
  return {
    ...contest,
    // Cuộc thi mẫu đã seed giữ phần giới thiệu, nhưng nội dung thi theo số bài thật.
    profile: sample ? { ...sample, sections: fallback.sections } : fallback,
    sample: false,
    people: [],
  };
}

export function questionCount(contest: ShowcaseContest) {
  return contest.profile.sections.reduce((sum, s) => sum + s.count, 0);
}

export function formatDuration(minutes: number) {
  if (minutes < 60) return `${minutes} phút`;
  if (minutes >= 24 * 60 && minutes % (24 * 60) === 0)
    return `${minutes / (24 * 60)} ngày`;
  if (minutes % 60 === 0) return `${minutes / 60} giờ`;
  return `${Math.floor(minutes / 60)} giờ ${minutes % 60} phút`;
}

/**
 * Bản đồ hành trình theo tiến độ thật của thí sinh: `stages` là các chặng có đề (số chặng và
 * thời gian làm), `current` là chặng đang làm, null khi đã xong mọi chặng có đề.
 */
export function journeyForLearner(
  journey: ContestJourney,
  stages: { number: number; durationMinutes: number }[],
  current: number | null,
): ContestJourney {
  if (stages.length === 0) return journey;
  const last = Math.max(...stages.map((stage) => stage.number));
  return {
    ...journey,
    currentStage: Math.min(
      (current ?? last + 1) - 1,
      journey.stages.length - 1,
    ),
    stages: journey.stages.map((stage, index) => ({
      ...stage,
      minutes: stages.find((item) => item.number === index + 1)
        ?.durationMinutes,
    })),
  };
}
