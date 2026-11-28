/** Sự kiện nút ngoài khung thao tác (vd. bản đồ hành trình) gửi để mở hộp thoại vào thi. */
export const CONTEST_ENTRY_REQUEST = "contest:entry-request";

/**
 * Yêu cầu mở hộp thoại "Vào chế độ làm bài?" của khung thao tác trên trang cuộc thi, để mọi
 * đường vào thi đều qua bước toàn màn hình. Trả về true nếu hộp thoại đã được mở.
 */
export function requestContestEntry() {
  const event = new Event(CONTEST_ENTRY_REQUEST, { cancelable: true });
  return !window.dispatchEvent(event);
}
