# MEDTRACK UKNPDPD — Smart Medical Study Planner

Aplikasi belajar pribadi berbahasa Indonesia, berjalan sepenuhnya di browser. Tidak ada backend, akun online, API berbayar, atau data pasien. Implementasi awal yang berfungsi; **belum memenuhi seluruh spesifikasi produksi**. Materi orisinal belum divalidasi klinis dan bukan soal resmi UKNPDPD.

## Jalankan

Node.js **22.12+** atau **24 LTS**, npm 11. Diuji dengan Node 24.22.1.

```sh
npm ci
npm run dev
```

Tidak membutuhkan `.env`. Jika cache npm bawaan tidak writable, gunakan `npm ci --cache /workspace/.npm-cache`.

```sh
npm run lint
npm run typecheck
npm test
npm run build
npm run preview
npx playwright install chromium
npm run test:e2e
```

Untuk Chromium sistem: `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:e2e`.
E2E menjalankan preview **build produksi** pada port 4173; jalankan build terlebih dahulu. Pengujian offline membutuhkan service worker aktif.

## Cara menggunakan

1. Isi nama, tanggal target CBT/OSCE, dan target harian. Field opsional boleh dibiarkan kosong.
2. Buat aktivitas di Rencana belajar; checklist selesai, edit/reschedule, status, filter, kalender bulanan/mingguan, dan hapus tersedia. Generator membuat satu sesi per hari berdasarkan kapasitas, prioritas, hari libur, serta tanggal ujian. Konfirmasi diperlukan sebelum regenerasi; jadwal manual/selesai dipertahankan. Gunakan periode kosong agar tidak menumpuk sesi.
3. Pilih bidang/topik di Ruang fokus. Stopwatch, Pomodoro 25/5 atau 50/10, dan durasi custom memakai timestamp sehingga tab background dan refresh tidak menggandakan durasi. Simpan sesi saat selesai; streak mensyaratkan minimal satu menit.
4. Latihan memakai soal tanpa pengulangan dalam attempt. Mode belajar menyediakan pembahasan per jawaban; mode ujian menunggu finalisasi. Autosave, bookmark, flag, resume, batas waktu, auto-finalisasi, serta hasil terkunci tersedia.
5. Station OSCE menyediakan skenario fiktif, checklist berbobot, item kritis, catatan, timer, serta riwayat. Penilaian ini hanya simulasi mandiri.
6. Flashcard mendukung edit/tambah/hapus/favorit/pencarian dan penjadwalan SM-2 rating 0–5. Catatan menggunakan teks polos dengan autosave 600 ms. Tunggu status tersimpan sebelum berpindah halaman.
7. Statistik berasal dari sesi, tugas, jawaban latihan yang difinalisasi, dan review. Rekomendasi adalah algoritma lokal, bukan AI. Sampel minimal akurasi bidang: 3 jawaban. Tidak ada data aktivitas simulasi.
8. Ekspor backup rutin dari Backup & data. Impor memvalidasi Zod dan versi; pratinjau mendahului gabung/ganti. Konflik ID: isi backup menang; timer lokal dipertahankan saat merge. Tombstone penghapusan digabung. Rollback disimpan sebelum impor; kegagalan penyimpanan rollback membatalkan impor.

## Data dan arsitektur

- React 19 + Vite 7 + TypeScript strict; React Router; Zustand; Tailwind 4; komponen Button berpola shadcn/ui (Radix Slot/CVA), konfigurasi `components.json`.
- React Hook Form + Zod, date-fns, Recharts, Lucide, Sonner.
- Vite PWA: precache app shell, semua chunk lazy, JSON seed terbundel, icon PNG/SVG orisinal. Notifikasi update memerlukan konfirmasi pengguna. Tidak ada notifikasi push.
- `src/features`: halaman fitur lazy-loaded; `src/lib`: model, repository storage, algoritma; `src/data`: lima file JSON statis; `src/tests`: unit test; `tests`: E2E.
- Namespace `medtrack:v1:`. Satu dokumen progres tervalidasi, versi 1; versi tidak dikenal ditolak. `migrate` adalah titik masuk migrasi, saat ini hanya v1 didukung.
- Data seed tidak disalin ke localStorage. Hanya perubahan topik/kartu dan progres disimpan. Backup berisi data pengguna, bukan salinan bank soal bawaan.
- Main state disimpan saat aksi, bukan setiap tick timer. Timestamp timer dipulihkan setelah refresh. Draft OSCE disimpan di sessionStorage per station.
- Error parsing tidak menghapus data mentah. Banner pemulihan dan ekspor data mentah tersedia. Jika penyimpanan gagal, perubahan hanya ada dalam memori; ekspor backup sebelum menutup tab.
- XP dihitung dari aktivitas tersimpan, tidak diberikan saat refresh. Hadiah review dibatasi 100 review/hari; menyelesaikan tugas berulang tidak menambah hadiah karena dihitung dari ID/status saat ini.

