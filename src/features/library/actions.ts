"use server";

import { revalidatePath } from "next/cache";
import { AppError } from "@/lib/errors";
import {
  addLibraryVideo,
  copyExerciseToRoom,
  copyLectureToRoom,
  createLibraryCategory,
  deleteLibraryCategory,
  deleteLibraryExercise,
  deleteLibraryLecture,
  getLibraryPicker,
  renameLibraryCategory,
  saveLibraryExercise,
  saveSharedToMine,
  updateLibraryMeta,
} from "./service";

const message = (error: unknown, fallback: string) =>
  error instanceof AppError ? error.message : fallback;

function revalidateRoom(slug: string, roomId: string) {
  revalidatePath(`/gv/paths/${slug}`);
  revalidatePath(`/gv/paths/${slug}/rooms/${roomId}`);
  revalidatePath(`/hv/rooms/${roomId}`);
}

/** Chạy một thao tác trên kho rồi làm mới trang kho; lỗi trả về thành câu dễ hiểu. */
async function run(fallback: string, task: () => Promise<unknown>) {
  try {
    await task();
    revalidatePath("/gv/library");
    return { error: null };
  } catch (error) {
    return { error: message(error, fallback) };
  }
}

export async function saveLibraryExerciseAction(input: unknown) {
  try {
    const saved = await saveLibraryExercise(input);
    revalidatePath("/gv/library");
    return { data: saved, error: null };
  } catch (error) {
    return { data: null, error: message(error, "Chưa thể lưu bài tập.") };
  }
}

export async function deleteLibraryExerciseAction(exerciseId: string) {
  return run("Chưa thể xóa bài tập.", () => deleteLibraryExercise(exerciseId));
}

export async function deleteLibraryLectureAction(lectureId: string) {
  return run("Chưa thể xóa bài giảng.", () => deleteLibraryLecture(lectureId));
}

export async function updateLibraryMetaAction(input: unknown) {
  return run("Chưa thể lưu thay đổi.", () => updateLibraryMeta(input));
}

export async function addLibraryVideoAction(input: unknown) {
  return run("Chưa thể thêm video.", () => addLibraryVideo(input));
}

export async function saveSharedToMineAction(input: {
  exerciseId?: string;
  lectureId?: string;
}) {
  return run("Chưa thể lưu về kho của bạn.", () => saveSharedToMine(input));
}

export async function createLibraryCategoryAction(name: string) {
  try {
    const category = await createLibraryCategory(name);
    revalidatePath("/gv/library");
    return { data: category, error: null };
  } catch (error) {
    return { data: null, error: message(error, "Chưa thể tạo danh mục.") };
  }
}

export async function renameLibraryCategoryAction(id: string, name: string) {
  return run("Chưa thể đổi tên danh mục.", () =>
    renameLibraryCategory(id, name),
  );
}

export async function deleteLibraryCategoryAction(id: string) {
  return run("Chưa thể xóa danh mục.", () => deleteLibraryCategory(id));
}

export async function getLibraryPickerAction() {
  try {
    return { data: await getLibraryPicker(), error: null };
  } catch (error) {
    return { data: null, error: message(error, "Chưa tải được kho tài liệu.") };
  }
}

export async function addLibraryItemToRoomAction(input: {
  roomId: string;
  exerciseId?: string;
  lectureId?: string;
}) {
  try {
    const result = input.exerciseId
      ? await copyExerciseToRoom({
          roomId: input.roomId,
          exerciseId: input.exerciseId,
        })
      : input.lectureId
        ? await copyLectureToRoom({
            roomId: input.roomId,
            lectureId: input.lectureId,
          })
        : null;
    if (!result) return { error: "Hãy chọn một mục trong kho." };
    revalidateRoom(result.slug, result.roomId);
    revalidatePath("/gv/library");
    return { error: null };
  } catch (error) {
    return { error: message(error, "Chưa thể thêm vào bài học.") };
  }
}
