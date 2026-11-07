import type { State } from "./model";
type Timer = NonNullable<State["timer"]>;
export const elapsed = (
  timer: Pick<Timer, "elapsedMs" | "startedAt" | "running">,
  at = Date.now(),
) => timer.elapsedMs + (timer.running ? Math.max(0, at - timer.startedAt) : 0);
export function toggleTimer(timer: Timer, at = Date.now()): Timer {
  return {
    ...timer,
    elapsedMs: elapsed(timer, at),
    startedAt: at,
    running: !timer.running,
  };
}
export function completeTimer(s: State, id: string, at = Date.now()): State {
  const timer = s.timer;
  if (!timer || timer.id !== id) return s;
  const actual = Math.min(
    elapsed(timer, at),
    timer.mode === "stopwatch" ? 86_400_000 : timer.targetSeconds * 1000,
  );
  return {
    ...s,
    timer: null,
    sessions: s.sessions.some((x) => x.id === id)
      ? s.sessions
      : [
          ...s.sessions,
          {
            id,
            subjectId: timer.subjectId,
            topicId: timer.topicId,
            minutes: actual / 60000,
            at: new Date(at).toISOString(),
          },
        ],
  };
}
