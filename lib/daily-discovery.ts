import "server-only";
import { createOpenAIClient, getOpenAIConfig, OPENAI_BUDGET_MS } from "./openai-config";
import { unstable_cache } from "next/cache";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";

const discoverySchema = z.object({ joke: z.string().min(10), fact: z.string().min(10), animal: z.string().min(2) });

async function generateDiscovery(singaporeDate: string) {
  const { apiKey, model } = getOpenAIConfig();
  const openai = createOpenAIClient(apiKey);
  const response = await openai.responses.parse({
    model,
    input: [
      { role: "developer", content: "Create one short, wholesome joke suitable for a Primary 3 child and one fascinating, accurate animal fact. The joke need not be about animals. Avoid scary, rude, mean, political, religious, or mature material. Make both easy to understand, fresh, and delightful. Name the animal featured in the fact." },
      { role: "user", content: `Create the daily discovery for Singapore date ${singaporeDate}. Use the date as an originality seed.` },
    ],
    text: { format: zodTextFormat(discoverySchema, "daily_discovery") },
  }, { signal: AbortSignal.timeout(OPENAI_BUDGET_MS) });
  if (!response.output_parsed) throw new Error("No daily discovery was generated.");
  return discoverySchema.parse(response.output_parsed);
}

const getCachedDiscovery = unstable_cache(async (date: string) => generateDiscovery(date), ["daily-discovery-v1"], { revalidate: false, tags: ["daily-discovery"] });
export function getDailyDiscovery(date: string) { return getCachedDiscovery(date); }
