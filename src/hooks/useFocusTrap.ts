import { useEffect, type RefObject } from "react";
const selector =
  'a[href],button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex="0"]';
export function useFocusTrap(
  ref: RefObject<HTMLElement | null>,
  active: boolean,
  close: () => void,
) {
  useEffect(() => {
    if (!active || !ref.current) return;
    const root = ref.current;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const nodes = () =>
      [...root.querySelectorAll<HTMLElement>(selector)].filter(
        (x) => x.getClientRects().length > 0,
      );
    nodes()[0]?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
      }
      if (e.key === "Tab") {
        const list = nodes();
        const first = list[0],
          last = list.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    const focus = (e: FocusEvent) => {
      if (e.target instanceof Node && !root.contains(e.target))
        nodes()[0]?.focus();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("focusin", focus);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("focusin", focus);
      if (previous?.isConnected) previous.focus();
    };
  }, [ref, active, close]);
}
