import { NextResponse } from "next/server";
import { z } from "zod";
import { QuizCacheMissError, getCachedDailyQuiz, getDailyQuiz } from "@/lib/quiz";
import { gradeQuizById, subjectSchema, toPublicQuiz } from "@/lib/quiz-schema";
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

const submissionSchema = z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), answers: z.record(z.string(), z.string().min(1)).refine((a) => Object.keys(a).length === 10) });
export async function POST(request: Request, context: RouteContext<"/api/quiz/[subject]">) {
  try {
    const subject = subjectSchema.safeParse((await context.params).subject);
    if (!subject.success) return apiError("UNKNOWN_SUBJECT", 404);
    let payload: unknown;
    try { payload = await withDeadline(request.json(), 5_000); }
    catch { return apiError("INVALID_SUBMISSION", 400); }
    const body = submissionSchema.safeParse(payload);
    if (!body.success) return apiError("INVALID_SUBMISSION", 400);
    if (body.data.date !== getSingaporeDate()) return apiError("QUIZ_EXPIRED", 409);
    const quiz = await withDeadline(getCachedDailyQuiz(subject.data, body.data.date), 10_000); const ids = quiz.questions.map((q) => q.id);
    if (Object.keys(body.data.answers).some((id) => !ids.includes(id))) return apiError("QUIZ_EXPIRED", 409);
    if (ids.some((id) => !body.data.answers[id]?.trim())) return apiError("INVALID_SUBMISSION", 400);
    const results = gradeQuizById(quiz, body.data.answers);
    return NextResponse.json({ score: results.filter((r) => r.isCorrect).length, total: 10, results });
  } catch (error) {
    logServerError("Quiz submission failed", error);
    return error instanceof QuizCacheMissError ? apiError("QUIZ_EXPIRED", 409) : apiError("GRADING_UNAVAILABLE", 503);
  }
}
