import { NextResponse } from "next/server";
import { AppError } from "./errors";
import { logger } from "./logger";

export function ok<T>(data: T, status = 200) {
  return NextResponse.json({ data, error: null }, { status });
}
export function fail(error: unknown) {
  if (error instanceof AppError)
    return NextResponse.json(
      { data: null, error: { code: error.code, message: error.message } },
      { status: error.status },
    );
  logger.error("request_failed", {
    error: error instanceof Error ? error.message : String(error),
  });
  return NextResponse.json(
    {
      data: null,
      error: { code: "INTERNAL_ERROR", message: "Internal server error" },
    },
    { status: 500 },
  );
}
