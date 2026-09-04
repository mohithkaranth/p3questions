import { NextResponse } from "next/server";
import { getDailyQuiz } from "@/lib/quiz";
import { subjectSchema, toPublicQuiz } from "@/lib/quiz-schema";
import { getSingaporeDate } from "@/lib/singapore-date";
export const runtime = "nodejs"; export const maxDuration = 60;
export async function GET(_request: Request, context: RouteContext<"/api/quiz/[subject]">) {
  const parsed = subjectSchema.safeParse((await context.params).subject);
  if (!parsed.success) return NextResponse.json({ error: "Unknown subject." }, { status: 404 });
  try { const date = getSingaporeDate(); const quiz = await getDailyQuiz(parsed.data, date); return NextResponse.json({ date, subject: parsed.data, ...toPublicQuiz(quiz) }, { headers: { "Cache-Control": "private, no-store" } }); }
  catch (error) { console.error("Quiz endpoint failed", error); return NextResponse.json({ error: "Today's quiz is taking a little nap. Please try again in a moment." }, { status: 503 }); }
}
