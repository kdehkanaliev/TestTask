import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { statsApi, transactionsApi } from "./api.js";
import { useTelegram } from "./hooks/useTelegram.js";
import TopBar from "./components/TopBar.jsx";
import SummaryCards from "./components/SummaryCards.jsx";
import Charts from "./components/Charts.jsx";
import TransactionList from "./components/TransactionList.jsx";

function currentMonthYear() {
  const now = new Date();
  return { month: now.getMonth() + 1, year: now.getFullYear() };
}

/* Pastga tortib yangilash (pull-to-refresh) logikasi. */
function usePullToRefresh(onRefresh) {
  const [pull, setPull] = useState(0);
  const touch = useRef({ y: 0, active: false });

  const onTouchStart = (e) => {
    if (window.scrollY <= 0) {
      touch.current = { y: e.touches[0].clientY, active: true };
    }
  };
  const onTouchMove = (e) => {
    if (!touch.current.active || window.scrollY > 0) return;
    const delta = e.touches[0].clientY - touch.current.y;
    if (delta > 0) setPull(Math.min(delta * 0.5, 90));
  };
  const onTouchEnd = () => {
    if (pull >= 55) onRefresh();
    setPull(0);
    touch.current.active = false;
  };

  return { pull, handlers: { onTouchStart, onTouchMove, onTouchEnd } };
}

export default function App() {
  const { initData, user, haptic } = useTelegram();
  const { pull, handlers } = usePullToRefresh(() => setReloadKey((k) => k + 1));

  const [view, setView] = useState(currentMonthYear);
  const [groupBy, setGroupBy] = useState("daily");
  const [reloadKey, setReloadKey] = useState(0);

  const [summary, setSummary] = useState(null);
  const [categories, setCategories] = useState([]);
  const [trend, setTrend] = useState([]);
  const [transactions, setTransactions] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const { month, year } = view;

  // Joriy oy/yil va guruhlash (kun/hafta) o'zgarganda barcha ma'lumotlarni yuklaymiz.
  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError("");

    const params = { month, year };
    Promise.all([
      statsApi.summary(params),
      statsApi.categories(params),
      statsApi.trend({ groupBy }),
      transactionsApi.list({ ...params, limit: 5 }),
    ])
      .then(([summaryRes, categoriesRes, trendRes, txRes]) => {
        if (!alive) return;
        setSummary(summaryRes);
        setCategories(categoriesRes.data || []);
        setTrend(trendRes.data || []);
        setTransactions(txRes.data || []);
      })
      .catch((err) => {
        if (!alive) return;
        setError(err.message);
        haptic("error");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [month, year, groupBy, reloadKey, haptic]);

  // Dinamika grafigi uchun faqat tanlangan oy ma'lumotlarini ajratamiz.
  const monthTrend = useMemo(
    () =>
      trend.filter((row) => {
        const d = new Date(row.period);
        return (
          !Number.isNaN(d.getTime()) &&
          d.getFullYear() === year &&
          d.getMonth() + 1 === month
        );
      }),
    [trend, month, year]
  );

  // Soft-delete: o'chirilgach ro'yxatni yangilaymiz.
  const handleDelete = useCallback(
    async (id) => {
      try {
        await transactionsApi.remove(id);
        haptic("success");
        setTransactions((prev) => prev.filter((tx) => tx.id !== id));
        // Statistikani ham yangilash.
        setReloadKey((k) => k + 1);
      } catch (err) {
        haptic("error");
        setError(err.message);
      }
    },
    [haptic]
  );

  const isBrowserDev = !initData && typeof window !== "undefined";

  return (
    <div
      className="relative min-h-[100dvh] bg-base text-text"
      {...handlers}
    >
      {/* Orqa fondagi yumshoq aurora */}
      <div className="aurora-blob -top-16 -left-16 h-64 w-64" />
      <div className="aurora-blob top-40 -right-20 h-72 w-72 [animation-delay:2s]" />

      {/* Pastga tortish indikatori */}
      <div
        className="pointer-events-none fixed left-0 right-0 top-0 z-40 flex justify-center transition-transform"
        style={{ transform: `translateY(${pull > 24 ? pull - 24 : -24}px)` }}
      >
        <div className="glass-strong flex items-center gap-2 px-4 py-2 text-xs font-medium text-muted shadow-glass">
          <span
            className={`h-3 w-3 rounded-full border-2 border-muted border-t-transparent ${
              pull >= 55 ? "animate-spin" : ""
            }`}
          />
          {pull >= 55 ? "Yangilanmoqda..." : "Yangilash uchun torting"}
        </div>
      </div>

      <main className="relative mx-auto flex w-full max-w-md flex-col gap-4 px-4 pb-12 pt-2">
        <TopBar month={month} year={year} onChange={(m, y) => setView({ month: m, year: y })} />

        {/* Dev brauzerda Telegram bo'lmasa ogohlantirish */}
        {isBrowserDev && (
          <div className="glass-strong flex items-start gap-2 px-4 py-3 text-xs text-muted">
            <span className="mt-0.5 text-sm">⚠️</span>
            <p>
              Bu ekran Telegram Mini App ichida ochiladi. Brauzerda sinash uchun URL oxiriga{" "}
              <code className="rounded bg-deep px-1 py-0.5 text-accent">?initData=...</code>{" "}
              qo'shib backend'ning dashboard so'rovlarini ham tekshirishingiz mumkin.
            </p>
          </div>
        )}

        {/* Xatolik banneri */}
        {error && (
          <div className="glass-strong flex items-start gap-2 border-expense/30 px-4 py-3 text-sm text-expense">
            <span className="mt-0.5 text-sm">❌</span>
            <p className="flex-1">{error}</p>
            <button
              type="button"
              onClick={() => setReloadKey((k) => k + 1)}
              className="touch-btn shrink-0 rounded-lg bg-deep px-2.5 py-1 text-xs font-semibold text-text"
            >
              Qayta
            </button>
          </div>
        )}

        <SummaryCards data={summary} loading={loading} />
        <Charts
          categories={categories}
          trend={monthTrend}
          groupBy={groupBy}
          onGroupChange={setGroupBy}
          loading={loading}
        />
        <TransactionList
          transactions={transactions}
          loading={loading}
          onDelete={handleDelete}
        />

        <p className="pb-2 text-center text-[11px] text-muted">
          SmartFinance • {new Date().getFullYear()} — {user?.username || ""}
        </p>
      </main>
    </div>
  );
}