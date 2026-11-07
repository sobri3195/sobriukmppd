import {
  Component,
  lazy,
  Suspense,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  BrowserRouter,
  NavLink,
  Link,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import {
  Activity,
  LayoutDashboard,
  BookOpen,
  ClipboardCheck,
  ChartNoAxesCombined,
  UserRound,
  CalendarDays,
  Timer,
  Layers,
  StickyNote,
  Stethoscope,
  History,
  Download,
  Settings,
  Sun,
  Moon,
  Plus,
  Menu,
  ArrowUpRight,
  Search,
  ChevronRight,
} from "lucide-react";
import { Toaster } from "sonner";
import { useRegisterSW } from "virtual:pwa-register/react";
import { useStore } from "../lib/store";
import { score } from "../lib/learning";
import { Button, Empty, Modal } from "../components/shared";
const Dashboard = lazy(() => import("../features/Dashboard"));
const Profile = lazy(() => import("../features/Profile"));
const Planner = lazy(() => import("../features/Planner"));
const TimerPage = lazy(() => import("../features/Timer"));
const Quiz = lazy(() => import("../features/Quiz"));
const Subjects = lazy(() => import("../features/Subjects"));
const Flashcards = lazy(() => import("../features/Flashcards"));
const Notes = lazy(() => import("../features/Notes"));
const Osce = lazy(() => import("../features/Osce"));
const Statistics = lazy(() => import("../features/Statistics"));
const Backup = lazy(() => import("../features/Backup"));
const nav = [
  { to: "/dashboard", label: "Beranda", icon: LayoutDashboard },
  { to: "/belajar/planner", label: "Rencana belajar", icon: CalendarDays },
  { to: "/belajar/materi", label: "Materi & bidang", icon: BookOpen },
  { to: "/belajar/timer", label: "Ruang fokus", icon: Timer },
  { to: "/belajar/flashcards", label: "Flashcard", icon: Layers },
  { to: "/belajar/catatan", label: "Catatan", icon: StickyNote },
  { to: "/latihan", label: "Bank soal & CBT", icon: ClipboardCheck },
  { to: "/latihan/osce", label: "Simulasi OSCE", icon: Stethoscope },
  { to: "/statistik", label: "Statistik", icon: ChartNoAxesCombined },
  { to: "/riwayat", label: "Riwayat", icon: History },
  { to: "/profil", label: "Profil", icon: UserRound },
  { to: "/backup", label: "Backup & data", icon: Download },
];
const mobile = [
  { to: "/dashboard", label: "Beranda", icon: LayoutDashboard },
  { to: "/belajar", label: "Belajar", icon: BookOpen },
  { to: "/latihan", label: "Latihan", icon: ClipboardCheck },
  { to: "/statistik", label: "Statistik", icon: ChartNoAxesCombined },
  { to: "/profil", label: "Profil", icon: UserRound },
];
function HistoryPage() {
  const data = useStore((s) => s.data);
  return (
    <>
      <h1>Riwayat aktivitas</h1>
      <section className="card mt">
        <h2>Latihan & tryout</h2>
        {!data.quizzes.filter((q) => q.submittedAt).length && (
          <Empty>Belum ada latihan yang selesai.</Empty>
        )}
        {data.quizzes
          .filter((q) => q.submittedAt)
          .slice()
          .reverse()
          .map((q) => (
            <Link
              className="list-link"
              key={q.id}
              to={`/latihan/hasil/${q.id}`}
            >
              {new Date(q.submittedAt!).toLocaleString("id-ID")} ·{" "}
              {q.questionIds.length} soal · {score(q).percent.toFixed(0)}%{" "}
              <ChevronRight size={16} />
            </Link>
          ))}
      </section>
      <section className="card mt">
        <h2>Sesi belajar</h2>
        {!data.sessions.length && (
          <Empty>Mulai sesi fokus untuk mencatat aktivitas belajarmu.</Empty>
        )}
        {data.sessions
          .slice()
          .reverse()
          .map((s) => (
            <p key={s.id}>
              {new Date(s.at).toLocaleString("id-ID")} · {s.minutes.toFixed(1)}{" "}
              menit
            </p>
          ))}
      </section>
    </>
  );
}
function StudyHub() {
  return (
    <>
      <h1>Ruang belajar</h1>
      <p className="muted">Pilih cara belajar yang sesuai untuk hari ini.</p>
      <div className="subject-grid mt">
        {nav.slice(1, 6).map((x) => (
          <Link className="card quick-card" key={x.to} to={x.to}>
            <x.icon />
            <h2>{x.label}</h2>
            <ArrowUpRight size={18} />
          </Link>
        ))}
      </div>
    </>
  );
}
function Shell() {
  const { data, update, error } = useStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [menu, setMenu] = useState(false);
  const [quick, setQuick] = useState(false);
  const [search, setSearch] = useState("");
  const {
    needRefresh: [needRefresh],
    offlineReady: [offlineReady],
    updateServiceWorker,
  } = useRegisterSW();
  useEffect(() => {
    document.documentElement.classList.toggle(
      "dark",
      data.profile?.theme === "dark",
    );
  }, [data.profile?.theme]);
  useEffect(() => {
    window.scrollTo(0, 0);
    setMenu(false);
    setQuick(false);
  }, [location.pathname]);
  useEffect(() => {
    if (location.pathname !== "/onboarding")
      try {
        sessionStorage.setItem("medtrack:last-route", location.pathname);
      } catch {
        /* restoration is optional */
      }
  }, [location.pathname]);
  const title =
    nav
      .slice()
      .sort((a, b) => b.to.length - a.to.length)
      .find((x) => location.pathname.startsWith(x.to))?.label ??
    "Ruang belajar";
  if (
    !data.profile &&
    location.pathname !== "/onboarding" &&
    location.pathname !== "/backup"
  )
    return <Navigate to="/onboarding" replace />;
  if (data.profile && location.pathname === "/onboarding")
    return <Navigate to="/dashboard" replace />;
  return (
    <>
      <a href="#main" className="skip-link">
        Lewati ke konten
      </a>
      {data.profile && (
        <>
          <aside className={`sidebar ${menu ? "open" : ""}`}>
            <Link to="/dashboard" className="brand">
              <span className="brand-mark">
                <Activity size={25} />
              </span>
              <span>
                MEDTRACK<small>UKNPDPD STUDY PLANNER</small>
              </span>
            </Link>
            <p className="nav-caption">WORKSPACE</p>
            <nav aria-label="Navigasi utama">
              {nav.map((x, i) => (
                <div key={x.to}>
                  {[1, 6, 8, 10].includes(i) && <div className="nav-divider" />}
                  <NavLink end={x.to === "/latihan"} to={x.to}>
                    <x.icon size={18} />
                    <span>{x.label}</span>
                    {x.to === "/belajar/flashcards" && <small>60</small>}
                  </NavLink>
                </div>
              ))}
            </nav>
            <div className="sidebar-note">
              <span>✦</span>
              <strong>Progres, bukan kesempurnaan.</strong>
              <p>Jaga ritme. Beri ruang untuk istirahat.</p>
            </div>
            <Link className="sidebar-user" to="/profil">
              <span className="avatar">
                {data.profile.name[0].toUpperCase()}
              </span>
              <div>
                <strong>{data.profile.name}</strong>
                <small>{data.profile.status} · Ruang pribadi</small>
              </div>
              <Settings size={16} />
            </Link>
          </aside>
          {menu && (
            <button
              aria-label="Tutup menu"
              className="sidebar-backdrop"
              onClick={() => setMenu(false)}
            />
          )}
          <header className="topbar">
            <div className="topbar-title">
              <button
                className="mobile-menu icon-button"
                aria-label="Buka menu"
                onClick={() => setMenu(!menu)}
              >
                <Menu size={21} />
              </button>
              <span className="muted">Workspace</span>
              <ChevronRight size={14} />
              <strong>{title}</strong>
            </div>
            <div className="topbar-actions">
              <form
                className="search-box"
                onSubmit={(e) => {
                  e.preventDefault();
                  navigate(
                    `/belajar/materi?search=${encodeURIComponent(search)}`,
                  );
                }}
              >
                <Search size={16} />
                <input
                  aria-label="Cari materi global"
                  placeholder="Cari materi belajar…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <kbd>↵</kbd>
              </form>
              <button
                className="icon-button"
                aria-label="Ganti tema"
                onClick={() =>
                  update((s) => ({
                    ...s,
                    profile: s.profile
                      ? {
                          ...s.profile,
                          theme: s.profile.theme === "dark" ? "light" : "dark",
                        }
                      : null,
                  }))
                }
              >
                {data.profile.theme === "dark" ? (
                  <Sun size={19} />
                ) : (
                  <Moon size={19} />
                )}
              </button>
              <Link className="avatar" to="/profil">
                {data.profile.name[0].toUpperCase()}
              </Link>
            </div>
          </header>
        </>
      )}
      <main
        id="main"
        className={data.profile ? "main-content" : "onboarding-main"}
      >
        {error && (
          <div className="error-banner" role="alert">
            {error} <Link to="/backup">Buka pemulihan data</Link>
          </div>
        )}
        {needRefresh && (
          <div className="notice">
            Versi baru tersedia. Simpan aktivitas sebelum memperbarui.{" "}
            <Button size="sm" onClick={() => updateServiceWorker(true)}>
              Perbarui aplikasi
            </Button>
          </div>
        )}
        <Suspense
          fallback={
            <div className="skeleton" role="status">
              Memuat ruang belajar…
            </div>
          }
        >
          <Routes>
            <Route path="/" element={<Restore />} />
            <Route path="/onboarding" element={<Profile onboarding />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/belajar" element={<StudyHub />} />
            <Route path="/belajar/planner" element={<Planner />} />
            <Route path="/belajar/timer" element={<TimerPage />} />
            <Route path="/belajar/materi" element={<Subjects />} />
            <Route path="/belajar/materi/:subjectId" element={<Subjects />} />
            <Route path="/belajar/flashcards" element={<Flashcards />} />
            <Route path="/belajar/catatan" element={<Notes />} />
            <Route path="/latihan" element={<Quiz />} />
            <Route path="/latihan/quiz" element={<Quiz />} />
            <Route path="/latihan/tryout" element={<Quiz />} />
            <Route path="/latihan/tryout/:sessionId" element={<Quiz />} />
            <Route path="/latihan/hasil/:sessionId" element={<Quiz />} />
            <Route path="/latihan/osce" element={<Osce />} />
            <Route path="/latihan/osce/:stationId" element={<Osce />} />
            <Route path="/statistik" element={<Statistics />} />
            <Route path="/riwayat" element={<HistoryPage />} />
            <Route path="/profil" element={<Profile />} />
            <Route path="/pengaturan" element={<Profile />} />
            <Route path="/backup" element={<Backup />} />
            <Route
              path="*"
              element={
                <Empty>
                  Halaman tidak ditemukan.{" "}
                  <Link to="/dashboard">Kembali ke beranda</Link>
                </Empty>
              }
            />
          </Routes>
        </Suspense>
        <p className="offline-status">
          {offlineReady
            ? "● Aset inti tersimpan untuk offline"
            : "Penyimpanan lokal · ekspor backup secara berkala"}
        </p>
      </main>
      {data.profile && (
        <>
          <button
            className="fab"
            aria-label="Tambah cepat"
            onClick={() => setQuick(true)}
          >
            <Plus size={25} />
          </button>
          <nav className="bottom-nav" aria-label="Navigasi mobile">
            {mobile.map((x) => (
              <NavLink key={x.to} to={x.to}>
                <x.icon size={21} />
                <span>{x.label}</span>
              </NavLink>
            ))}
          </nav>
        </>
      )}
      {quick && (
        <Modal title="Satu langkah baru" close={() => setQuick(false)}>
          <div className="stack">
            {[
              { to: "/belajar/timer", text: "Tambah sesi belajar" },
              { to: "/belajar/planner?new=1", text: "Tambah tugas" },
              { to: "/belajar/catatan?new=1", text: "Tambah catatan" },
              { to: "/profil", text: "Tambah target" },
              { to: "/belajar/flashcards", text: "Tambah flashcard" },
            ].map((x) => (
              <Button asChild variant="outline" key={x.to}>
                <Link to={x.to} onClick={() => setQuick(false)}>
                  {x.text} →
                </Link>
              </Button>
            ))}
          </div>
        </Modal>
      )}
      <Toaster richColors position="top-center" />
    </>
  );
}
function Restore() {
  let last = "/dashboard";
  try {
    const candidate = sessionStorage.getItem("medtrack:last-route");
    if (candidate && candidate.startsWith("/") && candidate !== "/")
      last = candidate;
  } catch {
    /* default dashboard */
  }
  return <Navigate to={last} replace />;
}
class ErrorBoundary extends Component<
  { children: ReactNode },
  { error: boolean }
> {
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  render() {
    if (this.state.error)
      return (
        <div className="card">
          <h1>Ruang belajar mengalami kendala</h1>
          <p>Data browser tidak dihapus. Muat ulang untuk mencoba kembali.</p>
          <Button onClick={() => location.reload()}>Muat ulang</Button>
        </div>
      );
    return this.props.children;
  }
}
export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Shell />
      </BrowserRouter>
    </ErrorBoundary>
  );
}
