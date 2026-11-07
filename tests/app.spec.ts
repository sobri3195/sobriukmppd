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
