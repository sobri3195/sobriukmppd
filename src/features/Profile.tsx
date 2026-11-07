import { notifySaved } from "../lib/feedback";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { addDays } from "date-fns";
import { Link, useNavigate } from "react-router-dom";
import { profileSchema, type Profile } from "../lib/model";
import { useStore } from "../lib/store";
import { localDate, statistics } from "../lib/learning";
import { subjects } from "../data";
import { Button, Field, PageTitle } from "../components/shared";
export default function ProfilePage({
  onboarding = false,
}: {
  onboarding?: boolean;
}) {
  const { data, update } = useStore();
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Profile>({
    resolver: zodResolver(profileSchema),
    defaultValues: data.profile ?? {
      name: "",
      fullName: "",
      faculty: "",
      status: "Koas",
      cbt: localDate(addDays(new Date(), 90)),
      osce: localDate(addDays(new Date(), 100)),
      dailyMinutes: 90,
      dailyQuestions: 20,
      targetScore: 75,
      priorities: [],
      theme: "light",
    },
  });
  return (
    <div className={onboarding ? "onboarding" : ""}>
      <PageTitle
        eyebrow="RUANG BELAJAR PRIBADI"
        title={
          onboarding
            ? "Langkah kecil, dokter masa depan."
            : "Profil & preferensi"
        }
      />
      <p className="muted">
        {onboarding
          ? "Selamat datang di MEDTRACK. Atur perjalanan belajarmu."
          : "Perbarui target sesuai ritme belajarmu."}{" "}
        Data disimpan di browser ini, tanpa akun online.
      </p>
      {!onboarding && (
        <div className="card accent-card">
          <h2>
            Level {Math.floor(statistics(data).xp / 250) + 1} ·{" "}
            {statistics(data).xp} XP
          </h2>
          <p>
            Aktivitas yang konsisten adalah pencapaian. Tidak ada penalti untuk
            jeda belajar.
          </p>
          <Link to="/backup">Kelola backup dan data →</Link>
        </div>
      )}
      <form
        className="card form-grid"
        onSubmit={handleSubmit((profile) => {
          update((s) => ({ ...s, profile }));
          notifySaved("Profil tersimpan");
          navigate("/dashboard");
        })}
      >
        <Field label="Nama panggilan">
          <input
            {...register("name")}
            placeholder="Nama yang kamu sukai"
            autoComplete="given-name"
          />
        </Field>
        <Field label="Status">
          <select {...register("status")}>
            <option>Koas</option>
            <option>First Taker</option>
            <option>Retaker</option>
          </select>
        </Field>
        <Field label="Nama lengkap (opsional)">
          <input {...register("fullName")} />
        </Field>
        <Field label="Fakultas kedokteran (opsional)">
          <input {...register("faculty")} />
        </Field>
        <Field label="Target tanggal CBT">
          <input type="date" {...register("cbt")} />
        </Field>
        <Field label="Target tanggal OSCE">
          <input type="date" {...register("osce")} />
        </Field>
        <Field label="Target belajar harian (menit)">
          <input
            type="number"
            {...register("dailyMinutes", { valueAsNumber: true })}
          />
        </Field>
        <Field label="Target soal harian">
          <input
            type="number"
            {...register("dailyQuestions", { valueAsNumber: true })}
          />
        </Field>
        <Field label="Target skor pribadi (%)">
          <input
            type="number"
            {...register("targetScore", { valueAsNumber: true })}
          />
        </Field>
        <Field label="Tema">
          <select {...register("theme")}>
            <option value="light">Terang</option>
            <option value="dark">Gelap</option>
          </select>
        </Field>
        <fieldset className="full">
          <legend>Bidang prioritas (opsional, boleh dilewati)</legend>
          <div className="chips">
            {subjects.map((s) => (
              <label key={s.id}>
                <input
                  type="checkbox"
                  value={s.id}
                  {...register("priorities")}
                />
                {s.name}
              </label>
            ))}
          </div>
        </fieldset>
        {Object.entries(errors).map(([key, e]) => (
          <p className="error" role="alert" key={key}>
            {key}: {e.message}
          </p>
        ))}
        <div className="full">
          <Button type="submit">
            {onboarding ? "Mulai perjalanan belajar →" : "Simpan profil"}
          </Button>
        </div>
      </form>
      <p className="small muted">
        Materi latihan orisinal, belum divalidasi klinis. Bukan soal resmi atau
        pengganti pendidikan klinis.
      </p>
    </div>
  );
}
