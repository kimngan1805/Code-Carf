export const LEVELS = [
  { level: 1, title: "Người mới", minXp: 0 },
  { level: 2, title: "Người học việc", minXp: 500 },
  { level: 3, title: "Lập trình viên", minXp: 1000 },
  { level: 4, title: "Cao thủ", minXp: 2000 },
] as const;

export interface LevelInfo {
  level: number;
  title: string;
  xp: number;
  /** XP needed to reach the next level, or null at the highest level. */
  nextXp: number | null;
  /** Progress from 0 to 1 within the current level. */
  progress: number;
}

export function getLevel(xp: number): LevelInfo {
  const safeXp = Math.max(0, Math.floor(xp));
  const index = LEVELS.findLastIndex((entry) => safeXp >= entry.minXp);
  const current = LEVELS[index];
  const next = LEVELS[index + 1];
  if (!next)
    return { ...current, xp: safeXp, nextXp: null, progress: 1 } as LevelInfo;
  return {
    level: current.level,
    title: current.title,
    xp: safeXp,
    nextXp: next.minXp,
    progress: (safeXp - current.minXp) / (next.minXp - current.minXp),
  };
}
