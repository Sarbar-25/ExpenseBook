import { useMemo, useState, useCallback, useEffect, memo, useRef } from "react";
import {
  BellRing,
  Calendar,
  Handshake,
  Home,
  ReceiptText,
  Settings,
  UsersRound,
  Wallet,
} from "lucide-react";


import SummaryChart from "./SummaryChart.jsx";


import CalendarPage from "./CalendarPage.jsx";
import SettingsPage from "./SettingsPage.jsx";
import { ConfirmDialog, NotificationPanel, ToastContainer } from "./SettingsComponents.jsx";
import LendBorrowPage from "./LendBorrowPage.jsx";
import MoneyRecordsPage from "./MoneyRecordsPage.jsx";
import TransactionsPage from "./TransactionsPage.jsx";
import ExpensesPage from "./ExpensesPage.jsx";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "./firebase";
import Login from "./Login.jsx";
import ExpenseInsights from "./components/ExpenseInsights.jsx";
import RemindersCard from "./components/RemindersCard.jsx";
import DashboardSummaryIllustration from "./components/DashboardSummaryIllustration.jsx";

import {
  saveToFirebase,
  fetchFromFirebase,
  clearFirebaseData,
  computeTotals,
  formatMoney,
  formatDateDisplay,
  initialData,
  todayISO,
  currentMonthKey,
  dateFromMonthKey,
  isISOInMonth,
} from "./utils.js";
import { db } from "./firebase";
import { collection, getDocs } from "firebase/firestore";

async function testFirestoreConnection() {
  try {
    // Minimal read: if Firestore is reachable, this won't throw.
    await fetchFromFirebase("__healthcheck__");
    return true;
  } catch {
    return false;
  }
}

async function deleteFromFirebase(collectionName, id, userId) {
  // Firestore docs are stored under users/<uid>/<collectionName>/<id>
  if (!userId || !collectionName || !id) return;
  // lazy-load to avoid changing existing imports
  const { db } = await import("./firebase");
  const { deleteDoc, doc } = await import("firebase/firestore");
  await deleteDoc(doc(db, "users", userId, collectionName, id));
}

// (Legacy) fetchDashboardMetrics kept for backward compatibility, but NOT used.
async function fetchDashboardMetrics(userId) {
  try {
    if (!userId) throw new Error("Missing userId");
    const cloudData = await fetchFromFirebase(userId);
    const transactions = Array.isArray(cloudData.transactions) ? cloudData.transactions : [];
    const expenses = Array.isArray(cloudData.expenses) ? cloudData.expenses : [];
    const receiverTransactions = Array.isArray(cloudData.receiverTransactions) ? cloudData.receiverTransactions : [];

    // ComputeTotals expects (senders, transactions, expenses).
    // Receiver transactions are treated as DEBIT by dashboard convention.
    // We map them to transactions-like debits by placing them into `senders` and flipping sign via Debit in totals.
    // Minimal safe approximation: treat receiver transactions as Debit by embedding into `transactions`.
    const receiverAsDebits = receiverTransactions.map((rt) => ({
      id: rt.id,
      name: rt.name || "Receiver Transaction",
      type: "Debit",
      amount: Number(rt.amount) || 0,
      date: rt.date,
    }));

    const totals = computeTotals([], [...transactions, ...receiverAsDebits], expenses);

    return {
      globalBalance: totals.totalBalance,
      netWorth: totals.totalBalance,
      totalLentPending: 0,
      totalBorrowPending: 0,
      totalSentMoney: 0,
      totalReceivers: 0,
      thisMonthSent: 0,
      remainingBalance: totals.totalBalance,
      totalSenderMoney: 0,
      thisMonthReceived: 0,
      totalSenders: 0,
    };
  } catch {
    return {
      globalBalance: 0,
      totalLentPending: 0,
      totalBorrowPending: 0,
      netWorth: 0,
      totalSentMoney: 0,
      totalReceivers: 0,
      thisMonthSent: 0,
      remainingBalance: 0,
      totalSenderMoney: 0,
      thisMonthReceived: 0,
      totalSenders: 0,
    };
  }
}

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

function normalizeMetricKey(value) {
  return String(value || "").trim().toLowerCase();
}

function getUniqueSenderCount(senderRows) {
  const unique = new Set();

  // Count unique sender *names* only. Do not fall back to `id` because
  // transaction entries without a `name` would otherwise be treated as
  // distinct senders (inflating the count). This mirrors the UI which
  // groups senders by name when rendering sender cards.
  senderRows.forEach((row) => {
    const name = row && row.name ? normalizeMetricKey(row.name) : "";
    if (name) unique.add(name);
  });

  return unique.size;
}

function getUniqueReceiverCount(receiverRows) {
  // Receivers are stored as distinct documents; count unique receiver
  // documents by id. If `receiverRows` is not an array, return 0.
  if (!Array.isArray(receiverRows)) return 0;
  const unique = new Set();
  receiverRows.forEach((row) => {
    if (row && row.id) unique.add(String(row.id));
  });
  return unique.size;
}

function getMonthlyReceivedTotal(senderRows, monthKey) {
  // Sum only real sender payment entries for the month. Exclude entries
  // that don't have a sender `name` and ignore obvious top-up/recharge
  // labels to avoid counting unrelated credit/top-up records.
  const skipRegex = /top[\s-]?up|topup|recharge/i;
  return (Array.isArray(senderRows) ? senderRows : []).reduce((sum, row) => {
    if (!row) return sum;
    if (!isISOInMonth(row.date, monthKey)) return sum;
    const name = (row.name || "").trim();
    if (!name) return sum;
    if (skipRegex.test(name)) return sum;
    const amount = Number(row.amount) || 0;
    if (amount <= 0) return sum;
    return sum + amount;
  }, 0);
}

const NOTIFICATIONS_STORAGE_KEY = "expensepr_notifications";
const NOTIFICATION_LIMIT = 100;

function loadStoredNotifications() {
  if (typeof window === "undefined" || !window.localStorage) return [];

  try {
    const raw = window.localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
    const parsed = JSON.parse(raw || "[]");
    if (!Array.isArray(parsed)) return [];

    return parsed.filter(
      (item) =>
        item &&
        typeof item.id === "string" &&
        typeof item.title === "string" &&
        typeof item.description === "string"
    );
  } catch {
    return [];
  }
}

