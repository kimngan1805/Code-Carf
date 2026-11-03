export async function enterExamFullscreen() {
  if (document.fullscreenElement) return;
  if (!document.documentElement.requestFullscreen)
    throw new Error(
      "Trình duyệt chưa hỗ trợ toàn màn hình. Bạn có thể chọn mở màn hình làm bài riêng.",
    );
  try {
    await document.documentElement.requestFullscreen();
  } catch {
    throw new Error(
      "Chưa thể vào toàn màn hình. Hãy cho phép hoặc chọn mở màn hình làm bài riêng.",
    );
  }
}

export async function exitExamFullscreen() {
  if (document.fullscreenElement && document.exitFullscreen)
    await document.exitFullscreen().catch(() => {});
}

/** Fullscreen must be requested in the click handler, before any network await. */
export async function prepareExamEntry(
  fullscreen: boolean,
  started: boolean,
  actions: {
    fullscreen: () => Promise<void>;
    start: () => Promise<void>;
    navigate: () => void;
  },
) {
  if (fullscreen) await actions.fullscreen();
  if (!started) await actions.start();
  actions.navigate();
}
