import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { entries, parse } = vi.hoisted(() => ({ entries: new Map<string, unknown>(), parse: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("openai", () => ({ default: class { responses = { parse }; } }));
vi.mock("next/cache", () => ({
  unstable_cache: (fn: (...args: string[]) => Promise<unknown>, namespace: string[]) => async (...args: string[]) => {
    const key = JSON.stringify([namespace, args]);
    if (entries.has(key)) return entries.get(key);
    const value = await fn(...args);
    entries.set(key, value);
    return value;
  },
}));

import { getCachedDailyQuiz, getDailyQuiz, getDailyQuizCacheKey } from "./quiz";
import { gradeQuizById, toPublicQuiz } from "./quiz-schema";

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "info").mockImplementation(() => {});
  entries.clear();
  parse.mockReset();
  vi.stubEnv("OPENAI_API_KEY", "test-only");
  parse.mockImplementation(async () => ({ output_parsed: {
    title: "Daily quiz",
    questions: Array.from({ length: 10 }, (_, i) => ({
      id: `q${i + 1}`, section: i < 6 ? "A" : "B", type: i < 6 ? "mcq" : "short",
      topic: "Test", prompt: `What is the answer to question ${i + 1}?`,
      choices: i < 6 ? [`${i + 1}`, "20", "30", "40"] : [],
      correctAnswer: `${i + 1}`, acceptedAnswers: [`${i + 1}`], explanation: "This is the correct answer.",
    })),
  } }));
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); });

describe("daily quiz cache", () => {
  it.each([401, 403, 404, 429, 500])("handles OpenAI HTTP %s without caching failure", async (status) => {
    parse.mockRejectedValueOnce(Object.assign(new Error("upstream secret"), { status }));
    await expect(getDailyQuiz("math", "2026-09-12")).rejects.toThrow("We could not prepare today's quiz.");
    expect(entries.size).toBe(0);
    await expect(getDailyQuiz("math", "2026-09-12")).resolves.toHaveProperty("questions");
    expect(parse).toHaveBeenCalledTimes(2);
  });

  it("rejects a missing key without calling OpenAI", async () => {
    vi.stubEnv("OPENAI_API_KEY", " ");
    await expect(getDailyQuiz("math", "2026-09-12")).rejects.toThrow("We could not prepare today's quiz.");
    expect(parse).not.toHaveBeenCalled();
  });

  it("passes the configured model and shared abort deadline to OpenAI", async () => {
    vi.stubEnv("OPENAI_QUIZ_MODEL", " gpt-5-mini ");
    await getDailyQuiz("math", "2026-09-12");
    expect(parse).toHaveBeenCalledWith(expect.objectContaining({ model: "gpt-5-mini" }), expect.objectContaining({ signal: expect.any(AbortSignal) }));
  });

  it("handles a failed or incomplete OpenAI response", async () => {
    parse.mockResolvedValueOnce({ output_parsed: null });
    await expect(getDailyQuiz("math", "2026-09-12")).rejects.toThrow("no usable quiz");
    expect(entries.size).toBe(0);
  });

  it("does not restart generation after an aborted OpenAI request", async () => {
    parse.mockRejectedValueOnce(new DOMException("Request aborted", "AbortError"));
    await expect(getDailyQuiz("science", "2026-09-12")).rejects.toThrow("We could not prepare today's quiz.");
    expect(parse).toHaveBeenCalledTimes(1);
    expect(entries.size).toBe(0);
  });
  it.each(["math", "science"] as const)("loads and grades the same complete cached %s quiz", async (subject) => {
    const loaded = await getDailyQuiz(subject, "2026-09-12");
    expect(await getDailyQuiz(subject, "2026-09-12")).toEqual(loaded);
    const cached = await getCachedDailyQuiz(subject, "2026-09-12");
    expect(cached).toEqual(loaded);
    const answers = Object.fromEntries(toPublicQuiz(loaded).questions.reverse().map((q) => [q.id, loaded.questions.find((item) => item.id === q.id)!.correctAnswer]));
    expect(gradeQuizById(cached, answers).every((mark) => mark.isCorrect)).toBe(true);
    expect(parse).toHaveBeenCalledTimes(1);
    expect(toPublicQuiz(loaded).questions[0]).not.toHaveProperty("correctAnswer");
  });

  it.each(["math", "science"] as const)("never generates %s during submission, including after eviction", async (subject) => {
    await expect(getCachedDailyQuiz(subject, "2026-09-12")).rejects.toThrow("cache missing");
    expect(parse).not.toHaveBeenCalled();
    await getDailyQuiz(subject, "2026-09-12");
    entries.clear();
    await expect(getCachedDailyQuiz(subject, "2026-09-12")).rejects.toThrow("cache missing");
    expect(parse).toHaveBeenCalledTimes(1);
  });

  it("isolates subjects and dates and replaces the old namespace", async () => {
    await getDailyQuiz("math", "2026-09-12");
    await getDailyQuiz("science", "2026-09-12");
    await getDailyQuiz("math", "2026-09-13");
    expect(parse).toHaveBeenCalledTimes(3);
    expect(getDailyQuizCacheKey("math", "2026-09-12")).toBe("daily-p3-quiz-v4:math:2026-09-12");
  });

  it("coalesces simultaneous loads", async () => {
    const quizzes = await Promise.all([getDailyQuiz("math", "2026-09-12"), getDailyQuiz("math", "2026-09-12")]);
    expect(quizzes[0]).toEqual(quizzes[1]);
    expect(parse).toHaveBeenCalledTimes(1);
  });
});
