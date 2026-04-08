import { useMemo, useState, useCallback, useEffect } from "react";
import SummaryChart from "./SummaryChart.jsx";
import ExpenseCalendar, { CalendarDayPanel } from "./ExpenseCalendar.jsx";
import {
  computeTotals,
  formatMoney,
  formatDateDisplay,
  initialData,
  todayISO,
  currentMonthKey,
  dateFromMonthKey,
  isISOInMonth,
  withDate,
} from "./utils.js";

function initials(name) {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function formatMonthYear(value) {
  return value.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

function shiftMonthKey(monthKey, delta) {
  const d = dateFromMonthKey(monthKey);
  d.setMonth(d.getMonth() + delta);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function firstDateOfMonth(monthKey) {
  return `${monthKey}-01`;
}

export default function App() {
  const [selectedMonth, setSelectedMonth] = useState(currentMonthKey);

  const [senders] = useState(() => withDate(initialData.senders, todayISO));
  const [transactions, setTransactions] = useState(() => withDate(initialData.transactions, todayISO));
  const [expenses, setExpenses] = useState(() => withDate(initialData.expenses, todayISO));

  const [balanceInput, setBalanceInput] = useState("");
  const [balanceDate, setBalanceDate] = useState(todayISO);
  const [expenseName, setExpenseName] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseDate, setExpenseDate] = useState(todayISO);
  const [expenseSearch, setExpenseSearch] = useState("");

  const [transactionName, setTransactionName] = useState("");
  const [transactionAmount, setTransactionAmount] = useState("");
  const [transactionType, setTransactionType] = useState("Credit");
  const [transactionDate, setTransactionDate] = useState(todayISO);

  const [selectedDate, setSelectedDate] = useState(todayISO);

  const [activeNav, setActiveNav] = useState("dashboard");
  const [menuOpen, setMenuOpen] = useState(false);

  const calMonth = useMemo(() => dateFromMonthKey(selectedMonth), [selectedMonth]);
  const selectedMonthLabel = useMemo(() => formatMonthYear(calMonth), [calMonth]);

  const visibleMonthSenders = useMemo(
    () => senders.filter((sender) => isISOInMonth(sender.date, selectedMonth)),
    [senders, selectedMonth]
  );

  const visibleMonthTransactions = useMemo(
    () => transactions.filter((tx) => isISOInMonth(tx.date, selectedMonth)),
    [transactions, selectedMonth]
  );

  const visibleMonthExpenses = useMemo(
    () => expenses.filter((e) => isISOInMonth(e.date, selectedMonth)),
    [expenses, selectedMonth]
  );

  const filteredMonthExpenses = useMemo(
    () => visibleMonthExpenses.filter((e) => {
      if (!expenseSearch) return true;
      const term = expenseSearch.toLowerCase();
      return e.name.toLowerCase().includes(term) || (e.date && e.date.toLowerCase().includes(term));
    }),
    [visibleMonthExpenses, expenseSearch]
  );

  const monthlyTotals = useMemo(
    () => computeTotals(visibleMonthSenders, visibleMonthTransactions, visibleMonthExpenses),
    [visibleMonthSenders, visibleMonthTransactions, visibleMonthExpenses]
  );

  const visibleMonthSenderTotal = useMemo(
    () => visibleMonthSenders.reduce((sum, sender) => sum + sender.amount, 0),
    [visibleMonthSenders]
  );

  const recentItems = useMemo(() => {
    const txItems = visibleMonthTransactions.map((tx) => ({
      id: tx.id,
      kind: "tx",
      name: tx.name,
      type: tx.type,
      amount: tx.amount,
      date: tx.date,
    }));
    const expItems = visibleMonthExpenses.map((e) => ({
      id: e.id,
      kind: "exp",
      name: `${e.name} (expense)`,
      type: "Expense",
      amount: e.amount,
      date: e.date,
    }));

    return [...txItems, ...expItems]
      .sort((a, b) => (b.date || "").localeCompare(a.date || ""))
      .slice(0, 8);
  }, [visibleMonthTransactions, visibleMonthExpenses]);

  useEffect(() => {
    setExpenseDate(selectedDate);
  }, [selectedDate]);

  useEffect(() => {
    if (!isISOInMonth(selectedDate, selectedMonth)) {
      setSelectedDate(firstDateOfMonth(selectedMonth));
    }
  }, [selectedMonth, selectedDate]);

  const addBalance = useCallback(() => {
    const raw = parseFloat(balanceInput);
    if (Number.isNaN(raw) || raw <= 0) return;
    setTransactions((prev) => [
      {
        id: "t" + Date.now(),
        name: "Balance top-up",
        type: "Credit",
        amount: raw,
        date: balanceDate || todayISO(),
      },
      ...prev,
    ]);
    setBalanceInput("");
    setBalanceDate(selectedDate || todayISO());
  }, [balanceInput, balanceDate, selectedDate]);

  const onExpenseSubmit = useCallback(
    (e) => {
      e.preventDefault();
      const name = expenseName.trim();
      const amt = parseFloat(expenseAmount);
      if (!name || Number.isNaN(amt) || amt <= 0) return;
      setExpenses((prev) => [
        { id: "e" + Date.now(), name, amount: amt, date: expenseDate || todayISO() },
        ...prev,
      ]);
      setExpenseName("");
      setExpenseAmount("");
    },
    [expenseName, expenseAmount, expenseDate]
  );

  const onTransactionSubmit = useCallback(
    (e) => {
      e.preventDefault();
      const name = transactionName.trim();
      const amt = parseFloat(transactionAmount);
      if (!name || Number.isNaN(amt) || amt <= 0) return;
      setTransactions((prev) => [
        { id: "t" + Date.now(), name, type: transactionType, amount: amt, date: transactionDate || todayISO() },
        ...prev,
      ]);
      setTransactionName("");
      setTransactionAmount("");
    },
    [transactionName, transactionAmount, transactionType, transactionDate]
  );

  const scrollTo = (section, navId) => {
    setActiveNav(navId);
    document.getElementById(section)?.scrollIntoView({ behavior: "smooth", block: "start" });
    setMenuOpen(false);
  };

  return (
    <div className="app">
      <aside
        className={`sidebar${menuOpen ? " is-open" : ""}`}
        id="sidebar"
        aria-label="Main navigation"
      >
        <div className="sidebar__brand">
          <span className="sidebar__logo" aria-hidden="true">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <path d="M7 15h0M2 9.5h20" />
            </svg>
          </span>
          <span className="sidebar__title">Expense Book</span>
        </div>
        <nav className="sidebar__nav">
          {[
            { id: "dashboard", label: "Dashboard", section: "dashboard" },
            { id: "calendar", label: "Calendar", section: "calendar" },
            { id: "senders", label: "Senders", section: "senders" },
            { id: "transactions", label: "Transactions", section: "transactions" },
            { id: "expenses", label: "Expenses", section: "expenses" },
          ].map((item) => (
            <a
              key={item.id}
              href={`#${item.section}`}
              className={`nav-link${activeNav === item.id ? " is-active" : ""}`}
              data-section={item.section}
              onClick={(e) => {
                e.preventDefault();
                scrollTo(item.section, item.id);
              }}
            >
              {item.id === "dashboard" && (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
              )}
              {item.id === "calendar" && (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
              )}
              {item.id === "senders" && (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              )}
              {item.id === "transactions" && (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="1" x2="12" y2="23" />
                  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
              )}
              {item.id === "expenses" && (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              )}
              {item.label}
            </a>
          ))}
        </nav>
        <p className="sidebar__foot">React + Vite - demo data</p>
      </aside>

      <button
        type="button"
        className="menu-toggle"
        aria-label={menuOpen ? "Close menu" : "Open menu"}
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen((o) => !o)}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>
      <div
        className={`sidebar-overlay${menuOpen ? " is-open" : ""}`}
        hidden={!menuOpen}
        onClick={() => setMenuOpen(false)}
        aria-hidden={!menuOpen}
      />

      <main className="main">
        <header className="top-bar">
          <div className="top-bar__balance card card--balance">
            <div className="top-bar__balance-label">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
              Monthly balance ({selectedMonthLabel})
            </div>
            <p className="top-bar__balance-value">{formatMoney(monthlyTotals.totalBalance)}</p>
          </div>
          <div className="top-bar__add card">
            <label htmlFor="addBalanceInput" className="sr-only">
              Add balance amount
            </label>
            <div className="input-group">
              <span className="input-prefix">Rs</span>
              <input
                type="number"
                id="addBalanceInput"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={balanceInput}
                onChange={(e) => setBalanceInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addBalance()}
                aria-describedby="addBalanceHelp"
              />
            </div>
            <input
              type="date"
              className="date-input"
              value={balanceDate}
              onChange={(e) => setBalanceDate(e.target.value)}
              aria-label="Balance transaction date"
            />
            <button type="button" className="btn btn--primary" onClick={addBalance}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Add balance
            </button>
            <span id="addBalanceHelp" className="help-text">
              Adds a dated credit entry to your ledger
            </span>
          </div>
        </header>

        <section className="section" id="dashboard" aria-labelledby="summary-heading">
          <h2 id="summary-heading" className="section__title">
            Summary
          </h2>

          <div className="card month-filter-card">
            <div className="month-filter-row">
              <label htmlFor="monthSelect" className="month-filter-label">
                Selected month
              </label>
              <input
                id="monthSelect"
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value || currentMonthKey())}
                className="month-input"
              />
            </div>
            <p className="month-filter-note">
              All senders, transactions, expenses, and totals below are filtered for {selectedMonthLabel}.
            </p>
          </div>

          <article className="card monthly-summary-card">
            <h3 className="card__heading">Monthly summary ({selectedMonthLabel})</h3>
            <div className="monthly-summary-grid">
              <p>
                Balance <strong>{formatMoney(monthlyTotals.totalBalance)}</strong>
              </p>
              <p>
                Credit <strong className="card__value--credit">{formatMoney(monthlyTotals.totalCredit)}</strong>
              </p>
              <p>
                Debit <strong className="card__value--debit">{formatMoney(monthlyTotals.totalDebit)}</strong>
              </p>
            </div>
          </article>

          <div className="summary-grid">
            <article className="card card--summary card--highlight">
              <div className="card__icon card__icon--balance">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
              </div>
              <h3 className="card__label">Monthly balance</h3>
              <p className="card__value">{formatMoney(monthlyTotals.totalBalance)}</p>
              <p className="card__hint">Credit - Debit - Expenses</p>
            </article>
            <article className="card card--summary">
              <div className="card__icon card__icon--credit">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                  <polyline points="17 6 23 6 23 12" />
                </svg>
              </div>
              <h3 className="card__label">Monthly credit</h3>
              <p className="card__value card__value--credit">{formatMoney(monthlyTotals.totalCredit)}</p>
            </article>
            <article className="card card--summary">
              <div className="card__icon card__icon--debit">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="23 18 13.5 8.5 8.5 13.5 1 6" />
                  <polyline points="17 18 23 18 23 12" />
                </svg>
              </div>
              <h3 className="card__label">Monthly debit</h3>
              <p className="card__value card__value--debit">{formatMoney(monthlyTotals.totalDebit)}</p>
            </article>
            <article className="card card--summary">
              <div className="card__icon card__icon--expense">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="1" y="4" width="22" height="16" rx="2" />
                  <line x1="1" y1="10" x2="23" y2="10" />
                </svg>
              </div>
              <h3 className="card__label">Monthly expenses</h3>
              <p className="card__value">{formatMoney(monthlyTotals.totalExpenses)}</p>
            </article>
          </div>

          <div className="dashboard-row">
            <div className="card card--chart">
              <h3 className="card__heading">Credit vs debit vs expenses ({selectedMonthLabel})</h3>
              <SummaryChart
                totalCredit={monthlyTotals.totalCredit}
                totalDebit={monthlyTotals.totalDebit}
                totalExpenses={monthlyTotals.totalExpenses}
              />
            </div>
            <div className="card card--recent">
              <h3 className="card__heading">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                Recent entries ({selectedMonthLabel})
              </h3>
              <ul className="recent-list">
                {recentItems.length === 0 ? (
                  <li className="empty-state">No activity in this month.</li>
                ) : (
                  recentItems.map((item) => {
                    const isCredit = item.type === "Credit";
                    const amountClass = isCredit ? "is-credit" : "is-debit";
                    const sign = isCredit ? "+" : "-";
                    const meta = item.kind === "exp" ? "Expense" : item.type;
                    return (
                      <li key={item.id} className="recent-item">
                        <div>
                          <div className="recent-item__name">{item.name}</div>
                          <div className="recent-item__meta">
                            {meta} - {formatDateDisplay(item.date)}
                          </div>
                        </div>
                        <span className={`recent-item__amount ${amountClass}`}>
                          {sign}
                          {formatMoney(item.amount)}
                        </span>
                      </li>
                    );
                  })
                )}
              </ul>
            </div>
          </div>
        </section>

        <section className="section" id="calendar" aria-labelledby="calendar-heading">
          <h2 id="calendar-heading" className="section__title">
            Expense calendar
          </h2>
          <p className="section__intro">
            Browse by day to see spending. Days with expenses are highlighted; totals roll up for the visible month.
          </p>
          <div className="calendar-layout">
            <div className="card calendar-layout__main">
              <ExpenseCalendar
                viewMonth={calMonth}
                onPrevMonth={() => setSelectedMonth((m) => shiftMonthKey(m, -1))}
                onNextMonth={() => setSelectedMonth((m) => shiftMonthKey(m, 1))}
                expenses={expenses}
                selectedDate={selectedDate}
                onSelectDate={setSelectedDate}
              />
            </div>
            <div className="card calendar-layout__side">
              <CalendarDayPanel
                selectedDate={selectedDate}
                expenses={expenses}
                onJumpToForm={() => {
                  document.getElementById("expenseDate")?.focus();
                  scrollTo("expenses", "expenses");
                }}
              />
            </div>
          </div>
        </section>

        <section className="section" id="senders" aria-labelledby="senders-heading">
          <h2 id="senders-heading" className="section__title">
            Money senders
          </h2>
          <div className="card">
            <p className="card__lead">People who credited funds to your account in {selectedMonthLabel}</p>
            <p className="sender-summary">
              Total received from senders: <strong>{formatMoney(visibleMonthSenderTotal)}</strong>
            </p>
            {visibleMonthSenders.length === 0 ? (
              <p className="empty-state">No sender credits were recorded for {selectedMonthLabel}.</p>
            ) : (
              <ul className="sender-list">
                {visibleMonthSenders.map((s) => (
                  <li key={s.id} className="sender-item">
                    <span className="sender-item__name">
                      <span className="sender-item__avatar">{initials(s.name)}</span>
                      <span className="sender-item__details">
                        <span>{s.name}</span>
                        <span className="sender-item__meta">{formatDateDisplay(s.date)}</span>
                      </span>
                    </span>
                    <span className="sender-item__amount">{formatMoney(s.amount)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section className="section" id="transactions" aria-labelledby="tx-heading">
          <h2 id="tx-heading" className="section__title">
            Debit and credit records
          </h2>
          <div className="expense-grid">
            <div className="card">
              <h3 className="card__heading">Add transaction</h3>
              <form className="expense-form" onSubmit={onTransactionSubmit}>
                <div className="form-row">
                  <label htmlFor="transactionName">Name / details</label>
                  <input
                    type="text"
                    id="transactionName"
                    required
                    placeholder="e.g. Salary"
                    autoComplete="off"
                    value={transactionName}
                    onChange={(e) => setTransactionName(e.target.value)}
                  />
                </div>
                <div className="form-row">
                  <label htmlFor="transactionType">Type</label>
                  <select
                    id="transactionType"
                    value={transactionType}
                    onChange={(e) => setTransactionType(e.target.value)}
                    style={{ width: "100%", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "0.6rem 0.7rem", fontFamily: "inherit", fontSize: "0.9rem", background: "var(--surface)", color: "var(--text)" }}
                  >
                    <option value="Credit">Credit</option>
                    <option value="Debit">Debit</option>
                  </select>
                </div>
                <div className="form-row">
                  <label htmlFor="transactionDate">Date</label>
                  <input
                    type="date"
                    id="transactionDate"
                    required
                    value={transactionDate}
                    onChange={(e) => setTransactionDate(e.target.value)}
                  />
                </div>
                <div className="form-row">
                  <label htmlFor="transactionAmount">Amount</label>
                  <div className="input-group">
                    <span className="input-prefix">Rs</span>
                    <input
                      type="number"
                      id="transactionAmount"
                      min="0"
                      step="0.01"
                      required
                      placeholder="0.00"
                      value={transactionAmount}
                      onChange={(e) => setTransactionAmount(e.target.value)}
                    />
                  </div>
                </div>
                <button type="submit" className="btn btn--primary btn--block">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  Add transaction
                </button>
              </form>
            </div>
            <div className="card">
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Date</th>
                      <th>Type</th>
                      <th className="align-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                  {visibleMonthTransactions.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="empty-state">
                        No transactions for {selectedMonthLabel}.
                      </td>
                    </tr>
                  ) : (
                    visibleMonthTransactions.map((tx) => {
                      const isCredit = tx.type === "Credit";
                      return (
                        <tr key={tx.id}>
                          <td>{tx.name}</td>
                          <td>{formatDateDisplay(tx.date)}</td>
                          <td>
                            <span className={`badge ${isCredit ? "badge--credit" : "badge--debit"}`}>{tx.type}</span>
                          </td>
                          <td className={`align-right ${isCredit ? "amount--credit" : "amount--debit"}`}>
                            {formatMoney(tx.amount)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>

        <section className="section" id="expenses" aria-labelledby="exp-heading">
          <h2 id="exp-heading" className="section__title">
            Expense list
          </h2>
          <div className="expense-grid">
            <div className="card">
              <h3 className="card__heading">Add expense</h3>
              <form className="expense-form" onSubmit={onExpenseSubmit}>
                <div className="form-row">
                  <label htmlFor="expenseName">Particulars</label>
                  <input
                    type="text"
                    id="expenseName"
                    required
                    placeholder="e.g. Office supplies"
                    autoComplete="off"
                    value={expenseName}
                    onChange={(e) => setExpenseName(e.target.value)}
                  />
                </div>
                <div className="form-row">
                  <label htmlFor="expenseDate">Date</label>
                  <input
                    type="date"
                    id="expenseDate"
                    required
                    value={expenseDate}
                    onChange={(e) => setExpenseDate(e.target.value)}
                  />
                </div>
                <div className="form-row">
                  <label htmlFor="expenseAmount">Amount</label>
                  <div className="input-group">
                    <span className="input-prefix">Rs</span>
                    <input
                      type="number"
                      id="expenseAmount"
                      min="0"
                      step="0.01"
                      required
                      placeholder="0.00"
                      value={expenseAmount}
                      onChange={(e) => setExpenseAmount(e.target.value)}
                    />
                  </div>
                </div>
                <button type="submit" className="btn btn--primary btn--block">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  Add expense
                </button>
              </form>
            </div>
            <div className="card">
              <h3 className="card__heading">Your expenses ({selectedMonthLabel})</h3>
              <div className="form-row" style={{ marginBottom: "1rem" }}>
                <input
                  type="text"
                  className="month-input"
                  style={{ width: "100%", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "0.6rem 0.7rem", fontFamily: "inherit", fontSize: "0.9rem", background: "var(--surface)", color: "var(--text)" }}
                  placeholder="Search by name or date..."
                  autoComplete="off"
                  value={expenseSearch}
                  onChange={(e) => setExpenseSearch(e.target.value)}
                />
              </div>
              <ul className="expense-list">
                {filteredMonthExpenses.length === 0 ? (
                  <li className="empty-state">No matching expenses found.</li>
                ) : (
                  filteredMonthExpenses.map((e) => (
                    <li key={e.id} className="expense-item">
                      <span className="expense-item__name">
                        {e.name}
                        {e.date && <span className="expense-item__date">{formatDateDisplay(e.date)}</span>}
                      </span>
                      <span className="expense-item__amount">{formatMoney(e.amount)}</span>
                    </li>
                  ))
                )}
              </ul>
            </div>
          </div>
        </section>

        <footer className="footer">
          <p>Expense Book - Demo UI - All figures are illustrative</p>
        </footer>
      </main>
    </div>
  );
}
