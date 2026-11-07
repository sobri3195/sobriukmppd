import { describe, it, expect } from "vitest";
import { addDays } from "date-fns";
import { emptyState, now, type Quiz } from "../lib/model";
import {
  score,
  finishQuiz,
  expired,
  streak,
  schedule,
  statistics,
  localDate,
  generatePlan,
  recommendations,
  subjectStats,
} from "../lib/learning";
import { questions, getCards, getTopics, stations } from "../data";
import { z } from "zod";
const quiz = (patch: Partial<Quiz> = {}): Quiz => ({
  id: "test",
  questionIds: ["q1", "q2"],
  answers: {},
  flags: [],
  startedAt: "2026-11-07T00:00:00.000Z",
  deadline: 1000,
  submittedAt: null,
  status: "in_progress",
  exam: true,
  ...patch,
});
describe("quiz state and scoring", () => {
  it("counts correct, wrong and unanswered separately", () => {
    const q = quiz({ answers: { q1: questions[0].correctOptionId } });
    expect(score(q)).toEqual({
      correct: 1,
      answered: 1,
      wrong: 0,
      unanswered: 1,
      percent: 50,
    });
  });
  it("does not count unanswered as accuracy samples", () => {
    expect(score(quiz()).answered).toBe(0);
  });
  it("expires on the exact deadline", () => {
    expect(expired(quiz(), 999)).toBe(false);
    expect(finishQuiz(quiz(), 1000).status).toBe("expired");
  });
  it("locks submitted attempts against double submission", () => {
    const q = finishQuiz(quiz(), 500);
    expect(finishQuiz(q, 9000)).toEqual(q);
  });
  it("preserves cancelled state", () =>
    expect(finishQuiz(quiz({ status: "cancelled" }), 2000).status).toBe(
      "cancelled",
    ));
});
describe("SM-2 with calendar dates", () => {
  it("uses 1 day then 6 days for successful recall", () => {
    const a = schedule(undefined, 5, new Date(2026, 10, 7, 23, 50));
    expect(a.interval).toBe(1);
    expect(a.dueDate).toBe("2026-11-08");
    const b = schedule({ id: "r1", cardId: "c1", ...a }, 5);
    expect(b.interval).toBe(6);
  });
  it("resets poor recall and floors ease at 1.3", () => {
    const previous = {
      id: "r1",
      cardId: "c1",
      ...schedule(undefined, 5),
      repetition: 8,
      interval: 60,
      ease: 1.3,
    };
    const next = schedule(previous, 0);
    expect(next.interval).toBe(1);
    expect(next.repetition).toBe(0);
    expect(next.ease).toBe(1.3);
  });
  it("rejects invalid quality", () =>
    expect(() => schedule(undefined, 6)).toThrow());
});
describe("real activity selectors", () => {
  it("returns zero for fresh data", () => {
    expect(statistics(emptyState())).toMatchObject({
      minutes: 0,
      answered: 0,
      correct: 0,
      accuracy: 0,
      current: 0,
      completed: 0,
      xp: 0,
    });
  });
  it("uses only submitted quizzes for accuracy", () => {
    const s = emptyState();
    s.quizzes = [quiz({ answers: { q1: questions[0].correctOptionId } })];
    expect(statistics(s).answered).toBe(0);
    s.quizzes = [finishQuiz(s.quizzes[0], 500)];
    expect(statistics(s).accuracy).toBe(100);
  });
  it("counts a study day once and tolerates yesterday", () => {
    const d = new Date(2026, 10, 7, 14);
    const a = new Date(2026, 10, 6, 10).toISOString(),
      b = new Date(2026, 10, 5, 10).toISOString();
    expect(streak([a, a, b], d)).toEqual({ current: 2, longest: 2 });
  });
  it("keeps longest streak after a break", () => {
    expect(
      streak(
        ["2026-11-01T12:00:00Z", "2026-11-02T12:00:00Z"],
        new Date(2026, 10, 7),
      ),
    ).toEqual({ current: 0, longest: 2 });
  });
  it("does not turn sub-minute sessions into streaks", () => {
    const s = emptyState();
    s.sessions = [
      { id: "s", subjectId: "s1", topicId: "", minutes: 0.1, at: now() },
    ];
    expect(statistics(s).current).toBe(0);
  });
  it("derives topic progress without claiming exam mastery", () => {
    const s = emptyState();
    s.topics = [{ ...getTopics(s)[0], status: "Sudah dipelajari" }];
    expect(subjectStats(s)[0].progress).toBe(50);
  });
  it("uses a minimum sample size for weakness", () => {
    const s = emptyState();
    expect(
      recommendations(s).every(
        (x) =>
          x.answered === 0 && x.reason === "Materi belum selesai dipelajari",
      ),
    ).toBe(true);
  });
  it("sorts recommendations by descending normalized priority", () => {
    const list = recommendations(emptyState());
    expect(
      list.every((x, i) => i === 0 || list[i - 1].priority >= x.priority),
    ).toBe(true);
    expect(list.every((x) => x.priority >= 0 && x.priority <= 1)).toBe(true);
  });
});
describe("capacity bounded planner", () => {
  it("respects days off, exam date, and daily capacity", () => {
    const plan = generatePlan(
      {
        exam: "2026-11-20",
        days: 20,
        minutes: 90,
        questions: 20,
        priorities: ["s1"],
        holidays: ["2026-11-08"],
      },
      new Date(2026, 10, 7),
    );
    expect(plan).toHaveLength(13);
    expect(plan.some((x) => x.date === "2026-11-08")).toBe(false);
    expect(
      plan.every(
        (x) =>
          x.date <= "2026-11-20" &&
          x.durationMinutes === 90 &&
          x.subjectId === "s1",
      ),
    ).toBe(true);
  });
  it("is deterministic except identifiers and audit timestamps", () => {
    const input = {
      exam: "2026-11-20",
      days: 10,
      minutes: 60,
      questions: 10,
      priorities: [],
      holidays: [],
    };
    const shape = () =>
      generatePlan(input, new Date(2026, 10, 7)).map(
        ({ date, title, subjectId, type, durationMinutes }) => ({
          date,
          title,
          subjectId,
          type,
          durationMinutes,
        }),
      );
    expect(shape()).toEqual(shape());
  });
  it("produces no plan for an elapsed exam date", () =>
    expect(
      generatePlan(
        {
          exam: "2026-11-01",
          days: 10,
          minutes: 60,
          questions: 10,
          priorities: [],
          holidays: [],
        },
        new Date(2026, 10, 7),
      ),
    ).toEqual([]));
  it("handles local calendar midnight", () =>
    expect(localDate(addDays(new Date(2026, 10, 7, 23, 59), 1))).toBe(
      "2026-11-08",
    ));
});
describe("original static content validation", () => {
  const schema = z.object({
    id: z.string(),
    subjectId: z.string(),
    topicId: z.string(),
    stem: z.string().min(15),
    options: z
      .array(z.object({ id: z.string(), text: z.string().min(1) }))
      .length(5),
    correctOptionId: z.string(),
    explanation: z.string().min(20),
    optionExplanations: z.record(z.string(), z.string()),
    learningPoints: z.array(z.string()).min(1),
    reference: z.null(),
    reviewStatus: z.literal("Materi latihan — belum divalidasi klinis"),
  });
  it("validates every question and unique key", () => {
    expect(questions.length).toBe(36);
    expect(new Set(questions.map((q) => q.stem)).size).toBe(questions.length);
    for (const q of questions) {
      schema.parse(q);
      expect(new Set(q.options.map((o) => o.id)).size).toBe(5);
      expect(q.options.some((o) => o.id === q.correctOptionId)).toBe(true);
      expect(Object.keys(q.optionExplanations)).toHaveLength(5);
    }
  });
  it("has 60 editable cards and 12 consistently weighted stations", () => {
    expect(getCards(emptyState())).toHaveLength(60);
    expect(stations).toHaveLength(12);
    for (const s of stations)
      expect(s.checklistItems.reduce((a, x) => a + x.weight, 0)).toBe(
        s.maxScore,
      );
  });
});

it("caps flashcard XP at 100 reviews per calendar day", () => {
  const state = emptyState();
  state.reviews = Array.from({ length: 101 }, (_, i) => ({
    id: `r${i}`,
    cardId: "c1",
    ...schedule(undefined, 5, new Date(2026, 10, 7, 12)),
  }));
  expect(statistics(state).xp).toBe(200);
});
