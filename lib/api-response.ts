export const apiMessages = {
  UNKNOWN_SUBJECT: "This quiz subject is not available.",
  INVALID_SUBMISSION: "Please answer all 10 questions before submitting.",
  QUIZ_EXPIRED: "A new daily quiz is ready! Please refresh for today's questions.",
  QUIZ_UNAVAILABLE: "Today's quiz is taking a little longer. Please try again in a moment.",
  GRADING_UNAVAILABLE: "We could not mark the quiz just now. Your answers are safe—please try again.",
  DISCOVERY_UNAVAILABLE: "Today's surprise is still getting ready. Please try again later.",
} as const;
export type ApiErrorCode = keyof typeof apiMessages;

export class FriendlyApiError extends Error {}

export async function readApiResponse<T>(response: Response, fallback: string): Promise<T> {
  const ok = response.ok;
  const contentType = response.headers.get("content-type")?.split(";")[0].trim().toLowerCase();
  if (contentType !== "application/json") throw new FriendlyApiError(fallback);
  let data: unknown;
  try { data = await response.json(); }
  catch { throw new FriendlyApiError(fallback); }
  if (!ok) {
    const code = data && typeof data === "object" && "code" in data ? data.code : undefined;
    // Only show our own messages, never arbitrary upstream text (even in JSON).
    throw new FriendlyApiError(typeof code === "string" && Object.hasOwn(apiMessages, code) ? apiMessages[code as ApiErrorCode] : fallback);
  }
  if (!data || typeof data !== "object" || "error" in data) throw new FriendlyApiError(fallback);
  return data as T;
}

export function friendlyError(error: unknown, fallback: string) {
  return error instanceof FriendlyApiError ? error.message : fallback;
}
