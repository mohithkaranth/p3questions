import { notFound } from "next/navigation";
import QuizClient from "./quiz-client";
export default async function QuizPage({ params }: PageProps<"/quiz/[subject]">) { const { subject } = await params; if (subject !== "math" && subject !== "science") notFound(); return <QuizClient subject={subject} />; }
