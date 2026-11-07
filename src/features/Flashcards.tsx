import { notifySaved } from "../lib/feedback";
import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { getCards, subjectName } from "../data";
import { useStore } from "../lib/store";
import { cardSchema, uid, type Card } from "../lib/model";
import { localDate, schedule, latestReview } from "../lib/learning";
import {
  Button,
  PageTitle,
  Field,
  SubjectSelect,
  Modal,
  Empty,
} from "../components/shared";
export default function Flashcards() {
  const { data, update } = useStore();
  const [subject, setSubject] = useState("");
  const [query, setQuery] = useState("");
  const [dueOnly, setDueOnly] = useState(true);
  const [favorites, setFavorites] = useState(false);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [params] = useSearchParams();
  const [edit, setEdit] = useState<Card | null>(() =>
    params.has("new")
      ? { id: uid(), subjectId: "s1", front: "", back: "", favorite: false }
      : null,
  );
  const cards = getCards(data).filter((c) => {
    const r = latestReview(data.reviews, c.id);
    return (
      (!subject || c.subjectId === subject) &&
      (!favorites || c.favorite) &&
      (!dueOnly || !r || r.dueDate <= localDate()) &&
      `${c.front} ${c.back}`.toLowerCase().includes(query.toLowerCase())
    );
  });
  const card = cards[index % Math.max(1, cards.length)];
  const latest = card ? latestReview(data.reviews, card.id) : undefined;
  function rate(quality: number) {
    if (!card) return;
    const saved = update((s) => ({
      ...s,
      reviews: [
        ...s.reviews,
        { id: uid(), cardId: card.id, ...schedule(latest, quality) },
      ],
    }));
    setFlipped(false);
    if (saved) notifySaved("Review tersimpan");
    else
      toast.error(
        "Review belum tersimpan di browser. Ekspor backup atau coba simpan ulang.",
      );
    if (!dueOnly) setIndex(index + 1);
  }
  return (
    <>
      <PageTitle
        eyebrow="INGAT LEBIH LAMA, REVIEW SECARA BERKALA"
        title="Flashcard"
      >
        <Button
          onClick={() =>
            setEdit({
              id: uid(),
              subjectId: subject || "s1",
              front: "",
              back: "",
              favorite: false,
            })
          }
        >
          + Tambah flashcard
        </Button>
      </PageTitle>
      <div className="toolbar">
        <SubjectSelect
          value={subject}
          onChange={(v) => {
            setSubject(v);
            setIndex(0);
            setFlipped(false);
          }}
          all
        />
        <input
          aria-label="Cari flashcard"
          placeholder="Cari kartu…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setFlipped(false);
          }}
        />
        <label className="check">
          <input
            type="checkbox"
            checked={dueOnly}
            onChange={(e) => {
              setDueOnly(e.target.checked);
              setFlipped(false);
            }}
          />{" "}
          Baru / jatuh tempo
        </label>
        <label className="check">
          <input
            type="checkbox"
            checked={favorites}
            onChange={(e) => setFavorites(e.target.checked)}
          />{" "}
          Favorit
        </label>
      </div>
      <p className="muted">
        {cards.length} kartu dalam pilihan ·{" "}
        {
          getCards(data).filter((c) => {
            const r = latestReview(data.reviews, c.id);
            return r && r.dueDate < localDate();
          }).length
        }{" "}
        overdue · Materi latihan — belum divalidasi klinis
      </p>
      {!card ? (
        <Empty>
          Semua kartu pada pilihan ini sudah direview. Kamu bisa melihat seluruh
          deck dengan mematikan filter jatuh tempo.
        </Empty>
      ) : (
        <section className="card flash-area">
          <div className="section-heading">
            <span className="badge">{subjectName(card.subjectId)}</span>
            <Button
              variant="ghost"
              onClick={() =>
                update((s) => ({
                  ...s,
                  cards: [
                    ...s.cards.filter((c) => c.id !== card.id),
                    { ...card, favorite: !card.favorite },
                  ],
                }))
              }
            >
              {card.favorite ? "★ Favorit" : "☆ Favorit"}
            </Button>
          </div>
          <button
            className={`flashcard ${flipped ? "flipped" : ""}`}
            onClick={() => setFlipped(!flipped)}
            aria-label="Balik flashcard"
          >
            <span className="eyebrow">
              {flipped ? "JAWABAN" : "PERTANYAAN"}
            </span>
            <strong>{flipped ? card.back : card.front}</strong>
            <small>Klik atau tekan Enter untuk membalik</small>
          </button>
          {flipped ? (
            <>
              <p>Seberapa baik kamu mengingatnya?</p>
              <div className="rating-row">
                {[
                  "0 · Lupa",
                  "1 · Sulit",
                  "2 · Hampir",
                  "3 · Cukup",
                  "4 · Baik",
                  "5 · Lancar",
                ].map((v, i) => (
                  <Button variant="outline" key={v} onClick={() => rate(i)}>
                    {v}
                  </Button>
                ))}
              </div>
            </>
          ) : (
            <p className="muted">Coba jawab sebelum membuka kartu.</p>
          )}
          <div className="section-heading">
            <Button
              variant="ghost"
              onClick={() => {
                setIndex((index + cards.length - 1) % cards.length);
                setFlipped(false);
              }}
            >
              ← Sebelumnya
            </Button>
            <span className="small muted">
              {latest
                ? `Review berikut: ${latest.dueDate}`
                : "Kartu baru · belum dipelajari"}
            </span>
            <Button
              variant="ghost"
              onClick={() => {
                setIndex(index + 1);
                setFlipped(false);
              }}
            >
              Berikutnya →
            </Button>
          </div>
          <Button variant="outline" onClick={() => setEdit(card)}>
            Edit kartu
          </Button>
        </section>
      )}
      {edit && (
        <Modal title="Flashcard" close={() => setEdit(null)}>
          <form
            className="stack"
            onSubmit={(e) => {
              e.preventDefault();
              const validated = cardSchema.safeParse(edit);
              if (!validated.success) {
                toast.error(validated.error.issues[0].message);
                return;
              }
              update((s) => ({
                ...s,
                cards: [...s.cards.filter((c) => c.id !== edit.id), edit],
              }));
              setEdit(null);
              notifySaved("Kartu tersimpan");
            }}
          >
            <Field label="Bidang">
              <SubjectSelect
                value={edit.subjectId}
                onChange={(v) => setEdit({ ...edit, subjectId: v })}
              />
            </Field>
            <Field label="Depan">
              <textarea
                required
                maxLength={5000}
                value={edit.front}
                onChange={(e) => setEdit({ ...edit, front: e.target.value })}
              />
            </Field>
            <Field label="Belakang">
              <textarea
                required
                maxLength={10000}
                value={edit.back}
                onChange={(e) => setEdit({ ...edit, back: e.target.value })}
              />
            </Field>
            <div className="actions">
              <Button type="submit">Simpan kartu</Button>
              <Button
                type="button"
                variant="destructive"
                onClick={() => {
                  if (confirm("Hapus kartu ini?")) {
                    update((s) => ({
                      ...s,
                      cards: s.cards.filter((c) => c.id !== edit.id),
                      deletedCards: [...new Set([...s.deletedCards, edit.id])],
                    }));
                    setEdit(null);
                  }
                }}
              >
                Hapus
              </Button>
            </div>
          </form>
        </Modal>
      )}
      <section className="card mt">
        <h3>Jadwal review SM-2 sederhana</h3>
        <p className="muted">
          Nilai 0–2 mengulang dari interval 1 hari. Recall baik: 1 hari, 6 hari,
          lalu interval dikalikan easiness factor (minimal 1,3). Tanggal jatuh
          tempo memakai kalender lokal. Kartu baru tidak dihitung sebagai
          dikuasai.
        </p>
      </section>
    </>
  );
}
