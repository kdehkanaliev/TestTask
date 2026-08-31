import { useEffect, useRef, useState } from "react";
import { useTelegram } from "../hooks/useTelegram.js";
import { MONTHS } from "../utils/format.js";

const ChevronIcon = ({ className = "" }) => (
  <svg
    className={className}
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.4"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="m6 9 6 6 6-6" />
  </svg>
);

/*
  Top Bar:
  - chap tomonda foydalanuvchi profili (rasmi/ismi),
  - o'ngda joriy oy/yil filtri (dropdown).
  - oy tanlanganda onChange(month, year) chaqiriladi.
*/
export default function TopBar({ month, year, onChange }) {
  const { user } = useTelegram();
  const [open, setOpen] = useState(false);
  const panelRef = useRef(null);

  const fullName = [user?.first_name, user?.last_name].filter(Boolean).join(" ");
  const displayName = fullName || user?.username || "Foydalanuvchi";
  const initial = (fullName || user?.username || "S")[0]?.toUpperCase() ?? "S";

  // Dropdown tashqarisiga bosilganda yopish.
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  // Yil o'zgartirish tugmalari.
  const shiftYear = (delta) => onChange(month, year + delta);

  return (
    <header className="flex items-center justify-between gap-3 px-1 py-2">
      {/* Profil */}
      <div className="flex min-w-0 items-center gap-3">
        {user?.photo_url ? (
          <img
            src={user.photo_url}
            alt={displayName}
            className="h-10 w-10 rounded-full border border-border object-cover"
          />
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-soft text-sm font-bold text-accent">
            {initial}
          </div>
        )}
        <div className="min-w-0">
          <p className="truncate text-[15px] font-semibold text-text">
            {displayName}
          </p>
          <p className="truncate text-xs text-muted">
            SmartFinance • moliyangiz nazoratda
          </p>
        </div>
      </div>

      {/* Oy/Yil tanlagich */}
      <div className="relative" ref={panelRef}>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className={`touch-btn glass-strong flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-text ${
            open ? "ring-2 ring-soft" : ""
          }`}
        >
          {MONTHS[month - 1]} {year}
          <ChevronIcon className={`text-muted transition-transform ${open ? "rotate-180" : ""}`} />
        </button>

        {open && (
          <div className="glass-strong absolute right-0 top-12 z-30 w-64 animate-fade-in p-2 shadow-glass">
            {/* Yil boshqaruvi */}
            <div className="mb-2 flex items-center justify-between px-1">
              <button
                type="button"
                onClick={() => shiftYear(-1)}
                className="touch-btn flex h-8 w-8 items-center justify-center rounded-full text-muted hover:text-text"
                aria-label="O'tgan yil"
              >
                ‹
              </button>
              <span className="text-sm font-bold text-text">{year}</span>
              <button
                type="button"
                onClick={() => shiftYear(1)}
                className="touch-btn flex h-8 w-8 items-center justify-center rounded-full text-muted hover:text-text"
                aria-label="Keyingi yil"
              >
                ›
              </button>
            </div>

            {/* Oylar to'ri */}
            <div className="grid grid-cols-3 gap-1">
              {MONTHS.map((label, idx) => {
                const isActive = idx + 1 === month;
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => {
                      onChange(idx + 1, year);
                      setOpen(false);
                    }}
                    className={`touch-btn rounded-xl px-2 py-2 text-[13px] font-medium transition-colors ${
                      isActive
                        ? "bg-accent text-white"
                        : "text-text hover:bg-soft"
                    }`}
                  >
                    <span className="line-clamp-1">{label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}