import { useMemo } from "react";
import { Link } from "react-router-dom";
import { format, subDays, differenceInCalendarDays, parseISO } from "date-fns";
import { id } from "date-fns/locale";
import {
  ArrowUpRight,
  Clock3,
  Target,
  Flame,
  BookOpen,
  ChevronRight,
  CalendarDays,
  Play,
  Stethoscope,
  Layers,
} from "lucide-react";
import { useStore } from "../lib/store";
import {
  localDate,
  statistics,
  recommendations,
  score,
  subjectStats,
  latestReview,
} from "../lib/learning";
import { getCards, getTopics, subjectName } from "../data";
import { Button, PageTitle, Progress, Empty } from "../components/shared";
import { ActivityChart } from "../components/charts/ActivityChart";
import { isFinalized } from "../lib/quiz";
export default function Dashboard() {
  const { data, update } = useStore();
  const p = data.profile!;
  const stat = useMemo(() => statistics(data), [data]);
  const suggestions = useMemo(() => recommendations(data), [data]);
  const weak = useMemo(
    () =>
      subjectStats(data)
        .filter((s) => s.answered >= 3)
        .sort((a, b) => a.accuracy - b.accuracy)
        .slice(0, 3),
    [data],
  );
  const topics = getTopics(data);
  const progress = topics.length
    ? (topics.filter((t) => ["Sudah dipelajari", "Dikuasai"].includes(t.status))
        .length /
        topics.length) *
      100
    : 0;
  const recent = [
    ...data.sessions.map((x) => ({
      id: `study-${x.id}`,
      at: x.at,
      label: `Sesi belajar · ${x.minutes.toFixed(1)} menit`,
    })),
    ...data.quizzes.filter(isFinalized).map((x) => ({
      id: `quiz-${x.id}`,
      at: x.submittedAt!,
      label: `Latihan · ${score(x).percent.toFixed(0)}%`,
    })),
    ...data.reviews.map((x) => ({
      id: `review-${x.id}`,
      at: x.at,
      label: "Review flashcard",
    })),
    ...data.osce.map((x) => ({
      id: `osce-${x.id}`,
      at: x.at,
      label: "Simulasi OSCE",
    })),
    ...data.tasks
      .filter((t) => t.status === "completed")
      .map((t) => ({
        id: `task-${t.id}`,
        at: t.updatedAt,
        label: `Selesai · ${t.title}`,
      })),
  ]
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 5);
  const hour = new Date().getHours();
  const greeting =
    hour < 11 ? "pagi" : hour < 15 ? "siang" : hour < 18 ? "sore" : "malam";
  const today = localDate();
  const minutes = data.sessions
    .filter((x) => localDate(parseISO(x.at)) === today)
    .reduce((a, x) => a + x.minutes, 0);
  const answered = data.quizzes
    .filter(
      (x) =>
        isFinalized(x) &&
        x.submittedAt &&
        localDate(parseISO(x.submittedAt)) === today,
    )
    .reduce((a, x) => a + score(x).answered, 0);
  const tasks = data.tasks.filter((t) => t.date === today);
  const due = getCards(data).filter((c) => {
    const r = latestReview(data.reviews, c.id);
    return !r || r.dueDate <= today;
  }).length;
  return (
    <>
      <PageTitle
        eyebrow={format(new Date(), "EEEE, d MMMM yyyy", {
          locale: id,
        }).toUpperCase()}
        title={`Selamat ${greeting}, ${p.name} 👋`}
      >
        <Button asChild variant="outline">
          <Link to="/belajar/planner">
            <CalendarDays size={16} /> Rencana belajar
          </Link>
        </Button>
      </PageTitle>
      <p className="intro">
        Setiap langkah kecil membawamu lebih dekat ke tujuan.
      </p>
      <section className="hero">
        <div className="hero-copy">
          <span className="hero-tag">
            <span /> YOUR NEXT CHAPTER
          </span>
          <h2>
            Persiapan UKNPDPD.
            <br />
            Lebih terarah, lebih siap.
          </h2>
          <p>
            {minutes > 0
              ? "Hebat, kamu sudah meluangkan waktu untuk belajar hari ini."
              : "Bangun konsistensi, pahami konsep, dan rayakan progresmu."}
          </p>
          <Button asChild className="hero-button">
            <Link to="/belajar/timer">
              <Play size={16} /> Mulai belajar <ArrowUpRight size={17} />
            </Link>
          </Button>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <div className="medical-symbol">
            <Stethoscope size={76} strokeWidth={1.4} />
          </div>
          <span className="art-label">one day at a time.</span>
        </div>
        <div className="countdowns">
          {(["cbt", "osce"] as const).map((key) => {
            const days = differenceInCalendarDays(parseISO(p[key]), new Date());
            return (
              <Link to="/profil" key={key}>
                <span>
                  TARGET {key.toUpperCase()} <ArrowUpRight size={13} />
                </span>
                <strong>
                  {Math.max(0, days)}
                  <small> hari</small>
                </strong>
                <em>
                  {days < 0
                    ? "Tanggal target telah lewat"
                    : format(parseISO(p[key]), "d MMM yyyy", { locale: id })}
                </em>
              </Link>
            );
          })}
        </div>
      </section>
      <div className="stats-grid">
        {[
          {
            label: "Waktu belajar",
            value: `${(stat.minutes / 60).toFixed(1)} jam`,
            sub: `${data.sessions.length} sesi terselesaikan`,
            icon: Clock3,
          },
          {
            label: "Soal dikerjakan",
            value: stat.answered,
            sub: "Dari latihan yang selesai",
            icon: BookOpen,
          },
          {
            label: "Akurasi latihan",
            value: `${stat.accuracy.toFixed(0)}%`,
            sub: stat.answered ? "Terus asah pemahamanmu" : "Belum ada jawaban",
            icon: Target,
          },
          {
            label: "Streak belajar",
            value: `${stat.current} hari`,
            sub: `Terpanjang ${stat.longest} hari`,
            icon: Flame,
          },
        ].map((x) => (
          <section className="card stat-card" key={x.label}>
            <div className="section-heading">
              <span>{x.label}</span>
              <span className="icon-box">
                <x.icon size={18} />
              </span>
            </div>
            <strong>{x.value}</strong>
            <small>{x.sub}</small>
          </section>
        ))}
      </div>
      <div className="dashboard-grid">
        <section className="card">
          <div className="section-heading">
            <div>
              <h2>Aktivitas belajar</h2>
              <p className="small muted">Ruang untuk tumbuh, setiap harinya</p>
            </div>
            <span className="badge">7 hari terakhir</span>
          </div>
          <ActivityChart data={data} days={7} />
        </section>
        <section className="card">
          <div className="section-heading">
            <h2>Target hari ini</h2>
            <span className="icon-box">
              <Target size={18} />
            </span>
          </div>
          {[
            {
              label: "Waktu belajar",
              current: Math.floor(minutes),
              target: p.dailyMinutes,
              unit: "menit",
            },
            {
              label: "Latihan soal",
              current: answered,
              target: p.dailyQuestions,
              unit: "soal",
            },
            {
              label: "Review flashcard",
              current: data.reviews.filter(
                (r) => localDate(parseISO(r.at)) === today,
              ).length,
              target: 10,
              unit: "kartu",
            },
          ].map((x) => (
            <div className="target-row" key={x.label}>
              <div>
                <span>{x.label}</span>
                <small>
                  {x.current} / {x.target} {x.unit}
                </small>
              </div>
              <Progress value={(x.current / x.target) * 100} />
            </div>
          ))}
          <p className="small muted">
            Tidak harus sempurna. Yang penting terus melangkah.
          </p>
        </section>
        <section className="card">
          <div className="section-heading">
            <h2>
              Agenda hari ini <span className="count">{tasks.length}</span>
            </h2>
            <Link to="/belajar/planner">
              Lihat semua <ChevronRight size={14} />
            </Link>
          </div>
          {!tasks.length ? (
            <Empty>
              Belum ada agenda. Tambahkan satu langkah kecil untuk hari ini.
            </Empty>
          ) : (
            tasks.map((task) => (
              <label className="task-row" key={task.id}>
                <input
                  aria-label={`Selesaikan ${task.title}`}
                  type="checkbox"
                  checked={task.status === "completed"}
                  onChange={(e) =>
                    update((s) => ({
                      ...s,
                      tasks: s.tasks.map((t) =>
                        t.id === task.id
                          ? {
                              ...t,
                              status: e.target.checked
                                ? "completed"
                                : "pending",
                              updatedAt: new Date().toISOString(),
                            }
                          : t,
                      ),
                    }))
                  }
                />
                <span>
                  <strong>{task.title}</strong>
                  <small>
                    {subjectName(task.subjectId)} · {task.durationMinutes} menit
                  </small>
                </span>
                <span
                  className={`badge ${task.priority === "high" ? "warm" : ""}`}
                >
                  {task.startTime}
                </span>
              </label>
            ))
          )}
          <Button asChild variant="outline" className="wide">
            <Link to="/belajar/planner">+ Tambah agenda</Link>
          </Button>
        </section>
        <section className="card">
          <div className="section-heading">
            <h2>Fokus berikutnya</h2>
            <span className="badge">Rekomendasi lokal</span>
          </div>
          {suggestions.slice(0, 3).map((s, i) => (
            <Link
              className="recommendation"
              key={s.id}
              to={`/belajar/materi/${s.id}`}
            >
              <span className="recommendation-number">0{i + 1}</span>
              <div>
                <strong>{s.name}</strong>
                <small>{s.reason}</small>
                <small>
                  {s.suggestedMinutes} menit · {s.suggestedQuestions} soal ·{" "}
                  {s.dueCards} kartu jatuh tempo
                </small>
                {s.topic && <small>Topik: {s.topic}</small>}
              </div>
              <ChevronRight size={16} />
            </Link>
          ))}
          {!suggestions.some((s) => s.enoughData) && (
            <p className="small muted">
              Kerjakan lebih banyak soal agar rekomendasi belajar menjadi lebih
              akurat.
            </p>
          )}
          <p className="small muted">
            {due} kartu baru / jatuh tempo siap direview.
          </p>
        </section>
      </div>
      <div className="two-col">
        <section className="card">
          <h2>Progres materi & rencana</h2>
          <p>Materi dipelajari: {progress.toFixed(0)}%</p>
          <Progress value={progress} />
          <p className="mt">Rencana selesai: {stat.completion.toFixed(0)}%</p>
          <Progress value={stat.completion} />
          <h3 className="mt">Bidang yang perlu review</h3>
          {!weak.length ? (
            <p className="muted">
              Data belum mencukupi (minimal 3 jawaban per bidang).
            </p>
          ) : (
            weak.map((s) => (
              <Link
                className="list-link"
                key={s.id}
                to={`/belajar/materi/${s.id}`}
              >
                {s.name} · {s.accuracy.toFixed(0)}% ({s.answered} jawaban) →
              </Link>
            ))
          )}
        </section>
        <section className="card">
          <h2>Aktivitas terakhir</h2>
          {!recent.length ? (
            <Empty>Aktivitas belajar akan tercatat di sini.</Empty>
          ) : (
            recent.map((x) => (
              <p key={x.id} className="recent-row">
                <strong>{x.label}</strong>
                <small>{new Date(x.at).toLocaleString("id-ID")}</small>
              </p>
            ))
          )}
        </section>
      </div>
      <section className="mt">
        <div className="section-heading">
          <h2>Pilih langkahmu</h2>
          <span className="small muted">Belajar dengan ritmemu sendiri</span>
        </div>
        <div className="quick-grid">
          {[
            {
              to: "/belajar/timer",
              label: "Mulai Belajar",
              sub: "Catat sesi fokus",
              icon: Clock3,
            },
            {
              to: "/latihan?mode=wrong",
              label: "Review Kesalahan",
              sub: "Pahami kembali jawaban salah",
              icon: BookOpen,
            },
            {
              to: "/belajar/planner?new=1",
              label: "Tambah Jadwal",
              sub: "Rencanakan langkah berikutnya",
              icon: CalendarDays,
            },
            {
              to: "/latihan/quiz",
              label: "Latihan 10 Soal",
              sub: "Uji pemahaman konsep",
              icon: BookOpen,
            },
            {
              to: "/latihan/osce",
              label: "Simulasi OSCE",
              sub: "Latihan keterampilan klinis",
              icon: Stethoscope,
            },
            {
              to: "/belajar/flashcards",
              label: "Flashcard",
              sub: "Sedikit review, lebih melekat",
              icon: Layers,
            },
          ].map((x) => (
            <Link className="card quick-card" to={x.to} key={x.to}>
              <span className="icon-box">
                <x.icon size={23} />
              </span>
              <div>
                <h3>{x.label}</h3>
                <p className="small muted">{x.sub}</p>
              </div>
              <ArrowUpRight size={18} />
            </Link>
          ))}
        </div>
      </section>
      <p className="small muted footer-note">
        MEDTRACK UKNPDPD · Ruang belajar pribadi, bukan penilaian kompetensi
        klinis. <span>{format(subDays(new Date(), 0), "yyyy")}</span>
      </p>
    </>
  );
}
