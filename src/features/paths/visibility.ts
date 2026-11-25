/**
 * Ai được xem một lộ trình.
 * - private: chỉ giảng viên thấy, dùng khi còn soạn dở (lưu là bản nháp).
 * - class: chỉ học viên các lớp được chọn (chưa có backend lớp học, chỉ là giao diện).
 * - public: hiện trên trang khám phá, mọi học viên đều xem được (xuất bản).
 */
export const PATH_VISIBILITIES = {
  private: {
    label: "Cá nhân",
    hint: "Chỉ mình bạn thấy. Hợp khi còn đang soạn dở.",
  },
  class: {
    label: "Lớp học",
    hint: "Chỉ học viên các lớp bạn chọn mới xem được.",
  },
  public: {
    label: "Trang khám phá",
    hint: "Hiện trên trang khám phá lộ trình, mọi học viên đều xem được.",
  },
} as const;

export type PathVisibility = keyof typeof PATH_VISIBILITIES;

/** Lớp mẫu để dựng giao diện chọn lớp, thay bằng lớp thật khi có backend. */
export const SAMPLE_CLASSES = [
  { id: "21IT1", name: "21IT1", detail: "Lập trình C++ · 42 học viên" },
  { id: "22SE2", name: "22SE2", detail: "Cấu trúc dữ liệu · 39 học viên" },
  { id: "21AD1", name: "21AD1", detail: "Phát triển web · 36 học viên" },
  { id: "23IT3", name: "23IT3", detail: "Nhập môn lập trình · 45 học viên" },
] as const;
