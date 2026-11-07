import { notifySaved } from "../lib/feedback";
import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  addDays,
  addMonths,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  format,
  parseISO,
} from "date-fns";
import { toast } from "sonner";
import { useStore } from "../lib/store";
import { uid, now, taskSchema, type Task } from "../lib/model";
import { generatePlan, localDate } from "../lib/learning";
import { subjectName, subjects } from "../data";
import {
  Button,
  Field,
  SubjectSelect,
  PageTitle,
  Modal,
  Empty,
} from "../components/shared";
export default function Planner() {
  const { data, update } = useStore();
  const [params] = useSearchParams();
  const [editing, setEditing] = useState<Task | null>(
    params.has("new") ? blank() : null,
  );
  const [date, setDate] = useState(localDate());
  const [view, setView] = useState("agenda");
  const [status, setStatus] = useState("");
  const [subject, setSubject] = useState("");
  const [generator, setGenerator] = useState(false);
  const [days, setDays] = useState(14);
  const [holidays, setHolidays] = useState("");
  const [minutes, setMinutes] = useState(data.profile!.dailyMinutes);
  const [questions, setQuestions] = useState(data.profile!.dailyQuestions);
  const [exam, setExam] = useState(data.profile!.cbt);
  const [priorities, setPriorities] = useState(
    data.profile!.priorities.join(","),
  );
  function blank(): Task {
    return {
      id: uid(),
      title: "",
      description: "",
      subjectId: "s1",
      topicId: "",
      date: localDate(),
      startTime: "09:00",
      endTime: "",
      durationMinutes: 25,
      priority: "medium",
      status: "pending",
      type: "reading",
      notes: "",
      createdAt: now(),
      updatedAt: now(),
      generated: false,
    };
  }
  const filtered = data.tasks.filter(
    (t) =>
      (!status || t.status === status) && (!subject || t.subjectId === subject),
  );
  const visible = filtered
    .filter((t) =>
      view === "month"
        ? t.date.slice(0, 7) === date.slice(0, 7)
        : view === "week"
          ? t.date >= date && t.date <= localDate(addDays(parseISO(date), 6))
          : t.date === date,
    )
    .sort(
      (a, b) =>
        a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime),
    );
  return (
    <>
      <PageTitle
        eyebrow="SEDIKIT DEMI SEDIKIT, SETIAP HARI"
        title="Rencana belajar"
      >
        <div className="actions">
          <Button variant="outline" onClick={() => setGenerator(true)}>
            Buat rencana otomatis
          </Button>
          <Button onClick={() => setEditing(blank())}>
            + Tambah aktivitas
          </Button>
        </div>
      </PageTitle>
      <section className="card">
        <div className="toolbar">
          <input
            aria-label="Tanggal agenda"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          <select
            aria-label="Tampilan kalender"
            value={view}
            onChange={(e) => setView(e.target.value)}
          >
            <option value="agenda">Agenda harian</option>
            <option value="week">Minggu</option>
            <option value="month">Bulan</option>
          </select>
          <select
            aria-label="Filter status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">Semua status</option>
            {["pending", "in_progress", "completed", "skipped"].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <SubjectSelect value={subject} onChange={setSubject} all />
        </div>
        {view === "month" && (
          <>
            <div className="section-heading">
              <Button
                variant="ghost"
                onClick={() =>
                  setDate(localDate(addMonths(parseISO(date), -1)))
                }
              >
                ← Bulan
              </Button>
              <strong>{format(parseISO(date), "MMMM yyyy")}</strong>
              <Button
                variant="ghost"
                onClick={() => setDate(localDate(addMonths(parseISO(date), 1)))}
              >
                Bulan →
              </Button>
            </div>
            <div className="calendar">
              {eachDayOfInterval({
                start: startOfMonth(parseISO(date)),
                end: endOfMonth(parseISO(date)),
              }).map((d) => (
                <button
                  className={localDate(d) === date ? "selected" : ""}
                  key={localDate(d)}
                  onClick={() => {
                    setDate(localDate(d));
                    setView("agenda");
                  }}
                >
                  <b>{format(d, "d")}</b>
                  <small>
                    {filtered.filter((t) => t.date === localDate(d)).length ||
                      "—"}
                  </small>
                </button>
              ))}
            </div>
          </>
        )}
        {!visible.length ? (
          <Empty>
            Tidak ada agenda pada periode ini. Tambahkan sesi atau buat rencana
            otomatis.
          </Empty>
        ) : (
          visible.map((t) => (
            <div className="planner-row" key={t.id}>
              <input
                aria-label={`Selesaikan ${t.title}`}
                type="checkbox"
                checked={t.status === "completed"}
                onChange={(e) =>
                  update((s) => ({
                    ...s,
                    tasks: s.tasks.map((x) =>
                      x.id === t.id
                        ? {
                            ...x,
                            status: e.target.checked ? "completed" : "pending",
                            updatedAt: now(),
                          }
                        : x,
                    ),
                  }))
                }
              />
              <div>
                <strong>{t.title}</strong>
                <small>
                  {t.date} · {t.startTime} · {t.durationMinutes} menit ·{" "}
                  {subjectName(t.subjectId)}
                </small>
                <span className="badge">
                  {t.status} · {t.priority}
                </span>
              </div>
              <Button variant="outline" size="sm" onClick={() => setEditing(t)}>
                Edit / jadwalkan ulang
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (confirm("Hapus aktivitas ini?"))
                    update((s) => ({
                      ...s,
                      tasks: s.tasks.filter((x) => x.id !== t.id),
                    }));
                }}
              >
                Hapus
              </Button>
            </div>
          ))
        )}
      </section>
      {editing && (
        <Modal title="Aktivitas belajar" close={() => setEditing(null)}>
          <form
            className="form-grid"
            onSubmit={(e) => {
              e.preventDefault();
              const result = taskSchema.safeParse(editing);
              if (!result.success) {
                toast.error(result.error.issues[0].message);
                return;
              }
              update((s) => ({
                ...s,
                tasks: [
                  ...s.tasks.filter((t) => t.id !== editing.id),
                  { ...result.data, updatedAt: now() },
                ],
              }));
              setEditing(null);
              notifySaved("Aktivitas tersimpan");
            }}
          >
            <Field label="Judul">
              <input
                required
                value={editing.title}
                onChange={(e) =>
                  setEditing({ ...editing, title: e.target.value })
                }
              />
            </Field>
            <Field label="Bidang">
              <SubjectSelect
                value={editing.subjectId}
                onChange={(v) => setEditing({ ...editing, subjectId: v })}
              />
            </Field>
            <Field label="Tanggal">
              <input
                required
                type="date"
                value={editing.date}
                onChange={(e) =>
                  setEditing({ ...editing, date: e.target.value })
                }
              />
            </Field>
            <Field label="Mulai">
              <input
                type="time"
                required
                value={editing.startTime}
                onChange={(e) =>
                  setEditing({ ...editing, startTime: e.target.value })
                }
              />
            </Field>
            <Field label="Durasi (menit)">
              <input
                type="number"
                min="1"
                max="720"
                value={editing.durationMinutes}
                onChange={(e) =>
                  setEditing({ ...editing, durationMinutes: +e.target.value })
                }
              />
            </Field>
            <Field label="Prioritas">
              <select
                value={editing.priority}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    priority: e.target.value as Task["priority"],
                  })
                }
              >
                {["low", "medium", "high"].map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </Field>
            <Field label="Status">
              <select
                value={editing.status}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    status: e.target.value as Task["status"],
                  })
                }
              >
                {["pending", "in_progress", "completed", "skipped"].map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </Field>
            <Field label="Jenis">
              <select
                value={editing.type}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    type: e.target.value as Task["type"],
                  })
                }
              >
                {[
                  "reading",
                  "question_practice",
                  "review",
                  "flashcard",
                  "osce",
                  "video",
                  "other",
                ].map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </Field>
            <Field label="Catatan">
              <textarea
                value={editing.notes}
                onChange={(e) =>
                  setEditing({ ...editing, notes: e.target.value })
                }
              />
            </Field>
            <Button type="submit">Simpan aktivitas</Button>
          </form>
        </Modal>
      )}
      {generator && (
        <Modal title="Rencana otomatis" close={() => setGenerator(false)}>
          <form
            className="stack"
            onSubmit={(e) => {
              e.preventDefault();
              const holidayList = holidays
                .split(",")
                .map((x) => x.trim())
                .filter(Boolean);
              if (holidayList.some((x) => !/^\d{4}-\d{2}-\d{2}$/.test(x))) {
                toast.error("Format hari libur YYYY-MM-DD, pisahkan koma.");
                return;
              }
              const plan = generatePlan({
                exam,
                days,
                minutes,
                questions,
                priorities: priorities.split(",").filter(Boolean),
                holidays: holidayList,
              });
              if (!plan.length) {
                toast.error("Tidak ada hari tersedia sebelum ujian.");
                return;
              }
              if (
                data.tasks.some((t) => t.generated) &&
                !confirm(
                  "Ganti hanya rencana otomatis yang belum selesai? Aktivitas manual dan selesai dipertahankan.",
                )
              )
                return;
              const capacity = plan.some(
                (t) =>
                  data.tasks
                    .filter(
                      (x) =>
                        x.date === t.date &&
                        (!x.generated || x.status === "completed"),
                    )
                    .reduce((n, x) => n + x.durationMinutes, 0) > 0,
              );
              if (capacity) {
                toast.error(
                  "Ada jadwal pada periode ini. Pilih periode kosong agar kapasitas harian tidak berlebih.",
                );
                return;
              }
              update((s) => ({
                ...s,
                tasks: [
                  ...s.tasks.filter(
                    (t) => !t.generated || t.status === "completed",
                  ),
                  ...plan,
                ],
              }));
              setGenerator(false);
              notifySaved(`${plan.length} sesi dibuat`);
            }}
          >
            <Field label="Tanggal ujian">
              <input
                required
                type="date"
                value={exam}
                onChange={(e) => setExam(e.target.value)}
              />
            </Field>
            <Field label="Jumlah hari tersedia (maksimal 365)">
              <input
                type="number"
                min="1"
                max="365"
                required
                value={days}
                onChange={(e) => setDays(+e.target.value)}
              />
            </Field>
            <Field label="Kapasitas menit per hari">
              <input
                type="number"
                min="5"
                max="720"
                required
                value={minutes}
                onChange={(e) => setMinutes(+e.target.value)}
              />
            </Field>
            <Field label="Target soal per hari evaluasi">
              <input
                type="number"
                min="1"
                max="500"
                required
                value={questions}
                onChange={(e) => setQuestions(+e.target.value)}
              />
            </Field>
            <Field label="Bidang prioritas">
              <select
                multiple
                value={priorities.split(",")}
                onChange={(e) =>
                  setPriorities(
                    [...e.target.selectedOptions].map((x) => x.value).join(","),
                  )
                }
              >
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Hari libur (YYYY-MM-DD, pisahkan koma)">
              <input
                value={holidays}
                onChange={(e) => setHolidays(e.target.value)}
              />
            </Field>
            <p className="small muted">
              Satu sesi per hari; review setiap sesi ketiga, evaluasi tiap tujuh
              sesi, dan review menjelang ujian. Rencana lama tidak diubah tanpa
              konfirmasi.
            </p>
            <Button type="submit">Buat rencana</Button>
          </form>
        </Modal>
      )}
    </>
  );
}
