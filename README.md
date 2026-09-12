# Eira's P3 Quest

A colourful daily Singapore Primary 3 Math and Science practice app. Each subject receives one server-generated set of 10 original questions per Singapore calendar day.

## Local development

1. Run `npm install`.
2. Copy `.env.example` to `.env.local` and set `OPENAI_API_KEY`.
3. Run `npm run dev` and open `http://localhost:3000`.

Answers remain server-side until submission. Quizzes use OpenAI Structured Outputs, Zod validation, and Next.js's persistent Data Cache keyed by subject and Singapore date.

## Vercel

Connect this repository to the existing Vercel project and add `OPENAI_API_KEY` under Project Settings → Environment Variables. No other service is required; Vercel's Data Cache stores the shared daily sets. `OPENAI_QUIZ_MODEL` is optional and defaults to `gpt-5-mini`.

The repository's `vercel.json` selects the Next.js framework and clears any stale static `public` output-directory override from the project settings.

Run `npm test`, `npm run lint`, and `npm run build` before deployment.

OpenAI calls share a 45-second generation budget with SDK retries disabled. API
handlers return JSON by 50 seconds, before the 60-second Vercel function limit.
Quiz validation retries share the same abort signal; grading only reads the cache.
Clients check HTTP status and Content-Type, and display only known friendly errors.

Production diagnostics: `npx vercel logs --project p3questions --environment production --since 1h`.
Generation logs include subject, date, model and key presence, never the key or raw
upstream response. A successful generation confirms runtime key and model access.
For environments with exportable credentials, run
`npx vercel env run -e production --project p3questions -- node scripts/check-openai.mjs`
to check model visibility and a minimal Responses request. Vercel Secret variables
cannot be exported; verify those through successful production generation logs.
