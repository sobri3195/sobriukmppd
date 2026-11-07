import { afterEach, it, expect, vi } from "vitest";
import { createProgressStore } from "../lib/progress-store";
import { emptyState, type State } from "../lib/model";
import {
  KEY,
  parseBackup,
  exportBackup,
  parseBackupDocument,
} from "../lib/storage";
import { completeTimer, elapsed, toggleTimer } from "../lib/timer";
import { finishQuiz, score, quizReport } from "../lib/quiz";
import { latestReview, recommendations, statistics } from "../lib/learning";
import { questions } from "../data";
function memory() {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => {
      map.set(k, v);
    },
    removeItem: (k: string) => {
      map.delete(k);
    },
    clear: () => map.clear(),
    key: (n: number) => [...map.keys()][n],
    get length() {
      return map.size;
    },
  } as Storage;
}
const note = (title = "Draft") => ({
  id: "n1",
  title,
  body: "Persist this",
  subjectId: "s1",
  tags: "",
  pinned: false,
  updatedAt: "2026-11-07T00:00:00.000Z",
});
afterEach(() => vi.useRealTimers());
it("updates state immediately but debounces disk writes", () => {
  vi.useFakeTimers();
  const disk = memory();
  const store = createProgressStore(() => disk);
  store.getState().updateDebounced((s) => ({ ...s, notes: [note()] }));
  expect(store.getState().data.notes).toHaveLength(1);
  expect(disk.getItem(KEY)).toBeNull();
  vi.advanceTimersByTime(600);
  expect(parseBackup(disk.getItem(KEY)!).notes[0].body).toBe("Persist this");
  expect(store.getState().dirty).toBe(false);
});
it("flushes pending notes before a reload lifecycle event", () => {
  vi.useFakeTimers();
  const disk = memory();
  const store = createProgressStore(() => disk);
  store.getState().updateDebounced((s) => ({ ...s, notes: [note()] }));
  expect(store.getState().flush()).toBe(true);
  expect(createProgressStore(() => disk).getState().data.notes).toHaveLength(1);
});
it("cancels stale note writes when a pending note is deleted", () => {
  vi.useFakeTimers();
  const disk = memory();
  const store = createProgressStore(() => disk);
  store.getState().updateDebounced((s) => ({ ...s, notes: [note()] }));
  store.getState().update((s) => ({ ...s, notes: [] }));
  vi.runAllTimers();
  expect(parseBackup(disk.getItem(KEY)!).notes).toEqual([]);
});
it("retains unsaved memory and retries after quota errors", () => {
  const disk = memory();
  const original = disk.setItem;
  disk.setItem = () => {
    throw new DOMException("full", "QuotaExceededError");
  };
  const store = createProgressStore(() => disk);
  expect(store.getState().update((s) => ({ ...s, notes: [note()] }))).toBe(
    false,
  );
  expect(store.getState().dirty).toBe(true);
  expect(store.getState().data.notes).toHaveLength(1);
  disk.setItem = original;
  expect(store.getState().flush()).toBe(true);
  expect(store.getState().error).toBeNull();
});
it("does not overwrite raw corrupt data with automatic writes", () => {
  const disk = memory();
  disk.setItem(KEY, "corrupt");
  const store = createProgressStore(() => disk);
  store.getState().update((s) => ({ ...s, notes: [note()] }));
  expect(store.getState().blocked).toBe(true);
  expect(disk.getItem(KEY)).toBe("corrupt");
});
it("does not report failed recovery as success or change existing memory", () => {
  const disk = memory();
  const store = createProgressStore(() => disk);
  disk.setItem = () => {
    throw new Error("denied");
  };
  expect(store.getState().recover({ ...emptyState(), notes: [note()] })).toBe(
    false,
  );
  expect(store.getState().data.notes).toEqual([]);
});
it("rejects a stale tab write and preserves both snapshots", () => {
  const disk = memory();
  const first = createProgressStore(() => disk),
    second = createProgressStore(() => disk);
  first.getState().update((s) => ({ ...s, notes: [note("first")] }));
  expect(
    second.getState().update((s) => ({ ...s, notes: [note("second")] })),
  ).toBe(false);
  expect(second.getState().blocked).toBe(true);
  expect(second.getState().data.notes[0].title).toBe("second");
  expect(parseBackup(disk.getItem(KEY)!).notes[0].title).toBe("first");
});
it("synchronizes a clean tab from valid storage events", () => {
  const disk = memory();
  const first = createProgressStore(() => disk),
    second = createProgressStore(() => disk);
  first.getState().update((s) => ({ ...s, notes: [note()] }));
  second.getState().acceptExternal();
  expect(second.getState().data.notes).toHaveLength(1);
  expect(second.getState().blocked).toBe(false);
});
it("does not replace dirty notes when another tab saves", () => {
  vi.useFakeTimers();
  const disk = memory();
  const first = createProgressStore(() => disk),
    second = createProgressStore(() => disk);
  second
    .getState()
    .updateDebounced((s) => ({ ...s, notes: [note("unsaved")] }));
  first.getState().update((s) => ({ ...s, notes: [note("remote")] }));
  second.getState().acceptExternal();
  vi.runAllTimers();
  expect(second.getState().blocked).toBe(true);
  expect(second.getState().data.notes[0].title).toBe("unsaved");
  expect(parseBackup(disk.getItem(KEY)!).notes[0].title).toBe("remote");
});
it("roundtrips timestamped backup envelopes and accepts raw v1 backups", () => {
  const state = { ...emptyState(), notes: [note()] };
  const at = new Date("2026-11-07T01:00:00.000Z");
  const doc = parseBackupDocument(exportBackup(state, at));
  expect(doc.exportedAt).toBe(at.toISOString());
  expect(doc.data).toEqual(state);
  expect(parseBackup(JSON.stringify(state))).toEqual(state);
});
it("rejects unsupported envelope versions without mutating state", () =>
  expect(() =>
    parseBackup(
      JSON.stringify({
        format: "medtrack-backup",
        schemaVersion: 2,
        data: emptyState(),
      }),
    ),
  ).toThrow());
