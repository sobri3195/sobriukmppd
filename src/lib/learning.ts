import {
  addDays,
  differenceInCalendarDays,
  format,
  parseISO,
  startOfDay,
} from "date-fns";
import { questions, subjects, getTopics, getCards } from "../data";
import { type State, type Review, type Task, uid, now } from "./model";
export const localDate = (date = new Date()) => format(date, "yyyy-MM-dd");
export { score, expired, finishQuiz } from "./quiz";
import { score, isFinalized } from "./quiz";
export function latestReview(reviews: Review[], cardId: string) {
  return reviews
    .filter((r) => r.cardId === cardId)
    .reduce<Review | undefined>(
      (latest, r) =>
        !latest || r.at > latest.at || (r.at === latest.at && r.id > latest.id)
          ? r
          : latest,
      undefined,
    );
}
export function schedule(
  previous: Review | undefined,
  quality: number,
  at = new Date(),
): Omit<Review, "id" | "cardId"> {
  if (!Number.isInteger(quality) || quality < 0 || quality > 5)
    throw new Error("Rating harus 0–5");
  const ease = Math.max(
    1.3,
    (previous?.ease ?? 2.5) +
      0.1 -
      (5 - quality) * (0.08 + (5 - quality) * 0.02),
  );
  const repetition = quality < 3 ? 0 : (previous?.repetition ?? 0) + 1;
  const interval =
    repetition <= 1
      ? 1
      : repetition === 2
        ? 6
        : Math.round((previous?.interval ?? 6) * (previous?.ease ?? 2.5));
  return {
    at: at.toISOString(),
    quality,
    ease,
    repetition,
    interval,
    dueDate: localDate(addDays(at, interval)),
  };
}
export function streak(dates: string[], at = new Date()) {
  const days = [...new Set(dates.map((d) => localDate(parseISO(d))))].sort();
  let longest = 0,
    run = 0;
  let prev = "";
  for (const d of days) {
    run =
      prev && differenceInCalendarDays(parseISO(d), parseISO(prev)) === 1
        ? run + 1
        : 1;
    longest = Math.max(longest, run);
    prev = d;
  }
  let current = 0;
  let cursor = startOfDay(at);
  if (!days.includes(localDate(cursor))) cursor = addDays(cursor, -1);
  while (days.includes(localDate(cursor))) {
    current++;
    cursor = addDays(cursor, -1);
  }
  return { current, longest };
}
export function statistics(s: State) {
  const quizzes = s.quizzes.filter(isFinalized);
  const totals = quizzes.reduce(
    (a, q) => {
      const r = score(q);
      return {
        answered: a.answered + r.answered,
        correct: a.correct + r.correct,
      };
    },
    { answered: 0, correct: 0 },
  );
  const minutes = s.sessions.reduce((a, x) => a + x.minutes, 0);
  const dates = [
    ...s.sessions.filter((x) => x.minutes >= 1).map((x) => x.at),
    ...quizzes.filter((q) => score(q).answered > 0).map((q) => q.submittedAt!),
    ...s.reviews.map((r) => r.at),
  ];
  return {
    ...totals,
    minutes,
    accuracy: totals.answered ? (totals.correct / totals.answered) * 100 : 0,
    ...streak(dates),
    completed: s.tasks.filter((t) => t.status === "completed").length,
    completion: s.tasks.length
      ? (s.tasks.filter((t) => t.status === "completed").length /
          s.tasks.length) *
        100
      : 0,
    tryouts: quizzes.filter((q) => q.exam).length,
    xp:
      Math.floor(minutes / 5) * 5 +
      Math.min(totals.answered, 10000) * 2 +
      s.tasks.filter((t) => t.status === "completed").length * 5 +
      Object.values(
        s.reviews.reduce<Record<string, number>>((a, r) => {
          const d = localDate(parseISO(r.at));
          a[d] = (a[d] ?? 0) + 1;
          return a;
        }, {}),
      ).reduce((a, n) => a + Math.min(n, 100) * 2, 0),
  };
}
export function subjectStats(s: State) {
  return subjects.map((subject) => {
    let answered = 0,
      correct = 0;
    for (const q of s.quizzes.filter(isFinalized)) {
      for (const id of q.questionIds) {
        const question = questions.find((x) => x.id === id);
        if (question?.subjectId === subject.id && q.answers[id]) {
          answered++;
          if (q.answers[id] === question.correctOptionId) correct++;
        }
      }
    }
    const topics = getTopics(s).filter((t) => t.subjectId === subject.id);
    return {
      ...subject,
      answered,
      correct,
      accuracy: answered ? (correct / answered) * 100 : 0,
      minutes: s.sessions
        .filter((x) => x.subjectId === subject.id)
        .reduce((a, x) => a + x.minutes, 0),
      progress: topics.length
        ? (topics.filter((t) =>
            ["Sudah dipelajari", "Dikuasai"].includes(t.status),
          ).length /
            topics.length) *
          100
        : 0,
    };
  });
}
export function recommendations(s: State) {
  const exam = s.profile
    ? differenceInCalendarDays(parseISO(s.profile.cbt), new Date())
    : 90;
  return subjectStats(s)
    .map((subject) => {
      const due = getCards(s).filter(
        (c) =>
          c.subjectId === subject.id &&
          (latestReview(s.reviews, c.id)?.dueDate ?? "9999-12-31") <=
            localDate(),
      ).length;
      const error = subject.answered >= 3 ? 1 - subject.accuracy / 100 : 0;
      const unfinished = 1 - subject.progress / 100;
      const last = s.sessions
        .filter((x) => x.subjectId === subject.id)
        .map((x) => x.at)
        .sort()
        .at(-1);
      const recency = last
        ? Math.min(
            1,
            Math.max(
              0,
              differenceInCalendarDays(new Date(), parseISO(last)) / 14,
            ),
          )
        : 1;
      return {
        ...subject,
        priority:
          0.4 * error +
          0.2 * Math.min(1, due / 5) +
          0.2 * unfinished +
          0.1 * recency +
          0.1 * Math.max(0, 1 - Math.max(0, exam) / 90),
        suggestedMinutes: Math.min(
          s.profile?.dailyMinutes ?? 25,
          Math.round(25 + 35 * error),
        ),
        suggestedQuestions: Math.min(
          s.profile?.dailyQuestions ?? 10,
          subject.answered >= 3 ? 10 : 5,
        ),
        dueCards: due,
        topic:
          getTopics(s).find(
            (t) =>
              t.subjectId === subject.id &&
              ["Belum dipelajari", "Perlu review"].includes(t.status),
          )?.title ?? null,
        enoughData: subject.answered >= 3,
        reason:
          error > 0.3
            ? "Akurasi latihan masih rendah"
            : due
              ? "Flashcard jatuh tempo"
              : unfinished > 0
                ? "Materi belum selesai dipelajari"
                : "Pertahankan pemahaman dengan review berkala",
      };
    })
    .sort((a, b) => b.priority - a.priority || a.id.localeCompare(b.id));
}
export function generatePlan(
  input: {
    exam: string;
    days: number;
    minutes: number;
    questions: number;
    priorities: string[];
    holidays: string[];
  },
  from = new Date(),
): Task[] {
  const output: Task[] = [];
  const start = startOfDay(from);
  const count = Math.min(
    365,
    input.days,
    Math.max(0, differenceInCalendarDays(parseISO(input.exam), start) + 1),
  );
  const ids = input.priorities.length
    ? input.priorities
    : subjects.map((s) => s.id);
  let index = 0;
  for (let d = 0; d < count; d++) {
    const day = localDate(addDays(start, d));
    if (input.holidays.includes(day)) continue;
    const type =
      d >= count - 3
        ? "review"
        : index % 7 === 6
          ? "question_practice"
          : index % 3 === 2
            ? "review"
            : "reading";
    output.push({
      id: uid(),
      title:
        type === "question_practice"
          ? `Evaluasi mingguan · target ${input.questions} soal`
          : type === "review"
            ? "Review berkala"
            : "Belajar terarah",
      description: "Rencana otomatis berdasarkan kapasitas harian.",
      subjectId: ids[index % ids.length],
      topicId: "",
      date: day,
      startTime: "09:00",
      endTime: "",
      durationMinutes: input.minutes,
      priority: "medium",
      status: "pending",
      type,
      notes: "",
      createdAt: now(),
      updatedAt: now(),
      generated: true,
    });
    index++;
  }
  return output;
}
