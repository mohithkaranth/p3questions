import "server-only";
import { AsyncLocalStorage } from "node:async_hooks";
import { createHash } from "node:crypto";
import { zodTextFormat } from "openai/helpers/zod";
import { unstable_cache } from "next/cache";
import { z } from "zod";
import { assignStableQuestionIds, quizSchema, type Quiz, type Subject } from "./quiz-schema";
import { createOpenAIClient, getOpenAIConfig, OPENAI_BUDGET_MS } from "./openai-config";
import { logServerError } from "./server-errors";

const scopes: Record<Subject, string> = {
  math: "Whole numbers up to 10,000; addition and subtraction; multiplication and division; fractions; money in Singapore dollars; length, mass and volume; time; area and perimeter; angles; bar graphs. Include Singapore-style word problems.",
  science: "Living and non-living things; classification of living things; materials and their properties; life cycles of plants and animals; magnets; scientific observation and fair-test reasoning.",
};

export class QuizGenerationError extends Error {
  constructor(message: string, options?: ErrorOptions) { super(message, options); this.name = "QuizGenerationError"; }
}

export class QuizCacheMissError extends Error {
  constructor() { super("Daily quiz cache missing; reload the quiz before submitting."); this.name = "QuizCacheMissError"; }
}

async function generateQuiz(subject: Subject, singaporeDate: string): Promise<Quiz> {
  try {
    const { apiKey, model } = getOpenAIConfig();
    console.info("Quiz generation started", { subject, singaporeDate, model, apiKeyPresent: true });
    const openai = createOpenAIClient(apiKey);
    const signal = AbortSignal.timeout(OPENAI_BUDGET_MS);
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        signal.throwIfAborted();
        const response = await openai.responses.parse({
          model,
          ...(model === "gpt-5-mini" ? { reasoning: { effort: "low" as const } } : {}),
          input: [
            { role: "developer", content: `You are an expert Singapore primary-school assessment writer. Create an original, polished Primary 3 ${subject} daily practice in current MOE-aligned school WA style.\nRequirements:\n- Exactly 10 questions: q1–q6 are Section A multiple-choice; q7–q10 are Section B short structured-answer.\n- Each MCQ has exactly four plausible distinct choices and one unambiguous answer. correctAnswer exactly equals one choice.\n- Every short-answer question must have ONE objectively determined answer from the information given. Never ask “name one”, “give an example”, “suggest”, “state one”, or anything with several different valid real-world answers.\n- acceptedAnswers must include correctAnswer and every harmless spelling, singular/plural, unit-format, punctuation, or equivalent-wording variation. correctAnswer is not automatically the only accepted answer. Never include factually different answers.\n- For calculations, request one final answer, not multi-part working.\n- Questions are age-appropriate, self-contained, factually correct, clear Singapore English, metric units, and need no images. Describe data in text.\n- Avoid tricks and out-of-scope topics. Give warm concise explanations that teach why. Vary topics and contexts. Never copy published wording.\n- choices is [] for short answers. acceptedAnswers includes correctAnswer exactly.` },
            { role: "user", content: `Generate the ${subject} quiz for Singapore date ${singaporeDate}. Use this date as an originality seed so today's set is genuinely new and distinct. Validation attempt ${attempt}. Allowed scope: ${scopes[subject]}` },
          ],
          text: { format: zodTextFormat(quizSchema, "daily_quiz") },
        }, { signal });
        if (!response.output_parsed) throw new QuizGenerationError("The model returned no usable quiz.");
        const quiz = quizSchema.parse(response.output_parsed);
        const revision = createHash("sha256").update(JSON.stringify(quiz)).digest("hex");
        console.info("Quiz generation succeeded", { subject, singaporeDate, model });
        return assignStableQuestionIds(quiz, subject, singaporeDate, revision);
      } catch (error) {
        if (error instanceof z.ZodError && attempt < 3) {
          console.warn("Rejected invalid quiz; retrying", { subject, singaporeDate, attempt });
          continue;
        }
        throw error;
      }
    }
    throw new QuizGenerationError("The model could not produce a valid quiz.");
  } catch (error) {
    if (error instanceof QuizGenerationError) throw error;
    logServerError("Quiz generation failed", error);
    throw new QuizGenerationError("We could not prepare today's quiz.", { cause: error });
  }
}

// Permission is request-local and deliberately excluded from cache identity. Both
// routes call the very same cached function with the same subject/date arguments.
const generationAllowed = new AsyncLocalStorage<boolean>();
const pending = new Map<string, Promise<Quiz>>();
const cachedQuiz = unstable_cache(async (subject: Subject, date: string) => {
  if (!generationAllowed.getStore()) throw new QuizCacheMissError();
  const key = getDailyQuizCacheKey(subject, date);
  let quiz = pending.get(key);
  if (!quiz) {
    quiz = generateQuiz(subject, date);
    pending.set(key, quiz);
  }
  try { return await quiz; }
  finally { if (pending.get(key) === quiz) pending.delete(key); }
}, ["daily-p3-quiz-v5"], { revalidate: false });

export async function getDailyQuiz(subject: Subject, date: string) {
  return generationAllowed.run(true, () => cachedQuiz(subject, date));
}

export async function getCachedDailyQuiz(subject: Subject, date: string) {
  return generationAllowed.run(false, () => cachedQuiz(subject, date));
}

export function getDailyQuizCacheKey(subject: Subject, date: string) { return `daily-p3-quiz-v5:${subject}:${date}`; }
