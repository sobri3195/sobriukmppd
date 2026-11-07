import { toast } from "sonner";
import { useStore } from "./store";
export function notifySaved(message: string) {
  const error = useStore.getState().error;
  if (error)
    toast.error(
      "Perubahan belum tersimpan di browser. Ekspor backup atau buka pemulihan data.",
    );
  else toast.success(message);
}
