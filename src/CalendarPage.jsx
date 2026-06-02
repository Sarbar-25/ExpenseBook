import React, { useEffect, useMemo, useState } from "react";
import ExpenseCalendar, { CalendarDayPanel } from "./ExpenseCalendar.jsx";
import {
  getReminderBudgetSnapshot,
  loadStoredReminders,
  REMINDERS_UPDATED_EVENT,
} from "./utils.js";

export default function CalendarPage({
  calMonth,
  expenses,
  selectedDate,
  setSelectedDate,
  onPrevMonth,
  onNextMonth,
  onNavigateToReminders,
  monthlyBalance,
  totalBalance,
  netWorth,
}) {
  const viewMonth = useMemo(() => calMonth, [calMonth]);
  const [reminders, setReminders] = useState(() => loadStoredReminders());

  useEffect(() => {
    const refreshReminders = () => {
      setReminders(loadStoredReminders());
    };

    refreshReminders();

    if (typeof window === "undefined") return undefined;

    window.addEventListener("storage", refreshReminders);
    window.addEventListener(REMINDERS_UPDATED_EVENT, refreshReminders);

    return () => {
      window.removeEventListener("storage", refreshReminders);
      window.removeEventListener(REMINDERS_UPDATED_EVENT, refreshReminders);
    };
  }, []);

  const reminderBudget = useMemo(
    () => getReminderBudgetSnapshot(reminders, monthlyBalance),
    [reminders, monthlyBalance]
  );

  // UI-only derived metrics for premium cards (no business logic changes).
  // Reminder count uses the existing reminders localStorage payload (expensebook_reminders)
  // and mirrors the RemindersCard “Upcoming” logic to keep counts synchronized.
  const upcomingRemindersCount = useMemo(() => {
    try {
      const today = new Date();
      // RemindersCard compares dueISO strings to todayISO() which is YYYY-MM-DD.
      const pad2 = (n) => String(n).padStart(2, "0");
      const todayISO = `${today.getFullYear()}-${pad2(today.getMonth() + 1)}-${pad2(today.getDate())}`;

      return reminders.filter((r) => {
        const reminder = r || {};
        const cancelled =
          reminder.cancelled === true ||
          reminder.canceled === true ||
          ["cancelled", "canceled"].includes(String(reminder.status || "").trim().toLowerCase());
        const completed = typeof reminder.completed === "boolean" ? reminder.completed : false;
        if (completed || cancelled) return false;

        const dueISO = typeof reminder.dueISO === "string" ? reminder.dueISO : "";
        // Count if due date is today or in the future OR due date is missing (treated as Upcoming in RemindersCard).
        if (!dueISO) return true;
        return String(dueISO) >= todayISO;
      }).length;
    } catch {
      return 0;
    }
  }, [reminders]);

  useEffect(() => {
    console.log("Monthly Balance Source:", Number(monthlyBalance) || 0);
    console.log("Total Balance:", Number(totalBalance) || 0);
    console.log("Net Worth:", Number(netWorth) || 0);
    console.log("Reminder Amount:", Number(reminderBudget.totalReminderAmount) || 0);
    console.log("Monthly Budget:", Number(reminderBudget.monthlyBudget) || 0);
  }, [monthlyBalance, totalBalance, netWorth, reminderBudget]);

  const thisMonthExpenseTotal = useMemo(() => {
    if (!Array.isArray(expenses)) return 0;
    const y = viewMonth?.getFullYear?.();
    const m = viewMonth?.getMonth?.() + 1;
    if (!y || !m) return 0;
    let sum = 0;
    for (const e of expenses) {
      if (!e?.date) continue;
      const [ey, em] = String(e.date).split("-").map(Number);
      if (ey === y && em === m) sum += Number(e.amount) || 0;
    }
    return sum;
  }, [expenses, viewMonth]);

  const daysWithExpenses = useMemo(() => {
    if (!Array.isArray(expenses)) return 0;
    const y = viewMonth?.getFullYear?.();
    const m = viewMonth?.getMonth?.() + 1;
    if (!y || !m) return 0;
    const set = new Set();
    for (const e of expenses) {
      if (!e?.date) continue;
      const [ey, em] = String(e.date).split("-").map(Number);
      if (ey === y && em === m) set.add(e.date);
    }
    return set.size;
  }, [expenses, viewMonth]);

  return (
    <div className="calendar-page">
      {/* HERO */}
      <section className="calendar-hero" aria-label="Expense calendar hero">
        <div className="calendar-hero__glow" aria-hidden="true" />

        <div className="calendar-hero__content">
          <div className="calendar-hero__copy">
            <h2 className="calendar-hero__title">Expense Calendar</h2>
            <p className="calendar-hero__subtitle">
              Track and manage your daily expenses visually
            </p>
          </div>


          <div className="calendar-hero__art" aria-hidden="true">
            {/* Premium 3D/SaaS illustration (inline SVG; no functional impact) */}
            <svg className="calendar-hero__artSvg" viewBox="0 0 520 320" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="g1" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#4F46E5" stopOpacity="0.95" />
                  <stop offset="0.55" stopColor="#2563EB" stopOpacity="0.9" />
                  <stop offset="1" stopColor="#8B5CF6" stopOpacity="0.85" />
                </linearGradient>
                <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#ffffff" stopOpacity="0.55" />
                  <stop offset="1" stopColor="#ffffff" stopOpacity="0.05" />
                </linearGradient>
                <filter id="shadow" x="-30%" y="-30%" width="160%" height="160%">
                  <feDropShadow dx="0" dy="14" stdDeviation="14" floodColor="#3B82F6" floodOpacity="0.22" />
                  <feDropShadow dx="0" dy="4" stdDeviation="7" floodColor="#0EA5E9" floodOpacity="0.12" />
                </filter>
              </defs>

              {/* Soft blobs */}
              <circle cx="92" cy="58" r="34" fill="#8B5CF6" opacity="0.18" />
              <circle cx="150" cy="96" r="22" fill="#3B82F6" opacity="0.14" />
              <circle cx="458" cy="70" r="40" fill="#2563EB" opacity="0.12" />
              <circle cx="430" cy="128" r="24" fill="#8B5CF6" opacity="0.10" />

              {/* 3D calendar card */}
              <g filter="url(#shadow)">
                <path
                  d="M180 40h220c18 0 32 14 32 32v168c0 18-14 32-32 32H180c-18 0-32-14-32-32V72c0-18 14-32 32-32z"
                  fill="url(#g1)"
                />
                <path
                  d="M168 52h224c14 0 25 11 25 25v168c0 14-11 25-25 25H168c-14 0-25-11-25-25V77c0-14 11-25 25-25z"
                  fill="rgba(255,255,255,0.14)"
                />

                {/* Top header */}
                <rect x="160" y="78" width="240" height="56" rx="18" fill="url(#g2)" opacity="0.9" />
                <g opacity="0.95">
                  <rect x="188" y="93" width="58" height="10" rx="6" fill="rgba(255,255,255,0.65)" />
                  <rect x="188" y="108" width="105" height="10" rx="6" fill="rgba(255,255,255,0.35)" />
                </g>

                {/* Grid */}
                <g opacity="0.95">
                  <rect
                    x="170"
                    y="150"
                    width="220"
                    height="92"
                    rx="18"
                    fill="rgba(255,255,255,0.12)"
                    stroke="rgba(255,255,255,0.18)"
                  />

                  {Array.from({ length: 4 }).map((_, r) =>
                    Array.from({ length: 3 }).map((__, c) => {
                      const x = 190 + c * 64;
                      const y = 170 + r * 20;
                      return (
                        <rect
                          key={`${r}-${c}`}
                          x={x}
                          y={y}
                          width="40"
                          height="12"
                          rx="6"
                          fill="rgba(255,255,255,0.22)"
                        />
                      );
                    })
                  )}
                </g>

                {/* Accent ring */}
                <circle cx="240" cy="238" r="22" fill="rgba(255,255,255,0.10)" stroke="rgba(255,255,255,0.22)" />
                <path
                  d="M240 222v16l10 6"
                  stroke="rgba(255,255,255,0.75)"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </g>
            </svg>

            {/* Floating decorative elements */}
            <span className="calendar-hero__chip calendar-hero__chip--one" />
            <span className="calendar-hero__chip calendar-hero__chip--two" />
            <span className="calendar-hero__chip calendar-hero__chip--three" />
          </div>
        </div>
      </section>

      {/* SUMMARY CARDS */}
      <section className="calendar-summary" aria-label="Calendar summary cards">
        <div className="calendar-summary__grid">
          <article className="calendar-summary-card calendar-summary-card--blue">
            <div className="calendar-summary-card__icon" aria-hidden="true">💳</div>
            <div className="calendar-summary-card__copy">
              <div className="calendar-summary-card__label">This Month</div>
              <div className="calendar-summary-card__value">{Number(thisMonthExpenseTotal).toFixed(2)}</div>
              <div className="calendar-summary-card__desc">Total expenses recorded</div>
            </div>
          </article>

          <article className="calendar-summary-card calendar-summary-card--green">
            <div className="calendar-summary-card__icon" aria-hidden="true">📅</div>
            <div className="calendar-summary-card__copy">
              <div className="calendar-summary-card__label">Days With Expenses</div>
              <div className="calendar-summary-card__value">{daysWithExpenses}</div>
              <div className="calendar-summary-card__desc">Active expense days</div>
            </div>
          </article>

          <article
            className="calendar-summary-card calendar-summary-card--orange"
            role="button"
            tabIndex={0}
            onClick={() => onNavigateToReminders?.()}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") onNavigateToReminders?.();
            }}
            aria-label="Go to reminders"
          >
            <div className="calendar-summary-card__icon" aria-hidden="true">⏰</div>
            <div className="calendar-summary-card__copy">
              <div className="calendar-summary-card__label">Upcoming Reminders</div>
              <div className="calendar-summary-card__value">{upcomingRemindersCount}</div>
              <div className="calendar-summary-card__desc">Next scheduled reminders</div>
            </div>
          </article>

          <article className="calendar-summary-card calendar-summary-card--violet">
            <div className="calendar-summary-card__icon" aria-hidden="true">🎯</div>
            <div className="calendar-summary-card__copy">
              <div className="calendar-summary-card__label">Monthly Budget</div>
              <div className="calendar-summary-card__value">{Number(reminderBudget.monthlyBudget).toFixed(2)}</div>
              <div className="calendar-summary-card__desc">Planned budget vs remaining</div>
            </div>
          </article>
        </div>
      </section>

      {/* CONTROL BAR */}
      <section className="calendar-toolbar" aria-label="Calendar control bar">
        <div className="calendar-toolbar__left">

          <button type="button" className="calendar-toolbar__iconBtn" onClick={onPrevMonth} aria-label="Previous month">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <div className="calendar-toolbar__monthLabel" aria-live="polite">
            {viewMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
          </div>
          <button type="button" className="calendar-toolbar__iconBtn" onClick={onNextMonth} aria-label="Next month">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>

        <div className="calendar-toolbar__right" aria-label="View options">
          <button type="button" className="calendar-toolbar__pill is-active">Month View</button>
          <button type="button" className="calendar-toolbar__pill">Week View</button>
          <button type="button" className="calendar-toolbar__pill">List View</button>
        </div>
      </section>

      {/* MAIN CALENDAR LAYOUT */}
      <div className="calendar-page__body">
        <div className="calendar-page__layout">
          <div className="calendar-page__panel calendar-page__panel--calendar">
            <ExpenseCalendar
              viewMonth={viewMonth}
              onPrevMonth={onPrevMonth}
              onNextMonth={onNextMonth}
              expenses={expenses}
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
            />
          </div>

          <div className="calendar-page__panel calendar-page__panel--day">
            <CalendarDayPanel selectedDate={selectedDate} expenses={expenses} />
          </div>
        </div>
      </div>

      <div className="calendar-page__glow" aria-hidden="true" />

      <style>
        {`
          /* Lightweight, local styles for layout + hero stacking */
          .calendar-page{ width:100%; padding: 0; position: relative; }

          .calendar-page__body{ padding: 0 0 20px; }
          .calendar-page__layout{
            display:grid;
            grid-template-columns: minmax(0, 1fr) minmax(320px, 420px);
            gap: 20px;
            align-items: stretch;
          }
          .calendar-page__panel{ min-height: 0; }

          /* Equal-height behavior: make both panels stretch */
          .calendar-page__panel > .calendar-module,
          .calendar-page__panel > .calendar-panel{ height:100%; }

          @media (max-width: 960px){
            .calendar-page__layout{ grid-template-columns: 1fr; }
          }

          .calendar-page__glow{
            position:absolute;
            top:-120px;
            left: 0;
            right:0;
            height: 220px;
            background: radial-gradient(circle at 20% 40%, rgba(59,130,246,0.12), transparent 55%),
                        radial-gradient(circle at 80% 30%, rgba(139,92,246,0.08), transparent 50%);
            pointer-events:none;
          }
        `}
      </style>
    </div>
  );
}
