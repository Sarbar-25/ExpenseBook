/**
 * Expense Book — frontend-only demo
 * Data lives in memory; totals update when you add balance or expenses.
 */

(function () {
  "use strict";

  // --- Initial dummy data ---
  let state = {
    senders: [
      { id: "s1", name: "fufi",     amount: 3000, date: "2026-03-01" },
      { id: "s2", name: "dadi",     amount: 1000, date: "2026-03-05" },
      { id: "s3", name: "cote abu", amount: 1000, date: "2026-03-10" },
      { id: "s4", name: "kahla",    amount: 1000, date: "2026-04-02" },
      { id: "s5", name: "ami",      amount: 5500, date: "2026-04-05" },
    ],
    transactions: [
      // March 2026
      { id: "t1",  name: "Hamad",    type: "Debit",  amount: 8600,  date: "2026-03-04", category: "Transfer" },
      { id: "t2",  name: "Asad",     type: "Debit",  amount: 1251,  date: "2026-03-08", category: "Transfer" },
      { id: "t3",  name: "saquib",   type: "Debit",  amount: 500,   date: "2026-03-12", category: "Transfer" },
      { id: "t4",  name: "fufi",     type: "Credit", amount: 3000,  date: "2026-03-01", category: "Income"   },
      { id: "t5",  name: "dadi",     type: "Credit", amount: 1000,  date: "2026-03-05", category: "Income"   },
      { id: "t6",  name: "cote abu", type: "Credit", amount: 1000,  date: "2026-03-10", category: "Income"   },
      // April 2026
      { id: "t7",  name: "kahla",    type: "Credit", amount: 1000,  date: "2026-04-02", category: "Income"   },
      { id: "t8",  name: "ami",      type: "Credit", amount: 5500,  date: "2026-04-05", category: "Income"   },
      { id: "t9",  name: "Hamad",    type: "Debit",  amount: 2000,  date: "2026-04-06", category: "Transfer" },
      { id: "t10", name: "Zaid",     type: "Debit",  amount: 750,   date: "2026-04-07", category: "Transfer" },
      { id: "t11", name: "Salary",   type: "Credit", amount: 12000, date: "2026-04-01", category: "Income"   },
    ],
    expenses: [
      { id: "e1", name: "Rent&bill", amount: 3700, date: "2026-01-01" },
      { id: "e2", name: "Transportation", amount: 1340, date: "2026-01-02" },
      { id: "e3", name: "Meak&Foods", amount: 2442, date: "2026-01-03" },
      { id: "e4", name: "Stationary", amount: 172, date: "2026-01-04" },
      { id: "e5", name: "Mobile", amount: 288, date: "2026-01-05" },
      { id: "e6", name: "grocery", amount: 111, date: "2026-01-06" },
      { id: "e7", name: "Travelling", amount: 2977, date: "2026-01-07" },
      { id: "e8", name: "others", amount: 218, date: "2026-01-08" },
      
      { id: "e9", name: "Rent&bill", amount: 4548, date: "2026-02-01" },
      { id: "e10", name: "Transportation", amount: 970, date: "2026-02-02" },
      { id: "e11", name: "Meak&Foods", amount: 1970, date: "2026-02-03" },
      { id: "e12", name: "study material", amount: 1200, date: "2026-02-04" },
      { id: "e13", name: "Stationary", amount: 165, date: "2026-02-05" },
      { id: "e14", name: "Mobile", amount: 470, date: "2026-02-06" },
      { id: "e15", name: "grocery", amount: 381, date: "2026-02-07" },
      { id: "e16", name: "tour", amount: 5238, date: "2026-02-08" },
      { id: "e17", name: "Travelling", amount: 855, date: "2026-02-09" },
      { id: "e18", name: "others", amount: 1348, date: "2026-02-10" },

      { id: "e19", name: "Rent&bill", amount: 8500, date: "2026-03-01" },
      { id: "e20", name: "Transportation", amount: 1110, date: "2026-03-02" },
      { id: "e21", name: "Meak&Foods", amount: 2812, date: "2026-03-03" },
      { id: "e22", name: "study material", amount: 400, date: "2026-03-04" },
      { id: "e23", name: "Stationary", amount: 50, date: "2026-03-05" },
      { id: "e24", name: "Mobile", amount: 400, date: "2026-03-06" },
      { id: "e25", name: "grocery", amount: 1107, date: "2026-03-07" },
      { id: "e26", name: "tour", amount: 424, date: "2026-03-08" },
      { id: "e27", name: "Travelling", amount: 70, date: "2026-03-09" },
      { id: "e28", name: "others", amount: 1210, date: "2026-03-10" },

      { id: "e29", name: "Transportation", amount: 120, date: "2026-04-01" },
      { id: "e30", name: "Meak&Foods", amount: 346, date: "2026-04-02" },
      { id: "e31", name: "Stationary", amount: 115, date: "2026-04-03" },
      { id: "e32", name: "others", amount: 100, date: "2026-04-04" },
    ],
    // filterMonth: "YYYY-MM" string, or null = show all
    filterMonth: null,
    calMonth: (function () {
      const d = new Date();
      return { y: d.getFullYear(), m: d.getMonth() };
    })(),
    selectedDate: (function () {
      const d = new Date();
      const p = function (n) { return String(n).padStart(2, "0"); };
      return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate());
    })(),
  };

  const chartInstances = {};
  let calendarEventsBound = false;

  // --- Money helpers ---
  function formatMoney(n) {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
    }).format(n);
  }

  function pad2(n) {
    return String(n).padStart(2, "0");
  }

  function formatDateDisplay(iso) {
    if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return "—";
    var parts = iso.split("-").map(Number);
    var dt = new Date(parts[0], parts[1] - 1, parts[2]);
    return dt.toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  function syncExpenseDateInput() {
    var el = document.getElementById("expenseDate");
    if (el) el.value = state.selectedDate;
    var tel = document.getElementById("transactionDate");
    if (tel) tel.value = state.selectedDate;
  }

  function shiftCalMonth(delta) {
    var y = state.calMonth.y;
    var m = state.calMonth.m + delta;
    if (m < 0) {
      m = 11;
      y--;
    }
    if (m > 11) {
      m = 0;
      y++;
    }
    state.calMonth = { y: y, m: m };
  }

  function sum(arr, pick) {
    return arr.reduce((acc, item) => acc + pick(item), 0);
  }

  /**
   * Returns data slices filtered to state.filterMonth ("YYYY-MM") or all data if null.
   */
  function getFilteredData() {
    const fm = state.filterMonth;
    if (!fm) {
      return { transactions: state.transactions, expenses: state.expenses, senders: state.senders };
    }
    const byMonth = (d) => d && d.startsWith(fm);
    return {
      transactions: state.transactions.filter((t) => byMonth(t.date)),
      expenses:     state.expenses.filter((e) => byMonth(e.date)),
      senders:      state.senders.filter((s) => byMonth(s.date)),
    };
  }

  /**
   * Returns a {name → total} map of expenses for the bar chart.
   * Uses filterMonth when set, otherwise falls back to targetY/targetM.
   */
  function getMonthlyExpenses(targetY, targetM) {
    const fm = state.filterMonth;
    const expenses = fm
      ? state.expenses.filter((e) => e.date && e.date.startsWith(fm))
      : state.expenses.filter((e) => {
          if (!e.date) return false;
          const p = e.date.split("-").map(Number);
          return p[0] === targetY && p[1] === targetM;
        });
    const map = {};
    expenses.forEach((e) => { map[e.name] = (map[e.name] || 0) + e.amount; });
    return map;
  }

  /**
   * Totals computed from the active month-filtered data.
   */
  function computeTotals() {
    const fd = getFilteredData();
    const creditFromSenders = sum(fd.senders, (s) => s.amount);
    const creditFromTx = sum(fd.transactions.filter((t) => t.type === "Credit"), (t) => t.amount);
    const totalCredit    = creditFromSenders + creditFromTx;
    const totalDebit     = sum(fd.transactions.filter((t) => t.type === "Debit"), (t) => t.amount);
    const totalExpenses  = sum(fd.expenses, (e) => e.amount);
    const totalBalance   = totalCredit - totalDebit - totalExpenses;
    return { totalCredit, totalDebit, totalExpenses, totalBalance, creditFromSenders, creditFromTx };
  }

  // --- DOM render ---
  function renderBalances() {
    const t = computeTotals();
    const el = (id) => document.getElementById(id);
    el("availableBalance").textContent = formatMoney(t.totalBalance);
    el("totalBalanceCard").textContent = formatMoney(t.totalBalance);
    el("totalCreditCard").textContent = formatMoney(t.totalCredit);
    el("totalDebitCard").textContent = formatMoney(t.totalDebit);
    el("totalExpensesCard").textContent = formatMoney(t.totalExpenses);
  }

  function getInitials(name) {
    return name
      .split(/\s+/)
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }

  function renderSenders() {
    const ul = document.getElementById("senderList");
    const summaryTotalEl = document.getElementById("totalSenderAmount");
    if (!ul) return;
    ul.innerHTML = "";

    const fd = getFilteredData();
    const senders = fd.senders;

    if (senders.length === 0) {
      ul.innerHTML = '<li class="empty-state" style="text-align:center;padding:1.5rem;">No senders available</li>';
      if (summaryTotalEl) summaryTotalEl.textContent = formatMoney(0);
      if (countHint) countHint.textContent = "0 senders";
      return;
    }

    let totalAmount = 0;
    senders.forEach((s) => {
      totalAmount += s.amount;
      const li = document.createElement("li");
      li.className = "sender-item";
      li.style.cursor = "pointer";
      const initials = getInitials(s.name);
      const dateLine = s.date
        ? `<span class="sender-item__meta">${formatDateDisplay(s.date)}</span>`
        : `<span class="sender-item__meta">Credited</span>`;

      li.innerHTML = `
        <div class="sender-item__name">
          <span class="sender-item__avatar">${initials}</span>
          <div class="sender-item__details">
            <strong>${escapeHtml(s.name)}</strong>
            <span class="sender-item__meta">Credited ${s.date ? "• " + formatDateDisplay(s.date) : ""}</span>
          </div>
        </div>
        <span class="sender-item__amount">${formatMoney(s.amount)}</span>
      `;

      li.addEventListener("click", () => openSenderModal(s.name));
      ul.appendChild(li);
    });

    if (summaryTotalEl) summaryTotalEl.textContent = formatMoney(totalAmount);

    const countHint = document.getElementById("senderCountHint");
    if (countHint) {
      const n = senders.length;
      countHint.textContent = n + " sender" + (n !== 1 ? "s" : "");
    }
  }

  function addSender(ev) {
    ev.preventDefault();
    const nameEl   = document.getElementById("senderName");
    const amtEl    = document.getElementById("senderAmount");
    const dateEl   = document.getElementById("senderDate");

    const name    = nameEl.value.trim();
    const amt     = parseFloat(amtEl.value);
    const dateVal = dateEl && dateEl.value ? dateEl.value : state.selectedDate;

    if (!name || Number.isNaN(amt) || amt <= 0 || !dateVal) {
      // Briefly shake the empty fields
      [nameEl, amtEl, dateEl].forEach((el) => {
        if (el && !el.value.trim()) {
          el.classList.add("input--error");
          setTimeout(() => el.classList.remove("input--error"), 800);
        }
      });
      return;
    }

    state.senders.unshift({
      id:     "s" + Date.now(),
      name,
      amount: amt,
      date:   dateVal,
    });

    nameEl.value = "";
    amtEl.value  = "";
    refreshAll();

    // Fade-in the first list item
    const firstItem = document.querySelector("#senderList .sender-item");
    if (firstItem) {
      firstItem.classList.add("sender-item--new");
      setTimeout(() => firstItem.classList.remove("sender-item--new"), 600);
    }
  }

  function openSenderModal(senderName) {
    const overlay = document.getElementById("senderModalOverlay");
    if (!overlay) return;

    const nameEl = document.getElementById("senderModalName");
    const avatarEl = document.getElementById("senderModalAvatar");
    const totalEl = document.getElementById("senderModalTotal");
    const txListEl = document.getElementById("senderModalTxList");

    const sender = state.senders.find(s => s.name === senderName);
    const relatedTxs = state.transactions.filter(tx => tx.name === senderName);
    
    // Calculate total from both sender record and separate transactions
    const txTotal = relatedTxs.reduce((sum, tx) => sum + tx.amount, 0);
    const displayTotal = (sender ? sender.amount : 0) + txTotal;

    nameEl.textContent = senderName;
    avatarEl.textContent = getInitials(senderName);
    totalEl.textContent = formatMoney(displayTotal);
    
    txListEl.innerHTML = "";
    const allInstances = [];
    if (sender) {
      allInstances.push({ name: "Initial Credit", type: "Credit", amount: sender.amount, date: "N/A" });
    }
    relatedTxs.forEach(tx => allInstances.push(tx));

    if (allInstances.length === 0) {
      txListEl.innerHTML = '<li class="empty-state">No transaction history found.</li>';
    } else {
      allInstances.forEach(tx => {
        const li = document.createElement("li");
        li.className = "recent-item";
        const isCredit = tx.type === "Credit";
        li.innerHTML = `
          <div>
            <div class="recent-item__name">${escapeHtml(tx.name || "Transaction")}</div>
            <div class="recent-item__meta">${tx.type} ${tx.date ? "&bull; " + formatDateDisplay(tx.date) : ""}</div>
          </div>
          <span class="recent-item__amount ${isCredit ? "is-credit" : "is-debit"}">${isCredit ? "+" : "−"}${formatMoney(tx.amount)}</span>
        `;
        txListEl.appendChild(li);
      });
    }

    overlay.hidden = false;
    requestAnimationFrame(() => overlay.classList.add("is-open"));
    document.body.style.overflow = "hidden";
  }

  function setupSenderModalEvents() {
    const overlay = document.getElementById("senderModalOverlay");
    const btnClose = document.getElementById("btnSenderModalClose");
    if (!overlay) return;

    const closeModal = () => {
      overlay.classList.remove("is-open");
      setTimeout(() => {
        overlay.hidden = true;
        document.body.style.overflow = "";
      }, 300);
    };

    if (btnClose) btnClose.addEventListener("click", closeModal);
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) closeModal();
    });
  }

  function renderTransactions() {
    const tbody = document.getElementById("transactionTable");
    if (!tbody) return;
    tbody.innerHTML = "";
    const fd = getFilteredData();
    if (fd.transactions.length === 0) {
      tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;padding:1.5rem;color:var(--text-muted);">No transactions for this period</td></tr>';
      return;
    }
    fd.transactions.forEach((tx) => {
      const tr = document.createElement("tr");
      const isCredit = tx.type === "Credit";
      tr.innerHTML = `
        <td>${escapeHtml(tx.name)}</td>
        <td><span class="badge ${isCredit ? "badge--credit" : "badge--debit"}">${tx.type}</span></td>
        <td class="align-right ${isCredit ? "amount--credit" : "amount--debit"}">${formatMoney(tx.amount)}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  // Renders the top 4 most recent transactions for the active filter month
  function renderRecent() {
    const ul = document.getElementById("recentTransactions");
    if (!ul) return;
    ul.innerHTML = "";

    const fd = getFilteredData();
    const sorted = fd.transactions.slice().sort((a, b) => {
      if (!a.date) return 1;
      if (!b.date) return -1;
      return b.date.localeCompare(a.date);
    });
    const recentTx = sorted.slice(0, 4);

    if (recentTx.length === 0) {
      ul.innerHTML = '<li class="empty-state">No transactions for this period.</li>';
      return;
    }

    recentTx.forEach((item) => {
      const li = document.createElement("li");
      li.className = "recent-item";
      const isCredit = item.type === "Credit";
      const amountClass = isCredit ? "is-credit" : "is-debit";
      const sign = isCredit ? "+" : "−";
      const categoryBadge = item.category
        ? `<span style="font-size:0.7rem;background:#f1f5f9;border-radius:4px;padding:1px 5px;margin-left:4px;color:var(--text-muted);">${escapeHtml(item.category)}</span>`
        : "";

      li.innerHTML = `
        <div>
          <div class="recent-item__name">${escapeHtml(item.name)}${categoryBadge}</div>
          <div class="recent-item__meta">${escapeHtml(item.type)} &bull; ${escapeHtml(formatDateDisplay(item.date))}</div>
        </div>
        <span class="recent-item__amount ${amountClass}">${sign}${formatMoney(item.amount)}</span>
      `;
      ul.appendChild(li);
    });
  }

  // Feature 3: View All Transactions Modal logic
  function renderModalTransactions() {
    const ul = document.getElementById("modalTransactionsList");
    if (!ul) return;
    ul.innerHTML = "";
    
    if (state.transactions.length === 0) {
      ul.innerHTML = '<li class="empty-state" style="text-align: center;">No transactions found.</li>';
      return;
    }

    state.transactions.forEach((item) => {
      const li = document.createElement("li");
      li.className = "recent-item";
      let amountClass = item.type === "Credit" ? "is-credit" : "is-debit";
      let sign = item.type === "Credit" ? "+" : "−";
      
      li.innerHTML = `
        <div>
          <div class="recent-item__name">${escapeHtml(item.name)}</div>
          <div class="recent-item__meta">${escapeHtml(item.type)} &bull; ${escapeHtml(formatDateDisplay(item.date))}</div>
        </div>
        <span class="recent-item__amount ${amountClass}">${sign}${formatMoney(item.amount)}</span>
      `;
      ul.appendChild(li);
    });
  }

  function setupModalEvents() {
    const btnOpen = document.getElementById("btnViewAllTransactions");
    const overlay = document.getElementById("transactionsModalOverlay");
    const btnClose = document.getElementById("btnModalClose");

    if (!overlay) return;

    function openModal() {
      renderModalTransactions();
      overlay.hidden = false;
      // Slight delay for animation
      requestAnimationFrame(() => {
        overlay.classList.add("is-open");
      });
      document.body.style.overflow = "hidden"; // Prevent scrolling behind
    }

    function closeModal() {
      overlay.classList.remove("is-open");
      // Wait for transition before hiding
      setTimeout(() => {
        overlay.hidden = true;
        document.body.style.overflow = "";
      }, 200); // matches --transition duration
    }

    if (btnOpen) btnOpen.addEventListener("click", openModal);
    if (btnClose) btnClose.addEventListener("click", closeModal);

    // Close on outside click
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) {
        closeModal();
      }
    });

    // Close on Escape key
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && overlay.classList.contains("is-open")) {
        closeModal();
      }
    });
  }

  function renderExpenses() {
    const ul = document.getElementById("expenseList");
    ul.innerHTML = "";

    // Sort newest first (by date descending), then show only top 4
    const sorted = state.expenses.slice().sort((a, b) => {
      if (!a.date) return 1;
      if (!b.date) return -1;
      return b.date.localeCompare(a.date);
    });
    const recent = sorted.slice(0, 4);

    if (recent.length === 0) {
      ul.innerHTML = '<li class="empty-state">No expenses recorded.</li>';
      return;
    }
    recent.forEach((e) => {
      const li = document.createElement("li");
      li.className = "expense-item";
      const dateLine = e.date
        ? `<span class="expense-item__date">${escapeHtml(formatDateDisplay(e.date))}</span>`
        : "";
      li.innerHTML = `
        <span class="expense-item__name">${escapeHtml(e.name)}${dateLine}</span>
        <span class="expense-item__amount">${formatMoney(e.amount)}</span>
      `;
      ul.appendChild(li);
    });
  }

  function renderModalExpenses(searchTerm) {
    const ul = document.getElementById("modalExpenseList");
    const countEl = document.getElementById("expenseModalCount");
    if (!ul) return;
    ul.innerHTML = "";

    const term = (searchTerm || "").toLowerCase();
    const sorted = state.expenses.slice().sort((a, b) => {
      if (!a.date) return 1;
      if (!b.date) return -1;
      return b.date.localeCompare(a.date);
    });
    const filtered = sorted.filter((e) => {
      if (!term) return true;
      return e.name.toLowerCase().includes(term) || (e.date && e.date.includes(term));
    });

    if (countEl) countEl.textContent = filtered.length + " expense" + (filtered.length !== 1 ? "s" : "");

    if (filtered.length === 0) {
      ul.innerHTML = '<li class="empty-state" style="text-align:center;">No matching expenses found.</li>';
      return;
    }
    filtered.forEach((e) => {
      const li = document.createElement("li");
      li.className = "expense-item";
      const dateLine = e.date
        ? `<span class="expense-item__date">${escapeHtml(formatDateDisplay(e.date))}</span>`
        : "";
      li.innerHTML = `
        <span class="expense-item__name">${escapeHtml(e.name)}${dateLine}</span>
        <span class="expense-item__amount">${formatMoney(e.amount)}</span>
      `;
      ul.appendChild(li);
    });
  }

  function setupExpensesModalEvents() {
    const btnOpen = document.getElementById("btnViewAllExpenses");
    const overlay = document.getElementById("expensesModalOverlay");
    const btnClose = document.getElementById("btnExpensesModalClose");
    const searchInput = document.getElementById("expenseModalSearchInput");
    if (!overlay) return;

    function openModal() {
      renderModalExpenses("");
      if (searchInput) searchInput.value = "";
      overlay.hidden = false;
      requestAnimationFrame(() => overlay.classList.add("is-open"));
      document.body.style.overflow = "hidden";
      if (searchInput) setTimeout(() => searchInput.focus(), 150);
    }

    function closeModal() {
      overlay.classList.remove("is-open");
      setTimeout(() => {
        overlay.hidden = true;
        document.body.style.overflow = "";
      }, 300);
    }

    if (btnOpen) btnOpen.addEventListener("click", openModal);
    if (btnClose) btnClose.addEventListener("click", closeModal);
    overlay.addEventListener("click", (e) => { if (e.target === overlay) closeModal(); });
    if (searchInput) searchInput.addEventListener("input", () => renderModalExpenses(searchInput.value));
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && overlay.classList.contains("is-open")) closeModal();
    });
  }

  function renderCalendarModule() {
    var root = document.getElementById("calendarModuleRoot");
    if (!root) return;

    var y = state.calMonth.y;
    var m = state.calMonth.m;
    var viewDate = new Date(y, m, 1);
    var label = viewDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });

    var monthTotal = 0;
    state.expenses.forEach(function (e) {
      if (!e.date) return;
      var parts = e.date.split("-").map(Number);
      if (parts[0] === y && parts[1] === m + 1) monthTotal += e.amount;
    });

    var first = new Date(y, m, 1);
    var lastDay = new Date(y, m + 1, 0).getDate();
    var startPad = first.getDay();

    var totalsByDate = {};
    state.expenses.forEach(function (e) {
      if (!e.date) return;
      if (!totalsByDate[e.date]) totalsByDate[e.date] = { total: 0, count: 0 };
      totalsByDate[e.date].total += e.amount;
      totalsByDate[e.date].count += 1;
    });

    var now = new Date();
    var todayStr =
      now.getFullYear() + "-" + pad2(now.getMonth() + 1) + "-" + pad2(now.getDate());

    function isoDay(d) {
      return y + "-" + pad2(m + 1) + "-" + pad2(d);
    }

    var cells = "";
    var i;
    for (i = 0; i < startPad; i++) {
      cells += '<div class="calendar-cell calendar-cell--pad"></div>';
    }
    for (var d = 1; d <= lastDay; d++) {
      var dateStr = isoDay(d);
      var agg = totalsByDate[dateStr];
      var hasExp = agg && agg.count > 0;
      var isToday = dateStr === todayStr;
      var isSelected = dateStr === state.selectedDate;
      var cls = "calendar-cell calendar-cell--day";
      if (isToday) cls += " calendar-cell--today";
      if (isSelected) cls += " calendar-cell--selected";
      if (hasExp) cls += " calendar-cell--has-expense";
      var mini = hasExp
        ? '<span class="calendar-cell__mini">' + formatMoney(agg.total) + "</span>"
        : "";
      var dot = hasExp ? '<span class="calendar-cell__dot"></span>' : "";
      cells +=
        '<button type="button" role="gridcell" class="' +
        cls +
        '" data-cal-date="' +
        dateStr +
        '"><span class="calendar-cell__num">' +
        d +
        "</span>" +
        dot +
        mini +
        "</button>";
    }
    var cellCount = startPad + lastDay;
    while (cellCount % 7 !== 0) {
      cells += '<div class="calendar-cell calendar-cell--pad"></div>';
      cellCount++;
    }

    var weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
      .map(function (w) {
        return '<div class="calendar-weekdays__cell">' + w + "</div>";
      })
      .join("");

    root.innerHTML =
      '<div class="calendar-module">' +
      '<div class="calendar-module__head">' +
      '<h3 class="card__heading calendar-module__title">' +
      '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> ' +
      "Expense calendar</h3>" +
      '<div class="calendar-nav">' +
      '<button type="button" class="calendar-nav__btn" data-cal-action="prev" aria-label="Previous month">' +
      '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg></button>' +
      '<span class="calendar-nav__label">' +
      escapeHtml(label) +
      "</span>" +
      '<button type="button" class="calendar-nav__btn" data-cal-action="next" aria-label="Next month">' +
      '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg></button>' +
      "</div>" +
      '<p class="calendar-module__month-total">This month: <strong>' +
      formatMoney(monthTotal) +
      "</strong></p>" +
      "</div>" +
      '<div class="calendar-grid-wrap">' +
      '<div class="calendar-weekdays" aria-hidden="true">' +
      weekdays +
      "</div>" +
      '<div class="calendar-grid" role="grid">' +
      cells +
      "</div></div></div>";
  }

  function renderCalendarPanel() {
    var panel = document.getElementById("calendarDayPanel");
    if (!panel) return;

    if (!state.selectedDate) {
      panel.innerHTML =
        '<div class="calendar-panel"><p class="calendar-panel__empty">Select a day on the calendar to see expenses.</p></div>';
      return;
    }

    var list = state.expenses.filter(function (e) {
      return e.date === state.selectedDate;
    });
    var dayTotal = list.reduce(function (a, e) {
      return a + e.amount;
    }, 0);

    var items = list
      .map(function (e) {
        return (
          '<li class="calendar-panel__item"><span class="calendar-panel__name">' +
          escapeHtml(e.name) +
          '</span><span class="calendar-panel__amt">' +
          formatMoney(e.amount) +
          "</span></li>"
        );
      })
      .join("");

    panel.innerHTML =
      '<div class="calendar-panel">' +
      '<div class="calendar-panel__header">' +
      "<h4 class=\"calendar-panel__title\">" +
      escapeHtml(formatDateDisplay(state.selectedDate)) +
      "</h4>" +
      '<p class="calendar-panel__sub">Day total: <strong>' +
      formatMoney(dayTotal) +
      "</strong> · " +
      list.length +
      " item" +
      (list.length !== 1 ? "s" : "") +
      "</p>" +
      '<button type="button" class="btn btn--ghost btn--small" id="calendarJumpToExpense">Log expense for this day</button>' +
      "</div>" +
      (list.length === 0
        ? '<p class="calendar-panel__empty">No expenses on this date.</p>'
        : '<ul class="calendar-panel__list">' + items + "</ul>") +
      "</div>";
  }

  function setupCalendarEvents() {
    if (calendarEventsBound) return;
    var section = document.getElementById("calendar");
    if (!section) return;
    calendarEventsBound = true;
    section.addEventListener("click", function (e) {
      var prev = e.target.closest("[data-cal-action='prev']");
      var next = e.target.closest("[data-cal-action='next']");
      if (prev) {
        shiftCalMonth(-1);
        refreshAll();
        return;
      }
      if (next) {
        shiftCalMonth(1);
        refreshAll();
        return;
      }
      var dayBtn = e.target.closest("[data-cal-date]");
      if (dayBtn && dayBtn.dataset.calDate) {
        state.selectedDate = dayBtn.dataset.calDate;
        syncExpenseDateInput();
        refreshAll();
        return;
      }
      if (e.target.closest("#calendarJumpToExpense")) {
        var expDate = document.getElementById("expenseDate");
        if (expDate) expDate.focus();
        document.getElementById("expenses")?.scrollIntoView({ behavior: "smooth", block: "start" });
        document.querySelectorAll(".nav-link").forEach(function (l) {
          l.classList.toggle("is-active", l.getAttribute("data-section") === "expenses");
        });
      }
    });
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  function updateCharts() {
    if (typeof Chart === "undefined") return;
    const t = computeTotals();

    // Palette (White Theme / Light Mode)
    const colors = {
      primary: "#3b82f6", // Accent Blue
      primaryLight: "rgba(59, 130, 246, 0.1)",
      primaryMuted: "rgba(59, 130, 246, 0.6)",
      credit: "#10b981", // Green
      debit: "#ef4444", // Red
      neutral: "#64748b" // Slate
    };

    // 1. Monthly Expenses (Bar Chart)
    const monthInput = document.getElementById("dashboardMonth");
    let targetY = state.calMonth.y;
    let targetM = state.calMonth.m + 1;
    if (monthInput && monthInput.value) {
      const parts = monthInput.value.split("-").map(Number);
      targetY = parts[0];
      targetM = parts[1];
    }
    
    const monthlyMap = getMonthlyExpenses(targetY, targetM);
    const expLabels = Object.keys(monthlyMap);
    const expValues = Object.values(monthlyMap);

    const c1 = document.getElementById("monthlyExpensesChart");
    if (c1) {
      if (chartInstances.bar) chartInstances.bar.destroy();
      chartInstances.bar = new Chart(c1, {
        type: "bar",
        data: {
          labels: expLabels.length ? expLabels : ["N/A"],
          datasets: [{
            label: "Expenses",
            data: expValues.length ? expValues : [0],
            backgroundColor: colors.primaryMuted,
            borderColor: colors.primary,
            borderWidth: 1,
            borderRadius: 6,
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { 
            legend: { display: false },
            tooltip: { callbacks: { label: ctx => formatMoney(ctx.raw) } }
          },
          scales: {
            y: { beginAtZero: true, grid: { color: "rgba(0,0,0,0.05)" }, ticks: { font: { size: 10 } } },
            x: { grid: { display: false }, ticks: { font: { size: 10 } } }
          }
        }
      });
    }

    // 2. Credit vs Debit (Pie Chart)
    const c2 = document.getElementById("creditDebitChart");
    if (c2) {
      if (chartInstances.pie) chartInstances.pie.destroy();
      chartInstances.pie = new Chart(c2, {
        type: "pie",
        data: {
          labels: ["Credit", "Debit"],
          datasets: [{
            data: [t.totalCredit, t.totalDebit],
            backgroundColor: ["rgba(16, 185, 129, 0.7)", "rgba(239, 68, 68, 0.7)"],
            borderColor: [colors.credit, colors.debit],
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: "bottom", labels: { boxWidth: 12, padding: 15 } },
            tooltip: { callbacks: { label: ctx => formatMoney(ctx.raw) } }
          }
        }
      });
    }

    // 3. Income Sources — Doughnut Chart (filtered senders)
    const c3 = document.getElementById("incomeSourcesChart");
    if (c3) {
      if (chartInstances.doughnut) chartInstances.doughnut.destroy();
      const fd = getFilteredData();
      const sLabels = fd.senders.map((s) => s.name);
      const sValues = fd.senders.map((s) => s.amount);
      const hasSenders = sLabels.length > 0;

      chartInstances.doughnut = new Chart(c3, {
        type: "doughnut",
        data: {
          labels: hasSenders ? sLabels : ["No data"],
          datasets: [{
            data: hasSenders ? sValues : [1],
            backgroundColor: [
              "rgba(59,130,246,0.75)", "rgba(139,92,246,0.75)",
              "rgba(245,158,11,0.75)", "rgba(16,185,129,0.75)", "rgba(236,72,153,0.75)",
            ],
            borderWidth: 0,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: "65%",
          animation: { duration: 400 },
          plugins: {
            legend: { position: "right", labels: { boxWidth: 12, padding: 10 } },
            tooltip: { callbacks: { label: (ctx) => hasSenders ? formatMoney(ctx.raw) : "No data" } },
          },
        },
      });
    }

  }

  function refreshAll() {
    renderBalances();
    renderSenders();
    renderTransactions();
    renderRecent();
    renderExpenses();
    updateCharts();
    renderCalendarModule();
    renderCalendarPanel();
  }

  // --- Actions ---
  function addBalance() {
    const input = document.getElementById("addBalanceInput");
    const raw = parseFloat(input.value);
    if (Number.isNaN(raw) || raw <= 0) {
      input.focus();
      return;
    }
    const id = "t" + Date.now();
    const todayStr = state.selectedDate;
    state.transactions.unshift({
      id,
      name: "Balance top-up",
      type: "Credit",
      amount: raw,
      date: todayStr,
      category: "Income",
    });
    input.value = "";
    refreshAll();
  }

  function addExpense(ev) {
    ev.preventDefault();
    const nameEl = document.getElementById("expenseName");
    const amtEl = document.getElementById("expenseAmount");
    const dateEl = document.getElementById("expenseDate");
    const name = nameEl.value.trim();
    const amt = parseFloat(amtEl.value);
    const dateVal = dateEl && dateEl.value ? dateEl.value : state.selectedDate;
    if (!name || Number.isNaN(amt) || amt <= 0 || !dateVal) return;
    state.expenses.unshift({
      id: "e" + Date.now(),
      name,
      amount: amt,
      date: dateVal,
    });
    nameEl.value = "";
    amtEl.value = "";
    refreshAll();
  }

  function addTransaction(ev) {
    ev.preventDefault();
    const nameEl = document.getElementById("transactionName");
    const typeEl = document.getElementById("transactionType");
    const dateEl = document.getElementById("transactionDate");
    const amtEl = document.getElementById("transactionAmount");

    const name = nameEl.value.trim();
    const type = typeEl.value;
    const amt = parseFloat(amtEl.value);
    const dateVal = dateEl && dateEl.value ? dateEl.value : state.selectedDate;

    if (!name || Number.isNaN(amt) || amt <= 0 || !dateVal) return;

    state.transactions.unshift({
      id: "t" + Date.now(),
      name,
      type,
      amount: amt,
      date: dateVal,
    });
    
    nameEl.value = "";
    amtEl.value = "";
    refreshAll();
  }

  // --- Navigation (scroll + mobile) ---
  function setupNav() {
    const links = document.querySelectorAll(".nav-link");
    const sidebar = document.getElementById("sidebar");
    const toggle = document.getElementById("menuToggle");
    const overlay = document.getElementById("sidebarOverlay");

    links.forEach((link) => {
      link.addEventListener("click", (e) => {
        e.preventDefault();
        const section = link.getAttribute("data-section");
        const target = document.getElementById(section);
        if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
        links.forEach((l) => l.classList.remove("is-active"));
        link.classList.add("is-active");
        closeMobileMenu();
      });
    });

    function openMobileMenu() {
      sidebar.classList.add("is-open");
      overlay.hidden = false;
      overlay.classList.add("is-open");
      toggle.setAttribute("aria-expanded", "true");
      toggle.setAttribute("aria-label", "Close menu");
    }

    function closeMobileMenu() {
      sidebar.classList.remove("is-open");
      overlay.hidden = true;
      overlay.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
      toggle.setAttribute("aria-label", "Open menu");
    }

    toggle.addEventListener("click", () => {
      if (sidebar.classList.contains("is-open")) closeMobileMenu();
      else openMobileMenu();
    });
    overlay.addEventListener("click", closeMobileMenu);
  }

  function setupTheme() {
    const btn = document.getElementById("themeToggleBtn");
    const menu = document.getElementById("themeMenu");
    const nameLabel = document.getElementById("themeName");
    const options = document.querySelectorAll(".theme-option");

    if (!btn || !menu) return;

    // Load saved theme
    const savedTheme = localStorage.getItem("expense-book-theme") || "light";
    applyTheme(savedTheme);

    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const isHidden = menu.hidden;
      menu.hidden = !isHidden;
      btn.setAttribute("aria-expanded", !isHidden);
    });

    options.forEach(opt => {
      opt.addEventListener("click", () => {
        const theme = opt.getAttribute("data-theme");
        applyTheme(theme);
        menu.hidden = true;
        btn.setAttribute("aria-expanded", "false");
      });
    });

    document.addEventListener("click", (e) => {
      if (!menu.contains(e.target) && !btn.contains(e.target)) {
        menu.hidden = true;
        btn.setAttribute("aria-expanded", "false");
      }
    });

    function applyTheme(theme) {
      // Clean up body classes
      document.body.classList.remove("theme-dark", "theme-blue", "theme-green", "theme-light");
      if (theme !== "light") {
        document.body.classList.add("theme-" + theme);
      } else {
        document.body.classList.add("theme-light");
      }
      
      if (nameLabel) {
        const displayNames = {
          light: "Light Theme",
          dark: "Dark Theme",
          blue: "Blue Theme",
          green: "Green Theme"
        };
        nameLabel.textContent = displayNames[theme] || (theme.charAt(0).toUpperCase() + theme.slice(1) + " Theme");
      }
      
      localStorage.setItem("expense-book-theme", theme);
      
      // Force refresh charts to pick up new CSS variable values
      refreshAll();
    }
  }

  function init() {
    document.getElementById("addBalanceBtn").addEventListener("click", addBalance);
    document.getElementById("addBalanceInput").addEventListener("keydown", (e) => {
      if (e.key === "Enter") addBalance();
    });
    document.getElementById("expenseForm").addEventListener("submit", addExpense);
    const txForm = document.getElementById("transactionForm");
    if (txForm) txForm.addEventListener("submit", addTransaction);
    const sForm = document.getElementById("senderForm");
    if (sForm) sForm.addEventListener("submit", addSender);
    // Pre-fill sender date
    const senderDateEl = document.getElementById("senderDate");
    if (senderDateEl) senderDateEl.value = state.selectedDate;
    const searchInput = document.getElementById("expenseSearchInput");
    if (searchInput) {
      searchInput.addEventListener("input", renderExpenses);
    }
    // Month filter — pre-select current month and wire to full refresh
    const dashboardMonth = document.getElementById("dashboardMonth");
    if (dashboardMonth) {
      const now = new Date();
      dashboardMonth.value = now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0");
      state.filterMonth = dashboardMonth.value;

      dashboardMonth.addEventListener("change", () => {
        state.filterMonth = dashboardMonth.value || null;
        // Smooth fade transition on dashboard section
        const dash = document.getElementById("dashboard");
        if (dash) {
          dash.style.transition = "opacity 0.15s ease";
          dash.style.opacity = "0.4";
        }
        setTimeout(() => {
          refreshAll();
          if (dash) dash.style.opacity = "1";
        }, 150);
      });
    }
    setupNav();
    setupTheme();
    setupCalendarEvents();
    setupModalEvents();
    setupSenderModalEvents();
    setupExpensesModalEvents();
    syncExpenseDateInput();
    refreshAll();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
