/** Shared totals + formatting (used by vanilla logic parity). */
import { db, addDoc, collection, getDocs, orderBy, query, deleteDoc, doc } from "./firebase";
import { auth } from "./firebase";



export async function fetchFromFirebase(userId) {
  if (!userId) return { expenses: [], transactions: [], receiverTransactions: [] };

  // Merge localStorage pending entries so each collection survives refresh.
  const pendingKeys = ["transactions", "expenses", "receiverTransactions"];
  const pendingEntries = {};
  for (const key of pendingKeys) {
    const lsKey = `pending_${userId}_${key}`;
    const lsRaw = localStorage.getItem(lsKey);
    try {
      pendingEntries[key] = lsRaw ? JSON.parse(lsRaw) : [];
    } catch {
      pendingEntries[key] = [];
    }
  }


  try {
    const expQ = query(collection(db, "users", userId, "expenses"), orderBy("date", "desc"));
    const expSnap = await getDocs(expQ);
    const expenses = [];
    expSnap.forEach((doc) => {
      expenses.push({ id: doc.id, ...doc.data() });
    });

    const txQ = query(collection(db, "users", userId, "transactions"), orderBy("date", "desc"));
    const txSnap = await getDocs(txQ);
    const transactions = [];
    txSnap.forEach((doc) => {
      transactions.push({ id: doc.id, ...doc.data() });
    });

    const receiverTransactions = [];

    // Prepend LS entries so UI shows immediately.
    return {
      expenses: [...(pendingEntries.expenses || []), ...expenses],
      transactions: [...(pendingEntries.transactions || []), ...transactions],
      receiverTransactions: pendingEntries.receiverTransactions || receiverTransactions,
    };

  } catch (error) {
    console.error("Error fetching from Firebase:", error);
    return {
      expenses: pendingEntries.expenses || [],
      transactions: pendingEntries.transactions || [],
      receiverTransactions: pendingEntries.receiverTransactions || [],
    };
  }
}



export async function saveToFirebase(userId, collectionName, data) {
  if (!userId) return null;

  const lsKey = `pending_${userId}_${collectionName}`;

  // Ensure balance updates immediately even if Firebase write fails
  const entry = {
    id: `ls_${Date.now()}_${Math.random().toString(16).slice(2)}`,
    ...data,
    createdAt: new Date().toISOString(),
  };

  try {
    const docRef = await addDoc(collection(db, "users", userId, collectionName), {
      ...data,
      createdAt: new Date(),
    });

    // If Firebase succeeds, clear any staged local entry list
    try {
      localStorage.removeItem(lsKey);
    } catch (_) { }

    return docRef.id;
  } catch (error) {
    console.error("Firebase error:", error);

    // LocalStorage fallback
    try {
      const prevRaw = localStorage.getItem(lsKey);
      const prev = prevRaw ? JSON.parse(prevRaw) : [];
      const next = [entry, ...prev.filter((x) => x && x.id !== entry.id)];
      localStorage.setItem(lsKey, JSON.stringify(next));
    } catch (lsErr) {
      console.error("localStorage fallback failed:", lsErr);
      return null;
    }

    // Return local entry id so callers can continue
    return entry.id;
  }
}



export function formatMoney(n) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(n);
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

/** YYYY-MM-DD in local timezone */
export function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/** YYYY-MM for current month (local timezone) */
export function currentMonthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
}

/** Derive YYYY-MM from YYYY-MM-DD */
export function monthKeyFromISO(iso) {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return "";
  return iso.slice(0, 7);
}

/** Create first-day Date from YYYY-MM */
export function dateFromMonthKey(monthKey) {
  if (!monthKey || !/^\d{4}-\d{2}$/.test(monthKey)) return new Date();
  const [y, m] = monthKey.split("-").map(Number);
  return new Date(y, m - 1, 1);
}

/** Returns true if YYYY-MM-DD belongs to YYYY-MM */
export function isISOInMonth(iso, monthKey) {
  return monthKeyFromISO(iso) === monthKey;
}

/** Ensure every item has a date; fallbackDate can be string or function(item)->string */
export function withDate(items, fallbackDate) {
  return items.map((item) => ({
    ...item,
    date:
      item.date ||
      (typeof fallbackDate === "function" ? fallbackDate(item) : fallbackDate) ||
      todayISO(),
  }));
}

/** Readable label for an ISO date string */
export function formatDateDisplay(iso) {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return "-";
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function sum(arr, pick) {
  return arr.reduce((acc, item) => acc + pick(item), 0);
}

export function computeTotals(senders, transactions, expenses) {
  const creditFromSenders = sum(senders, (s) => s.amount);
  const creditFromTx = sum(
    transactions.filter((t) => t.type === "Credit"),
    (t) => t.amount
  );
  const totalCredit = creditFromSenders + creditFromTx;

  const totalDebit = sum(
    transactions.filter((t) => t.type === "Debit"),
    (t) => t.amount
  );

  const totalExpenses = sum(expenses, (e) => e.amount);

  const totalBalance = totalCredit - totalDebit - totalExpenses;

  return {
    totalCredit,
    totalDebit,
    totalExpenses,
    totalBalance,
    creditFromSenders,
    creditFromTx,
  };
}

export const initialData = {
  senders: [
    { id: "s1", name: "Sarah Chen", amount: 1200, date: "2026-04-02" },
    { id: "s2", name: "Marcus Webb", amount: 450.5, date: "2026-04-03" },
    { id: "s3", name: "Elena Ruiz", amount: 89.99, date: "2026-03-27" },
    { id: "s4", name: "Payroll - Acme Co.", amount: 3200, date: "2026-04-01" },
  ],
  transactions: [
    { id: "t1", name: "Freelance invoice #104", type: "Credit", amount: 850, date: "2026-04-01" },
    { id: "t2", name: "Rent payment", type: "Debit", amount: 1100, date: "2026-04-02" },
    { id: "t3", name: "Client refund", type: "Credit", amount: 120, date: "2026-03-29" },
    { id: "t4", name: "Utilities", type: "Debit", amount: 142.3, date: "2026-04-03" },
    { id: "t5", name: "ATM withdrawal", type: "Debit", amount: 200, date: "2026-04-04" },
  ],
  expenses: [
    { id: "e1", name: "Software subscription", amount: 49, date: "2026-04-01" },
    { id: "e2", name: "Team lunch", amount: 86.4, date: "2026-04-03" },
    { id: "e3", name: "Courier", amount: 22.5, date: "2026-04-04" },
  ],
};

export async function clearFirebaseData(userId) {
  if (!userId) return;
  try {
    const expQ = query(collection(db, "users", userId, "expenses"));
    const expSnap = await getDocs(expQ);
    const expDeletes = expSnap.docs.map(d => deleteDoc(d.ref));

    const txQ = query(collection(db, "users", userId, "transactions"));
    const txSnap = await getDocs(txQ);
    const txDeletes = txSnap.docs.map(d => deleteDoc(d.ref));

    await Promise.all([...expDeletes, ...txDeletes]);
    console.log("Firebase data cleared for user", userId);
  } catch (error) {
    console.error("Error clearing Firebase data:", error);
  }
}