import { z } from "zod";
import { useEffect, useState, useRef } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { stations, subjectName } from "../data";
import { useStore } from "../lib/store";
import { uid, now } from "../lib/model";
import { Button, Field, PageTitle, Empty } from "../components/shared";
export default function Osce() {
  const { stationId } = useParams();
  return <OsceContent key={stationId ?? "list"} stationId={stationId} />;
}
function OsceContent({ stationId }: { stationId: string | undefined }) {
  const navigate = useNavigate();
  const { data, update } = useStore();
  const station = stations.find((s) => s.id === stationId);
  const key = `medtrack:v1:osce-draft:${stationId}`;
  const [draft] = useState(() => {
    try {
      const raw = sessionStorage.getItem(key);
      if (raw)
        return z
          .object({
            checked: z.array(z.string()),
            notes: z.string().max(20000),
            minutes: z.number().min(1).max(60),
            start: z.number().nullable(),
          })
          .parse(JSON.parse(raw) as unknown);
    } catch {
      /* Ignore invalid draft; never change recorded results. */
    }
    return {
      checked: [] as string[],
      notes: "",
      minutes: station?.durationMinutes ?? 8,
      start: null as number | null,
    };
  });
  const [checked, setChecked] = useState(draft.checked);
  const [notes, setNotes] = useState(draft.notes);
  const [minutes, setMinutes] = useState(draft.minutes);
  const [start, setStart] = useState(draft.start);
  const [tick, setTick] = useState(Date.now());
  const submitted = useRef(false);
  useEffect(() => {
    if (!station || submitted.current) return;
    try {
      sessionStorage.setItem(
        key,
        JSON.stringify({ checked, notes, minutes, start }),
      );
    } catch {
      /* Optional draft is unavailable; completed results still use main storage. */
    }
  }, [station, key, checked, notes, minutes, start]);
  useEffect(() => {
    if (!start) return;
    const t = setInterval(() => setTick(Date.now()), 500);
    return () => clearInterval(t);
  }, [start]);
  if (!stationId)
    return (
      <>
        <PageTitle eyebrow="LATIHAN KLINIS TERSTRUKTUR" title="Simulasi OSCE" />
        <div className="notice">
          Skenario pasien fiktif · Belum divalidasi klinis. Penilaian mandiri
          bukan pengganti evaluasi penguji klinis.
        </div>
        <div className="subject-grid">
          {stations.map((s, i) => (
            <Link
              className="card subject-card"
              key={s.id}
              to={`/latihan/osce/${s.id}`}
            >
              <span className="eyebrow">
                STATION {String(i + 1).padStart(2, "0")}
              </span>
              <h3>{s.title}</h3>
              <p className="muted">{s.scenario}</p>
              <span className="badge">
                {s.durationMinutes} menit · {subjectName(s.specialty)}
              </span>
            </Link>
          ))}
        </div>
        <section className="card mt">
          <h2>Riwayat simulasi</h2>
          {!data.osce.length && <Empty>Belum ada simulasi tersimpan.</Empty>}
          {data.osce.map((o) => {
            const st = stations.find((s) => s.id === o.stationId)!;
            return (
              <details key={o.id}>
                <summary>
                  {st.title} ·{" "}
                  {Math.round(
                    (st.checklistItems
                      .filter((i) => o.checked.includes(i.id))
                      .reduce((a, i) => a + i.weight, 0) /
                      st.maxScore) *
                      100,
                  )}
                  % · {new Date(o.at).toLocaleString("id-ID")}
                </summary>
                <p>
                  Terlewat:{" "}
                  {st.checklistItems
                    .filter((i) => !o.checked.includes(i.id))
                    .map((i) => i.label)
                    .join("; ") || "Tidak ada"}
                </p>
                <p>{o.notes}</p>
              </details>
            );
          })}
        </section>
      </>
    );
  if (!station) return <Empty>Station tidak ditemukan.</Empty>;
  const seconds = start
    ? Math.min(minutes * 60, Math.max(0, Math.floor((tick - start) / 1000)))
    : 0;
  const remaining = minutes * 60 - seconds;
  const total = station.checklistItems
    .filter((i) => checked.includes(i.id))
    .reduce((a, i) => a + i.weight, 0);
  return (
    <>
      <PageTitle
        eyebrow="SIMULASI MANDIRI · PASIEN FIKTIF"
        title={station.title}
      />
      <div className="two-col">
        <section className="card">
          <h2>Skenario</h2>
          <p>{station.scenario}</p>
          <p>{station.instructions}</p>
          <h3>Checklist berbobot</h3>
          {station.checklistItems.map((i) => (
            <label key={i.id} className="checklist-item">
              <input
                disabled={!start || remaining === 0}
                type="checkbox"
                checked={checked.includes(i.id)}
                onChange={(e) =>
                  setChecked(
                    e.target.checked
                      ? [...checked, i.id]
                      : checked.filter((id) => id !== i.id),
                  )
                }
              />
              <span>
                {i.label}{" "}
                <small>
                  ({i.weight} poin)
                  {station.criticalItems.includes(i.id) ? " · kritis" : ""}
                </small>
              </span>
            </label>
          ))}
          <Field label="Catatan evaluator">
            <textarea
              value={notes}
              maxLength={20000}
              onChange={(e) => setNotes(e.target.value)}
            />
          </Field>
        </section>
        <section className="card">
          <Field label="Durasi station (menit)">
            <input
              disabled={!!start}
              type="number"
              min="1"
              max="60"
              value={minutes}
              onChange={(e) =>
                setMinutes(Math.max(1, Math.min(60, +e.target.value)))
              }
            />
          </Field>
          <div className="timer-display small-timer" role="timer">
            {Math.floor(remaining / 60)}:
            {String(remaining % 60).padStart(2, "0")}
          </div>
          {!start ? (
            <Button
              onClick={() => {
                if (!Number.isFinite(minutes) || minutes < 1 || minutes > 60) {
                  toast.error("Durasi harus 1–60 menit");
                  return;
                }
                setStart(Date.now());
                setTick(Date.now());
              }}
            >
              Mulai station
            </Button>
          ) : (
            <p role="status">
              {remaining
                ? "Simulasi berjalan"
                : "Waktu station selesai. Checklist dikunci; tambahkan catatan dan simpan."}
            </p>
          )}
          <h2 className="mt">
            {Math.round((total / station.maxScore) * 100)}% pencapaian
          </h2>
          <p>
            {total} / {station.maxScore} poin
          </p>
          <p className="muted">
            Kritis terlewat:{" "}
            {station.criticalItems
              .filter((id) => !checked.includes(id))
              .map(
                (id) => station.checklistItems.find((i) => i.id === id)?.label,
              )
              .join("; ") || "Tidak ada"}
          </p>
          <Button
            disabled={!start}
            onClick={() => {
              if (submitted.current) return;
              submitted.current = true;
              const saved = update((s) => ({
                ...s,
                osce: [
                  ...s.osce,
                  {
                    id: uid(),
                    stationId: station.id,
                    at: now(),
                    checked,
                    notes,
                    seconds,
                  },
                ],
              }));
              try {
                sessionStorage.removeItem(key);
              } catch {
                /* optional draft */
              }
              if (saved) toast.success("Simulasi tersimpan");
              else
                toast.error(
                  "Simulasi ada di memori. Ekspor backup atau coba simpan ulang.",
                );
              navigate("/latihan/osce");
            }}
          >
            Simpan simulasi
          </Button>
        </section>
      </div>
    </>
  );
}
