import { toast } from "sonner";
import { notifySaved } from "../lib/feedback";
import { useState, useEffect } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useStore } from "../lib/store";
import { getTopics, subjectName } from "../data";
import { subjectStats } from "../lib/learning";
import { topicSchema, uid, type Topic } from "../lib/model";
import {
  Button,
  PageTitle,
  Progress,
  Field,
  Modal,
  SubjectSelect,
  Empty,
} from "../components/shared";
export default function Subjects() {
  const { subjectId } = useParams();
  const { data, update } = useStore();
  const [params] = useSearchParams();
  const [search, setSearch] = useState(params.get("search") ?? "");
  useEffect(() => setSearch(params.get("search") ?? ""), [params]);
  const [sort, setSort] = useState("name");
  const [edit, setEdit] = useState<Topic | null>(null);
  const topics = getTopics(data).filter(
    (t) =>
      (!subjectId || t.subjectId === subjectId) &&
      `${t.title} ${t.notes}`.toLowerCase().includes(search.toLowerCase()),
  );
  let stats = subjectStats(data);
  if (sort === "progress")
    stats = stats.sort((a, b) => a.progress - b.progress);
  if (sort === "weak")
    stats = stats.sort(
      (a, b) =>
        (a.answered >= 3 ? a.accuracy : 101) -
        (b.answered >= 3 ? b.accuracy : 101),
    );
  return (
    <>
      <PageTitle
        eyebrow="BANGUN PEMAHAMAN, TOPIK DEMI TOPIK"
        title={subjectId ? subjectName(subjectId) : "Materi & bidang"}
      >
        <Button
          onClick={() =>
            setEdit({
              id: uid(),
              subjectId: subjectId ?? "s1",
              title: "",
              status: "Belum dipelajari",
              notes: "",
              bookmark: false,
            })
          }
        >
          + Tambah topik
        </Button>
      </PageTitle>
      <div className="toolbar">
        <input
          aria-label="Cari materi"
          placeholder="Cari topik atau catatan…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          aria-label="Urutkan bidang"
          value={sort}
          onChange={(e) => setSort(e.target.value)}
        >
          <option value="name">Urutan bidang</option>
          <option value="progress">Progres terendah</option>
          <option value="weak">Akurasi terendah</option>
        </select>
      </div>
      {!subjectId && !search && (
        <div className="subject-grid">
          {stats.map((s, i) => (
            <Link
              className="card subject-card"
              to={`/belajar/materi/${s.id}`}
              key={s.id}
            >
              <div className="section-heading">
                <span className="icon-box" style={{ color: s.color }}>
                  {" "}
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="small muted">{s.progress.toFixed(0)}%</span>
              </div>
              <h3>{s.name}</h3>
              <Progress value={s.progress} />
              <p className="small muted">
                {s.minutes.toFixed(0)} menit ·{" "}
                {s.answered >= 3
                  ? `${s.accuracy.toFixed(0)}% akurasi`
                  : "Data latihan belum cukup"}
              </p>
            </Link>
          ))}
        </div>
      )}
      {(subjectId || search) && (
        <section className="card">
          {!topics.length && (
            <Empty>Belum ada topik. Tambahkan topik untuk bidang ini.</Empty>
          )}
          {topics.map((t) => (
            <div className="topic-row" key={t.id}>
              <div>
                <strong>
                  {t.bookmark ? "★ " : ""}
                  {t.title}
                </strong>
                <small>{subjectName(t.subjectId)}</small>
                {t.notes && <p className="muted">{t.notes}</p>}
              </div>
              <select
                aria-label={`Status ${t.title}`}
                value={t.status}
                onChange={(e) =>
                  update((s) => ({
                    ...s,
                    topics: [
                      ...s.topics.filter((x) => x.id !== t.id),
                      { ...t, status: e.target.value as Topic["status"] },
                    ],
                  }))
                }
              >
                {[
                  "Belum dipelajari",
                  "Sedang dipelajari",
                  "Sudah dipelajari",
                  "Perlu review",
                  "Dikuasai",
                ].map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
              <Button variant="outline" size="sm" onClick={() => setEdit(t)}>
                Edit
              </Button>
            </div>
          ))}
          <Link to="/latihan">Latih pemahaman dengan soal →</Link>
          <p className="small muted">
            Status materi adalah refleksi mandiri; tidak memvalidasi kemampuan
            klinis.
          </p>
        </section>
      )}
      {edit && (
        <Modal title="Topik belajar" close={() => setEdit(null)}>
          <form
            className="stack"
            onSubmit={(e) => {
              e.preventDefault();
              const validated = topicSchema.safeParse(edit);
              if (!validated.success) {
                toast.error(validated.error.issues[0].message);
                return;
              }
              update((s) => ({
                ...s,
                topics: [...s.topics.filter((x) => x.id !== edit.id), edit],
              }));
              setEdit(null);
              notifySaved("Topik tersimpan");
            }}
          >
            <Field label="Judul">
              <input
                required
                maxLength={200}
                value={edit.title}
                onChange={(e) => setEdit({ ...edit, title: e.target.value })}
              />
            </Field>
            <Field label="Bidang">
              <SubjectSelect
                value={edit.subjectId}
                onChange={(v) => setEdit({ ...edit, subjectId: v })}
              />
            </Field>
            <Field label="Catatan">
              <textarea
                maxLength={20000}
                value={edit.notes}
                onChange={(e) => setEdit({ ...edit, notes: e.target.value })}
              />
            </Field>
            <label>
              <input
                type="checkbox"
                checked={edit.bookmark}
                onChange={(e) =>
                  setEdit({ ...edit, bookmark: e.target.checked })
                }
              />{" "}
              Bookmark
            </label>
            <div className="actions">
              <Button type="submit">Simpan topik</Button>
              <Button
                type="button"
                variant="destructive"
                onClick={() => {
                  if (confirm("Hapus topik ini?")) {
                    update((s) => ({
                      ...s,
                      topics: s.topics.filter((t) => t.id !== edit.id),
                      deletedTopics: [...s.deletedTopics, edit.id],
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
    </>
  );
}
