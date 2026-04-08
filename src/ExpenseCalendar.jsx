import { useMemo } from "react";
import { formatMoney, formatDateDisplay } from "./utils.js";

/**
 * Month grid: shows daily expense totals; click a day to inspect entries.
 */
export default function ExpenseCalendar({
  viewMonth,
  onPrevMonth,
  onNextMonth,
  expenses,
  selectedDate,
  onSelectDate,
}) {
  const { year, monthIndex, label } = useMemo(() => {
    const y = viewMonth.getFullYear();
    const m = viewMonth.getMonth();
    const label = viewMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    return { year: y, monthIndex: m, label };
  }, [viewMonth]);

  const { cells, todayISO } = useMemo(() => {
    const first = new Date(year, monthIndex, 1);
    const lastDay = new Date(year, monthIndex + 1, 0).getDate();
    const startPad = first.getDay();
    const out = [];

    const pad = (n) => String(n).padStart(2, "0");
    const iso = (d) => `${year}-${pad(monthIndex + 1)}-${pad(d)}`;

    const now = new Date();
    const tIso = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

    for (let i = 0; i < startPad; i++) {
      out.push({ type: "pad", key: `pad-${i}` });
    }
    for (let d = 1; d <= lastDay; d++) {
      out.push({ type: "day", day: d, dateStr: iso(d), key: `day-${d}` });
    }
    while (out.length % 7 !== 0) {
      out.push({ type: "pad", key: `trail-${out.length}` });
    }

    return { cells: out, todayISO: tIso };
  }, [year, monthIndex]);

  const totalsByDate = useMemo(() => {
    const map = new Map();
    for (const e of expenses) {
      const d = e.date;
      if (!d) continue;
      const prev = map.get(d) || { total: 0, count: 0 };
      map.set(d, { total: prev.total + e.amount, count: prev.count + 1 });
    }
    return map;
  }, [expenses]);

  const monthExpenseTotal = useMemo(() => {
    let sum = 0;
    for (const e of expenses) {
      if (!e.date) continue;
      const [ey, em] = e.date.split("-").map(Number);
      if (ey === year && em === monthIndex + 1) sum += e.amount;
    }
    return sum;
  }, [expenses, year, monthIndex]);

  return (
    <div className="calendar-module">
      <div className="calendar-module__head">
        <h3 className="card__heading calendar-module__title">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          Expense calendar
        </h3>
        <div className="calendar-nav">
          <button type="button" className="calendar-nav__btn" onClick={onPrevMonth} aria-label="Previous month">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <span className="calendar-nav__label">{label}</span>
          <button type="button" className="calendar-nav__btn" onClick={onNextMonth} aria-label="Next month">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
        <p className="calendar-module__month-total">
          This month: <strong>{formatMoney(monthExpenseTotal)}</strong>
        </p>
      </div>

      <div className="calendar-grid-wrap">
        <div className="calendar-weekdays" aria-hidden="true">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((w) => (
            <div key={w} className="calendar-weekdays__cell">
              {w}
            </div>
          ))}
        </div>
        <div className="calendar-grid" role="grid" aria-label={`Calendar for ${label}`}>
          {cells.map((cell) => {
            if (cell.type === "pad") {
              return <div key={cell.key} className="calendar-cell calendar-cell--pad" />;
            }
            const agg = totalsByDate.get(cell.dateStr);
            const hasExp = agg && agg.count > 0;
            const isToday = cell.dateStr === todayISO;
            const isSelected = selectedDate === cell.dateStr;
            return (
              <button
                key={cell.key}
                type="button"
                role="gridcell"
                className={`calendar-cell calendar-cell--day${isToday ? " calendar-cell--today" : ""}${
                  isSelected ? " calendar-cell--selected" : ""
                }${hasExp ? " calendar-cell--has-expense" : ""}`}
                onClick={() => onSelectDate(cell.dateStr)}
                aria-pressed={isSelected}
                aria-label={`${cell.day}, ${hasExp ? formatMoney(agg.total) + " spent" : "no expenses"}`}
              >
                <span className="calendar-cell__num">{cell.day}</span>
                {hasExp && <span className="calendar-cell__dot" title={`${agg.count} expense(s)`} />}
                {hasExp && <span className="calendar-cell__mini">{formatMoney(agg.total)}</span>}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/** Side panel: list expenses for one day */
export function CalendarDayPanel({ selectedDate, expenses, onJumpToForm }) {
  const list = useMemo(() => {
    if (!selectedDate) return [];
    return expenses.filter((e) => e.date === selectedDate);
  }, [selectedDate, expenses]);

  const dayTotal = useMemo(() => list.reduce((a, e) => a + e.amount, 0), [list]);

  if (!selectedDate) {
    return (
      <div className="calendar-panel">
        <p className="calendar-panel__empty">Select a day on the calendar to see expenses.</p>
      </div>
    );
  }

  return (
    <div className="calendar-panel">
      <div className="calendar-panel__header">
        <h4 className="calendar-panel__title">{formatDateDisplay(selectedDate)}</h4>
        <p className="calendar-panel__sub">
          Day total: <strong>{formatMoney(dayTotal)}</strong> - {list.length} item{list.length !== 1 ? "s" : ""}
        </p>
        {onJumpToForm && (
          <button type="button" className="btn btn--ghost btn--small" onClick={onJumpToForm}>
            Log expense for this day
          </button>
        )}
      </div>
      {list.length === 0 ? (
        <p className="calendar-panel__empty">No expenses on this date.</p>
      ) : (
        <ul className="calendar-panel__list">
          {list.map((e) => (
            <li key={e.id} className="calendar-panel__item">
              <span className="calendar-panel__name">{e.name}</span>
              <span className="calendar-panel__amt">{formatMoney(e.amount)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}