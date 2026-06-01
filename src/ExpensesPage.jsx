import { currentMonthKey } from "./utils.js";

export default function ExpensesPage({
  selectedMonth,
  selectedMonthLabel,
  setSelectedMonth,
  expenseName,
  setExpenseName,
  expenseDate,
  setExpenseDate,
  expenseAmount,
  setExpenseAmount,
  onExpenseSubmit,
  expenseSearch,
  setExpenseSearch,
  filteredMonthExpenses,
  deleteExpense,
  setActiveModal,
  formatDateDisplay,
  formatMoney,
}) {
  return (
    <section className="section" id="expenses" aria-labelledby="exp-heading">
      <div style={{ display: "grid", gap: "1rem", marginBottom: "1.5rem" }}>
        <div>
          <h2 id="exp-heading" className="section__title">
            Expense list
          </h2>
          <p className="section__intro">
            Manage expense entries, search your monthly records, and review all history from one dedicated workspace.
          </p>
        </div>
        <div className="card month-filter-card" style={{ marginBottom: 0 }}>
          <div className="form-row" style={{ marginBottom: "0.5rem" }}>
            <label htmlFor="expensesMonthSelect">Selected month</label>
            <input
              id="expensesMonthSelect"
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value || currentMonthKey())}
              className="month-input"
            />
          </div>
          <p className="month-filter-note">
            Expenses below are filtered for {selectedMonthLabel}.
          </p>
        </div>
      </div>

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
                className="expense-input expense-input--text"
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
                className="expense-input expense-input--date"
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
              />
            </div>

            <div className="form-row">
              <label htmlFor="expenseAmount">Amount</label>
              <div className="expense-amount">
                <span className="expense-amount__prefix">Rs</span>
                <input
                  type="number"
                  id="expenseAmount"
                  className="expense-input expense-input--number"
                  min="0"
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={expenseAmount}
                  onChange={(e) => setExpenseAmount(e.target.value)}
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn btn--primary btn--block btn--expense-add"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Add expense
            </button>
          </form>
        </div>

        <div className="card">
          <div className="card__header-row">
            <h3 className="card__heading">Your expenses ({selectedMonthLabel})</h3>
            <button
              type="button"
              className="btn--show-all"
              onClick={() => setActiveModal("expenses")}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: "6px" }}><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" /></svg>
              Full View
            </button>
          </div>
          <div className="form-row" style={{ marginBottom: "1rem" }}>
            <input
              type="text"
              className="expense-search-input"
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
              filteredMonthExpenses.slice(0, 3).map((expense) => (
                <li key={expense.id} className="expense-item expense-item--row">
                  <span className="expense-item__name">
                    {expense.name}
                    <span className="expense-item__date">{formatDateDisplay(expense.date)}</span>
                  </span>
                  <span className="expense-item__amount">{formatMoney(expense.amount)}</span>
                  <button
                    className="btn--icon"
                    onClick={() => deleteExpense(expense.id)}
                    style={{ color: "var(--danger)", marginLeft: "8px" }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="3 6 5 6 21 6"></polyline>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      </div>
    </section>
  );
}
