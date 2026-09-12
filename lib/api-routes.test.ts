import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Quiz } from "./quiz-schema";

const { load, cached, discovery } = vi.hoisted(() => ({ load: vi.fn(), cached: vi.fn(), discovery: vi.fn() }));
vi.mock("@/lib/quiz", () => ({ getDailyQuiz: load, getCachedDailyQuiz: cached, QuizCacheMissError: class extends Error {} }));
vi.mock("@/lib/daily-discovery", () => ({ getDailyDiscovery: discovery }));
vi.mock("@/lib/singapore-date", () => ({ getSingaporeDate: () => "2026-09-12" }));
import { GET, POST } from "../app/api/quiz/[subject]/route";
import { QuizCacheMissError } from "./quiz";
import nextConfig from "../next.config";
import { GET as discoveryGET } from "../app/api/daily-discovery/route";

const quiz: Quiz = { title: "Quiz", questions: Array.from({ length: 10 }, (_, i) => ({
  id: `q${i}`, section: "B", type: "short", topic: "Test", prompt: "What is the answer?", choices: [],
  correctAnswer: `${i}`, acceptedAnswers: [`${i}`], explanation: "This is the answer.",
})) };
const context = (subject = "math") => ({ params: Promise.resolve({ subject }) });
const submission = () => new Request("https://example.test", { method: "POST", body: JSON.stringify({ date: "2026-09-12", answers: Object.fromEntries(quiz.questions.map((q) => [q.id, q.correctAnswer])) }) });
async function expectJson(response: Response, status: number) {
  expect(response.status).toBe(status);
  expect(response.headers.get("content-type")).toContain("application/json");
  const data = await response.json();
  expect(JSON.stringify(data)).not.toContain("secret");
  return data;
}
beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  load.mockReset().mockResolvedValue(quiz);
  cached.mockReset().mockResolvedValue(quiz);
  discovery.mockReset().mockResolvedValue({ joke: "A joke", fact: "A fact", animal: "Bird" });
});
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

describe("API JSON contracts", () => {
  it("routes the legacy submission URL into the same generation and grading bundle", async () => {
    expect(await nextConfig.rewrites!()).toContainEqual({ source: "/api/quiz/:subject/submit", destination: "/api/quiz/:subject" });
  });
  it("asks for a refresh on cache loss without generating a replacement during submission", async () => {
    cached.mockRejectedValue(new QuizCacheMissError());
    expect((await expectJson(await POST(submission(), context()), 409)).code).toBe("QUIZ_EXPIRED");
    expect(load).not.toHaveBeenCalled();
  });
  it.each(["math", "science"])("returns JSON for %s loading and grading", async (subject) => {
    const data = await expectJson(await GET(new Request("https://example.test"), context(subject)), 200);
    expect(data.questions[0]).not.toHaveProperty("correctAnswer");
    expect((await expectJson(await POST(submission(), context(subject)), 200)).score).toBe(10);
    expect(cached).toHaveBeenCalledWith(subject, "2026-09-12");
    expect(load).toHaveBeenCalledTimes(1);
  });
  it("returns JSON for failed generation and grading", async () => {
    load.mockRejectedValue(new Error("secret OpenAI failure"));
    cached.mockRejectedValue(new Error("secret cache failure"));
    await expectJson(await GET(new Request("https://example.test"), context()), 503);
    await expectJson(await POST(submission(), context()), 503);
  });
  it("returns JSON for malformed submissions and invalid subjects", async () => {
    await expectJson(await POST(new Request("https://example.test", { method: "POST", body: "not JSON" }), context()), 400);
    await expectJson(await GET(new Request("https://example.test"), context("other")), 404);
    await expectJson(await POST(submission(), context("other")), 404);
  });
  it("catches parameter failures inside the JSON boundary", async () => {
    await expectJson(await GET(new Request("https://example.test"), { params: Promise.reject(new Error("secret")) }), 503);
    await expectJson(await POST(submission(), { params: Promise.reject(new Error("secret")) }), 503);
  });
  it("returns JSON before Vercel can terminate a stalled load", async () => {
    vi.useFakeTimers();
    load.mockImplementation(() => new Promise(() => {}));
    const response = GET(new Request("https://example.test"), context());
    await vi.advanceTimersByTimeAsync(50_000);
    await expectJson(await response, 503);
  });
  it("returns JSON for discovery success and failure", async () => {
    await expectJson(await discoveryGET(), 200);
    discovery.mockRejectedValue(new Error("secret OpenAI failure"));
    await expectJson(await discoveryGET(), 503);
  });
});
