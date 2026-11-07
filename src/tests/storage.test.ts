import { it, expect } from "vitest";
import { emptyState } from "../lib/model";
import {
  load,
  save,
  parseBackup,
  mergeStates,
  migrate,
  KEY,
} from "../lib/storage";
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
it("roundtrips validated data", () => {
  const s = memory();
  save(s, emptyState());
  expect(load(s)).toEqual({ state: emptyState(), error: null });
});
it("preserves corrupt storage and reports recovery", () => {
  const s = memory();
  s.setItem(KEY, "broken");
  expect(load(s).error).toBeTruthy();
  expect(s.getItem(KEY)).toBe("broken");
});
it("reports unavailable storage", () => {
  const s = memory();
  s.getItem = () => {
    throw new Error("denied");
  };
  expect(load(s).error).toBeTruthy();
});
it("does not swallow quota errors", () => {
  const s = memory();
  s.setItem = () => {
    throw new DOMException("Full", "QuotaExceededError");
  };
  expect(() => save(s, emptyState())).toThrow();
});
it("rejects future schema versions", () =>
  expect(() =>
    parseBackup(JSON.stringify({ ...emptyState(), version: 99 })),
  ).toThrow());
it("version 1 migration preserves data", () =>
  expect(migrate(emptyState())).toEqual(emptyState()));
it("rejects malformed and unsafe imports", () => {
  expect(() => parseBackup('{"__proto__":{}}')).toThrow();
  expect(() => parseBackup('{"constructor":{}}')).toThrow();
  expect(() => parseBackup("{}")).toThrow();
});
it("merges by stable ID with explicit incoming wins rule", () => {
  const a = emptyState();
  a.notes = [
    {
      id: "n",
      title: "old",
      body: "a",
      subjectId: "s1",
      tags: "",
      pinned: false,
      updatedAt: "2026-11-07T00:00:00.000Z",
    },
  ];
  const b = { ...emptyState(), notes: [{ ...a.notes[0], title: "new" }] };
  expect(mergeStates(a, b).notes).toHaveLength(1);
  expect(mergeStates(a, b).notes[0].title).toBe("new");
});
it("retains bookmark and deletion sets without duplicates", () => {
  const a = { ...emptyState(), bookmarks: ["q1"], deletedCards: ["c1"] };
  const b = { ...emptyState(), bookmarks: ["q1", "q2"], deletedCards: ["c1"] };
  expect(mergeStates(a, b).bookmarks).toEqual(["q1", "q2"]);
  expect(mergeStates(a, b).deletedCards).toEqual(["c1"]);
});

it("rejects unknown questions before rendering imported sessions", () => {
  const s = emptyState();
  s.quizzes = [
    {
      id: "q",
      questionIds: ["missing"],
      answers: {},
      flags: [],
      startedAt: "2026-11-07T00:00:00.000Z",
      deadline: 1000,
      submittedAt: null,
      status: "in_progress",
      exam: true,
    },
  ];
  expect(() => parseBackup(JSON.stringify(s))).toThrow("Soal tidak dikenal");
});
it("rejects duplicate record IDs", () => {
  const s = emptyState();
  const n = {
    id: "n",
    title: "note",
    body: "",
    subjectId: "s1",
    tags: "",
    pinned: false,
    updatedAt: "2026-11-07T00:00:00.000Z",
  };
  s.notes = [n, n];
  expect(() => parseBackup(JSON.stringify(s))).toThrow("ID duplikat");
});

it("rejects OSCE sessions pointing to an unknown station", () => {
  const s = emptyState();
  s.osce = [
    {
      id: "o",
      stationId: "missing",
      at: "2026-11-07T00:00:00.000Z",
      checked: [],
      notes: "",
      seconds: 0,
    },
  ];
  expect(() => parseBackup(JSON.stringify(s))).toThrow("Station");
});
