import { useState } from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import Skeleton from "./Skeleton.jsx";
import { formatMoney, categoryColor, categoryIcon } from "../utils/format.js";

/* Recharts tooltip — Telegram theme'ga mos shisha (glass) uslub. */
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-strong px-3 py-2 text-xs shadow-glass">
      <p className="mb-1 font-semibold text-text">{label}</p>
      {payload.map((entry) => (
        <div key={entry.dataKey} className="flex items-center gap-2 py-0.5">
          <span
            className="h-2 w-2 rounded-full"
            style={{ background: entry.color || entry.fill }}
          />
          <span className="text-muted">
            {entry.dataKey === "income" ? "Kirim" : "Chiqim"}
          </span>
          <span className="ml-auto pl-3 font-semibold text-text">
            {formatMoney(entry.value)} so'm
          </span>
        </div>
      ))}
    </div>
  );
}

/* Donut markazidagi umumiy chiqim summasini ko'rsatish. */
function DonutCenter({ total }) {
  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
      <span className="text-[10px] font-medium uppercase tracking-wide text-muted">
        Chiqim
      </span>
      <span className="text-lg font-bold text-text">
        {formatMoney(total)} so'm
      </span>
    </div>
  );
}

/*
  Grafiklar bloki:
  1. Donut (PieChart): chiqimlarning kategoriyalar bo'yicha taqsimoti.
     `categories` GET /api/stats/categories javobidagi `data` massivi.
  2. Area (AreaChart): kunbay/haftabay kirim-chiqim dinamikasi.
     `trend` GET /api/stats/monthly-trend javobidagi `data` massivi.
*/
export default function Charts({ categories, trend, groupBy, onGroupChange, loading }) {
  const [activeIndex, setActiveIndex] = useState(null);
  const totalExpense = categories.reduce((sum, item) => sum + Number(item.total), 0);

  const trendData = (trend || []).map((row) => ({
    ...row,
    label: row.period,
  }));

  const toggle = (mode) => (
    <button
      type="button"
      onClick={() => onGroupChange?.(mode)}
      className={`touch-btn rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
        groupBy === mode ? "bg-accent text-white" : "text-muted hover:bg-soft"
      }`}
    >
      {mode === "daily" ? "Kun" : "Hafta"}
    </button>
  );

  return (
    <section className="flex flex-col gap-3">
      {/* ---- Chiqimlar kategoriya bo'yicha (Donut) ---- */}
      <div className="glass p-4">
        <div className="mb-1 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-text">Kategoriyalar</h3>
          <span className="text-xs text-muted">Chiqim taqsimoti</span>
        </div>

        {loading ? (
          <Skeleton className="mx-auto mt-4 h-44 w-44 rounded-full" />
        ) : totalExpense <= 0 ? (
          <div className="flex h-44 flex-col items-center justify-center text-center text-sm text-muted">
            <span className="mb-2 text-3xl">📊</span>
            Bu oyda chiqimlar yo'q
          </div>
        ) : (
          <div className="relative mx-auto h-44 w-full max-w-[220px]">
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={categories}
                  dataKey="total"
                  nameKey="category"
                  cx="50%"
                  cy="50%"
                  innerRadius={54}
                  outerRadius={78}
                  paddingAngle={3}
                  cornerRadius={6}
                  strokeWidth={0}
                  onMouseEnter={(_, i) => setActiveIndex(i)}
                  onMouseLeave={() => setActiveIndex(null)}
                >
                  {categories.map((entry, i) => (
                    <Cell
                      key={entry.category}
                      fill={categoryColor(entry.category)}
                      opacity={activeIndex === null || activeIndex === i ? 1 : 0.45}
                    />
                  ))}
                </Pie>
                <Tooltip content={ChartTooltip} />
              </PieChart>
            </ResponsiveContainer>
            <DonutCenter total={totalExpense} />
          </div>
        )}

        {/* Legend */}
        {!loading && totalExpense > 0 && (
          <div className="mt-4 flex flex-col gap-1.5">
            {categories.map((item) => (
              <div key={item.category} className="flex items-center gap-2.5 text-[13px]">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ background: categoryColor(item.category) }}
                />
                <span className="text-base leading-none">
                  {categoryIcon(item.category)}
                </span>
                <span className="w-24 truncate font-medium text-text">
                  {item.category}
                </span>
                <span className="text-muted">{formatMoney(item.total)} so'm</span>
                <span className="ml-auto font-semibold text-text">
                  {Number(item.percent || 0).toFixed(0)}%
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ---- Kirim-chiqim dinamikasi (Area chart) ---- */}
      <div className="glass p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-text">Dinamika</h3>
          <div className="flex gap-1 rounded-full bg-deep p-1">
            {toggle("daily")}
            {toggle("weekly")}
          </div>
        </div>

        {loading ? (
          <Skeleton className="h-44 w-full" />
        ) : trendData.length === 0 ? (
          <div className="flex h-44 flex-col items-center justify-center text-center text-sm text-muted">
            <span className="mb-2 text-3xl">📈</span>
            Bu oyda tranzaksiyalar yo'q
          </div>
        ) : (
          <div className="h-44 w-full">
            <ResponsiveContainer>
              <AreaChart data={trendData} margin={{ top: 6, right: 4, left: 4, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradIncome" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#34d399" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#34d399" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradExpense" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#fb7185" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#fb7185" stopOpacity={0} />
                  </linearGradient>
                </defs>

                <CartesianGrid vertical={false} stroke="var(--tg-border)" strokeDasharray="4 6" />
                <XAxis
                  dataKey="label"
                  tickFormatter={(value) => {
                    const d = new Date(value);
                    return Number.isNaN(d.getTime())
                      ? value
                      : `${d.getDate()}.${d.getMonth() + 1}`;
                  }}
                  tick={{ fill: "var(--tg-muted)", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  minTickGap={22}
                />
                <YAxis hide domain={[0, (dataMax) => dataMax * 1.15]} />
                <Tooltip content={ChartTooltip} />

                <Area
                  type="monotone"
                  dataKey="income"
                  name="Kirim"
                  stroke="#34d399"
                  strokeWidth={2}
                  fill="url(#gradIncome)"
                />
                <Area
                  type="monotone"
                  dataKey="expense"
                  name="Chiqim"
                  stroke="#fb7185"
                  strokeWidth={2}
                  fill="url(#gradExpense)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </section>
  );
}