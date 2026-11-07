import { create } from "zustand";
import { emptyState, type State } from "./model";
import { KEY, parseBackup, save } from "./storage";
export interface ProgressStore {
  data: State;
  error: string | null;
  dirty: boolean;
  blocked: boolean;
  update: (fn: (s: State) => State) => boolean;
  updateDebounced: (fn: (s: State) => State) => void;
  flush: () => boolean;
  recover: (s: State) => boolean;
  acceptExternal: () => void;
}
/** Compare before writing: a stale tab must never silently replace another tab's data. */
export function createProgressStore(storage: () => Storage) {
  let baseline: string | null = null;
  let initial = emptyState();
  let error: string | null = null;
  let blocked = false;
  try {
    baseline = storage().getItem(KEY);
    if (baseline) initial = parseBackup(baseline);
  } catch {
    error =
      "Data tidak dapat dimuat. Data asli dipertahankan; buka Backup & data untuk pemulihan.";
    blocked = true;
  }
  let pending: ReturnType<typeof setTimeout> | undefined;
  return create<ProgressStore>((set, get) => {
    const cancel = () => {
      if (pending !== undefined) {
        clearTimeout(pending);
        pending = undefined;
      }
    };
    const flush = () => {
      cancel();
      if (!get().dirty) return !get().error;
      if (get().blocked) return false;
      try {
        const target = storage();
        if (target.getItem(KEY) !== baseline) {
          set({
            blocked: true,
            error:
              "Konflik antar-tab: data lain berubah. Ekspor progres tab ini lalu muat versi tersimpan atau gabungkan backup.",
          });
          return false;
        }
        save(target, get().data);
        baseline = target.getItem(KEY);
        set({ dirty: false, error: null });
        return true;
      } catch {
        set({
          error:
            "Gagal menyimpan: penyimpanan penuh atau tidak tersedia. Ekspor backup atau coba simpan ulang.",
        });
        return false;
      }
    };
    return {
      data: initial,
      error,
      blocked,
      dirty: false,
      update: (fn) => {
        const previous = get().data;
        const data = fn(previous);
        if (data === previous) return !get().error;
        set({ data, dirty: true });
        return flush();
      },
      updateDebounced: (fn) => {
        set({ data: fn(get().data), dirty: true });
        cancel();
        pending = setTimeout(flush, 600);
      },
      flush,
      recover: (data) => {
        cancel();
        try {
          save(storage(), data);
          baseline = storage().getItem(KEY);
          set({ data, dirty: false, error: null, blocked: false });
          return true;
        } catch {
          set({
            error:
              "Pemulihan gagal: penyimpanan tidak tersedia. Data lama tidak diubah.",
          });
          return false;
        }
      },
      acceptExternal: () => {
        try {
          const raw = storage().getItem(KEY);
          if (raw === baseline) return;
          if (get().dirty) {
            set({
              blocked: true,
              error:
                "Konflik antar-tab: progres tab ini belum tersimpan. Ekspor backup sebelum memuat data lain.",
            });
            return;
          }
          const data = raw ? parseBackup(raw) : emptyState();
          baseline = raw;
          set({ data, error: null, blocked: false });
        } catch {
          set({
            blocked: true,
            error:
              "Data dari tab lain tidak valid. Data tab ini dipertahankan.",
          });
        }
      },
    };
  });
}
