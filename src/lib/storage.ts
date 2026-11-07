import { questions, stations } from "../data";
import { stateSchema, emptyState, type State } from "./model";
export const KEY = "medtrack:v1:state";
export function parseBackup(raw: string): State {
  if (raw.length > 15_000_000)
    throw new Error("Backup terlalu besar (maksimal 15 MB).");
  const parsed: unknown = JSON.parse(raw, (key, value) => {
    if (["__proto__", "constructor", "prototype"].includes(key))
      throw new Error("Kunci data tidak aman.");
    return value;
  });
  return validateState(stateSchema.parse(parsed));
}
function validateState(state: State): State {
  for (const field of [
    "tasks",
    "sessions",
    "quizzes",
    "cards",
    "reviews",
    "notes",
    "topics",
    "osce",
  ] as const) {
    if (new Set(state[field].map((x) => x.id)).size !== state[field].length)
      throw new Error("ID duplikat pada backup.");
  }
  for (const quiz of state.quizzes) {
    if (new Set(quiz.questionIds).size !== quiz.questionIds.length)
      throw new Error("Soal duplikat pada sesi.");
    for (const id of quiz.questionIds) {
      if (!questions.some((q) => q.id === id))
        throw new Error("Soal tidak dikenal.");
    }
    for (const [id, answer] of Object.entries(quiz.answers)) {
      if (
        !quiz.questionIds.includes(id) ||
        !questions
          .find((q) => q.id === id)
          ?.options.some((o) => o.id === answer)
      )
        throw new Error("Jawaban tidak valid.");
    }
    if (quiz.flags.some((id) => !quiz.questionIds.includes(id)))
      throw new Error("Flag tidak valid.");
    if (quiz.status === "in_progress" && quiz.submittedAt !== null)
      throw new Error("Status sesi tidak konsisten.");
    if (["submitted", "expired"].includes(quiz.status) && !quiz.submittedAt)
      throw new Error("Waktu finalisasi tidak tersedia.");
  }
  for (const attempt of state.osce) {
    const station = stations.find((x) => x.id === attempt.stationId);
    if (
      !station ||
      attempt.checked.some(
        (id) => !station.checklistItems.some((x) => x.id === id),
      )
    )
      throw new Error("Station atau checklist tidak dikenal.");
  }
  return state;
}
export function migrate(raw: unknown): State {
  return validateState(stateSchema.parse(raw));
}
export function load(storage: Storage): { state: State; error: string | null } {
  try {
    const raw = storage.getItem(KEY);
    return { state: raw ? parseBackup(raw) : emptyState(), error: null };
  } catch {
    return {
      state: emptyState(),
      error:
        "Data tidak dapat dimuat. Data asli dipertahankan; ekspor data mentah sebelum memulihkan backup.",
    };
  }
}
export function save(storage: Storage, state: State) {
  storage.setItem(KEY, JSON.stringify(validateState(stateSchema.parse(state))));
}
export function mergeStates(old: State, incoming: State): State {
  const result = {
    ...old,
    profile: incoming.profile ?? old.profile,
    timer: old.timer,
  };
  const fields = [
    "tasks",
    "sessions",
    "quizzes",
    "cards",
    "reviews",
    "notes",
    "topics",
    "osce",
  ] as const;
  for (const field of fields) {
    const map = new Map<string, unknown>(old[field].map((v) => [v.id, v]));
    incoming[field].forEach((v) => map.set(v.id, v));
    Object.assign(result, { [field]: [...map.values()] });
  }
  for (const field of ["bookmarks", "deletedCards", "deletedTopics"] as const)
    result[field] = [...new Set([...old[field], ...incoming[field]])];
  return validateState(stateSchema.parse(result));
}
export function download(
  name: string,
  body: string,
  type = "application/json",
) {
  const url = URL.createObjectURL(new Blob([body], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
