import { describe, expect, it } from "vitest";
import { assignStableQuestionIds, gradeQuizById, normalizeAnswer, quizSchema, toPublicQuiz } from "./quiz-schema";
const validQuestions = Array.from({length:10},(_,i)=>({id:`q${i+1}`,section:i<6?"A" as const:"B" as const,type:i<6?"mcq" as const:"short" as const,topic:"Test",prompt:"This is a clear sample question?",choices:i<6?["1","2","3","4"]:[],correctAnswer:"1",acceptedAnswers:["1"],explanation:"One is the correct answer."}));
describe("quiz validation",()=>{it("accepts the required structure",()=>expect(quizSchema.safeParse({title:"Daily quiz",questions:validQuestions}).success).toBe(true));it("rejects an answer outside choices",()=>{const questions=structuredClone(validQuestions);questions[0].correctAnswer="5";questions[0].acceptedAnswers=["5"];expect(quizSchema.safeParse({title:"Daily quiz",questions}).success).toBe(false)});it("normalises formatting",()=>expect(normalizeAnswer("  $1,200.  ")).toBe("1200"))});

describe("ID-based grading", () => {
  it("maps every displayed question to its own answer even when submissions are reordered", () => {
    const questions = structuredClone(validQuestions);
    questions[0] = { ...questions[0], prompt: "Which group contains only living things?", choices: ["Ant, Grass, Flower", "Rock, Ant, Water", "Chair, Flower, Soil", "Water, Air, Grass"], correctAnswer: "Ant, Grass, Flower", acceptedAnswers: ["Ant, Grass, Flower"], explanation: "Ants, grass and flowers are all living things." };
    questions[1] = { ...questions[1], prompt: "What do living things need?", choices: ["Needs food to grow", "A metal shell", "A battery", "Plastic"], correctAnswer: "Needs food to grow", acceptedAnswers: ["Needs food to grow"], explanation: "Living things need food or nutrients to grow." };
    const quiz = assignStableQuestionIds(quizSchema.parse({ title: "Science", questions }), "science", "2026-09-04");
    const displayed = toPublicQuiz(quiz).questions;
    const answers = Object.fromEntries([...displayed].reverse().map((question) => [question.id, quiz.questions.find((candidate) => candidate.id === question.id)!.correctAnswer]));
    const marks = new Map(gradeQuizById(quiz, answers).map((mark) => [mark.id, mark]));
    for (const question of displayed) expect(marks.get(question.id)?.correctAnswer).toBe(quiz.questions.find((candidate) => candidate.id === question.id)?.correctAnswer);
    expect(marks.get("science-2026-09-04-q1")).toMatchObject({ isCorrect: true, correctAnswer: "Ant, Grass, Flower" });
  });

  it("assigns unique IDs stable for the subject and Singapore date", () => {
    const quiz = assignStableQuestionIds(quizSchema.parse({ title: "Science", questions: validQuestions }), "science", "2026-09-04");
    expect(new Set(quiz.questions.map((question) => question.id)).size).toBe(10);
    expect(quiz.questions[0].id).toBe("science-2026-09-04-q1");
  });
});

describe("structured-answer ambiguity", () => {
  it("rejects the reported open-ended playground question", () => {
    const questions = structuredClone(validQuestions);
    questions[6].prompt = "Name one non-living thing found on a playground.";
    questions[6].correctAnswer = "rock";
    questions[6].acceptedAnswers = ["rock", "rocks"];
    const result = quizSchema.safeParse({ title: "Science", questions });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues.some((issue) => issue.message.includes("many possible"))).toBe(true);
  });

  it.each(["Give an example of a magnetic object.", "Suggest a material for a raincoat.", "State one living thing."])("rejects ambiguous wording: %s", (prompt) => {
    const questions = structuredClone(validQuestions);
    questions[6].prompt = prompt;
    expect(quizSchema.safeParse({ title: "Science", questions }).success).toBe(false);
  });
});
