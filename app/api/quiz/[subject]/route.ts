import { NextResponse } from "next/server";
import { getDailyQuiz } from "@/lib/quiz";
import { subjectSchema, toPublicQuiz } from "@/lib/quiz-schema";
import { getSingaporeDate } from "@/lib/singapore-date";
import { apiError, logServerError, withDeadline } from "@/lib/server-errors";
export const runtime = "nodejs"; export const maxDuration = 60;
export async function GET(_request: Request, context: RouteContext<"/api/quiz/[subject]">) {
  try {
    const parsed = subjectSchema.safeParse((await context.params).subject);
    if (!parsed.success) return apiError("UNKNOWN_SUBJECT", 404);
    const date = getSingaporeDate();
    const quiz = await withDeadline(getDailyQuiz(parsed.data, date));
    return NextResponse.json({ date, subject: parsed.data, ...toPublicQuiz(quiz) }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    logServerError("Quiz endpoint failed", error);
    return apiError("QUIZ_UNAVAILABLE", 503);
  }
}
