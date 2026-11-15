export async function enterExamFullscreen() {
  if (document.fullscreenElement) return;
  if (!document.documentElement.requestFullscreen)
    throw new Error(
      "Trình duyệt chưa hỗ trợ toàn màn hình. Hãy mở bài thi bằng trình duyệt hỗ trợ chế độ này.",
    );
  try {
    await document.documentElement.requestFullscreen();
  } catch {
    throw new Error("Chưa thể vào toàn màn hình. Hãy cho phép rồi thử lại.");
  }
}

export async function exitExamFullscreen() {
  if (document.fullscreenElement && document.exitFullscreen)
    await document.exitFullscreen().catch(() => {});
}

/** Fullscreen must be requested in the click handler, before any network await. */
export async function prepareExamEntry(
  started: boolean,
  actions: {
    fullscreen: () => Promise<void>;
    start: () => Promise<void>;
    navigate: () => void;
  },
) {
  await actions.fullscreen();
  if (!started) await actions.start();
  actions.navigate();
}
