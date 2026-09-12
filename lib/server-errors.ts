import { NextResponse } from "next/server";
import { apiMessages, type ApiErrorCode } from "./api-response";

export function apiError(code: ApiErrorCode, status: number) {
  return NextResponse.json({ code, error: apiMessages[code] }, { status, headers: { "Cache-Control": "private, no-store" } });
}

export function logServerError(event: string, error: unknown) {
  // Exclude raw messages, response bodies, request headers and credentials.
  const value = error && typeof error === "object" ? error as Record<string, unknown> : {};
  console.error(event, {
    type: error instanceof Error ? error.name : "UnknownError",
    status: typeof value.status === "number" ? value.status : undefined,
    requestId: typeof value.request_id === "string" ? value.request_id : undefined,
  });
}

export async function withDeadline<T>(work: Promise<T>, milliseconds = 50_000): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error("API deadline exceeded")), milliseconds);
  });
  try { return await Promise.race([work, timeout]); }
  finally { clearTimeout(timer); }
}
