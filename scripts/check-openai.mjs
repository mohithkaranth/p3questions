import OpenAI from "openai";

// Run through `vercel env run -e production --project p3questions -- node
// scripts/check-openai.mjs`. Secrets stay in the child process environment.
const apiKey = process.env.OPENAI_API_KEY?.trim();
const model = process.env.OPENAI_QUIZ_MODEL?.trim() || "gpt-5-mini";
if (!apiKey) {
  console.error(JSON.stringify({ apiKeyPresent: false, model }));
  process.exitCode = 1;
} else {
  try {
    const client = new OpenAI({ apiKey, timeout: 20_000, maxRetries: 0 });
    const accessible = await client.models.retrieve(model);
    const response = await client.responses.create({
      model, input: "Reply with OK.", max_output_tokens: 128,
      ...(model === "gpt-5-mini" ? { reasoning: { effort: "minimal" } } : {}),
    });
    console.log(JSON.stringify({ apiKeyPresent: true, model: accessible.id, modelAccessible: true, responsesStatus: response.status }));
    if (response.status !== "completed") process.exitCode = 1;
  } catch (error) {
    console.error(JSON.stringify({ apiKeyPresent: true, model, modelAccessible: false, status: error.status, type: error.name }));
    process.exitCode = 1;
  }
}
