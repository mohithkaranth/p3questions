import { describe, expect, it, vi } from "vitest";
import { apiMessages, friendlyError, readApiResponse } from "./api-response";

const fallback = apiMessages.QUIZ_UNAVAILABLE;
describe("API response handling", () => {
  it("reads successful JSON", async () => {
    await expect(readApiResponse(Response.json({ title: "Quiz" }), fallback)).resolves.toEqual({ title: "Quiz" });
  });
  it("shows a known JSON error without trusting server message text", async () => {
    await expect(readApiResponse(Response.json({ code: "QUIZ_EXPIRED", error: "secret server details" }, { status: 409 }), fallback)).rejects.toThrow(apiMessages.QUIZ_EXPIRED);
  });
  it("hides unknown JSON errors", async () => {
    await expect(readApiResponse(Response.json({ error: "secret server details" }, { status: 503 }), fallback)).rejects.toThrow(fallback);
  });
  it.each([200, 500, 504])("does not parse plain text with HTTP %s", async (status) => {
    const response = new Response("An error occurred: secret", { status });
    const json = vi.spyOn(response, "json");
    await expect(readApiResponse(response, fallback)).rejects.toThrow(fallback);
    expect(json).not.toHaveBeenCalled();
  });
  it.each(["text/html", "", "application/json"])("handles invalid bodies with content type %s", async (contentType) => {
    await expect(readApiResponse(new Response("<html>Internal error</html>", { headers: { "Content-Type": contentType } }), fallback)).rejects.toThrow(fallback);
  });
  it("hides raw network errors", () => {
    expect(friendlyError(new Error("internal host information"), fallback)).toBe(fallback);
  });
});
