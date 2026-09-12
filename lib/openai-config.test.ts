import { afterEach, describe, expect, it, vi } from "vitest";
import { createOpenAIClient, getOpenAIConfig, OPENAI_BUDGET_MS } from "./openai-config";

afterEach(() => vi.unstubAllEnvs());
describe("OpenAI configuration", () => {
  it("reads and trims the server key and default model", () => {
    vi.stubEnv("OPENAI_API_KEY", " test-key ");
    vi.stubEnv("OPENAI_QUIZ_MODEL", "");
    expect(getOpenAIConfig()).toEqual({ apiKey: "test-key", model: "gpt-5-mini" });
  });
  it("preserves the configured model", () => {
    vi.stubEnv("OPENAI_API_KEY", "test-key");
    vi.stubEnv("OPENAI_QUIZ_MODEL", " custom-model ");
    expect(getOpenAIConfig().model).toBe("custom-model");
  });
  it.each(["", " ", "your_openai_api_key_here"])("rejects an unconfigured key", (key) => {
    vi.stubEnv("OPENAI_API_KEY", key);
    expect(getOpenAIConfig).toThrow("not configured");
  });
  it("disables implicit SDK retries within the Vercel budget", () => {
    const client = createOpenAIClient("test-key");
    expect(client.apiKey).toBe("test-key");
    expect(client.maxRetries).toBe(0);
    expect(client.timeout).toBe(OPENAI_BUDGET_MS);
    expect(client.timeout).toBeLessThan(50_000);
  });
});
