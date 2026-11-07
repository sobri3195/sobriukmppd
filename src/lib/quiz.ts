import { questions } from "../data";
import type { Quiz } from "./model";
export const isFinalized = (q: Quiz) =>
  q.status === "submitted" || q.status === "expired";
export function score(quiz: Quiz) {
  let correct = 0,
    answered = 0;
  for (const id of quiz.questionIds) {
    const q = questions.find((q) => q.id === id);
    const answer = quiz.answers[id];
    if (q && q.options.some((o) => o.id === answer)) {
      answered++;
      if (answer === q.correctOptionId) correct++;
    }
  }
  return {
    correct,
    answered,
    wrong: answered - correct,
    unanswered: quiz.questionIds.length - answered,
    percent: quiz.questionIds.length
      ? (correct / quiz.questionIds.length) * 100
      : 0,
  };
}
export const expired = (quiz: Quiz, at = Date.now()) =>
  quiz.status === "in_progress" && at >= quiz.deadline;
export function finishQuiz(quiz: Quiz, at = Date.now()): Quiz {
  if (quiz.status !== "in_progress") return quiz;
  return {
    ...quiz,
    status: expired(quiz, at) ? "expired" : "submitted",
    submittedAt: new Date(
      Math.max(Date.parse(quiz.startedAt), Math.min(at, quiz.deadline)),
    ).toISOString(),
  };
}
export function quizReport(quiz: Quiz) {
  const groups = new Map<
    string,
    { subjectId: string; total: number; answered: number; correct: number }
  >();
  for (const id of quiz.questionIds) {
    const q = questions.find((x) => x.id === id);
    if (!q) continue;
    const row = groups.get(q.subjectId) ?? {
      subjectId: q.subjectId,
      total: 0,
      answered: 0,
      correct: 0,
    };
    row.total++;
    if (quiz.answers[id]) {
      row.answered++;
      if (quiz.answers[id] === q.correctOptionId) row.correct++;
    }
    groups.set(q.subjectId, row);
  }
  return [...groups.values()].map((r) => ({
    ...r,
    accuracy: r.answered ? (r.correct / r.answered) * 100 : 0,
  }));
}
