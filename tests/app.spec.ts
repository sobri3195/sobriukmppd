import questions from "../src/data/questions.json" with { type: "json" };
import { test, expect, type Page } from "@playwright/test";
async function onboard(page: Page) {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Langkah kecil, dokter masa depan." }),
  ).toBeVisible();
  await page.getByLabel("Nama panggilan").fill("Nadia");
  await page.getByRole("button", { name: "Mulai perjalanan belajar" }).click();
  await expect(
    page.getByRole("heading", { name: /Selamat .*Nadia/ }),
  ).toBeVisible();
}
test("onboarding, planner CRUD, timer, notes and refresh", async ({ page }) => {
  await onboard(page);
  await page.goto("/belajar/planner");
  await page
    .getByRole("button", { name: "+ Tambah aktivitas", exact: true })
    .click();
  await page.getByLabel("Judul", { exact: true }).fill("Review kardiologi");
  await page.getByRole("button", { name: "Simpan aktivitas" }).click();
  await expect(
    page.getByText("Review kardiologi", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("checkbox", { name: "Selesaikan Review kardiologi" })
    .check();
  await page.reload();
  await expect(
    page.getByRole("checkbox", { name: "Selesaikan Review kardiologi" }),
  ).toBeChecked();
  await page.goto("/belajar/timer");
  await page.getByRole("button", { name: "Mulai fokus" }).click();
  await page.waitForTimeout(1100);
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Jeda", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Selesai & simpan" }).click();
  await expect(page.getByRole("button", { name: "Mulai fokus" })).toBeVisible();
  await page.goto("/belajar/catatan");
  await page.getByRole("button", { name: "+ Tambah catatan" }).click();
  await page.getByLabel("Judul catatan").fill("Refleksi hari ini");
  await page
    .getByLabel("Isi catatan")
    .fill("Review konsep dasar dan ulangi besok.");
  await expect(
    page.getByRole("status").filter({ hasText: "Tersimpan otomatis" }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("button", { name: /Refleksi hari ini/ }),
  ).toBeVisible();
});
test("ten question quiz, bookmark, results and wrong-answer review", async ({
  page,
}) => {
  await onboard(page);
  await page.goto("/latihan");
  await page
    .getByRole("button", { name: "Mulai latihan", exact: true })
    .click();
  await page.getByRole("button", { name: "Bookmark soal" }).click();
  for (let i = 0; i < 10; i++) {
    const stem = await page.locator(".question-stem").textContent();
    const question = questions.find((q) => q.stem === stem)!;
    const wrong = question.options.find(
      (o) => o.id !== question.correctOptionId,
    )!;
    await page.locator(".option").filter({ hasText: wrong.text }).click();
    if (i < 9)
      await page
        .getByRole("button", { name: "Berikutnya", exact: true })
        .click();
  }
  page.once("dialog", (d) => d.accept());
  await page
    .getByRole("button", { name: "Selesaikan latihan", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Hasil latihan", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Skor latihan pribadi", { exact: false }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Hasil latihan", exact: true }),
  ).toBeVisible();
  await page.goto("/latihan");
  await page.getByLabel("Sumber soal").selectOption("wrong");
  await page.getByLabel("Jumlah soal").fill("1");
  await page
    .getByRole("button", { name: "Mulai latihan", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Soal 1 dari 1" }),
  ).toBeVisible();
});
test("flashcard, OSCE and backup import/export", async ({ page }) => {
  await onboard(page);
  await page.goto("/belajar/flashcards");
  await page.getByRole("button", { name: "Balik flashcard" }).click();
  await page.getByRole("button", { name: "5 · Lancar" }).click();
  await expect(
    page.getByText("59 kartu dalam pilihan", { exact: false }),
  ).toBeVisible();
  await page.goto("/latihan/osce/o1");
  await page.getByRole("button", { name: "Mulai station" }).click();
  await page.getByRole("checkbox").first().check();
  await page.getByRole("button", { name: "Simpan simulasi" }).click();
  await expect(
    page.getByRole("heading", { name: "Riwayat simulasi" }),
  ).toBeVisible();
  await page.goto("/backup");
  const download = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Ekspor backup JSON", exact: true })
    .click();
  const file = await (await download).path();
  expect(file).toBeTruthy();
  await page.getByLabel("Pilih file backup JSON").setInputFiles(file!);
  await expect(page.getByText("Pratinjau:", { exact: false })).toBeVisible();
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Impor data tervalidasi" }).click();
  await expect(
    page.getByText("Impor diproses.", { exact: false }),
  ).toBeVisible();
});
test("mobile navigation, dark mode and no horizontal overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await onboard(page);
  const nav = page.getByRole("navigation", { name: "Navigasi mobile" });
  await expect(nav).toBeVisible();
  await nav.getByRole("link", { name: "Belajar", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Ruang belajar", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Ganti tema" }).click();
  await expect(page.locator("html")).toHaveClass("dark");
  await page.reload();
  await expect(page.locator("html")).toHaveClass("dark");
  await nav.getByRole("link", { name: "Beranda", exact: true }).click();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
test("cached production shell works offline on nested route", async ({
  page,
  context,
}) => {
  await onboard(page);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  await context.setOffline(true);
  await page.goto("/belajar/flashcards");
  await expect(
    page.getByRole("heading", { name: "Flashcard", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Balik flashcard" }).click();
  await expect(page.getByRole("button", { name: "5 · Lancar" })).toBeVisible();
  await context.setOffline(false);
});

test("exam expiry locks results and corrupt backups do not replace progress", async ({
  page,
}) => {
  await onboard(page);
  await page.clock.install();
  await page.goto("/latihan");
  await page.getByLabel("Durasi simulasi (menit)").fill("1");
  await page.getByLabel("Jumlah soal").fill("1");
  await page
    .getByRole("checkbox", {
      name: "Mode ujian: pembahasan setelah finalisasi",
    })
    .check();
  await page
    .getByRole("button", { name: "Mulai latihan", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Soal 1 dari 1" }),
  ).toBeVisible();
  await page.clock.fastForward(61000);
  await expect(
    page.getByRole("heading", { name: "Hasil latihan", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("0 benar · 0 salah · 1 tidak dijawab"),
  ).toBeVisible();
  await page.goto("/backup");
  await page.getByLabel("Pilih file backup JSON").setInputFiles({
    name: "bad.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"version":999}'),
  });
  await expect(
    page.getByText(
      "Backup tidak valid, terlalu besar, atau versi tidak didukung. Data tidak diubah.",
    ),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Impor data tervalidasi" }),
  ).toHaveCount(0);
  await page.goto("/dashboard");
  await expect(
    page.getByRole("heading", { name: /Selamat .*Nadia/ }),
  ).toBeVisible();
});

test("corrupt storage exposes recovery without onboarding and preserves raw data", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem("medtrack:v1:state", "broken-data"),
  );
  await page.goto("/");
  await page.getByRole("link", { name: "Buka pemulihan data" }).click();
  await expect(
    page.getByRole("heading", { name: "Backup & data", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => localStorage.getItem("medtrack:v1:state")),
  ).toBe("broken-data");
  const downloaded = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Ekspor data mentah untuk pemulihan" })
    .click();
  expect((await downloaded).suggestedFilename()).toBe(
    "medtrack-data-mentah.json",
  );
});

test("active result links cannot disclose keys and insufficient pools offer an alternative", async ({
  page,
}) => {
  await onboard(page);
  await page.goto("/latihan");
  await page.getByLabel("Bidang", { exact: true }).selectOption("s1");
  await expect(
    page.getByRole("button", { name: "Gunakan 2 soal tersedia" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Gunakan 2 soal tersedia" }).click();
  await page
    .getByRole("checkbox", {
      name: "Mode ujian: pembahasan setelah finalisasi",
    })
    .check();
  await page
    .getByRole("button", { name: "Mulai latihan", exact: true })
    .click();
  const id = page.url().split("/").at(-1);
  await page.goto(`/latihan/hasil/${id}`);
  await expect(page).toHaveURL(new RegExp(`/latihan/tryout/${id}$`));
  await expect(
    page.getByRole("heading", { name: "Hasil latihan", exact: true }),
  ).toHaveCount(0);
  await expect(page.getByText("Kunci:", { exact: false })).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Periksa jawaban" }),
  ).toHaveCount(0);
});
test("notes survive immediate reload and deletion cancels pending autosave", async ({
  page,
}) => {
  await onboard(page);
  await page.goto("/belajar/catatan");
  await page.getByRole("button", { name: "+ Tambah catatan" }).click();
  await page.getByLabel("Judul catatan").fill("Tidak boleh hilang");
  await page.getByLabel("Isi catatan").fill("Perubahan terakhir");
  await page.reload();
  await page.getByRole("button", { name: /Tidak boleh hilang/ }).click();
  await expect(page.getByLabel("Isi catatan")).toHaveValue(
    "Perubahan terakhir",
  );
  await page.getByLabel("Isi catatan").fill("Draft yang dihapus");
  page.once("dialog", (d) => d.accept());
  await page
    .getByRole("button", { name: "Hapus catatan", exact: true })
    .click();
  await page.waitForTimeout(700);
  await page.reload();
  await expect(
    page.getByRole("button", { name: /Tidak boleh hilang/ }),
  ).toHaveCount(0);
});
test("sidebar collapse persists, drawer traps focus, and quick actions open forms", async ({
  page,
}) => {
  await onboard(page);
  await page.getByRole("button", { name: "Ciutkan sidebar" }).click();
  await expect(page.locator("html")).toHaveClass(/sidebar-collapsed/);
  await page.reload();
  await expect(page.locator("html")).toHaveClass(/sidebar-collapsed/);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Buka menu" }).click();
  const dialog = page.getByRole("dialog", { name: "Menu utama" });
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Shift+Tab");
  expect(await dialog.evaluate((e) => e.contains(document.activeElement))).toBe(
    true,
  );
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await page.getByRole("button", { name: "Tambah cepat" }).click();
  await page
    .getByRole("link", { name: "Tambah flashcard →", exact: true })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Flashcard", exact: true }),
  ).toBeVisible();
});
test("OSCE station drafts stay isolated and elapsed station checklists lock", async ({
  page,
}) => {
  await onboard(page);
  await page.clock.install();
  await page.goto("/latihan/osce/o1");
  await page.getByRole("button", { name: "Mulai station" }).click();
  await page.getByRole("checkbox").first().check();
  await page.goto("/latihan/osce/o2");
  await expect(page.getByRole("checkbox").first()).not.toBeChecked();
  await page.goto("/latihan/osce/o1");
  await expect(page.getByRole("checkbox").first()).toBeChecked();
  await page.clock.fastForward(8 * 60000 + 1000);
  await expect(page.getByRole("checkbox").first()).toBeDisabled();
  await page.getByRole("button", { name: "Simpan simulasi" }).click();
  await expect(
    page.getByRole("heading", { name: "Riwayat simulasi" }),
  ).toBeVisible();
});
test("clean tabs synchronize and dirty tabs expose conflicts without losing notes", async ({
  page,
  context,
}) => {
  await onboard(page);
  const other = await context.newPage();
  await other.goto("/dashboard");
  await page.clock.install();
  await page.goto("/belajar/catatan");
  await page.getByRole("button", { name: "+ Tambah catatan" }).click();
  await page.getByLabel("Judul catatan").fill("Draft tab pertama");
  await page.clock.pauseAt(new Date(Date.now() + 100));
  await other.evaluate(() => {
    const key = "medtrack:v1:state";
    const state = JSON.parse(localStorage.getItem(key)!);
    state.notes.push({
      id: "remote-note",
      title: "Catatan tab kedua",
      body: "Data dari tab lain",
      subjectId: "s1",
      tags: "",
      pinned: false,
      updatedAt: new Date().toISOString(),
    });
    localStorage.setItem(key, JSON.stringify(state));
  });
  await expect(page.getByRole("alert")).toContainText("Konflik antar-tab");
  await expect(page.getByLabel("Judul catatan")).toHaveValue(
    "Draft tab pertama",
  );
  await other.close();
});

test("dashboard and analytics reflect completed tasks, material progress and real quiz answers", async ({
  page,
}) => {
  await onboard(page);
  await page
    .getByRole("link", { name: "Tambah Jadwal Rencanakan langkah berikutnya" })
    .click();
  await page.getByLabel("Judul", { exact: true }).fill("Belajar hari ini");
  await page.getByRole("button", { name: "Simpan aktivitas" }).click();
  await page
    .getByRole("checkbox", { name: "Selesaikan Belajar hari ini" })
    .check();
  const desktop = page.getByRole("navigation", { name: "Navigasi utama" });
  await desktop.getByRole("link", { name: "Beranda", exact: true }).click();
  await expect(
    page.getByText("Rencana selesai: 100%", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Latihan 10 Soal Uji pemahaman konsep" })
    .click();
  await page.getByLabel("Jumlah soal").fill("1");
  await page
    .getByRole("button", { name: "Mulai latihan", exact: true })
    .click();
  const stem = await page.locator(".question-stem").textContent();
  const q = questions.find((x) => x.stem === stem)!;
  const correct = q.options.find((o) => o.id === q.correctOptionId)!;
  await page.locator(".option").filter({ hasText: correct.text }).click();
  page.once("dialog", (d) => d.accept());
  await page
    .getByRole("button", { name: "Selesaikan latihan", exact: true })
    .click();
  await expect(
    page.getByText("1 benar · 0 salah · 0 tidak dijawab"),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: "Akurasi per bidang & rekomendasi review",
    }),
  ).toBeVisible();
  await desktop.getByRole("link", { name: "Statistik", exact: true }).click();
  await expect(
    page
      .locator(".stat-card")
      .filter({ has: page.getByText("Jawaban", { exact: true }) })
      .locator("strong"),
  ).toHaveText("1");
  await expect(
    page
      .locator(".stat-card")
      .filter({ has: page.getByText("Akurasi", { exact: true }) })
      .locator("strong"),
  ).toHaveText("100.0%");
  await desktop
    .getByRole("link", { name: "Materi & bidang", exact: true })
    .click();
  await page
    .locator(".subject-card")
    .filter({
      has: page.getByRole("heading", { name: "Kardiovaskular", exact: true }),
    })
    .click();
  await page
    .locator(".topic-row select")
    .first()
    .selectOption("Sudah dipelajari");
  await desktop.getByRole("link", { name: "Beranda", exact: true }).click();
  await expect(
    page.getByText("Materi dipelajari: 3%", { exact: true }),
  ).toBeVisible();
});
