import "server-only";
import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { unstable_cache } from "next/cache";
import { z } from "zod";
import { assignStableQuestionIds, quizSchema, type Quiz, type Subject } from "./quiz-schema";

const scopes: Record<Subject, string> = {
  math: "Whole numbers up to 10,000; addition and subtraction; multiplication and division; fractions; money in Singapore dollars; length, mass and volume; time; area and perimeter; angles; bar graphs. Include Singapore-style word problems.",
  science: "Living and non-living things; classification of living things; materials and their properties; life cycles of plants and animals; magnets; scientific observation and fair-test reasoning.",
};

export class QuizGenerationError extends Error {
  constructor(message: string, options?: ErrorOptions) { super(message, options); this.name = "QuizGenerationError"; }
}

async function generateQuiz(subject: Subject, singaporeDate: string): Promise<Quiz> {
  if (!process.env.OPENAI_API_KEY) throw new QuizGenerationError("OPENAI_API_KEY is not configured.");
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: 55_000, maxRetries: 2 });
  try {
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const response = await openai.responses.parse({
          model: process.env.OPENAI_QUIZ_MODEL || "gpt-5-mini",
          input: [
            { role: "developer", content: `You are an expert Singapore primary-school assessment writer. Create an original, polished Primary 3 ${subject} daily practice in current MOE-aligned school WA style.\nRequirements:\n- Exactly 10 questions: q1–q6 are Section A multiple-choice; q7–q10 are Section B short structured-answer.\n- Each MCQ has exactly four plausible distinct choices and one unambiguous answer. correctAnswer exactly equals one choice.\n- Every short-answer question must have ONE objectively determined answer from the information given. Never ask “name one”, “give an example”, “suggest”, “state one”, or anything with several different valid real-world answers.\n- acceptedAnswers must include correctAnswer and every harmless spelling, singular/plural, unit-format, punctuation, or equivalent-wording variation. correctAnswer is not automatically the only accepted answer. Never include factually different answers.\n- For calculations, request one final answer, not multi-part working.\n- Questions are age-appropriate, self-contained, factually correct, clear Singapore English, metric units, and need no images. Describe data in text.\n- Avoid tricks and out-of-scope topics. Give warm concise explanations that teach why. Vary topics and contexts. Never copy published wording.\n- choices is [] for short answers. acceptedAnswers includes correctAnswer exactly.` },
            { role: "user", content: `Generate the ${subject} quiz for Singapore date ${singaporeDate}. Use this date as an originality seed so today's set is genuinely new and distinct. Validation attempt ${attempt}. Allowed scope: ${scopes[subject]}` },
          ],
          text: { format: zodTextFormat(quizSchema, "daily_quiz") },
        });
        if (!response.output_parsed) throw new QuizGenerationError("The model returned no usable quiz.");
        return assignStableQuestionIds(quizSchema.parse(response.output_parsed), subject, singaporeDate);
      } catch (error) {
        if (error instanceof z.ZodError && attempt < 3) {
          console.warn("Rejected ambiguous or invalid quiz; retrying", { subject, singaporeDate, attempt, issues: error.issues });
          continue;
        }
        throw error;
      }
    }
    throw new QuizGenerationError("The model could not produce a valid quiz.");
  } catch (error) {
    if (error instanceof QuizGenerationError) throw error;
    console.error("Quiz generation failed", { subject, singaporeDate, error });
    throw new QuizGenerationError("We could not prepare today's quiz.", { cause: error });
  }
}

export async function getDailyQuiz(subject: Subject, date: string) {
  const cacheKey = getDailyQuizCacheKey(subject, date);
  return unstable_cache(() => generateQuiz(subject, date), [cacheKey], { revalidate: false, tags: [cacheKey] })();
}

export function getDailyQuizCacheKey(subject: Subject, date: string) { return `daily-p3-quiz-v3:${subject}:${date}`; }
