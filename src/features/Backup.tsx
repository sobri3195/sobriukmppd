import { useState } from "react";
import { toast } from "sonner";
import { useStore } from "../lib/store";
import { emptyState, type State } from "../lib/model";
import { download, parseBackup, mergeStates, KEY } from "../lib/storage";
import { Button, PageTitle } from "../components/shared";
export default function Backup() {
  const { data, recover } = useStore();
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
      localStorage.setItem("medtrack:v1:rollback", JSON.stringify(data));
      recover(mode === "replace" ? incoming : mergeStates(data, incoming));
      setIncoming(null);
      toast.success("Impor diproses. Periksa status penyimpanan di atas.");
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
      <div className="two-col">
        <section className="card stack">
          <h2>Ekspor data</h2>
          <p className="muted">
            Simpan profil dan seluruh progres sebagai JSON yang dapat diimpor
            kembali.
          </p>
          <Button
            onClick={() =>
              download("medtrack-backup.json", JSON.stringify(data, null, 2))
            }
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
                  r.map((v) => `"${v.replaceAll('"', '""')}"`).join(","),
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
          <input
            aria-label="Pilih file backup JSON"
            type="file"
            accept=".json,application/json"
            onChange={async (e) => {
              setIncoming(null);
              try {
                const file = e.target.files?.[0];
                if (!file) return;
                if (file.size > 15_000_000)
                  throw new Error("File terlalu besar");
                setIncoming(parseBackup(await file.text()));
                toast.success("Struktur backup valid");
              } catch {
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
                {incoming.tasks.length} tugas · {incoming.sessions.length} sesi
                · {incoming.quizzes.length} latihan · {incoming.notes.length}{" "}
                catatan
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
                  recover(previous);
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
                recover(emptyState());
                location.assign("/onboarding");
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
