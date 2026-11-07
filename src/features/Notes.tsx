import { notifySaved } from "../lib/feedback";
import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useStore } from "../lib/store";
import { uid, now, type State } from "../lib/model";
import { download } from "../lib/storage";
import { subjectName } from "../data";
import {
  Button,
  Field,
  PageTitle,
  SubjectSelect,
  Empty,
} from "../components/shared";
type Note = State["notes"][number];
export default function Notes() {
  const { data, update, updateDebounced, dirty, error } = useStore();
  const [params] = useSearchParams();
  const blank = (): Note => ({
    id: uid(),
    title: "Catatan baru",
    body: "",
    subjectId: "s1",
    tags: "",
    pinned: false,
    updatedAt: now(),
  });
  const [selected, setSelected] = useState<string | null>(null);
  const [newDraft] = useState<Note | null>(() =>
    params.has("new") ? blank() : null,
  );
  const edit =
    data.notes.find((n) => n.id === selected) ??
    (selected === null ? newDraft : null);
  function setEdit(note: Note | null) {
    if (!note) {
      setSelected("");
      return;
    }
    setSelected(note.id);
    updateDebounced((s) => ({
      ...s,
      notes: [
        ...s.notes.filter((n) => n.id !== note.id),
        { ...note, updatedAt: now() },
      ],
    }));
  }
  const [query, setQuery] = useState("");
  const [subject, setSubject] = useState("");
  return (
    <>
      <PageTitle eyebrow="TULIS, HUBUNGKAN, PAHAMI" title="Catatan belajar">
        <Button onClick={() => setEdit(blank())}>+ Tambah catatan</Button>
      </PageTitle>
      <div className="toolbar">
        <input
          aria-label="Cari catatan"
          placeholder="Cari judul, isi, atau tag…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <SubjectSelect value={subject} onChange={setSubject} all />
        <Button
          variant="outline"
          onClick={() =>
            download(
              "medtrack-catatan.txt",
              data.notes
                .map((n) => `${n.title}\n${n.body}\n#${n.tags}\n`)
                .join("\n"),
              "text/plain",
            )
          }
        >
          Ekspor catatan
        </Button>
      </div>
      <div className="two-col">
        <section className="card">
          {!data.notes.length && (
            <Empty>
              Simpan ide, ringkasan, dan refleksi belajarmu di sini.
            </Empty>
          )}
          {data.notes
            .filter(
              (n) =>
                (!subject || n.subjectId === subject) &&
                `${n.title} ${n.body} ${n.tags}`
                  .toLowerCase()
                  .includes(query.toLowerCase()),
            )
            .sort(
              (a, b) =>
                Number(b.pinned) - Number(a.pinned) ||
                b.updatedAt.localeCompare(a.updatedAt),
            )
            .map((n) => (
              <button
                className="note-list-item"
                key={n.id}
                onClick={() => setSelected(n.id)}
              >
                <strong>
                  {n.pinned ? "★ " : ""}
                  {n.title}
                </strong>
                <small>
                  {subjectName(n.subjectId)} ·{" "}
                  {new Date(n.updatedAt).toLocaleDateString("id-ID")}
                </small>
                <p>{n.body.slice(0, 100)}</p>
              </button>
            ))}
        </section>
        {edit ? (
          <section className="card stack">
            <Field label="Judul catatan">
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
            <Field label="Tag">
              <input
                maxLength={2000}
                value={edit.tags}
                onChange={(e) => setEdit({ ...edit, tags: e.target.value })}
              />
            </Field>
            <Field label="Isi catatan">
              <textarea
                className="note-editor"
                maxLength={20000}
                value={edit.body}
                onChange={(e) => setEdit({ ...edit, body: e.target.value })}
              />
            </Field>
            <label>
              <input
                type="checkbox"
                checked={edit.pinned}
                onChange={(e) => setEdit({ ...edit, pinned: e.target.checked })}
              />{" "}
              Pin catatan
            </label>
            <p className="small muted" role="status">
              {error
                ? "Belum tersimpan — lihat peringatan penyimpanan"
                : dirty
                  ? "Menyimpan…"
                  : "Tersimpan otomatis"}{" "}
              · Teks polos, HTML tidak dijalankan.
            </p>
            <Button
              variant="destructive"
              onClick={() => {
                if (confirm("Hapus catatan ini?")) {
                  update((s) => ({
                    ...s,
                    notes: s.notes.filter((n) => n.id !== edit.id),
                  }));
                  setEdit(null);
                  notifySaved("Catatan dihapus");
                }
              }}
            >
              Hapus catatan
            </Button>
          </section>
        ) : (
          <Empty>Pilih catatan atau buat catatan baru.</Empty>
        )}
      </div>
    </>
  );
}
