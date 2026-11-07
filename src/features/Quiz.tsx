import { useEffect, useState } from "react";
import { Link, useNavigate, useParams, useLocation } from "react-router-dom";
import { Bookmark, Flag, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { questions, subjectName } from "../data";
import { useStore } from "../lib/store";
import { uid, now } from "../lib/model";
import { score, finishQuiz, subjectStats } from "../lib/learning";
import {
  Button,
  Field,
  SubjectSelect,
  PageTitle,
  Empty,
  Progress,
} from "../components/shared";
export default function QuizPage() {
  const { data, update } = useStore();
  const navigate = useNavigate();
  const location = useLocation();
  const { sessionId } = useParams();
  const [subject, setSubject] = useState("");
  const [mode, setMode] = useState("new");
  const [count, setCount] = useState(10);
  const [duration, setDuration] = useState(15);
  const [exam, setExam] = useState(location.pathname.includes("tryout"));
  const [index, setIndex] = useState(0);
  const [reveal, setReveal] = useState(false);
  const [tick, setTick] = useState(Date.now());
  const quiz = data.quizzes.find((q) => q.id === sessionId);
  const results = location.pathname.includes("/hasil/");
  const wrongIds = new Set(
    data.quizzes
      .filter((q) => q.submittedAt)
      .flatMap((q) =>
        q.questionIds.filter(
          (id) =>
            q.answers[id] &&
            q.answers[id] !==
              questions.find((x) => x.id === id)?.correctOptionId,
        ),
      ),
  );
  const answeredIds = new Set(
    data.quizzes
      .filter((q) => q.submittedAt)
      .flatMap((q) => Object.keys(q.answers)),
  );
  const weak = new Set(
    subjectStats(data)
      .filter((s) => s.answered >= 3 && s.accuracy < 70)
      .map((s) => s.id),
  );
  const pool = questions.filter(
    (q) =>
      (!subject || q.subjectId === subject) &&
      (mode === "wrong"
        ? wrongIds.has(q.id)
        : mode === "bookmark"
          ? data.bookmarks.includes(q.id)
          : mode === "weak"
            ? weak.has(q.subjectId)
            : mode === "unseen"
              ? !answeredIds.has(q.id)
              : true),
  );
  useEffect(() => {
    setIndex(0);
    setReveal(false);
  }, [sessionId]);
  useEffect(() => {
    if (!quiz || quiz.status !== "in_progress") return;
    const i = setInterval(() => setTick(Date.now()), 500);
    return () => clearInterval(i);
  }, [quiz]);
  useEffect(() => {
    if (quiz?.status === "in_progress" && tick >= quiz.deadline) {
      update((s) => ({
        ...s,
        quizzes: s.quizzes.map((q) =>
          q.id === quiz.id ? finishQuiz(q, tick) : q,
        ),
      }));
      navigate(`/latihan/hasil/${quiz.id}`, { replace: true });
      toast.info("Waktu habis. Jawaban otomatis disimpan.");
    }
  }, [tick, quiz, update, navigate]);
  function start() {
    if (pool.length < count) {
      toast.error("Jumlah soal tersedia tidak mencukupi.");
      return;
    }
    const ids = pool.map((q) => q.id);
    for (let i = ids.length - 1; i > 0; i--) {
      const buffer = new Uint32Array(1);
      crypto.getRandomValues(buffer);
      const j = buffer[0] % (i + 1);
      [ids[i], ids[j]] = [ids[j], ids[i]];
    }
    const id = uid();
    update((s) => ({
      ...s,
      quizzes: [
        ...s.quizzes,
        {
          id,
          questionIds: ids.slice(0, count),
          answers: {},
          flags: [],
          startedAt: now(),
          deadline: Date.now() + duration * 60000,
          submittedAt: null,
          status: "in_progress",
          exam,
        },
      ],
    }));
    navigate(`/latihan/tryout/${id}`);
  }
  if (sessionId && !quiz)
    return (
      <Empty>
        Sesi tidak ditemukan. <Link to="/latihan">Kembali ke latihan</Link>
      </Empty>
    );
  if (quiz && (results || quiz.status !== "in_progress")) {
    const result = score(quiz);
    return (
      <>
        <PageTitle eyebrow="EVALUASI, PAHAMI, ULANGI" title="Hasil latihan">
          <Button asChild>
            <Link to="/latihan">Latihan lagi</Link>
          </Button>
        </PageTitle>
        <section className="card result-hero">
          <h2>{result.percent.toFixed(1)}%</h2>
          <p>Skor latihan pribadi · target {data.profile!.targetScore}%</p>
          <p>
            {result.correct} benar · {result.wrong} salah · {result.unanswered}{" "}
            tidak dijawab
          </p>
          <p className="small muted">
            Durasi{" "}
            {Math.max(
              0,
              (Date.parse(quiz.submittedAt ?? quiz.startedAt) -
                Date.parse(quiz.startedAt)) /
                1000,
            ).toFixed(0)}{" "}
            detik · {quiz.status === "expired" ? "Waktu habis" : "Selesai"}
          </p>
          <p>Hasil simulasi ini bukan pernyataan kelulusan UKNPDPD.</p>
        </section>
        <div className="stack">
          {quiz.questionIds.map((id, i) => {
            const q = questions.find((x) => x.id === id)!;
            return (
              <section className="card" key={id}>
                <span
                  className={`badge ${quiz.answers[id] === q.correctOptionId ? "" : "warm"}`}
                >
                  {i + 1}.{" "}
                  {quiz.answers[id] === q.correctOptionId
                    ? "Benar"
                    : quiz.answers[id]
                      ? "Perlu review"
                      : "Tidak dijawab"}
                </span>
                <h3>{q.stem}</h3>
                <p>
                  Jawabanmu: {quiz.answers[id] ?? "—"} · Kunci:{" "}
                  {q.correctOptionId}
                </p>
                <p>{q.explanation}</p>
                <details>
                  <summary>Pembahasan pilihan & poin belajar</summary>
                  {q.options.map((o) => (
                    <p key={o.id}>
                      <strong>
                        {o.id}. {o.text}:
                      </strong>{" "}
                      {
                        q.optionExplanations[
                          o.id as keyof typeof q.optionExplanations
                        ]
                      }
                    </p>
                  ))}
                </details>
                <p className="small muted">
                  {subjectName(q.subjectId)} · {q.reviewStatus}
                </p>
              </section>
            );
          })}
        </div>
      </>
    );
  }
  if (quiz) {
    const question = questions.find((q) => q.id === quiz.questionIds[index])!;
    const remaining = Math.max(0, Math.ceil((quiz.deadline - tick) / 1000));
    const currentAnswer = quiz.answers[question.id];
    return (
      <>
        <PageTitle
          eyebrow={
            quiz.exam
              ? "PENGATURAN SIMULASI · BUKAN KETENTUAN RESMI"
              : "MODE BELAJAR"
          }
          title={`Soal ${index + 1} dari ${quiz.questionIds.length}`}
        >
          <span className="timer-badge" role="timer">
            {Math.floor(remaining / 60)}:
            {String(remaining % 60).padStart(2, "0")}
          </span>
        </PageTitle>
        <div className="quiz-layout">
          <section className="card">
            <div className="section-heading">
              <span className="badge">
                {subjectName(question.subjectId)} · {question.difficulty}
              </span>
              <div className="actions">
                <Button
                  variant="ghost"
                  aria-label="Bookmark soal"
                  onClick={() =>
                    update((s) => ({
                      ...s,
                      bookmarks: s.bookmarks.includes(question.id)
                        ? s.bookmarks.filter((id) => id !== question.id)
                        : [...s.bookmarks, question.id],
                    }))
                  }
                >
                  <Bookmark
                    size={20}
                    fill={
                      data.bookmarks.includes(question.id)
                        ? "currentColor"
                        : "none"
                    }
                  />
                </Button>
                <Button
                  variant="ghost"
                  aria-label="Tandai ragu"
                  onClick={() =>
                    update((s) => ({
                      ...s,
                      quizzes: s.quizzes.map((q) =>
                        q.id === quiz.id
                          ? {
                              ...q,
                              flags: q.flags.includes(question.id)
                                ? q.flags.filter((id) => id !== question.id)
                                : [...q.flags, question.id],
                            }
                          : q,
                      ),
                    }))
                  }
                >
                  <Flag
                    size={20}
                    fill={
                      quiz.flags.includes(question.id) ? "currentColor" : "none"
                    }
                  />
                </Button>
              </div>
            </div>
            <h2 className="question-stem">{question.stem}</h2>
            <fieldset className="options">
              <legend className="sr-only">Pilih satu jawaban</legend>
              {question.options.map((o) => (
                <label
                  className={`option ${currentAnswer === o.id ? "selected" : ""}`}
                  key={o.id}
                >
                  <input
                    type="radio"
                    name="answer"
                    value={o.id}
                    checked={currentAnswer === o.id}
                    onChange={() => {
                      setReveal(false);
                      update((s) => ({
                        ...s,
                        quizzes: s.quizzes.map((q) =>
                          q.id === quiz.id &&
                          q.status === "in_progress" &&
                          Date.now() < q.deadline
                            ? {
                                ...q,
                                answers: { ...q.answers, [question.id]: o.id },
                              }
                            : q,
                        ),
                      }));
                    }}
                  />
                  <span className="option-letter">{o.id}</span>
                  {o.text}
                </label>
              ))}
            </fieldset>
            {!quiz.exam && currentAnswer && (
              <Button variant="outline" onClick={() => setReveal(true)}>
                Periksa jawaban
              </Button>
            )}
            {reveal && !quiz.exam && (
              <div className="explanation">
                <strong>
                  {currentAnswer === question.correctOptionId
                    ? "Benar!"
                    : "Mari pelajari lagi."}
                </strong>
                <p>{question.explanation}</p>
                <p>Kunci: {question.correctOptionId}</p>
              </div>
            )}
            <div className="section-heading quiz-footer">
              <Button
                variant="outline"
                disabled={index === 0}
                onClick={() => {
                  setIndex(index - 1);
                  setReveal(false);
                }}
              >
                <ChevronLeft size={16} /> Sebelumnya
              </Button>
              <Button
                disabled={index === quiz.questionIds.length - 1}
                onClick={() => {
                  setIndex(index + 1);
                  setReveal(false);
                }}
              >
                Berikutnya <ChevronRight size={16} />
              </Button>
            </div>
            <p className="small muted">{question.reviewStatus}</p>
          </section>
          <aside className="card">
            <h3>Navigasi soal</h3>
            <div className="question-grid">
              {quiz.questionIds.map((id, i) => (
                <button
                  aria-label={`Ke soal ${i + 1}`}
                  className={`${index === i ? "current" : ""} ${quiz.answers[id] ? "answered" : ""} ${quiz.flags.includes(id) ? "flagged" : ""}`}
                  key={id}
                  onClick={() => {
                    setIndex(i);
                    setReveal(false);
                  }}
                >
                  {i + 1}
                </button>
              ))}
            </div>
            <p className="small muted">Teal: terjawab · Jingga: ragu</p>
            <Progress
              value={
                (Object.keys(quiz.answers).length / quiz.questionIds.length) *
                100
              }
            />
            <p>{Object.keys(quiz.answers).length} jawaban tersimpan otomatis</p>
            <Button
              className="wide"
              onClick={() => {
                if (
                  confirm(
                    `Finalisasi latihan? ${quiz.questionIds.length - Object.keys(quiz.answers).length} soal belum dijawab. Jawaban akan dikunci.`,
                  )
                ) {
                  update((s) => ({
                    ...s,
                    quizzes: s.quizzes.map((q) =>
                      q.id === quiz.id ? finishQuiz(q) : q,
                    ),
                  }));
                  navigate(`/latihan/hasil/${quiz.id}`);
                }
              }}
            >
              Selesaikan latihan
            </Button>
            <Button
              variant="ghost"
              className="wide"
              onClick={() => navigate("/latihan")}
            >
              Simpan & keluar
            </Button>
          </aside>
        </div>
      </>
    );
  }
  return (
    <>
      <PageTitle
        eyebrow="LATIHAN TERARAH, PEMAHAMAN LEBIH KUAT"
        title="Bank soal & tryout"
      />
      <div className="notice">
        {questions.length} soal orisinal · Materi latihan — belum divalidasi
        klinis. Bukan soal resmi UKNPDPD. Tidak ada rujukan medis yang diklaim.
      </div>
      <div className="two-col">
        <section className="card">
          <h2>Atur latihanmu</h2>
          <form
            className="stack"
            onSubmit={(e) => {
              e.preventDefault();
              start();
            }}
          >
            <Field label="Bidang">
              <SubjectSelect value={subject} onChange={setSubject} all />
            </Field>
            <Field label="Sumber soal">
              <select value={mode} onChange={(e) => setMode(e.target.value)}>
                <option value="new">Semua soal</option>
                <option value="unseen">Belum dijawab</option>
                <option value="weak">Bidang lemah (minimal 3 jawaban)</option>
                <option value="wrong">Review jawaban salah</option>
                <option value="bookmark">Bookmark</option>
              </select>
            </Field>
            <p>
              {pool.length} soal tersedia · tanpa pengulangan dalam satu sesi
            </p>
            <Field label="Jumlah soal">
              <input
                required
                type="number"
                min="1"
                max={pool.length || 1}
                value={count}
                onChange={(e) => setCount(+e.target.value)}
              />
            </Field>
            <Field label="Durasi simulasi (menit)">
              <input
                required
                type="number"
                min="1"
                max="480"
                value={duration}
                onChange={(e) => setDuration(+e.target.value)}
              />
            </Field>
            <label className="check">
              <input
                type="checkbox"
                checked={exam}
                onChange={(e) => setExam(e.target.checked)}
              />{" "}
              Mode ujian: pembahasan setelah finalisasi
            </label>
            <Button
              disabled={!pool.length || count > pool.length}
              type="submit"
            >
              Mulai latihan
            </Button>
          </form>
        </section>
        <section className="card">
          <h2>Preset tryout CBT</h2>
          <p className="muted">
            Pengaturan simulasi yang dapat kamu sesuaikan.
          </p>
          <div className="stack">
            {[
              { n: 10, label: "Mini", time: 15 },
              { n: 25, label: "Latihan", time: 35 },
              { n: 50, label: "Intensif", time: 70 },
              { n: 150, label: "Full", time: 200 },
            ].map((p) => (
              <Button
                key={p.n}
                variant="outline"
                disabled={p.n > questions.length}
                onClick={() => {
                  setSubject("");
                  setMode("new");
                  setCount(p.n);
                  setDuration(p.time);
                  setExam(true);
                  toast.info("Preset dipilih. Tekan Mulai latihan.");
                }}
              >
                {p.label} · {p.n} soal{" "}
                {p.n > questions.length ? "· belum tersedia" : ""}
              </Button>
            ))}
          </div>
          <h3 className="mt">Lanjutkan sesi</h3>
          {data.quizzes
            .filter((q) => q.status === "in_progress")
            .map((q) => (
              <Link
                className="list-link"
                key={q.id}
                to={`/latihan/tryout/${q.id}`}
              >
                {q.questionIds.length} soal ·{" "}
                {new Date(q.startedAt).toLocaleString("id-ID")} →
              </Link>
            ))}
          {!data.quizzes.some((q) => q.status === "in_progress") && (
            <p className="muted">Tidak ada sesi aktif.</p>
          )}
          <Link to="/riwayat">Lihat riwayat hasil →</Link>
        </section>
      </div>
    </>
  );
}