function createNotificationId() {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

// Memoized Modal component to prevent unnecessary re-renders
const Modal = memo(({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="modal-overlay is-open" onClick={onClose}>
      <div className="modal modal--wide" onClick={(e) => e.stopPropagation()}>
        <header className="modal__header">
          <h3 className="modal__title">{title}</h3>
          <button type="button" className="modal__close" onClick={onClose}>&times;</button>
        </header>
        <div className="modal__body">
          {children}
        </div>
      </div>
    </div>
  );
});

Modal.displayName = "Modal";

export default function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthLoading(false);
    });
    return unsub;
  }, []);

  const [selectedMonth, setSelectedMonth] = useState(() => currentMonthKey());

  // Safely get theme from localStorage with fallback to "light"
  const [theme, setTheme] = useState(() => {
    try {
      const storedTheme =
        typeof window !== "undefined" && window.localStorage
          ? localStorage.getItem("theme") || "light"
          : "light";
      return storedTheme === "dark" ? "dark" : "light";
    } catch {
      return "light";
    }
  });

  const [userCurrency, setUserCurrency] = useState(() => {
    try {
      return typeof window !== "undefined" && window.localStorage
        ? localStorage.getItem("userCurrency") || "INR"
        : "INR";
    } catch {
      return "INR";
    }
  });

  const applyThemeToDom = useCallback((nextTheme) => {
    const normalizedTheme = nextTheme === "dark" ? "dark" : "light";
    const themeClass = `${normalizedTheme}-theme`;

    if (typeof document === "undefined") return;

    try {
      document.body?.classList?.remove("light-theme", "dark-theme");
      document.body?.classList?.add(themeClass);
    } catch (_) { }

    try {
      document.documentElement.classList.remove("light-theme", "dark-theme");
      document.documentElement.classList.add(themeClass);
    } catch (_) { }

    if (typeof window !== "undefined" && window.localStorage) {
      try {
        localStorage.setItem("theme", normalizedTheme);
      } catch (_) { }
    }
  }, []);

  useEffect(() => {
    applyThemeToDom(theme);
  }, [theme, applyThemeToDom]);

  // (notification dropdown click-outside handler is declared after notificationOpen state below)


  useEffect(() => {
    if (typeof window === "undefined") return;

    const onStorage = (e) => {
      try {
        if (e?.key !== "theme") return;
        const next = e.newValue === "dark" ? "dark" : "light";
        setTheme(next);
        applyThemeToDom(next);
      } catch (error) {
        console.error("Error handling theme storage event:", error);
      }
    };

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [applyThemeToDom]);

  useEffect(() => {
    if (typeof window === "undefined" || !window.localStorage) return;
    try {
      localStorage.setItem("userCurrency", userCurrency);
    } catch (error) {
      console.error("Failed to persist userCurrency:", error);
    }
  }, [userCurrency]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const onError = (event) => {
      console.error("Global runtime error:", event.error || event.message, event);
    };

    const onRejection = (event) => {
      console.error("Unhandled promise rejection:", event.reason, event);
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);

    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  const [themeMenuOpen, setThemeMenuOpen] = useState(false);

  const toggleTheme = useCallback(() => {
    setTheme((current) => (current === "dark" ? "light" : "dark"));
  }, [setTheme]);

  // Safely get route from window.location with fallback to "/dashboard"
  const [routePath, setRoutePath] = useState(() => {
    try {
      if (typeof window === "undefined") return "/dashboard";
      const path = window.location.pathname;
      return path === "/" || path === "" ? "/dashboard" : path;
    } catch {
      return "/dashboard";
    }
  });

  const [receiverTransactions, setReceiverTransactions] = useState([]);
  const [receivers, setReceivers] = useState([]);

  const [globalMetrics, setGlobalMetrics] = useState({
    globalBalance: 0,
    totalLentPending: 0,
    totalBorrowPending: 0,
    netWorth: 0,
    totalSentMoney: 0,
    totalReceivers: 0,
    thisMonthSent: 0,
    remainingBalance: 0,
    totalSenderMoney: 0,
    thisMonthReceived: 0,
    totalSenders: 0
  });

  const [balanceInput, setBalanceInput] = useState("");

  const [balanceDate, setBalanceDate] = useState(() => todayISO());
  const [expenseName, setExpenseName] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseDate, setExpenseDate] = useState(() => todayISO());
  const [expenseSearch, setExpenseSearch] = useState("");

  const [transactionName, setTransactionName] = useState("");
  const [transactionAmount, setTransactionAmount] = useState("");
  const [transactionType, setTransactionType] = useState("Credit");
  const [transactionDate, setTransactionDate] = useState(() => todayISO());

  const [selectedDate, setSelectedDate] = useState(() => todayISO());

  const [senders, setSenders] = useState(initialData.senders);

  const [transactions, setTransactions] = useState(initialData.transactions);

  const [expenses, setExpenses] = useState(initialData.expenses);

  const [userName, setUserName] = useState(() => {
    try {
      return typeof window !== "undefined" && window.localStorage
        ? localStorage.getItem("expensebook_username") || ""
        : "";
    } catch {
      return "";
    }
  });

  const stableUserName = useMemo(
    () =>
      userName ||
      user?.displayName ||
      user?.email?.split("@")[0] ||
      "User",
    [userName, user]
  );

  const userInitials = useMemo(() => initials(stableUserName), [stableUserName]);

  const [activeNav, setActiveNav] = useState("dashboard");

  const [menuOpen, setMenuOpen] = useState(false);

  const [notificationOpen, setNotificationOpen] = useState(false);
  const notifWrapRef = useRef(null);
  const [notifications, setNotifications] = useState(() => loadStoredNotifications());
  const [toasts, setToasts] = useState([]);
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: "",
    message: "",
    confirmLabel: "Confirm",
    onConfirm: null,
  });

  useEffect(() => {
    if (!notificationOpen) return;

    const onDocDown = (e) => {
      const el = notifWrapRef?.current;
      if (!el) return;
      if (!el.contains(e.target)) setNotificationOpen(false);
    };

    document.addEventListener("mousedown", onDocDown);
    document.addEventListener("touchstart", onDocDown, { passive: true });

    return () => {
      document.removeEventListener("mousedown", onDocDown);
      document.removeEventListener("touchstart", onDocDown);
    };
  }, [notificationOpen]);

  useEffect(() => {
    if (typeof window === "undefined" || !window.localStorage) return;
    try {
      window.localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(notifications));
    } catch (error) {
      console.warn("Failed to persist notifications:", error);
    }
  }, [notifications]);



  const [activeModal, setActiveModal] = useState(null); // 'transactions' | 'expenses'

  const [activeDropdown, setActiveDropdown] = useState(null); // 'transactions' | 'expenses'
  const [modalSearch, setModalSearch] = useState("");

  const loadRawReceivers = useCallback(async (userId) => {
    if (!userId) return [];
    const snapshot = await getDocs(collection(db, "users", userId, "receivers"));
    const rows = [];
    snapshot.forEach((docSnap) => rows.push({ id: docSnap.id, ...docSnap.data() }));
    return rows.filter((item) => !item.userId || item.userId === userId);
  }, []);

  const normalizeRoute = useCallback((pathname) => {
    const normalized = pathname.replace(/\/+/g, "/").replace(/\/$/, "");
    if (normalized === "" || normalized === "/") return "/dashboard";
    return normalized;
  }, []);

  const setRoute = useCallback((pathname) => {
    const path = normalizeRoute(pathname);

    // Safely update window history
    if (typeof window !== "undefined" && window.history) {
      try {
        window.history.pushState({}, "", path);
      } catch (e) {
        console.warn("Failed to update history:", e);
      }
    }

    setRoutePath(path);

    // Update active nav based on route
    if (path === "/senders") setActiveNav("senders");
    else if (path === "/settings") setActiveNav("settings");
    else if (path === "/reminders") setActiveNav("reminders");
    else if (path === "/lendBorrow") setActiveNav("lendBorrow");
    else if (path === "/calendar") setActiveNav("calendar");
    else setActiveNav("dashboard");
  }, [normalizeRoute]);

  useEffect(() => {
    // Handle browser back/forward navigation
    const handlePopState = () => {

      if (typeof window === "undefined") return;
      const current = normalizeRoute(window.location.pathname || "/");
      setRoutePath(current);
      if (current === "/senders") setActiveNav("senders");
      else if (current === "/settings") setActiveNav("settings");
      else if (current === "/reminders") setActiveNav("reminders");
      else if (current === "/lendBorrow") setActiveNav("lendBorrow");
      else if (current === "/calendar") setActiveNav("calendar");
      else setActiveNav("dashboard");
    };

    handlePopState();

    // Redirect if on root
    if (typeof window !== "undefined") {
      if (window.location.pathname === "/" || window.location.pathname === "") {
        try {
          window.history.replaceState({}, "", "/dashboard");
        } catch (e) {
          console.warn("Failed to replace history:", e);
        }
        setRoutePath("/dashboard");
        setActiveNav("dashboard");
      }

      window.addEventListener("popstate", handlePopState);
      return () => window.removeEventListener("popstate", handlePopState);
    }
  }, [normalizeRoute]);

  const unreadNotificationCount = useMemo(
    () => notifications.filter((item) => !item.read).length,
    [notifications]
  );

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const addToast = useCallback((input, fallbackType = "success") => {
    const type = typeof input === "object" && input?.type ? input.type : fallbackType;
    const defaults = {
      success: "Success",
      error: "Action Failed",
      warning: "Attention Needed",
      info: "Update",
    };
    const payload =
      typeof input === "string"
        ? {
          title: defaults[type] || defaults.info,
          description: input,
          type,
        }
        : {
          title: input?.title || defaults[type] || defaults.info,
          description: input?.description || input?.message || "",
          type,
        };

    if (!payload.description) return;

    const id = createNotificationId();
    const timestamp = new Date().toISOString();
    const nextItem = {
      id,
      type: payload.type,
      title: payload.title,
      description: payload.description,
      timestamp,
      read: false,
    };

    setNotifications((prev) => [nextItem, ...prev].slice(0, NOTIFICATION_LIMIT));
    setToasts((prev) => [{ ...nextItem, isClosing: false }, ...prev]);

    window.setTimeout(() => {
      setToasts((prev) =>
        prev.map((toast) => (toast.id === id ? { ...toast, isClosing: true } : toast))
      );
    }, 4400);

    window.setTimeout(() => {
      removeToast(id);
    }, 5000);
  }, [removeToast]);

  const requestConfirm = useCallback((options) => {
    setConfirmDialog({
      isOpen: true,
      title: options?.title || "Please confirm",
      message: options?.message || "Are you sure you want to continue?",
      confirmLabel: options?.confirmLabel || "Confirm",
      onConfirm: options?.onConfirm || null,
    });
  }, []);

  const handleConfirmDialogCancel = useCallback(() => {
    setConfirmDialog((prev) => ({ ...prev, isOpen: false, onConfirm: null }));
  }, []);

  const handleConfirmDialogConfirm = useCallback(async () => {
    const action = confirmDialog.onConfirm;
    setConfirmDialog((prev) => ({ ...prev, isOpen: false, onConfirm: null }));
    if (typeof action === "function") {
      await action();
    }
  }, [confirmDialog]);

  const markNotificationRead = useCallback((id) => {
    setNotifications((prev) =>
      prev.map((item) => (item.id === id ? { ...item, read: true } : item))
    );
  }, []);

  const markAllNotificationsRead = useCallback(() => {
    setNotifications((prev) => prev.map((item) => ({ ...item, read: true })));
  }, []);

  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const calMonth = useMemo(() => dateFromMonthKey(selectedMonth), [selectedMonth]);
  const selectedMonthLabel = useMemo(() => formatMonthYear(calMonth), [calMonth]);

  const visibleMonthTransactions = useMemo(
    () => transactions.filter((tx) => isISOInMonth(tx.date, selectedMonth)),
    [transactions, selectedMonth]
  );

  const visibleMonthExpenses = useMemo(
    () => expenses.filter((e) => isISOInMonth(e.date, selectedMonth)),
    [expenses, selectedMonth]
  );

  const visibleMonthReceiverTransactions = useMemo(
    () => receiverTransactions.filter((rt) => isISOInMonth(rt.date, selectedMonth)),
    [receiverTransactions, selectedMonth]
  );

  const visibleMonthSenders = useMemo(
    () => senders.filter((sender) => isISOInMonth(sender.date, selectedMonth)),
    [senders, selectedMonth]
  );

  // Update dashboard counters to reflect month selection
  useEffect(() => {
    // Count unique senders present in the selected month
    const totalSendersMonth = getUniqueSenderCount(visibleMonthSenders);
    // Count unique receivers that have transactions in the selected month
    const receiverIds = new Set(visibleMonthReceiverTransactions.map((rt) => rt.id));
    const totalReceiversMonth = receiverIds.size;
    // Sum of amounts sent this month (receiver transactions are treated as debits)
    const thisMonthSent = visibleMonthReceiverTransactions.reduce(
      (sum, rt) => sum + (Number(rt.amount) || 0),
      0
    );
    // Sum of amounts received this month (credits from sender transactions)
    const thisMonthReceived = visibleMonthTransactions.reduce((sum, tx) => {
      if (!tx) return sum;
      if (tx.type !== "Credit") return sum;

      const amt = Number(tx.amount) || 0;
      return amt > 0 ? sum + amt : sum;
    }, 0);
    setGlobalMetrics((prev) => ({
      ...prev,
      totalSenders: totalSendersMonth,
      totalReceivers: totalReceiversMonth,
      thisMonthSent,
      thisMonthReceived,
    }));
  }, [visibleMonthSenders, visibleMonthReceiverTransactions, selectedMonth]);

  const todayStr = useMemo(() => todayISO(), []);
  const yesterdayStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${dd}`;
  }, []);

  const filteredMonthExpenses = useMemo(
    () => visibleMonthExpenses.filter((e) => {
      if (!expenseSearch) return true;
      const term = expenseSearch.toLowerCase();
      return e.name.toLowerCase().includes(term) || (e.date && e.date.toLowerCase().includes(term));
    }),
    [visibleMonthExpenses, expenseSearch]
  );

  const monthlyTotals = useMemo(() => {
    // computeTotals expects: (senders, transactions, expenses)
    // Receiver transactions are money sent out => treat them as Debit.
    const receiverAsDebits = visibleMonthReceiverTransactions.map((rt) => ({
      id: rt.id,
      name: rt.name || "Receiver Transaction",
      type: "Debit",
      amount: Number(rt.amount) || 0,
      date: rt.date,
    }));

    return computeTotals(
      visibleMonthSenders,
      [...visibleMonthTransactions, ...receiverAsDebits],
      visibleMonthExpenses
    );
  }, [visibleMonthSenders, visibleMonthTransactions, visibleMonthExpenses, visibleMonthReceiverTransactions]);

  const monthlyBalanceGrowth = useMemo(() => {
    const totalCredit = Number(monthlyTotals.totalCredit) || 0;
    const totalBalance = Number(monthlyTotals.totalBalance) || 0;
    if (totalCredit <= 0) return 0;
    return Math.round((totalBalance / totalCredit) * 100);
  }, [monthlyTotals]);

  const recentItems = useMemo(() => {
    // Keep this deterministic and always based on current month arrays.
    // Preserve existing recent UI structure; only expand the underlying dataset.
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
      name: `${e.name}`,
      type: "Expense",
      amount: e.amount,
      date: e.date,
    }));

    // Receiver transactions represent money sent out => debit.
    const rtItems = visibleMonthReceiverTransactions.map((rt) => ({
      id: rt.id,
      kind: "rt",
      name: rt.name || "Receiver Transaction",
      type: "Debit",
      amount: Number(rt.amount) || 0,
      date: rt.date,
    }));

    return [...txItems, ...expItems, ...rtItems]
      .sort((a, b) => (b.date || "").localeCompare(a.date || ""))
      .slice(0, 3);
  }, [visibleMonthTransactions, visibleMonthExpenses, visibleMonthReceiverTransactions]);



  useEffect(() => {
    setExpenseDate(selectedDate);
  }, [selectedDate]);

  useEffect(() => {
    if (!isISOInMonth(selectedDate, selectedMonth)) {
      setSelectedDate(firstDateOfMonth(selectedMonth));
    }
  }, [selectedMonth, selectedDate]);

  // Request ID counter for preventing stale async responses
  const updateGlobalBalanceRequestId = useMemo(() => ({ current: 0 }), []);

  const updateGlobalBalance = useCallback(async () => {
    if (!user) {
      console.log('[DIAGNOSTIC] updateGlobalBalance: No user, skipping');
      return;
    }

    // Increment request ID to track this specific call
    const requestId = ++updateGlobalBalanceRequestId.current;
    console.log('[DIAGNOSTIC] updateGlobalBalance: Starting request #', requestId, 'for user', user.uid);

    try {
      // Use the same cloud payload that drives dashboard lists to keep UI consistent.
      const cloudData = await fetchFromFirebase("D5OAD47F9jbUts6TJQbpys7MmHz1");
      console.log('[DIAGNOSTIC] updateGlobalBalance: Firebase response for request #', requestId, {
        sendersCount: cloudData?.senders?.length || 0,
        transactionsCount: cloudData?.transactions?.length || 0,
        expensesCount: cloudData?.expenses?.length || 0,
        receiverTransactionsCount: cloudData?.receiverTransactions?.length || 0
      });

      // If a newer request was made, ignore this stale response
      if (requestId !== updateGlobalBalanceRequestId.current) {
        console.log('[DIAGNOSTIC] updateGlobalBalance: Request #', requestId, 'cancelled due to newer request');
        return;
      }

      const tx = Array.isArray(cloudData?.transactions) ? cloudData.transactions : [];
      const ex = Array.isArray(cloudData?.expenses) ? cloudData.expenses : [];
      const rt = Array.isArray(cloudData?.receiverTransactions) ? cloudData.receiverTransactions : [];
      const senderRows = Array.isArray(cloudData?.senders) ? cloudData.senders : [];
      const receiverRows = await loadRawReceivers(user.uid);

      // Stage state first so any downstream renders use the newest dataset.
      setSenders(senderRows);
      setReceivers(receiverRows);
      setTransactions(tx);
      setExpenses(ex);
      setReceiverTransactions(rt);

      // Receiver transactions are money sent out => treat them as DEBIT.
      const rtAsDebits = rt.map((r) => ({
        id: r.id,
        name: r.name || "Receiver Transaction",
        type: "Debit",
        amount: Number(r.amount) || 0,
        date: r.date,
      }));

      const totals = computeTotals(
        senderRows,
        [...tx, ...rtAsDebits],
        ex
      );

      // Reconnect pending sender/receiver + monthly aggregation cards to shared state.
      // IMPORTANT: Pending Lent/Borrowed must come from lendBorrow state (remaining = amount - sum(repayments)).

      const monthKey = currentMonthKey();
      const monthTx = tx.filter((t) => isISOInMonth(t.date, monthKey));
      const monthRt = rt.filter((r) => isISOInMonth(r.date, monthKey));

      const totalSenders = getUniqueSenderCount(senderRows);
      const totalReceivers = getUniqueReceiverCount(receiverRows);

      // Pending totals from lendBorrow records (match LendBorrowPage aggregation)
      let totalLentPending = 0;
      let totalBorrowPending = 0;
      try {
        const lbSnap = await getDocs(collection(db, "users", user.uid, "lendBorrow"));
        const recordsRaw = [];
        lbSnap.forEach((d) => recordsRaw.push({ id: d.id, ...d.data() }));
        const records = recordsRaw.filter((item) => !item.userId || item.userId === user.uid);

        records.forEach((r) => {
          const amt = Number(r.amount) || 0;
          const repaid = Array.isArray(r.repayments)
            ? r.repayments.reduce((s, rep) => s + (Number(rep?.amount) || 0), 0)
            : 0;
          const remaining = amt - repaid;
          if (remaining <= 0) return;

          if (r.type === "lend") totalLentPending += remaining;
          if (r.type === "borrow") totalBorrowPending += remaining;
        });
      } catch (e) {
        console.error("Failed to compute lend/borrow pending metrics from lendBorrow", e);
      }

      const thisMonthSent = monthRt.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
      const thisMonthReceived = getMonthlyReceivedTotal(senderRows, monthKey);

      // Net Worth formula:
      // Net Worth = Available Balance + Total Lent - Borrowed Money
      // Use: remainingBalance or availableBalance, totalLentPending, totalBorrowPending
      const remainingBalance = Number(totals?.totalBalance) || 0;
      const netWorth =
        remainingBalance + Number(totalLentPending || 0) - Number(totalBorrowPending || 0);

      console.log('[DIAGNOSTIC] updateGlobalBalance: Setting globalMetrics for request #', requestId, {
        globalBalance: totals.totalBalance,
        netWorth,
        totalLentPending,
        totalBorrowPending,
        totalSentMoney: thisMonthSent,
        totalReceivers,
        thisMonthSent,
        remainingBalance: totals.totalBalance,
        totalSenderMoney: thisMonthReceived,
        thisMonthReceived,
        totalSenders
      });

      setGlobalMetrics((prev) => ({
        ...prev,
        globalBalance: totals.totalBalance,
        netWorth,
        totalLentPending,
        totalBorrowPending,
        totalSentMoney: thisMonthSent,
        totalReceivers,
        thisMonthSent,
        remainingBalance: totals.totalBalance,
        totalSenderMoney: thisMonthReceived,
        thisMonthReceived,
        totalSenders,
      }));
    } catch (error) {
      console.error("[DIAGNOSTIC] Error updating global balance:", error);
    }
  }, [user, loadRawReceivers]);


  // Separate effect: load raw data on user change and calculate metrics
  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      console.log('[DIAGNOSTIC] loadData: user =', user?.uid || 'null', 'cancelled =', cancelled);
      if (!user) {
        console.log('[DIAGNOSTIC] loadData: No user, resetting all state to empty');
        setSenders([]);
        setReceivers([]);
        setTransactions([]);
        setExpenses([]);
        setReceiverTransactions([]);
        setGlobalMetrics({
          globalBalance: 0,
          totalLentPending: 0,
          totalBorrowPending: 0,
          netWorth: 0,
          totalSentMoney: 0,
          totalReceivers: 0,
          thisMonthSent: 0,
          remainingBalance: 0,
          totalSenders: 0,
          thisMonthReceived: 0
        });
        return;
      }

      try {
        console.log('[DIAGNOSTIC] loadData: Fetching from Firebase for user', user.uid);
        const cloudData = await fetchFromFirebase(user.uid);
        console.log('[DIAGNOSTIC] loadData: Firebase response:', {
          sendersCount: cloudData?.senders?.length || 0,
          transactionsCount: cloudData?.transactions?.length || 0,
          expensesCount: cloudData?.expenses?.length || 0,
          receiverTransactionsCount: cloudData?.receiverTransactions?.length || 0
        });
        if (cancelled) {
          console.log('[DIAGNOSTIC] loadData: Request was cancelled, ignoring response');
          return;
        }
        if (cloudData) {
          const sendersData = Array.isArray(cloudData.senders) ? cloudData.senders : [];
          const receiversData = await loadRawReceivers(user.uid);
          const transactionsData = cloudData.transactions || [];
          const expensesData = cloudData.expenses || [];
          const receiverTransactionsData = cloudData.receiverTransactions || [];

          console.log('[DIAGNOSTIC] loadData: Setting state with:', {
            sendersCount: sendersData.length,
            receiversCount: receiversData.length,
            transactionsCount: transactionsData.length,
            expensesCount: expensesData.length,
            receiverTransactionsCount: receiverTransactionsData.length
          });

          setSenders(sendersData);
          setReceivers(receiversData);
          setTransactions(transactionsData);
          setExpenses(expensesData);
          setReceiverTransactions(receiverTransactionsData);

          // Calculate and set globalMetrics from fetched data
          console.log('[DIAGNOSTIC] loadData: Calculating globalMetrics from fetched data...');

          // Receiver transactions are money sent out => treat them as DEBIT.
          const rtAsDebits = receiverTransactionsData.map((r) => ({
            id: r.id,
            name: r.name || "Receiver Transaction",
            type: "Debit",
            amount: Number(r.amount) || 0,
            date: r.date,
          }));

          const totals = computeTotals(
            sendersData,
            [...transactionsData, ...rtAsDebits],
            expensesData
          );

          const monthKey = currentMonthKey();

          const totalSenders = getUniqueSenderCount(sendersData);
          const totalReceivers = getUniqueReceiverCount(receiversData);

          // Pending totals from lendBorrow records
          let totalLentPending = 0;
          let totalBorrowPending = 0;
          try {
            const lbSnap = await getDocs(collection(db, "users", user.uid, "lendBorrow"));
            const recordsRaw = [];
            lbSnap.forEach((d) => recordsRaw.push({ id: d.id, ...d.data() }));
            const records = recordsRaw.filter((item) => !item.userId || item.userId === user.uid);

            records.forEach((r) => {
              const amt = Number(r.amount) || 0;
              const repaid = Array.isArray(r.repayments)
                ? r.repayments.reduce((s, rep) => s + (Number(rep?.amount) || 0), 0)
                : 0;
              const remaining = amt - repaid;
              if (remaining <= 0) return;

              if (r.type === "lend") totalLentPending += remaining;
              if (r.type === "borrow") totalBorrowPending += remaining;
            });
          } catch (e) {
            console.error("Failed to compute lend/borrow pending metrics from lendBorrow", e);
          }

          const monthRt = receiverTransactionsData.filter((r) => isISOInMonth(r.date, monthKey));
          const thisMonthSent = monthRt.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
          const thisMonthReceived = getMonthlyReceivedTotal(sendersData, monthKey);

          const remainingBalance = Number(totals?.totalBalance) || 0;
          const netWorth =
            remainingBalance + Number(totalLentPending || 0) - Number(totalBorrowPending || 0);

          console.log('[DIAGNOSTIC] loadData: Setting globalMetrics:', {
            globalBalance: totals.totalBalance,
            netWorth,
            totalLentPending,
            totalBorrowPending,
            totalSentMoney: thisMonthSent,
            totalReceivers,
            thisMonthSent,
            remainingBalance: totals.totalBalance,
            totalSenderMoney: thisMonthReceived,
            thisMonthReceived,
            totalSenders
          });

          setGlobalMetrics({
            globalBalance: totals.totalBalance,
            netWorth,
            totalLentPending,
            totalBorrowPending,
            totalSentMoney: thisMonthSent,
            totalReceivers,
            thisMonthSent,
            remainingBalance: totals.totalBalance,
            totalSenderMoney: thisMonthReceived,
            thisMonthReceived,
            totalSenders,
          });

          console.log('[DIAGNOSTIC] loadData: Complete - state and metrics updated');
        }
      } catch (error) {
        console.error("[DIAGNOSTIC] Error syncing with cloud:", error);
      }
    }

    loadData();
    return () => { cancelled = true; };
  }, [user]);

  const addBalance = useCallback(async () => {
    const raw = parseFloat(balanceInput);
    if (Number.isNaN(raw) || raw <= 0) return;

    const txDate = balanceDate || selectedDate || todayISO();
    const nextTx = {
      id: "t" + Date.now(),
      name: "Balance top-up",
      type: "Credit",
      amount: raw,
      date: txDate,
    };

    setTransactions((prev) => [nextTx, ...prev]);
    setBalanceInput("");
    setBalanceDate(selectedDate || todayISO());

    if (!user) return;

    try {
      await saveToFirebase(user.uid, "transactions", {
        name: "Balance top-up",
        type: "Credit",
        amount: raw,
        date: txDate,
        createdAt: new Date().toISOString(),
      });
      await updateGlobalBalance();
      addToast("Balance added successfully", "success");
    } catch (error) {
      console.error("Error saving balance:", error);

      if (typeof window !== "undefined" && window.localStorage) {
        try {
          const key = `pending_${user.uid}_transactions`;
          const prevRaw = localStorage.getItem(key);
          const prev = prevRaw ? JSON.parse(prevRaw) : [];
          const next = [
            {
              id: `ls_${Date.now()}_${Math.random().toString(16).slice(2)}`,
              name: "Balance top-up",
              type: "Credit",
              amount: raw,
              date: txDate,
              createdAt: new Date().toISOString(),
            },
            ...(Array.isArray(prev) ? prev : []),
          ];
          localStorage.setItem(key, JSON.stringify(next));
        } catch (lsErr) {
          console.error("localStorage fallback failed:", lsErr);
        }
      }

      try {
        await updateGlobalBalance();
      } catch (metricsErr) {
        console.error("updateGlobalBalance failed after fallback:", metricsErr);
      }

      addToast("Failed to save balance top-up (stored locally)", "error");
    }
  }, [balanceInput, balanceDate, selectedDate, user, addToast, updateGlobalBalance]);

  const onExpenseSubmit = useCallback(
    async (e) => {
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

      if (user) {
        try {
          await saveToFirebase(user.uid, "expenses", {
            name,
            amount: amt,
            date: expenseDate || todayISO(),
            createdAt: new Date().toISOString()
          });
          await updateGlobalBalance();
          addToast("Expense added successfully", "success");
        } catch (error) {
          console.error("Error saving expense:", error);
          addToast("Failed to save expense", "error");
        }
      }
    },
    [expenseName, expenseAmount, expenseDate, user, addToast, updateGlobalBalance]
  );

  const onTransactionSubmit = useCallback(
    async (e) => {
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

      if (user) {
        try {
          await saveToFirebase(user.uid, "transactions", {
            name,
            type: transactionType,
            amount: amt,
            date: transactionDate || todayISO(),
            createdAt: new Date().toISOString()
          });
          await updateGlobalBalance();
          addToast("Transaction added successfully", "success");
        } catch (error) {
          console.error("Error saving transaction:", error);
          addToast("Failed to save transaction", "error");
        }
      }
    },
    [transactionName, transactionAmount, transactionType, transactionDate, user, addToast, updateGlobalBalance]
  );

  const scrollTo = useCallback((section, navId) => {
    setActiveNav(navId);
    if (typeof document !== "undefined") {
      try {
        document.getElementById(section)?.scrollIntoView({ behavior: "smooth", block: "start" });
      } catch (e) {
        console.warn("Failed to scroll to section:", e);
      }
    }
    setMenuOpen(false);
  }, []);

  const handleResetData = async () => {
    if (!user) return;

    requestConfirm({
      title: "Reset all data?",
      message: "This will permanently delete your transactions, expenses, and cloud backup. This action cannot be undone.",
      confirmLabel: "Delete Everything",
      onConfirm: async () => {
        try {
          await clearFirebaseData(user.uid);
          setTransactions([]);
          setExpenses([]);
          addToast({
            type: "success",
            title: "Data Reset Complete",
            description: "All dashboard records and backup data were deleted successfully.",
          });
        } catch (error) {
          console.error("Error resetting data:", error);
          addToast({
            type: "error",
            title: "Reset Failed",
            description: "We could not delete your data. Please try again.",
          });
        }
      },
    });
  };

  const deleteTransaction = useCallback(async (id) => {
    if (!user) return;

    requestConfirm({
      title: "Delete transaction?",
      message: "This transaction will be removed from your records immediately.",
      confirmLabel: "Delete Transaction",
      onConfirm: async () => {
        try {
          await deleteFromFirebase("transactions", id, user.uid);
          setTransactions(prev => prev.filter(tx => tx.id !== id));
          await updateGlobalBalance();
          addToast({
            type: "success",
            title: "Transaction Deleted",
            description: "The transaction was removed successfully.",
          });
        } catch (error) {
          console.error("Error deleting transaction:", error);
          addToast({
            type: "error",
            title: "Delete Failed",
            description: "We could not delete that transaction.",
          });
        }
      },
    });
  }, [user, updateGlobalBalance, addToast, requestConfirm]);

  const deleteExpense = useCallback(async (id) => {
    if (!user) return;

    requestConfirm({
      title: "Delete expense?",
      message: "This expense entry will be removed from your monthly records.",
      confirmLabel: "Delete Expense",
      onConfirm: async () => {
        try {
          await deleteFromFirebase("expenses", id, user.uid);
          setExpenses(prev => prev.filter(e => e.id !== id));
          await updateGlobalBalance();
          addToast({
            type: "success",
            title: "Expense Deleted",
            description: "The expense was removed successfully.",
          });
        } catch (error) {
          console.error("Error deleting expense:", error);
          addToast({
            type: "error",
            title: "Delete Failed",
            description: "We could not delete that expense.",
          });
        }
      },
    });
  }, [user, updateGlobalBalance, addToast, requestConfirm]);

  if (authLoading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          fontSize: '1.1rem',
          color: 'var(--text)',
          backgroundColor: 'var(--surface)'
        }}
        role="status"
        aria-label="Loading application"
      >
        <div>Loading your Expense Book...</div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

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
          <div>
            <span className="sidebar__title">Expense Book</span>
            <p className="sidebar__subtitle">Premium fintech workspace</p>
          </div>
        </div>

        <div className="sidebar__profile-chip" aria-label="Profile">
          <span className="profile-chip__avatar">{userInitials}</span>
          <div className="profile-chip__info">
            <span className="profile-chip__name">{stableUserName}</span>
            <span className="profile-chip__role">Premium User</span>
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true" className="profile-chip__chevron">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>

        <nav className="sidebar__nav">

          {[
            { id: "dashboard", label: "Dashboard", section: "dashboard" },
            { id: "calendar", label: "Calendar", path: "/calendar" },

            { id: "senders", label: "Senders & Receivers", path: "/senders" },
            { id: "transactions", label: "Transactions", section: "transactions" },
            { id: "expenses", label: "Expenses", section: "expenses" },
            { id: "reminders", label: "Reminders", path: "/reminders" },
            { id: "lendBorrow", label: "Lend & Borrow", section: "lendBorrow" },
            { id: "settings", label: "Settings", path: "/settings" },
          ].map((item) => (

            <a
              key={item.id}
              href={item.path || `#${item.section}`}
              className={`nav-link${activeNav === item.id ? " is-active" : ""}`}
              data-section={item.section}
              onClick={(e) => {
                e.preventDefault();
                if (item.path) {
                  setRoute(item.path);
                } else if (item.section) {
                  scrollTo(item.section, item.id);
                }
              }}
            >
              {item.id === "dashboard" && <Home size={20} />}
              {item.id === "calendar" && <Calendar size={20} />}
              {item.id === "senders" && <UsersRound size={20} />}
              {item.id === "transactions" && <ReceiptText size={20} />}
              {item.id === "expenses" && <Wallet size={20} />}
              {item.id === "reminders" && <BellRing size={20} />}
              {item.id === "lendBorrow" && <Handshake size={20} />}
              {item.id === "settings" && <Settings size={20} />}
              {item.label}
            </a>
          ))}
        </nav>
        <div className="sidebar__live">
          <div className="sidebar__live-dot" aria-hidden="true" />
          <div className="sidebar__live-copy">
            <strong>Live Sync</strong>
            <span>Cloud connected</span>
          </div>
        </div>
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
        {activeNav === "settings" ? (
          <SettingsPage
            user={user}
            onLogout={() => signOut(auth)}
            onReset={handleResetData}
            theme={theme}
            setTheme={setTheme}
            userCurrency={userCurrency}
            setUserCurrency={setUserCurrency}
            userName={stableUserName}
            setUserName={setUserName}
            addToast={addToast}
          />
        ) : activeNav === "reminders" ? (
          <div className="settings-container">
            <RemindersCard addToast={addToast} requestConfirm={requestConfirm} />
          </div>
        ) : activeNav === "calendar" ? (
          <CalendarPage
            calMonth={calMonth}
            selectedMonthLabel={selectedMonthLabel}
            expenses={expenses}
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            setSelectedMonth={setSelectedMonth}
            onPrevMonth={() => setSelectedMonth((monthKey) => shiftMonthKey(monthKey, -1))}
            onNextMonth={() => setSelectedMonth((monthKey) => shiftMonthKey(monthKey, 1))}
            monthlyBalance={Number(monthlyTotals.totalBalance) || 0}
            thisMonthExpenses={Number(monthlyTotals.totalExpenses) || 0}
            onNavigateToReminders={() => setRoute("/reminders")}
          />
        ) : activeNav === "transactions" ? (
          <TransactionsPage
            selectedMonth={selectedMonth}
            selectedMonthLabel={selectedMonthLabel}
            setSelectedMonth={setSelectedMonth}
            transactionName={transactionName}
            setTransactionName={setTransactionName}
            transactionType={transactionType}
            setTransactionType={setTransactionType}
            transactionDate={transactionDate}
            setTransactionDate={setTransactionDate}
            transactionAmount={transactionAmount}
            setTransactionAmount={setTransactionAmount}
            onTransactionSubmit={onTransactionSubmit}
            visibleMonthTransactions={visibleMonthTransactions}
            deleteTransaction={deleteTransaction}
            setActiveModal={setActiveModal}
            formatDateDisplay={formatDateDisplay}
            formatMoney={formatMoney}
          />
        ) : activeNav === "expenses" ? (
          <ExpensesPage
            selectedMonth={selectedMonth}
            selectedMonthLabel={selectedMonthLabel}
            setSelectedMonth={setSelectedMonth}
            expenseName={expenseName}
            setExpenseName={setExpenseName}
            expenseDate={expenseDate}
            setExpenseDate={setExpenseDate}
            expenseAmount={expenseAmount}
            setExpenseAmount={setExpenseAmount}
            onExpenseSubmit={onExpenseSubmit}
            expenseSearch={expenseSearch}
            setExpenseSearch={setExpenseSearch}
            filteredMonthExpenses={filteredMonthExpenses}
            deleteExpense={deleteExpense}
            setActiveModal={setActiveModal}
            formatDateDisplay={formatDateDisplay}
            formatMoney={formatMoney}
          />
        ) : activeNav === "lendBorrow" ? (
          <LendBorrowPage
            user={user}
            addToast={addToast}
            requestConfirm={requestConfirm}
            updateGlobalBalance={updateGlobalBalance}
          />
        ) : activeNav === "senders" ? (

          <MoneyRecordsPage
            user={user}
            addToast={addToast}
            updateGlobalBalance={updateGlobalBalance}
            globalMetrics={globalMetrics}
            onNavigate={setRoute}
          />
        ) : (
          <>
            <header className="main-header">
              <div className="main-header__greeting">
                <span className="greeting-prefix">Welcome back,</span>
                <span className="user-name">
                  <span className="user-name__text">{stableUserName}</span>
                  <span className="user-name__wave" aria-hidden="true">👋</span>
                </span>
                <span className="greeting-subtitle">Here is your premium financial snapshot for today.</span>
              </div>

              <div className="main-header__actions">
                <div className="notif-wrap" ref={notifWrapRef}>
                  <button
                    type="button"
                    className="header-action header-action--notification"
                    aria-label="Notifications"
                    aria-expanded={notificationOpen}
                    onClick={() => setNotificationOpen((o) => !o)}
                  >
                    <span className="header-action__icon-wrap">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 7h18s-3 0-3-7" />
                        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                      </svg>
                      {unreadNotificationCount > 0 && (
                        <span className="notification-badge" aria-hidden="true">
                          {unreadNotificationCount > 99 ? "99+" : unreadNotificationCount}
                        </span>
                      )}
                    </span>
                  </button>

                  {notificationOpen && (
                    <NotificationPanel
                      notifications={notifications}
                      unreadCount={unreadNotificationCount}
                      onMarkAllRead={markAllNotificationsRead}
                      onClearAll={clearAllNotifications}
                      onItemClick={markNotificationRead}
                    />
                  )}
                </div>

                <button type="button" className="header-action header-action--theme" onClick={toggleTheme} aria-label="Toggle theme">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <circle cx="12" cy="12" r="5" />
                    <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
                  </svg>
                </button>
              </div>

            </header>

            <header className="top-bar">
              <div className="top-bar__balance card card--balance">
                <div className="top-bar__balance-copy">
                  <div className="top-bar__balance-label">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                    </svg>
                    Monthly Balance
                  </div>
                  <p className="top-bar__balance-month">{selectedMonthLabel}</p>
                  <p className="top-bar__balance-value">{formatMoney(monthlyTotals.totalBalance)}</p>
                  <span className="top-bar__balance-badge">{monthlyBalanceGrowth >= 0 ? "+" : ""}{monthlyBalanceGrowth}% growth</span>
                </div>
                <div className="top-bar__balance-graphic" aria-hidden="true">
                  <svg width="112" height="112" viewBox="0 0 112 112" fill="none">
                    <rect x="18" y="26" width="76" height="52" rx="18" fill="rgba(255,255,255,0.12)" />
                    <rect x="28" y="38" width="56" height="8" rx="4" fill="rgba(255,255,255,0.45)" />
                    <rect x="28" y="54" width="34" height="8" rx="4" fill="rgba(255,255,255,0.7)" />
                    <circle cx="84" cy="72" r="18" fill="rgba(255,255,255,0.16)" />
                    <path d="M76 72h16M84 64v16" stroke="rgba(255,255,255,0.95)" strokeWidth="4" strokeLinecap="round" />
                  </svg>
                </div>
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
                Dashboard Summary
              </h2>

              <div className="summary-grid" style={{ marginBottom: '2rem' }}>
                <article className="card card--summary">
                  <div className="card__summary-illustration" aria-hidden="true">
                    <DashboardSummaryIllustration variant="netWorth" />
                  </div>
                  <div className="card__icon" style={{ backgroundColor: 'var(--icon-primary-bg)', color: 'var(--icon-primary)' }}>

                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                    </svg>
                  </div>
                  <h3 className="card__label">Net Worth</h3>
                  <p className="card__value" style={{ fontWeight: 700 }}>{formatMoney(globalMetrics.netWorth)}</p>

                </article>

                <article className="card card--summary">
                  <div className="card__summary-illustration" aria-hidden="true">
                    <DashboardSummaryIllustration variant="totalBalance" />
                  </div>
                  <div className="card__icon" style={{ backgroundColor: 'var(--icon-success-bg)', color: 'var(--icon-success)' }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 3h18v18H3z M3 9h18" />
                    </svg>
                  </div>
                  <h3 className="card__label">Total Balance</h3>
                  <p className="card__value">{formatMoney(globalMetrics.globalBalance)}</p>
                </article>

                <article className="card card--summary">
                  <div className="card__summary-illustration" aria-hidden="true">
                    <DashboardSummaryIllustration variant="lentOut" />
                  </div>
                  <div className="card__icon" style={{ backgroundColor: 'var(--icon-warning-bg)', color: 'var(--icon-warning)' }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </div>
                  <h3 className="card__label">Pending Lent Out</h3>
                  <p className="card__value amount--credit">{formatMoney(globalMetrics.totalLentPending)}</p>
                </article>

                <article className="card card--summary">
                  <div className="card__summary-illustration" aria-hidden="true">
                    <DashboardSummaryIllustration variant="borrowed" />
                  </div>
                  <div className="card__icon" style={{ backgroundColor: 'var(--icon-danger-bg)', color: 'var(--icon-danger)' }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M19 12H5M12 19l-7-7 7-7" />
                    </svg>
                  </div>
                  <h3 className="card__label">Pending Borrowed</h3>
                  <p className="card__value amount--debit">{formatMoney(globalMetrics.totalBorrowPending)}</p>
                </article>
              </div>

              <div className="summary-grid" style={{ marginBottom: '2rem' }}>
                <article className="card card--summary">
                  <div className="card__summary-illustration" aria-hidden="true">
                    <DashboardSummaryIllustration variant="senders" />
                  </div>
                  <div className="card__icon" style={{ backgroundColor: 'var(--icon-info-bg)', color: 'var(--icon-info)' }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
                    </svg>
                  </div>
                  <h3 className="card__label">Total Senders</h3>
                  <p className="card__value">{globalMetrics.totalSenders}</p>
                </article>
                <article className="card card--summary">
                  <div className="card__summary-illustration" aria-hidden="true">
                    <DashboardSummaryIllustration variant="receivers" />
                  </div>
                  <div className="card__icon" style={{ backgroundColor: 'var(--icon-violet-bg)', color: 'var(--icon-violet)' }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10z" />
                      <path d="M2 22c0-5.5 4.5-10 10-10s10 4.5 10 10" />
                    </svg>
                  </div>
                  <h3 className="card__label">Total Receivers</h3>
                  <p className="card__value">{globalMetrics.totalReceivers}</p>
                </article>
                <article className="card card--summary">
                  <div className="card__summary-illustration" aria-hidden="true">
                    <DashboardSummaryIllustration variant="sent" />
                  </div>
                  <div className="card__icon" style={{ backgroundColor: 'var(--icon-success-bg)', color: 'var(--icon-success)' }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 17h18M16 7l5 5-5 5M2 12h6" />
                    </svg>
                  </div>
                  <h3 className="card__label">This Month Sent</h3>
                  <p className="card__value">{formatMoney(globalMetrics.thisMonthSent)}</p>
                </article>
                <article className="card card--summary">
                  <div className="card__summary-illustration" aria-hidden="true">
                    <DashboardSummaryIllustration variant="received" />
                  </div>
                  <div className="card__icon" style={{ backgroundColor: 'var(--icon-success-bg)', color: 'var(--icon-success)' }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  </div>
                  <h3 className="card__label">This Month Total Received</h3>
                  <p className="card__value">{formatMoney(globalMetrics.thisMonthReceived)}</p>
                </article>
              </div>

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
                  All transactions, expenses, and totals below are filtered for {selectedMonthLabel}.
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



              <div className="summary-grid" style={{ marginTop: 0 }}>
                <article className="card card--summary card--highlight">

                  <div className="card__icon card__icon--balance">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                    </svg>
                  </div>
                  <h3 className="card__label">Monthly balance</h3>
                  <p className="card__value">{formatMoney(monthlyTotals.totalBalance)}</p>
                  <p className="card__hint">Credit - Debit</p>
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
                  <h3 className="card__heading">Monthly summary ({selectedMonthLabel})</h3>
                  <SummaryChart
                    type="bar"
                    labels={["Credit", "Debit", "Expenses"]}
                    data={[
                      monthlyTotals.totalCredit,
                      monthlyTotals.totalDebit,
                      monthlyTotals.totalExpenses,
                    ]}
                  />
                </div>
                <div className="card card--chart">
                  <h3 className="card__heading">Distribution ({selectedMonthLabel})</h3>
                  <SummaryChart
                    type="doughnut"
                    labels={["Credit", "Debit", "Expenses"]}
                    data={[
                      monthlyTotals.totalCredit,
                      monthlyTotals.totalDebit,
                      monthlyTotals.totalExpenses,
                    ]}
                  />
                </div>
              </div>

              <div className="card card--recent card--recent-full">
                <div className="card__header-row card__header-row--recent" style={{ marginBottom: "0.5rem" }}>
                  <h3 className="card__heading">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: "6px" }}>
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                    Recent entries ({selectedMonthLabel})
                  </h3>
                  <button
                    type="button"
                    className="btn--show-all"
                    onClick={() => setActiveModal('recent')}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px' }}><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" /></svg>
                    Full View
                  </button>
                </div>
                <ul className="recent-list recent-list--dashboard">
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
                          <div className="recent-item__content">
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

            </section>
          </>
        )}
        <footer className="footer">
          <p>Expense Book &mdash; <span className="footer__dev-credit">Developed by <span className="footer__dev-name">Sarbar</span></span></p>
        </footer>
      </main>

      <Modal
        isOpen={!!activeModal}
        onClose={() => { setActiveModal(null); setModalSearch(""); }}
        title={`Full ${activeModal === 'transactions' ? 'Transactions' : activeModal === 'expenses' ? 'Expenses' : 'Recent Entries'} (${selectedMonthLabel})`}
      >
        <div className="modal-search-row">
          <input
            type="text"
            className="month-input modal-search-input"
            placeholder="Search entries..."
            value={modalSearch}
            onChange={(e) => setModalSearch(e.target.value)}
          />
          <span className="modal-expense-count">
            {activeModal === 'transactions' ? visibleMonthTransactions.length : activeModal === 'expenses' ? visibleMonthExpenses.length : visibleMonthTransactions.length + visibleMonthExpenses.length} total
          </span>
        </div>

        {activeModal === 'transactions' && (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr><th>Name</th><th>Date</th><th>Type</th><th className="align-right">Amount</th><th className="align-right">Action</th></tr>
              </thead>
              <tbody>
                {visibleMonthTransactions.filter(tx => tx.name.toLowerCase().includes(modalSearch.toLowerCase())).map((tx) => (
                  <tr key={tx.id}>
                    <td>{tx.name}</td>
                    <td>{formatDateDisplay(tx.date)}</td>
                    <td><span className={`badge ${tx.type === 'Credit' ? 'badge--credit' : 'badge--debit'}`}>{tx.type}</span></td>
                    <td className={`align-right ${tx.type === 'Credit' ? 'amount--credit' : 'amount--debit'}`}>{formatMoney(tx.amount)}</td>
                    <td className="align-right">
                      <button className="btn--icon" onClick={() => deleteTransaction(tx.id)} style={{ color: 'var(--danger)' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeModal === 'expenses' && (
          <ul className="expense-list">
            {visibleMonthExpenses.filter(e => e.name.toLowerCase().includes(modalSearch.toLowerCase())).map((e) => (
              <li key={e.id} className="expense-item">
                <span className="expense-item__name">
                  {e.name}
                  <span className="expense-item__date">{formatDateDisplay(e.date)}</span>
                </span>
                <span className="expense-item__amount">{formatMoney(e.amount)}</span>
                <button className="btn--icon" onClick={() => deleteExpense(e.id)} style={{ color: 'var(--danger)', marginLeft: '8px' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                </button>
              </li>
            ))}
          </ul>
        )}

        {activeModal === 'recent' && (
          <ul className="recent-list" style={{ maxHeight: 'none' }}>
            {[
              ...visibleMonthTransactions.map(tx => ({ ...tx, kind: 'tx', meta: tx.type })),
              ...visibleMonthExpenses.map(e => ({ ...e, kind: 'exp', meta: 'Expense' })),
              ...visibleMonthReceiverTransactions.map(rt => ({
                ...rt,
                kind: 'rt',
                meta: 'Sent',
                type: 'Debit'
              }))
            ].sort((a, b) => (b.date || "").localeCompare(a.date || ""))
              .filter((item) =>
                (item?.name || "")
                  .toLowerCase()
                  .includes((modalSearch || "").toLowerCase())
              )
              .map(item => {
                const isCredit = item.type === "Credit";
                const amountClass = isCredit ? "is-credit" : "is-debit";
                const sign = isCredit ? "+" : "-";
                return (
                  <li key={item.id} className="recent-item">
                    <div>
                      <div className="recent-item__name">{item.name}</div>
                      <div className="recent-item__meta">{item.meta} - {formatDateDisplay(item.date)}</div>
                    </div>
                    <span className={`recent-item__amount ${amountClass}`}>
                      {sign}{formatMoney(item.amount)}
                    </span>
                  </li>
                );
              })}
          </ul>
        )}

      </Modal>

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmLabel={confirmDialog.confirmLabel}
        onConfirm={handleConfirmDialogConfirm}
        onCancel={handleConfirmDialogCancel}
      />

      <ToastContainer toasts={toasts} onClose={removeToast} />

    </div>
  );
}
