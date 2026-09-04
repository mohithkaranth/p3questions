import { NextResponse } from "next/server";
import { z } from "zod";
import { getDailyQuiz } from "@/lib/quiz";
import { gradeQuizById, subjectSchema } from "@/lib/quiz-schema";
import { getSingaporeDate } from "@/lib/singapore-date";
export const runtime = "nodejs"; export const maxDuration = 60;
const submissionSchema = z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), answers: z.record(z.string(), z.string().min(1)).refine((a) => Object.keys(a).length === 10) });
export async function POST(request: Request, context: RouteContext<"/api/quiz/[subject]/submit">) {
  const subject = subjectSchema.safeParse((await context.params).subject);
  if (!subject.success) return NextResponse.json({ error: "Unknown subject." }, { status: 404 });
  try {
    const body = submissionSchema.safeParse(await request.json());
    if (!body.success) return NextResponse.json({ error: "Please answer all 10 questions before submitting." }, { status: 400 });
    if (body.data.date !== getSingaporeDate()) return NextResponse.json({ error: "A new daily quiz is ready! Please refresh for today's questions." }, { status: 409 });
    const quiz = await getDailyQuiz(subject.data, body.data.date); const ids = quiz.questions.map((q) => q.id);
    if (Object.keys(body.data.answers).some((id) => !ids.includes(id)) || ids.some((id) => !body.data.answers[id]?.trim())) return NextResponse.json({ error: "Please answer all 10 questions before submitting." }, { status: 400 });
    const results = gradeQuizById(quiz, body.data.answers);
    return NextResponse.json({ score: results.filter((r) => r.isCorrect).length, total: 10, results });
  } catch (error) { console.error("Quiz submission failed", error); return NextResponse.json({ error: "We could not mark the quiz just now. Your answers are safe—please try again." }, { status: 503 }); }
}
