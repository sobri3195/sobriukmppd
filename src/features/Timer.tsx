import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useStore } from "../lib/store";
import { uid } from "../lib/model";
import { getTopics } from "../data";
import { Button, Field, SubjectSelect, PageTitle } from "../components/shared";
import { elapsed, completeTimer, toggleTimer } from "../lib/timer";
export default function Timer() {
  const { data, update } = useStore();
  const [tick, setTick] = useState(Date.now());
  const [subject, setSubject] = useState("s1");
  const [topic, setTopic] = useState("");
  const [mode, setMode] = useState<"stopwatch" | "pomodoro" | "custom">(
    "pomodoro",
  );
  const [minutes, setMinutes] = useState(25);
  const [rest, setRest] = useState(5);
  const [restEnd, setRestEnd] = useState<number | null>(null);
  const timer = data.timer;
  useEffect(() => {
    const interval = setInterval(() => setTick(Date.now()), 500);
    return () => clearInterval(interval);
  }, []);
  const ms = timer ? elapsed(timer, tick) : 0;
  const remaining =
    timer?.mode === "stopwatch"
      ? ms
      : Math.max(0, (timer?.targetSeconds ?? minutes * 60) * 1000 - ms);
  const seconds = Math.floor(remaining / 1000);
  function finish() {
    if (!timer) return;
    const actual = Math.min(
      elapsed(timer),
      timer.mode === "stopwatch" ? 86_400_000 : timer.targetSeconds * 1000,
    );
    const saved = update((s) => completeTimer(s, timer.id));
    if (saved)
      toast.success(`Sesi tersimpan · ${(actual / 60000).toFixed(1)} menit`);
    else
      toast.error("Sesi ada di memori. Ekspor backup atau coba simpan ulang.");
    if (timer.mode === "pomodoro") setRestEnd(Date.now() + rest * 60000);
  }
  useEffect(() => {
    if (
      timer?.running &&
      timer.mode !== "stopwatch" &&
      elapsed(timer, tick) >= timer.targetSeconds * 1000
    ) {
      update((s) =>
        !s.timer || s.timer.id !== timer.id
          ? s
          : {
              ...s,
              timer: {
                ...s.timer,
                running: false,
                elapsedMs: s.timer.targetSeconds * 1000,
              },
            },
      );
      toast.info("Waktu fokus selesai. Simpan sesi untuk mencatat progres.");
    }
  }, [tick, timer, update]);
  return (
    <>
      <PageTitle eyebrow="SATU SESI, SATU LANGKAH MAJU" title="Ruang fokus" />
      <section className="card timer-card">
        <span className="badge">
          {timer ? timer.mode : mode} ·{" "}
          {timer ? (timer.running ? "Berjalan" : "Dijeda") : "Siap mulai"}
        </span>
        <div className="timer-display" role="timer">
          {String(Math.floor(seconds / 3600)).padStart(2, "0")}:
          {String(Math.floor(seconds / 60) % 60).padStart(2, "0")}:
          {String(seconds % 60).padStart(2, "0")}
        </div>
        <p className="muted">Fokus pada proses. Progres akan mengikuti.</p>
        {!timer ? (
          <form
            className="stack timer-form"
            onSubmit={(e) => {
              e.preventDefault();
              setRestEnd(null);
              update((s) => ({
                ...s,
                timer: {
                  id: uid(),
                  subjectId: subject,
                  topicId: topic,
                  mode,
                  targetSeconds: minutes * 60,
                  elapsedMs: 0,
                  startedAt: Date.now(),
                  running: true,
                },
              }));
            }}
          >
            <Field label="Bidang">
              <SubjectSelect
                value={subject}
                onChange={(v) => {
                  setSubject(v);
                  setTopic("");
                }}
              />
            </Field>
            <Field label="Topik (opsional)">
              <select value={topic} onChange={(e) => setTopic(e.target.value)}>
                <option value="">Tanpa topik</option>
                {getTopics(data)
                  .filter((t) => t.subjectId === subject)
                  .map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title}
                    </option>
                  ))}
              </select>
            </Field>
            <div className="toolbar">
              <select
                aria-label="Mode timer"
                value={mode}
                onChange={(e) => setMode(e.target.value as typeof mode)}
              >
                <option value="pomodoro">Pomodoro</option>
                <option value="stopwatch">Stopwatch</option>
                <option value="custom">Custom</option>
              </select>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setMode("pomodoro");
                  setMinutes(25);
                  setRest(5);
                }}
              >
                25/5
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setMode("pomodoro");
                  setMinutes(50);
                  setRest(10);
                }}
              >
                50/10
              </Button>
            </div>
            <Field label="Durasi fokus (menit)">
              <input
                type="number"
                min="1"
                max="720"
                required
                value={minutes}
                onChange={(e) => setMinutes(+e.target.value)}
              />
            </Field>
            {mode === "pomodoro" && (
              <Field label="Istirahat (menit)">
                <input
                  type="number"
                  min="1"
                  max="60"
                  value={rest}
                  onChange={(e) => setRest(+e.target.value)}
                />
              </Field>
            )}
            <Button type="submit">Mulai fokus</Button>
          </form>
        ) : (
          <div className="actions center">
            <Button
              variant="outline"
              onClick={() =>
                update((s) =>
                  !s.timer ? s : { ...s, timer: toggleTimer(s.timer) },
                )
              }
            >
              {timer.running ? "Jeda" : "Lanjutkan"}
            </Button>
            <Button onClick={finish}>Selesai & simpan</Button>
            <Button
              variant="ghost"
              onClick={() => {
                if (confirm("Buang sesi tanpa menyimpan?"))
                  update((s) => ({ ...s, timer: null }));
              }}
            >
              Buang
            </Button>
          </div>
        )}
        {restEnd && (
          <p role="status">
            Istirahat: {Math.max(0, Math.ceil((restEnd - tick) / 60000))} menit
            tersisa. Mulai sesi berikutnya saat siap.
          </p>
        )}
        <p className="small muted">
          Sesi dipulihkan setelah refresh. Streak dihitung untuk sesi minimal
          satu menit.
        </p>
      </section>
    </>
  );
}
