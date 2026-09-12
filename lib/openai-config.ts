import OpenAI from "openai";

export const OPENAI_BUDGET_MS = 45_000;
export function getOpenAIConfig() {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey || apiKey === "your_openai_api_key_here") throw new Error("OPENAI_API_KEY is not configured.");
  return { apiKey, model: process.env.OPENAI_QUIZ_MODEL?.trim() || "gpt-5-mini" };
}

export function createOpenAIClient(apiKey: string) {
  // SDK retries multiply the timeout and can exceed Vercel's 60-second limit.
  return new OpenAI({ apiKey, timeout: OPENAI_BUDGET_MS, maxRetries: 0 });
}
