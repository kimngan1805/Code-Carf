/** Ảnh bìa lộ trình là giao diện có sẵn (không upload), giảng viên chỉ chọn một khóa. */
export const COVER_THEMES = [
  {
    key: "blue",
    label: "Xanh thương hiệu",
    className: "from-brand-blue to-brand-sky",
  },
  { key: "sky", label: "Xanh da trời", className: "from-brand-sky to-primary" },
  { key: "green", label: "Xanh lá", className: "from-success to-highlight" },
  {
    key: "orange",
    label: "Cam",
    className: "from-brand-orange to-accent-strong",
  },
  {
    key: "amber",
    label: "Vàng đất",
    className: "from-warning to-brand-orange",
  },
  { key: "gray", label: "Xám", className: "from-brand-gray to-foreground" },
] as const;

export type CoverThemeKey = (typeof COVER_THEMES)[number]["key"];
export const COVER_THEME_KEYS = COVER_THEMES.map((theme) => theme.key) as [
  CoverThemeKey,
  ...CoverThemeKey[],
];

/** Khóa lạ (dữ liệu cũ) rơi về xanh dương thay vì làm hỏng thẻ. */
export function coverThemeClass(key: string) {
  return (COVER_THEMES.find((theme) => theme.key === key) ?? COVER_THEMES[0])
    .className;
}

export const DIFFICULTY_LABELS = {
  EASY: "Cơ bản",
  MEDIUM: "Trung bình",
  HARD: "Nâng cao",
} as const;
