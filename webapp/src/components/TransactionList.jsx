import { useMemo, useState } from "react";
import Skeleton from "./Skeleton.jsx";
import { formatMoney, timeAgo, categoryIcon, categoryColor } from "../utils/format.js";

const TrashIcon = ({ className = "" }) => (
  <svg
    className={className}
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M3 6h18" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
    <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    <line x1="10" x2="10" y1="11" y2="17" />
    <line x1="14" x2="14" y1="11" y2="17" />
  </svg>
);

/*
  So'nggi tranzaksiyalar ro'yxati:
  - oxirgi 5 ta tranzaksiya (kategoriya iconi, izoh, summa va vaqti),
  - tezkor filtr tugmalari (Barchasi / Kirim / Chiqim),
  - soft-delete (o'chirishni tasdiqlash bilan).
*/
export default function TransactionList({ transactions, loading, onDelete }) {
  const [filter, setFilter] = useState("all");
  const [confirmId, setConfirmId] = useState(null);

  const list = useMemo(() => {
    const items = Array.isArray(transactions) ? transactions : [];
    if (filter === "all") return items;
    return items.filter((tx) => tx.type === filter);
  }, [transactions, filter]);

  if (loading) {
    return (
      <section className="glass flex flex-col gap-3 p-4" aria-busy="true">
        <Skeleton className="h-4 w-32" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1">
              <Skeleton className="h-3 w-2/3" />
              <Skeleton className="mt-1.5 h-2.5 w-1/3" />
            </div>
            <Skeleton className="h-3 w-16" />
          </div>
        ))}
      </section>
    );
  }

  const filters = [
    { key: "all", label: "Barchasi" },
    { key: "income", label: "Kirim" },
    { key: "expense", label: "Chiqim" },
  ];

  return (
    <section className="glass p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-text">So'nggi tranzaksiyalar</h3>
        {/* Tezkor filtr tugmalari */}
        <div className="flex gap-1 rounded-full bg-deep p-1">
          {filters.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setFilter(item.key)}
              className={`touch-btn rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                filter === item.key
                  ? "bg-accent text-white"
                  : "text-muted hover:bg-soft"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {list.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center text-sm text-muted">
          <span className="mb-2 text-3xl">💸</span>
          Tranzaksiyalar topilmadi
        </div>
      ) : (
        <ul className="flex flex-col divide-y divide-border">
          {list.map((tx) => {
            const isIncome = tx.type === "income";
            const title = tx.category_title || (isIncome ? "Kirim" : "Chiqim");
            return (
              <li
                key={tx.id}
                className="flex items-center gap-3 py-3 transition-colors active:bg-soft"
              >
                {/* Kategoriya iconi */}
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-lg"
                  style={{ background: `${categoryColor(title)}20` }}
                >
                  <span style={{ filter: "none" }}>{categoryIcon(title)}</span>
                </span>

                {/* Izoh va vaqti */}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-text">
                    {title}
                  </p>
                  <p className="truncate text-xs text-muted">
                    {tx.comment ? `${tx.comment} • ` : ""}
                    {timeAgo(tx.created_at)}
                  </p>
                </div>

                {/* Summa */}
                <div className="flex items-center gap-2">
                  {!confirmId && (
                    <p
                      className={`shrink-0 text-sm font-bold ${
                        isIncome ? "text-income" : "text-expense"
                      }`}
                    >
                      {isIncome ? "+" : "-"}
                      {formatMoney(tx.amount)}
                    </p>
                  )}

                  {/* Soft-delete: avval tasdiqlash */}
                  {confirmId === tx.id ? (
                    <div className="flex shrink-0 items-center gap-1.5">
                      <span className="text-xs text-muted">O'chirish?</span>
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            await onDelete(tx.id);
                          } finally {
                            setConfirmId(null);
                          }
                        }}
                        className="touch-btn rounded-lg bg-expense/20 px-2.5 py-1 text-xs font-bold text-expense"
                      >
                        Ha
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmId(null)}
                        className="touch-btn rounded-lg bg-deep px-2.5 py-1 text-xs font-semibold text-muted"
                      >
                        Yo'q
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmId(tx.id)}
                      className="touch-btn rounded-lg p-2 text-muted hover:text-expense"
                      aria-label={`${title} tranzaksiyasini o'chirish`}
                    >
                      <TrashIcon />
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}