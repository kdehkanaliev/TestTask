import Skeleton from "./Skeleton.jsx";
import { formatMoney } from "../utils/format.js";

const DownIcon = ({ className = "" }) => (
  <svg
    className={className}
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 5v14" />
    <path d="m19 12-7 7-7-7" />
  </svg>
);

const UpIcon = ({ className = "" }) => (
  <svg
    className={className}
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 19V5" />
    <path d="m5 12 7-7 7 7" />
  </svg>
);

const WalletIcon = ({ className = "" }) => (
  <svg
    className={className}
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M19 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-2" />
    <path d="M17 12h3a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1h-3a2 2 0 0 1 0-4Z" />
  </svg>
);

/*
  Xulosa kartalari: Umumiy Kirim, Umumiy Chiqim va Sof Balans.
  `data` GET /api/stats/summary javobidir: { income, expense, balance }.
*/
export default function SummaryCards({ data, loading }) {
  /* Kirim va chiqim kartalari */
  const miniCards = [
    {
      key: "income",
      label: "Umumiy Kirim",
      value: data?.income,
      sign: "+",
      icon: UpIcon,
      color: "text-income",
      bg: "bg-income/15",
    },
    {
      key: "expense",
      label: "Umumiy Chiqim",
      value: data?.expense,
      sign: "-",
      icon: DownIcon,
      color: "text-expense",
      bg: "bg-expense/15",
    },
  ];

  return (
    <section className="flex flex-col gap-3" aria-label="Xulosa">
      <div className="grid grid-cols-2 gap-3">
        {miniCards.map(({ key, label, value, sign, icon: Icon, color, bg }) => (
          <div key={key} className="glass touch-btn p-4">
            <div className={`mb-3 inline-flex h-10 w-10 items-center justify-center rounded-2xl ${bg} ${color}`}>
              <Icon />
            </div>
            {loading ? (
              <Skeleton className="h-4 w-16" />
            ) : (
              <p className={`text-xl font-bold ${color}`}>
                {sign}
                {formatMoney(value)}
              </p>
            )}
            <p className="mt-0.5 text-xs font-medium text-muted">{label}</p>
          </div>
        ))}
      </div>

      {/* Sof balans — to'liq enli filtr karta */}
      <div className="glass relative overflow-hidden p-4">
        <div className="aurora-blob -bottom-10 -right-10 h-40 w-40 opacity-60" />
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-soft text-accent">
            <WalletIcon />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-muted">Sof Balans</p>
            {loading ? (
              <Skeleton className="mt-1 h-5 w-28" />
            ) : (
              <p className="mt-0.5 truncate text-2xl font-bold text-text">
                {formatMoney(data?.balance)}
                <span className="ml-1.5 text-xs font-medium text-muted">UZS</span>
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}