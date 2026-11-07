import { useState, useRef } from "react";
import { toast } from "sonner";
import { useStore } from "../lib/store";
import { emptyState, type State } from "../lib/model";
import {
  download,
  parseBackup,
  parseBackupDocument,
  exportBackup,
  mergeStates,
  KEY,
} from "../lib/storage";
import { Button, PageTitle } from "../components/shared";
export default function Backup() {
  const { data, recover, flush, blocked } = useStore();
  const request = useRef(0);
  const [exportedAt, setExportedAt] = useState<string | null>(null);
  const [incoming, setIncoming] = useState<State | null>(null);
  const [mode, setMode] = useState("merge");
  function apply() {
    if (
      !incoming ||
      !confirm(
        mode === "replace"
          ? "Ganti seluruh data? Backup rollback akan disimpan terlebih dahulu."
          : "Gabungkan backup? ID konflik menggunakan isi backup; sesi timer aktif dipertahankan.",
      )
    )
      return;
    try {
      if (blocked) {
        const raw = localStorage.getItem(KEY);
        if (raw) localStorage.setItem("medtrack:v1:recovery-original", raw);
      }
      localStorage.setItem("medtrack:v1:rollback", JSON.stringify(data));
      if (
        !recover(mode === "replace" ? incoming : mergeStates(data, incoming))
      ) {
        toast.error("Impor gagal; data lama dipertahankan.");
        return;
      }
      setIncoming(null);
      toast.success("Impor diproses. Data berhasil tersimpan.");
    } catch {
      toast.error(
        "Backup rollback gagal. Impor dibatalkan; ekspor data dan kosongkan ruang browser.",
      );
    }
  }
  return (
    <>
      <PageTitle eyebrow="PROGRESMU, DATA MILIKMU" title="Backup & data" />
      <div className="notice">
        Data tersimpan di browser ini. Pembersihan data browser dapat menghapus
        progres. Simpan backup rutin; tidak ada sinkronisasi akun atau password.
      </div>
      <div className="actions">
        <Button
          variant="outline"
          onClick={() => {
            if (flush()) toast.success("Progres tersimpan");
            else
              toast.error(
                "Belum dapat menyimpan. Ekspor backup terlebih dahulu.",
              );
          }}
        >
          Coba simpan ulang
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            if (
              confirm(
                "Ekspor progres tab ini sebelum melanjutkan. Muat versi browser dan buang perubahan tab yang belum tersimpan?",
              )
            ) {
              try {
                const raw = localStorage.getItem(KEY);
                if (recover(raw ? parseBackup(raw) : emptyState()))
                  toast.success("Versi tersimpan dimuat");
              } catch {
                toast.error(
                  "Data browser tidak valid. Impor backup untuk pemulihan.",
                );
              }
            }
          }}
        >
          Muat versi tersimpan
        </Button>
      </div>
      <div className="two-col">
        <section className="card stack">
          <h2>Ekspor data</h2>
          <p className="muted">
            Simpan profil dan seluruh progres sebagai JSON yang dapat diimpor
            kembali.
          </p>
          <Button
            onClick={() => download("medtrack-backup.json", exportBackup(data))}
          >
            Ekspor backup JSON
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              const rows = [
                ["id", "tanggal", "bidang", "menit"],
                ...data.sessions.map((s) => [
                  s.id,
                  s.at,
                  s.subjectId,
                  String(s.minutes),
                ]),
              ];
              const csv = rows
                .map((r) =>
                  r
                    .map(
                      (v) =>
                        `"${(/^[=+@\-\t\r]/.test(v) ? "'" : "") + v.replaceAll('"', '""')}"`,
                    )
                    .join(","),
                )
                .join("\n");
              download("medtrack-sesi.csv", csv, "text/csv");
            }}
          >
            Ekspor riwayat sesi CSV
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              try {
                download(
                  "medtrack-data-mentah.json",
                  localStorage.getItem(KEY) ?? "null",
                );
              } catch {
                toast.error("Data browser tidak dapat dibaca.");
              }
            }}
          >
            Ekspor data mentah untuk pemulihan
          </Button>
        </section>
        <section className="card stack">
          <h2>Impor backup</h2>
          <Button
            variant="ghost"
            onClick={() => {
              try {
                const raw = localStorage.getItem(
                  "medtrack:v1:recovery-original",
                );
                if (!raw) {
                  toast.error("Tidak ada data asli pemulihan.");
                  return;
                }
                download("medtrack-data-sebelum-pemulihan.json", raw);
              } catch {
                toast.error("Data pemulihan tidak dapat dibaca.");
              }
            }}
          >
            Ekspor data sebelum pemulihan
          </Button>
          <input
            aria-label="Pilih file backup JSON"
            type="file"
            accept=".json,application/json"
            onChange={async (e) => {
              setIncoming(null);
              const current = ++request.current;
              try {
                const file = e.target.files?.[0];
                if (!file) return;
                if (file.size > 15_000_000)
                  throw new Error("File terlalu besar");
                const document = parseBackupDocument(await file.text());
                if (current !== request.current) return;
                setIncoming(document.data);
                setExportedAt(document.exportedAt);
                toast.success("Struktur backup valid");
              } catch {
                if (current !== request.current) return;
                toast.error(
                  "Backup tidak valid, terlalu besar, atau versi tidak didukung. Data tidak diubah.",
                );
              }
            }}
          />
          {incoming && (
            <>
              <p>
                Pratinjau: {incoming.profile?.name ?? "Tanpa profil"} ·{" "}
                {exportedAt
                  ? `Diekspor ${new Date(exportedAt).toLocaleString("id-ID")}`
                  : "Format v1 lama"}{" "}
                · {incoming.tasks.length} tugas · {incoming.sessions.length}{" "}
                sesi · {incoming.quizzes.length} latihan ·{" "}
                {incoming.notes.length} catatan
              </p>
              <select
                aria-label="Mode impor"
                value={mode}
                onChange={(e) => setMode(e.target.value)}
              >
                <option value="merge">
                  Gabungkan — ID konflik memakai backup
                </option>
                <option value="replace">Ganti seluruh data</option>
              </select>
              <Button onClick={apply}>Impor data tervalidasi</Button>
            </>
          )}
          <Button
            variant="outline"
            onClick={() => {
              try {
                const raw = localStorage.getItem("medtrack:v1:rollback");
                if (!raw) throw new Error("Tidak ada rollback");
                const previous = parseBackup(raw);
                if (confirm("Pulihkan backup sebelum impor terakhir?"))
                  if (recover(previous)) toast.success("Rollback dipulihkan");
                  else toast.error("Rollback gagal disimpan");
              } catch {
                toast.error("Backup rollback tidak tersedia atau tidak valid.");
              }
            }}
          >
            Pulihkan rollback
          </Button>
        </section>
        <section className="card">
          <h2>Reset data</h2>
          <p>
            Hapus profil dan progres pada perangkat ini. Soal dan materi bawaan
            tetap tersedia.
          </p>
          <Button
            variant="destructive"
            onClick={() => {
              if (
                confirm(
                  "Hapus semua progres? Pastikan backup sudah diekspor.",
                ) &&
                prompt("Ketik RESET untuk melanjutkan") === "RESET"
              ) {
                if (recover(emptyState())) {
                  for (const key of Object.keys(localStorage))
                    if (key.startsWith("medtrack:v1:") && key !== KEY)
                      localStorage.removeItem(key);
                  for (const key of Object.keys(sessionStorage))
                    if (key.startsWith("medtrack:"))
                      sessionStorage.removeItem(key);
                  location.assign("/onboarding");
                } else toast.error("Reset gagal; data lama dipertahankan.");
              }
            }}
          >
            Reset seluruh data
          </Button>
        </section>
      </div>
    </>
  );
}
