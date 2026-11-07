import { create } from "zustand";
import { emptyState, type State } from "./model";
import { load, save } from "./storage";
let initial = { state: emptyState(), error: null as string | null };
try {
  initial = load(window.localStorage);
} catch {
  initial.error =
    "Penyimpanan browser tidak tersedia. Progres hanya tersimpan selama tab ini terbuka.";
}
export const useStore = create<{
  data: State;
  error: string | null;
  update: (fn: (s: State) => State) => void;
  recover: (s: State) => void;
}>((set, get) => ({
  data: initial.state,
  error: initial.error,
  update: (fn) => {
    const data = fn(get().data);
    if (get().error) {
      set({ data });
      return;
    }
    try {
      save(localStorage, data);
      set({ data, error: null });
    } catch {
      set({
        data,
        error:
          "Gagal menyimpan. Penyimpanan penuh atau tidak tersedia. Ekspor backup sebelum menutup tab.",
      });
    }
  },
  recover: (data) => {
    try {
      save(localStorage, data);
      set({ data, error: null });
    } catch {
      set({
        error:
          "Pemulihan gagal: penyimpanan tidak tersedia. Ekspor backup untuk mengamankan data.",
      });
    }
  },
}));
