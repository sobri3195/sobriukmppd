import { createProgressStore } from "./progress-store";
import { KEY } from "./storage";
export const useStore = createProgressStore(() => window.localStorage);
// Debounced writes are flushed for navigation/reload; ticks never write storage.
window.addEventListener("pagehide", () => useStore.getState().flush());
window.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") useStore.getState().flush();
});
window.addEventListener("storage", (event) => {
  if (event.key === KEY || event.key === null)
    useStore.getState().acceptExternal();
});
