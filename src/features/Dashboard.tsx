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
import { localDate, statistics, recommendations, score } from "../lib/learning";
import { getCards, subjectName } from "../data";
import { Button, PageTitle, Progress, Empty } from "../components/shared";
import { ActivityChart } from "./Statistics";
export default function Dashboard() {
  const { data, update } = useStore();
  const p = data.profile!;
  const stat = statistics(data);
  const hour = new Date().getHours();
  const greeting =
    hour < 11 ? "pagi" : hour < 15 ? "siang" : hour < 18 ? "sore" : "malam";
  const today = localDate();
  const minutes = data.sessions
    .filter((x) => localDate(parseISO(x.at)) === today)
    .reduce((a, x) => a + x.minutes, 0);
  const answered = data.quizzes
    .filter(
      (x) => x.submittedAt && localDate(parseISO(x.submittedAt)) === today,
    )
    .reduce((a, x) => a + score(x).answered, 0);
  const tasks = data.tasks.filter((t) => t.date === today);
  const due = getCards(data).filter((c) => {
    const r = data.reviews.filter((r) => r.cardId === c.id).at(-1);
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
          {recommendations(data)
            .slice(0, 3)
            .map((s, i) => (
              <Link
                className="recommendation"
                key={s.id}
                to={`/belajar/materi/${s.id}`}
              >
                <span className="recommendation-number">0{i + 1}</span>
                <div>
                  <strong>{s.name}</strong>
                  <small>{s.reason}</small>
                </div>
                <ChevronRight size={16} />
              </Link>
            ))}
          <p className="small muted">
            {due} kartu baru / jatuh tempo siap direview.
          </p>
        </section>
      </div>
      <section>
        <div className="section-heading">
          <h2>Pilih langkahmu</h2>
          <span className="small muted">Belajar dengan ritmemu sendiri</span>
        </div>
        <div className="quick-grid">
          {[
            {
              to: "/latihan",
              label: "Latihan CBT",
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
