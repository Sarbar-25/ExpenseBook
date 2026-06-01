import { currentMonthKey } from "./utils.js";

export default function TransactionsPage({
  selectedMonth,
  selectedMonthLabel,
  setSelectedMonth,
  transactionName,
  setTransactionName,
  transactionType,
  setTransactionType,
  transactionDate,
  setTransactionDate,
  transactionAmount,
  setTransactionAmount,
  onTransactionSubmit,
  visibleMonthTransactions,
  deleteTransaction,
  setActiveModal,
  formatDateDisplay,
  formatMoney,
}) {
  return (
    <section className="section" id="transactions" aria-labelledby="tx-heading">
      <div style={{ display: "grid", gap: "1rem", marginBottom: "1.5rem" }}>
        <div>
          <h2 id="tx-heading" className="section__title">
            Debit and credit records
          </h2>
          <p className="section__intro">
            Manage all debit and credit entries from one place. Existing balances, storage, and transaction logic remain unchanged.
          </p>
        </div>
        <div className="card month-filter-card" style={{ marginBottom: 0 }}>
          <div className="form-row" style={{ marginBottom: "0.5rem" }}>
            <label htmlFor="transactionsMonthSelect">
              Selected month
            </label>
            <input
              id="transactionsMonthSelect"
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value || currentMonthKey())}
              className="month-input"
            />
          </div>
          <p className="month-filter-note">
            Transactions below are filtered for {selectedMonthLabel}.
          </p>
        </div>
      </div>

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
          <div className="card__header-row">
            <h3 className="card__heading">Your transactions ({selectedMonthLabel})</h3>
            <button
              type="button"
              className="btn--show-all"
              onClick={() => setActiveModal("transactions")}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: "6px" }}><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" /></svg>
              Full View
            </button>
          </div>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Date</th>
                  <th>Type</th>
                  <th className="align-right">Amount</th>
                  <th className="align-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {visibleMonthTransactions.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="empty-state">
                      No transactions for {selectedMonthLabel}.
                    </td>
                  </tr>
                ) : (
                  visibleMonthTransactions.slice(0, 3).map((tx) => {
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
                        <td className="align-right">
                          <button
                            className="btn--icon"
                            onClick={() => deleteTransaction(tx.id)}
                            title="Delete transaction"
                            style={{ color: "var(--danger)", padding: "4px" }}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="3 6 5 6 21 6"></polyline>
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                          </button>
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
  );
}