it("preserves a blank note title as an untitled draft", () => {
  const data = parseBackup(
    JSON.stringify({ ...emptyState(), notes: [note("  ")] }),
  );
  expect(data.notes[0].title).toBe("Catatan tanpa judul");
});
const timer: NonNullable<State["timer"]> = {
  id: "timer",
  subjectId: "s1",
  topicId: "",
  mode: "custom",
  targetSeconds: 60,
  startedAt: 1000,
  elapsedMs: 0,
  running: true,
};
it("timer pause/resume excludes background time while paused", () => {
  const paused = toggleTimer(timer, 11000);
  expect(elapsed(paused, 71000)).toBe(10000);
  const running = toggleTimer(paused, 71000);
  expect(elapsed(running, 81000)).toBe(20000);
});
it("timer expiry clamps elapsed duration and repeated finish adds no duplicate", () => {
  const s = { ...emptyState(), timer };
  const finished = completeTimer(s, "timer", 100000);
  expect(finished.sessions[0].minutes).toBe(1);
  expect(completeTimer(finished, "timer", 200000)).toBe(finished);
});
it("timer ignores a finish event for another active session", () => {
  const s = { ...emptyState(), timer };
  expect(completeTimer(s, "different", 2000)).toBe(s);
});
it("restored overdue quizzes use their deadline as completion timestamp", () => {
  const q = {
    id: "quiz",
    questionIds: ["q1"],
    answers: { q1: questions[0].correctOptionId },
    flags: [],
    startedAt: "2026-11-07T00:00:00.000Z",
    deadline: Date.parse("2026-11-07T00:01:00.000Z"),
    submittedAt: null,
    status: "in_progress" as const,
    exam: true,
  };
  expect(
    finishQuiz(q, Date.parse("2026-11-08T00:00:00.000Z")).submittedAt,
  ).toBe("2026-11-07T00:01:00.000Z");
});
it("quiz reports separate per-subject denominators and empty answers", () => {
  const q = {
    id: "quiz",
    questionIds: ["q1", "q3"],
    answers: { q1: questions[0].correctOptionId },
    flags: [],
    startedAt: "2026-11-07T00:00:00.000Z",
    deadline: 1,
    submittedAt: null,
    status: "in_progress" as const,
    exam: true,
  };
  expect(quizReport(q)).toMatchObject([
    { subjectId: "s1", answered: 1, correct: 1, accuracy: 100 },
    { subjectId: "s2", answered: 0, correct: 0, accuracy: 0 },
  ]);
  expect(score({ ...q, answers: { q1: "invalid" } }).answered).toBe(0);
});
it("uses chronological review order after importing unsorted data", () => {
  const older = {
    id: "old",
    cardId: "c1",
    at: "2026-11-01T00:00:00.000Z",
    quality: 5,
    ease: 2.5,
    repetition: 1,
    interval: 1,
    dueDate: "2026-11-02",
  };
  const newer = {
    ...older,
    id: "new",
    at: "2026-11-07T00:00:00.000Z",
    dueDate: "2026-11-10",
  };
  expect(latestReview([newer, older], "c1")?.id).toBe("new");
});
it("recommendation action sizes are bounded by personal targets", () => {
  for (const item of recommendations(emptyState())) {
    expect(item.suggestedMinutes).toBeLessThanOrEqual(25);
    expect(item.suggestedQuestions).toBeLessThanOrEqual(10);
    expect(item.enoughData).toBe(false);
  }
});
it("cancelled attempts never count as answered activity", () => {
  const s = emptyState();
  s.quizzes = [
    {
      id: "q",
      questionIds: ["q1"],
      answers: { q1: questions[0].correctOptionId },
      flags: [],
      startedAt: "2026-11-07T00:00:00.000Z",
      deadline: 1,
      submittedAt: "2026-11-07T00:00:00.000Z",
      status: "cancelled",
      exam: true,
    },
  ];
  expect(statistics(s).answered).toBe(0);
});
