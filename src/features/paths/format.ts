const DAY = 24 * 60 * 60 * 1000;

/** "Đăng 3 ngày trước": so sánh theo mốc ngày, không phụ thuộc giờ trong ngày. */
export function formatPostedAt(date: Date | null, now = new Date()) {
  if (!date) return "";
  const days = Math.floor((now.getTime() - date.getTime()) / DAY);
  if (days < 1) return "Hôm nay";
  if (days === 1) return "Hôm qua";
  if (days < 7) return `${days} ngày trước`;
  if (days < 30) return `${Math.floor(days / 7)} tuần trước`;
  if (days < 365) return `${Math.floor(days / 30)} tháng trước`;
  return `${Math.floor(days / 365)} năm trước`;
}

export function formatDuration(minutes: number | null) {
  if (!minutes) return "";
  if (minutes < 60) return `${minutes} phút`;
  return `${+(minutes / 60).toFixed(1)} giờ`;
}