## Deploy Vercel

Import repository ke Vercel, pilih Vite, install `npm ci`, build `npm run build`, output `dist`. `vercel.json` menyediakan rewrite SPA `/(.*)` ke `/index.html`, serta `no-cache` untuk `sw.js`. HTTPS diperlukan untuk PWA. Tidak ada URL localhost atau key di frontend.

**Deployment Vercel belum dijalankan**: memerlukan akses proyek Vercel. Setelah deploy, periksa refresh nested route, respons asset JavaScript (bukan HTML), ikon/manifest, update service worker, dan offline setelah cache lengkap. Pengujian lokal menggunakan production-style Vite preview, bukan bukti konfigurasi Vercel live.

## Batas implementasi saat ini

- **36 soal konsep dasar**, bukan target 150 soal/vignette klinis menyeluruh. Preset 10/25 tersedia; 50/150 dinonaktifkan. Distraktor dijelaskan secara ringkas berdasarkan konsep, bukan pembahasan klinis individual yang mendalam. Tidak mengklaim referensi medis terverifikasi. Seluruh konten memerlukan review dokter sebelum dipakai sebagai sumber klinis.
- 60 flashcard editable dan 12 station contoh tersedia. Station terutama latihan anamnesis/komunikasi, bukan cakupan lengkap keterampilan fisik/prosedur/kegawatdaruratan.
- Belum ada editor nama/icon/warna bidang, impor soal custom pengguna, filter tingkat kesulitan (semua seed tingkat dasar), atau CRUD bank soal.
- Statistik menyediakan aktivitas 7/30/90 hari, tren skor, akurasi bidang, progres materi, streak, dan ringkasan nyata. Belum ada radar, heatmap, rincian tingkat kesulitan, perbandingan tryout khusus, atau semua visualisasi yang diminta.
- Generator belum membagi satu hari menjadi sesi soal/review terpisah dan belum memiliki hari evaluasi selain sesi mingguan. Tidak ada drag-and-drop.
- Gamifikasi hanya XP dan level; belum ada katalog achievement, weekly challenge, atau milestone.
- Belum ada notifikasi agenda/due yang terpusat, dialog instalasi PWA khusus, swipe kartu, font Inter self-hosted, atau indikator penyimpanan per aksi. OSCE belum mengunci checklist setelah waktu habis; pengguna mengevaluasi dan menyimpan sendiri.
- State utama memakai write sinkron per aksi; hanya catatan yang debounce. Belum ada migrasi dari versi lama (repository sebelumnya kosong), cross-tab conflict resolution, atau test semua kemungkinan error aksesibilitas/storage quota.
- localStorage bukan brankas atau sinkronisasi multi-perangkat. Jangan menyimpan identitas pasien/data klinis nyata. Backup diunduh tanpa enkripsi. Penghapusan data browser menghapus progres dan rollback.
- Fitur offline hanya tersedia setelah app shell dan aset terkait tercache; status cache ditampilkan. Live proses tidak dipulihkan oleh snapshot lingkungan.

## Pengembangan berikutnya

Prioritas: review klinis dan perluasan bank soal ke 150 soal berbeda; audit aksesibilitas menyeluruh; tes waktu/background dan impor relasional yang lebih ketat; storage multi-tab; pencapaian/event ledger; analitik lanjutan; validasi Vercel live. Tidak menyatakan implementasi ini production-ready sebelum semua persyaratan dan audit selesai.
