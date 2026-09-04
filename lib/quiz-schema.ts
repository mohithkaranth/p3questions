import { z } from "zod";

export const subjectSchema = z.enum(["math", "science"]);
export type Subject = z.infer<typeof subjectSchema>;

export const questionSchema = z.object({
  id: z.string().min(1), section: z.enum(["A", "B"]), type: z.enum(["mcq", "short"]),
  topic: z.string().min(1), prompt: z.string().min(5), choices: z.array(z.string().min(1)),
  correctAnswer: z.string().min(1), acceptedAnswers: z.array(z.string().min(1)).min(1), explanation: z.string().min(8),
});

export const quizSchema = z.object({ title: z.string().min(1), questions: z.array(questionSchema).length(10) }).superRefine((quiz, ctx) => {
  if (new Set(quiz.questions.map((q) => q.id)).size !== 10) ctx.addIssue({ code: "custom", message: "Question IDs must be unique" });
  quiz.questions.forEach((q, index) => {
    if (q.id !== `q${index + 1}`) ctx.addIssue({ code: "custom", path: ["questions", index, "id"], message: `Expected q${index + 1}` });
    if (index < 6 && (q.section !== "A" || q.type !== "mcq" || q.choices.length !== 4)) ctx.addIssue({ code: "custom", path: ["questions", index], message: "Questions 1–6 must be Section A MCQs with four choices" });
    if (index >= 6 && (q.section !== "B" || q.type !== "short" || q.choices.length !== 0)) ctx.addIssue({ code: "custom", path: ["questions", index], message: "Questions 7–10 must be Section B short answers" });
    if (!q.acceptedAnswers.some((a) => normalizeAnswer(a) === normalizeAnswer(q.correctAnswer))) ctx.addIssue({ code: "custom", path: ["questions", index, "acceptedAnswers"], message: "Must include correct answer" });
    if (q.type === "mcq" && !q.choices.includes(q.correctAnswer)) ctx.addIssue({ code: "custom", path: ["questions", index, "correctAnswer"], message: "MCQ answer must match a choice" });
  });
});

export type Quiz = z.infer<typeof quizSchema>;
export type Question = z.infer<typeof questionSchema>;
export type PublicQuestion = Omit<Question, "correctAnswer" | "acceptedAnswers" | "explanation">;
export function normalizeAnswer(value: string) { return value.trim().toLocaleLowerCase("en-SG").replace(/[,$]/g, "").replace(/\s+/g, " ").replace(/[.!?]+$/, ""); }
export function toPublicQuiz(quiz: Quiz) { return { title: quiz.title, questions: quiz.questions.map((q) => ({ id: q.id, section: q.section, type: q.type, topic: q.topic, prompt: q.prompt, choices: q.choices })) }; }
