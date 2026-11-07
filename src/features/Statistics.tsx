import { useState } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  LineChart,
  Line,
} from "recharts";
import { format, parseISO, subDays } from "date-fns";
import { useStore } from "../lib/store";
import { localDate, statistics, subjectStats, score } from "../lib/learning";
import type { State } from "../lib/model";
import { Empty, PageTitle, Progress } from "../components/shared";
export function ActivityChart({ data, days }: { data: State; days: number }) {
  const rows = Array.from({ length: days }, (_, i) => {
    const date = subDays(new Date(), days - 1 - i);
    return {
      day: format(date, "dd MMM"),
      menit: data.sessions
        .filter((s) => localDate(parseISO(s.at)) === localDate(date))
        .reduce((a, x) => a + x.minutes, 0),
    };
  });
  return (
    <div className="chart">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={rows}>
          <defs>
            <linearGradient id="activity-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0d9488" stopOpacity={0.22} />
              <stop offset="100%" stopColor="#0d9488" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            vertical={false}
            stroke="var(--border)"
            strokeDasharray="3 5"
          />
          <XAxis
            dataKey="day"
            tickLine={false}
            axisLine={false}
            fontSize={11}
            minTickGap={20}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            fontSize={11}
            width={30}
            allowDecimals={false}
          />
          <Tooltip />
          <Area
            type="monotone"
            dataKey="menit"
            stroke="#0d9488"
            strokeWidth={2.5}
            fill="url(#activity-fill)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
export default function Statistics() {
  const all = useStore((s) => s.data);
  const [days, setDays] = useState(30);
  const cutoff = days ? subDays(new Date(), days).toISOString() : "";
  const data = {
    ...all,
    sessions: all.sessions.filter((x) => x.at >= cutoff),
    quizzes: all.quizzes.filter(
      (x) => (x.submittedAt ?? x.startedAt) >= cutoff,
    ),
    reviews: all.reviews.filter((x) => x.at >= cutoff),
    tasks: all.tasks.filter((x) => x.date >= cutoff.slice(0, 10)),
  };
  const s = statistics(data);
  const subjects = subjectStats(data);
  const results = data.quizzes
    .filter((q) => q.submittedAt)
    .map((q, i) => ({ name: `#${i + 1}`, skor: score(q).percent }));
  return (
    <>
      <PageTitle eyebrow="KENALI POLA BELAJARMU" title="Statistik belajar">
        <select
          aria-label="Periode statistik"
          value={days}
          onChange={(e) => setDays(+e.target.value)}
        >
          {[7, 30, 90, 0].map((n) => (
            <option key={n} value={n}>
              {n ? `${n} hari` : "Seluruh waktu"}
            </option>
          ))}
        </select>
      </PageTitle>
      <div className="stats-grid">
        {[
          ["Jam belajar", (s.minutes / 60).toFixed(1)],
          ["Jawaban", s.answered],
          ["Akurasi", `${s.accuracy.toFixed(1)}%`],
          ["Sesi belajar", data.sessions.length],
          ["Tryout", s.tryouts],
          ["Review kartu", data.reviews.length],
          ["Tugas selesai", `${s.completion.toFixed(0)}%`],
          ["Streak terpanjang", `${s.longest} hari`],
        ].map(([k, v]) => (
          <div className="card stat-card" key={k}>
            <span>{k}</span>
            <strong>{v}</strong>
          </div>
        ))}
      </div>
      <div className="two-col">
        <section className="card">
          <h2>Waktu belajar · {days || 30} hari</h2>
          <ActivityChart data={data} days={days || 30} />
        </section>
        <section className="card">
          <h2>Tren hasil latihan</h2>
          {!results.length ? (
            <Empty>Selesaikan latihan untuk melihat tren skor.</Empty>
          ) : (
            <div className="chart">
              <ResponsiveContainer>
                <LineChart data={results}>
                  <XAxis dataKey="name" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Line dataKey="skor" stroke="#0d9488" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>
        <section className="card full">
          <h2>Akurasi per bidang</h2>
          <div className="chart">
            <ResponsiveContainer>
              <BarChart data={subjects.filter((s) => s.answered)}>
                <XAxis dataKey="name" hide />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Bar dataKey="accuracy" fill="#0d9488" radius={[5, 5, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          {!s.answered && (
            <p className="muted">
              Data belum mencukupi. Grafik hanya menggunakan jawaban latihan
              yang telah diselesaikan.
            </p>
          )}
        </section>
      </div>
      <section className="card">
        <h2>Penguasaan materi & area review</h2>
        {subjects.map((s) => (
          <div className="subject-stat" key={s.id}>
            <strong>{s.name}</strong>
            <span>
              {s.answered >= 3
                ? `${s.accuracy.toFixed(0)}% · ${s.answered} jawaban`
                : "Data belum mencukupi (minimal 3 jawaban)"}
            </span>
            <Progress value={s.progress} />
          </div>
        ))}
        <p className="small muted">
          Status belajar adalah penilaian mandiri, bukan kemampuan klinis
          tervalidasi.
        </p>
      </section>
    </>
  );
}
