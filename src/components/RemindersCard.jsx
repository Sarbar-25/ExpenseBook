import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
    Bell,
    Pencil,
    Trash2,
    CheckCircle2,
    Search,
    Clock3,
    CalendarClock,
    ListOrdered,
} from "lucide-react";
import { createPortal } from "react-dom";

import {
    formatMoney,
    formatDateDisplay,
    todayISO,
    currentMonthKey,
    REMINDERS_STORAGE_KEY,
    REMINDERS_UPDATED_EVENT,
} from "../utils.js";

const REMINDERS_MONTH_FILTER_SESSION_KEY = "expensebook_reminders_month_filter";


function dueISOFromOffset(offsetDays = 0) {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${dd}`;
}

function getReminderStatus(item) {
    const due = item?.dueISO;
    const today = todayISO();
    if (item?.completed) return "Completed";
    if (due && String(due) < today) return "Overdue";
    return "Upcoming";
}

function formatMonthLabel(monthKey) {
    if (!monthKey || !/^\d{4}-\d{2}$/.test(monthKey)) return "selected month";
    const [year, month] = monthKey.split("-").map(Number);
    return new Date(year, month - 1, 1).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
    });
}

function statusMeta(status) {
    if (status === "Overdue") {
        return {
            badgeClass: "badge--overdue",
            iconBg: "rgba(239, 68, 68, 0.14)",
            iconFg: "#ef4444",
        };
    }
    if (status === "Completed") {
        return {
            badgeClass: "badge--completed",
            iconBg: "rgba(16, 185, 129, 0.14)",
            iconFg: "#10b981",
        };
    }
    return {
        badgeClass: "badge--upcoming",
        iconBg: "rgba(59, 130, 246, 0.14)",
        iconFg: "#3b82f6",
    };
}

function ReminderAvatar({ item }) {
    const st = getReminderStatus(item);
    const meta = statusMeta(st);

    const bg = item.iconBg || meta.iconBg;
    const fg = item.iconFg || meta.iconFg;
    const icon = item.icon || <Bell size={16} />;

    return (
        <span
            className="reminders-card__avatar flex items-center justify-center w-12 h-12 rounded-full shadow-sm"
            style={{ background: bg, color: fg }}
            aria-hidden="true"
        >
            {icon}
        </span>
    );
}

function RemindersCardItem({ item, onEdit, onDelete, onMarkComplete }) {
    const status = getReminderStatus(item);
    let statusStyle = { background: "var(--surface-soft)", color: "var(--text-muted)" };
    let borderStyle = { borderColor: "var(--border)" };

    if (status === "Upcoming") {
        statusStyle = { background: "var(--info-soft)", color: "var(--info)" };
        borderStyle = { borderColor: "var(--info)" };
    } else if (status === "Overdue") {
        statusStyle = { background: "var(--danger-soft)", color: "var(--danger)" };
        borderStyle = { borderColor: "var(--danger)" };
    } else if (status === "Completed") {
        statusStyle = { background: "var(--success-soft)", color: "var(--success)" };
        borderStyle = { borderColor: "var(--success)" };
    }

    return (
        <li
            className="rounded-[20px] shadow-sm border border-l-4 p-5 mb-4 hover:shadow-md transition-all duration-200 w-full"
            style={{ background: "var(--surface)", ...borderStyle }}
        >
            
            {/* Desktop Horizontal Card */}
            <div className="hidden md:grid grid-cols-[70px_2fr_1fr_1fr_1fr_auto] gap-4 items-center w-full">
                
                {/* Icon */}
                <div className="flex flex-col items-center justify-center">
                    <ReminderAvatar item={item} />
                </div>
                
                {/* Name & Notes */}
                <div className="flex flex-col min-w-0 pr-4">
                    <h3 className="text-base font-semibold truncate" style={{ color: "var(--text)" }} title={item.title}>{item.title}</h3>
                    <p className="text-xs truncate mt-0.5" style={{ color: "var(--text-muted)" }} title={item.notes}>{item.notes ? item.notes : "No notes"}</p>
                </div>

                {/* Amount */}
                <div className="flex flex-col min-w-0">
                    <span className="text-[10px] uppercase tracking-wider font-bold mb-0.5" style={{ color: "var(--text-muted)" }}>Amount</span>
                    <span className="font-semibold text-sm truncate" style={{ color: "var(--text)" }}>{item.amount == null ? "—" : formatMoney(item.amount)}</span>
                </div>

                {/* Due Date & Status */}
                <div className="flex flex-col min-w-0 items-start">
                    <span className="text-[10px] uppercase tracking-wider font-bold mb-1" style={{ color: "var(--text-muted)" }}>Due Date</span>
                    <span className="font-semibold text-sm truncate mb-1" style={{ color: "var(--text)" }}>{formatDateDisplay(item.dueISO)}</span>
                    <span className="px-3 py-1 rounded-full text-xs font-medium" style={statusStyle}>{status}</span>
                </div>

                {/* Type */}
                <div className="flex flex-col min-w-0">
                    <span className="text-[10px] uppercase tracking-wider font-bold mb-0.5" style={{ color: "var(--text-muted)" }}>Type</span>
                    <span className="font-semibold text-sm truncate" style={{ color: "var(--text)" }}>{item.type || "Payment"}</span>
                </div>

                {/* Actions */}
                <div className="flex gap-2 justify-end">
                    {!item.completed && (
                        <button type="button" className="flex items-center justify-center h-[36px] px-4 rounded-xl transition-colors font-medium text-sm" style={{ background: "var(--accent)", color: "var(--hero-contrast)" }} onClick={() => onMarkComplete(item.id)}>
                            Complete
                        </button>
                    )}
                    <button type="button" className="flex items-center justify-center h-[36px] px-3 border rounded-xl transition-colors font-medium text-sm" style={{ background: "var(--surface)", color: "var(--text)", borderColor: "var(--border)" }} onClick={() => onEdit(item)}>
                        Edit
                    </button>
                    <button type="button" className="flex items-center justify-center h-[36px] px-3 border rounded-xl transition-colors font-medium text-sm" style={{ background: "var(--surface)", color: "var(--danger)", borderColor: "var(--danger-border)" }} onClick={() => onDelete(item.id)}>
                        Delete
                    </button>
                </div>
            </div>

            {/* Mobile / Tablet Fallback */}
            <div className="flex flex-col md:hidden gap-4">
                <div className="flex justify-between items-start">
                    <div className="flex gap-3 items-center">
                        <ReminderAvatar item={item} />
                        <div>
                            <h3 className="text-base font-semibold truncate" style={{ color: "var(--text)" }}>{item.title}</h3>
                            <span className="px-3 py-1 rounded-full text-xs font-medium inline-block mt-1" style={statusStyle}>{status}</span>
                        </div>
                    </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3 rounded-xl p-3 border" style={{ background: "var(--surface-soft)", borderColor: "var(--border)" }}>
                    <div className="flex flex-col">
                        <span className="text-[10px] uppercase tracking-wider font-bold mb-0.5" style={{ color: "var(--text-muted)" }}>Amount</span>
                        <span className="font-semibold text-sm" style={{ color: "var(--text)" }}>{item.amount == null ? "—" : formatMoney(item.amount)}</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[10px] uppercase tracking-wider font-bold mb-0.5" style={{ color: "var(--text-muted)" }}>Due Date</span>
                        <span className="font-semibold text-sm" style={{ color: "var(--text)" }}>{formatDateDisplay(item.dueISO)}</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[10px] uppercase tracking-wider font-bold mb-0.5" style={{ color: "var(--text-muted)" }}>Type</span>
                        <span className="font-semibold text-sm" style={{ color: "var(--text)" }}>{item.type || "Payment"}</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[10px] uppercase tracking-wider font-bold mb-0.5" style={{ color: "var(--text-muted)" }}>Notes</span>
                        <span className="text-sm truncate" style={{ color: "var(--text-muted)" }}>{item.notes ? item.notes : "—"}</span>
                    </div>
                </div>

                <div className="flex gap-2 justify-end mt-2">
                    {!item.completed && (
                        <button type="button" className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors" style={{ background: "var(--accent)", color: "var(--hero-contrast)" }} onClick={() => onMarkComplete(item.id)}>
                            <CheckCircle2 size={14} /> Complete
                        </button>
                    )}
                    <button type="button" className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors border" style={{ background: "var(--surface)", color: "var(--text)", borderColor: "var(--border)" }} onClick={() => onEdit(item)}>
                        <Pencil size={14} /> Edit
                    </button>
                    <button type="button" className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors border" style={{ background: "var(--surface)", color: "var(--danger)", borderColor: "var(--danger-border)" }} onClick={() => onDelete(item.id)}>
                        <Trash2 size={14} /> Delete
                    </button>
                </div>
            </div>
        </li>
    );
}

export default function RemindersCard({ addToast, requestConfirm }) {
    const safeLoadRemindersFromLocalStorage = useCallback(() => {
        try {
            if (typeof window === "undefined" || !window.localStorage) return [];
            const raw = window.localStorage.getItem(REMINDERS_STORAGE_KEY);
            if (!raw) return [];

            const parsed = JSON.parse(raw);
            if (!Array.isArray(parsed)) return [];

            return parsed
                .filter((r) => r && typeof r === "object")
                .map((r) => {
                    const formType = r.type || "Payment";
                    const nextReminder = {
                        id: String(
                            r.id ?? `r_${Date.now()}_${Math.random().toString(16).slice(2)}`
                        ),
                        title: typeof r.title === "string" ? r.title : "",
                        dueISO: typeof r.dueISO === "string" ? r.dueISO : "",
                        amount:
                            r.amount === null || r.amount === undefined ? null : Number(r.amount),
                        type: formType,
                        notes: typeof r.notes === "string" ? r.notes : "",
                        // Backward compatible: older records won't have completed.
                        completed: typeof r.completed === "boolean" ? r.completed : false,
                    };

                    if (!nextReminder.title || !nextReminder.dueISO) return null;

                    if (formType === "Payment") {
                        nextReminder.iconBg = "rgba(59, 130, 246, 0.14)";
                        nextReminder.iconFg = "#3b82f6";
                        nextReminder.icon = (
                            <svg
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                            >
                                <path d="M3 7h18" />
                                <path d="M7 12h10" />
                                <path d="M9 17h6" />
                            </svg>
                        );
                    } else if (formType === "Collection") {
                        nextReminder.iconBg = "rgba(16, 185, 129, 0.14)";
                        nextReminder.iconFg = "#10b981";
                        nextReminder.icon = (
                            <svg
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                            >
                                <circle cx="9" cy="7" r="4" />
                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                            </svg>
                        );
                    } else if (formType === "Expense") {
                        nextReminder.iconBg = "rgba(239, 68, 68, 0.14)";
                        nextReminder.iconFg = "#ef4444";
                        nextReminder.icon = (
                            <svg
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                            >
                                <path d="M12 2v20" />
                                <path d="M7 5h10" />
                                <path d="M7 19h10" />
                            </svg>
                        );
                    } else if (formType === "Borrow") {
                        nextReminder.iconBg = "rgba(245, 158, 11, 0.14)";
                        nextReminder.iconFg = "#f59e0b";
                        nextReminder.icon = (
                            <svg
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                            >
                                <path d="M12 1v22" />
                                <path d="M7 5h10" />
                                <path d="M17 19H7" />
                            </svg>
                        );
                    } else if (formType === "Lend") {
                        nextReminder.iconBg = "rgba(139, 92, 246, 0.14)";
                        nextReminder.iconFg = "#8b5cf6";
                        nextReminder.icon = (
                            <svg
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                            >
                                <path d="M12 1l3 5H9l3-5z" />
                                <path d="M21 10H3" />
                                <path d="M17 10l-5 13-5-13" />
                            </svg>
                        );
                    } else {
                        nextReminder.iconBg = "rgba(59, 130, 246, 0.14)";
                        nextReminder.iconFg = "#3b82f6";
                        nextReminder.icon = (
                            <svg
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                            >
                                <path d="M21 15a4 4 0 0 1-4 4H7l-4 4V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />
                            </svg>
                        );
                    }

                    return nextReminder;
                })
                .filter(Boolean);
        } catch {
            return [];
        }
    }, []);

    const persistRemindersToLocalStorage = useCallback((nextReminders) => {
        try {
            if (typeof window === "undefined" || !window.localStorage) return;

            const serializable = Array.isArray(nextReminders)
                ? nextReminders.map((r) => ({
                    id: r?.id,
                    title: r?.title,
                    dueISO: r?.dueISO,
                    amount: r?.amount,
                    type: r?.type,
                    notes: r?.notes,
                    completed: typeof r?.completed === "boolean" ? r.completed : false,
                }))
                : [];

            window.localStorage.setItem(REMINDERS_STORAGE_KEY, JSON.stringify(serializable));
            window.dispatchEvent(new Event(REMINDERS_UPDATED_EVENT));
        } catch {
            // Ignore persistence failures.
        }
    }, []);

    const [reminders, setReminders] = useState(() =>
        safeLoadRemindersFromLocalStorage()
    );

    // Summary + controls
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("All");
    const [sortMode, setSortMode] = useState("Default");
    const [selectedMonth, setSelectedMonth] = useState(() => {
        try {
            if (typeof window === "undefined" || !window.sessionStorage) return currentMonthKey();
            return window.sessionStorage.getItem(REMINDERS_MONTH_FILTER_SESSION_KEY) || currentMonthKey();
        } catch {
            return currentMonthKey();
        }
    });

    // View mode: keep existing default UX by defaulting to Upcoming only
    // (switch to All Reminders when requested; must not reset search/filter/sort)
    const [viewMode, setViewMode] = useState("Upcoming");

    const normalizedSearch = (searchTerm || "").trim().toLowerCase();
    const monthFilterLabel = useMemo(
        () => (selectedMonth === "all" ? "All Months" : formatMonthLabel(selectedMonth)),
        [selectedMonth]
    );

    useEffect(() => {
        try {
            if (typeof window === "undefined" || !window.sessionStorage) return;
            window.sessionStorage.setItem(REMINDERS_MONTH_FILTER_SESSION_KEY, selectedMonth || currentMonthKey());
        } catch {
            // Ignore session persistence failures.
        }
    }, [selectedMonth]);


    const derived = useMemo(() => {
        const today = todayISO();
        const monthScopedReminders = reminders.filter((r) => {
            if (selectedMonth === "all") return true;
            const dueISO = typeof r?.dueISO === "string" ? r.dueISO : "";
            return dueISO.slice(0, 7) === selectedMonth;
        });

        const withStatus = monthScopedReminders.map((r) => ({ ...r, __status: getReminderStatus(r) }));

        const filtered = withStatus.filter((r) => {
            // View mode controls which statuses are visible
            if (viewMode === "Upcoming" && r.__status !== "Upcoming") return false;
            if (viewMode === "Overdue" && r.__status !== "Overdue") return false;
            if (viewMode === "Completed" && r.__status !== "Completed") return false;
            // viewMode === "All" shows everything (no status restriction)

            if (statusFilter !== "All" && r.__status !== statusFilter) return false;

            if (!normalizedSearch) return true;


            const amountStr = r.amount == null ? "" : String(r.amount);
            const notes = (r.notes || "").toLowerCase();
            const title = (r.title || "").toLowerCase();
            const dueISO = (r.dueISO || "").toLowerCase();

            return (
                title.includes(normalizedSearch) ||
                notes.includes(normalizedSearch) ||
                dueISO.includes(normalizedSearch) ||
                amountStr.includes(normalizedSearch)
            );
        });

        const groupRank = (status) => {
            if (status === "Overdue") return 0;
            if (status === "Upcoming") return 1;
            if (status === "Completed") return 2;
            return 1;
        };

        const sorters = {
            Default: (a, b) => {
                const ra = groupRank(a.__status);
                const rb = groupRank(b.__status);
                if (ra !== rb) return ra - rb;
                return String(a.dueISO || "").localeCompare(String(b.dueISO || ""));
            },
            DueDate: (a, b) => {
                const ra = groupRank(a.__status);
                const rb = groupRank(b.__status);
                if (ra !== rb) return ra - rb;
                return String(a.dueISO || "").localeCompare(String(b.dueISO || ""));
            },
            Title: (a, b) => {
                const ra = groupRank(a.__status);
                const rb = groupRank(b.__status);
                if (ra !== rb) return ra - rb;
                return String(a.title || "").localeCompare(String(b.title || ""));
            },
        };

        const filteredSorted = filtered
            .slice()
            .sort(sorters[sortMode] || sorters.Default);

        const overdue = withStatus.filter((r) => !r.completed && r.dueISO && String(r.dueISO) < today).length;
        const completed = withStatus.filter((r) => r.completed).length;
        const upcoming = withStatus.filter((r) => !r.completed && (!r.dueISO || String(r.dueISO) >= today)).length;

        return {
            filteredSorted,
            hasAnyReminders: reminders.length > 0,
            counts: {
                overdue,
                upcoming,
                completed,
                total: withStatus.length,
            },
        };
    }, [reminders, normalizedSearch, selectedMonth, sortMode, statusFilter, viewMode]);

    // ===== Existing Add reminder modal logic MUST remain unchanged when adding =====
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formName, setFormName] = useState("");
    const [formDate, setFormDate] = useState("");
    const [formAmount, setFormAmount] = useState("");
    const [formType, setFormType] = useState("Payment");

    const [fieldErrors, setFieldErrors] = useState({ name: "", date: "" });

    // Edit mode (reuses same modal UI; add flow unchanged)
    const [isEditMode, setIsEditMode] = useState(false);
    const [editingId, setEditingId] = useState(null);

    const openModal = useCallback(() => {
        setFieldErrors({ name: "", date: "" });
        setFormName("");
        setFormDate("");
        setFormAmount("");
        setFormType("Payment");
        setIsEditMode(false);
        setEditingId(null);
        setIsModalOpen(true);
    }, []);

    const closeModal = useCallback(() => {
        setIsModalOpen(false);
    }, []);

    const handleAddReminder = () => {
        openModal();
    };

    const onMarkComplete = (id) => {
        setReminders((prev) => {
            const next = prev.map((r) => (r.id === id ? { ...r, completed: true } : r));
            persistRemindersToLocalStorage(next);
            return next;
        });
        addToast?.({
            type: "success",
            title: "Reminder Completed",
            description: "The reminder was marked as completed.",
        });
    };

    const onDelete = (id) => {
        requestConfirm?.({
            title: "Delete reminder?",
            message: "This reminder will be removed from your schedule immediately.",
            confirmLabel: "Delete Reminder",
            onConfirm: () => {
                setReminders((prev) => {
                    const next = prev.filter((r) => r.id !== id);
                    persistRemindersToLocalStorage(next);
                    return next;
                });
                addToast?.({
                    type: "success",
                    title: "Reminder Deleted",
                    description: "The reminder was deleted successfully.",
                });
            },
        });
    };

    const onEdit = (reminder) => {
        setFieldErrors({ name: "", date: "" });
        setIsEditMode(true);
        setEditingId(reminder.id);

        // Prefill add form fields (modal structure remains identical)
        setFormName(reminder.title || "");
        setFormDate(reminder.dueISO || "");
        setFormAmount(reminder.amount == null ? "" : String(reminder.amount));
        setFormType(reminder.type || "Payment");
        setIsModalOpen(true);
    };

    const validateAndSave = useCallback(() => {
        const name = (formName || "").trim();
        const date = (formDate || "").trim();

        const nextErrors = {
            name: name ? "" : "Reminder name is required.",
            date: date ? "" : "Reminder date is required.",
        };
        setFieldErrors(nextErrors);

        if (!name || !date) {
            addToast?.({
                type: "warning",
                title: "Missing Reminder Details",
                description: "Please enter both a reminder name and due date.",
            });
            return;
        }

        const parsedAmount = formAmount === "" ? null : Number(formAmount);
        const amount = parsedAmount === null || Number.isNaN(parsedAmount) ? null : parsedAmount;

        if (!isEditMode) {
            const nextReminder = {
                id: `r_${Date.now()}_${Math.random().toString(16).slice(2)}`,
                title: name,
                dueISO: date,
                amount: amount,
                type: formType,
                completed: false,
                notes: "",
                // icons/colors derived from type for proper styling
                iconBg: "rgba(59, 130, 246, 0.14)",
                iconFg: "#3b82f6",
                icon: (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15a4 4 0 0 1-4 4H7l-4 4V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />
                    </svg>
                ),
            };

            // Map icon styling by reminder type (keep identical to previous logic)
            if (formType === "Payment") {
                nextReminder.iconBg = "rgba(59, 130, 246, 0.14)";
                nextReminder.iconFg = "#3b82f6";
                nextReminder.icon = (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M3 7h18" />
                        <path d="M7 12h10" />
                        <path d="M9 17h6" />
                    </svg>
                );
            } else if (formType === "Collection") {
                nextReminder.iconBg = "rgba(16, 185, 129, 0.14)";
                nextReminder.iconFg = "#10b981";
                nextReminder.icon = (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="9" cy="7" r="4" />
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
                );
            } else if (formType === "Expense") {
                nextReminder.iconBg = "rgba(239, 68, 68, 0.14)";
                nextReminder.iconFg = "#ef4444";
                nextReminder.icon = (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 2v20" />
                        <path d="M7 5h10" />
                        <path d="M7 19h10" />
                    </svg>
                );
            } else if (formType === "Borrow") {
                nextReminder.iconBg = "rgba(245, 158, 11, 0.14)";
                nextReminder.iconFg = "#f59e0b";
                nextReminder.icon = (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 1v22" />
                        <path d="M7 5h10" />
                        <path d="M17 19H7" />
                    </svg>
                );
            } else if (formType === "Lend") {
                nextReminder.iconBg = "rgba(139, 92, 246, 0.14)";
                nextReminder.iconFg = "#8b5cf6";
                nextReminder.icon = (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 1l3 5H9l3-5z" />
                        <path d="M21 10H3" />
                        <path d="M17 10l-5 13-5-13" />
                    </svg>
                );
            }

            setReminders((prev) => {
                const next = [nextReminder, ...prev];
                persistRemindersToLocalStorage(next);
                return next;
            });

            closeModal();
            addToast?.({
                type: "success",
                title: "Reminder Added",
                description: `${name} was added to your reminder list.`,
            });
            return;
        }

        // Edit mode
        setReminders((prev) => {
            const existing = prev.find((r) => r.id === editingId);
            const completed = existing?.completed === true;

            const nextReminder = {
                id: editingId,
                title: name,
                dueISO: date,
                amount: amount,
                type: formType,
                completed: completed,
                notes: existing?.notes || "",
                iconBg: existing?.iconBg,
                iconFg: existing?.iconFg,
                icon: existing?.icon,
            };

            // Recompute icon styling by type
            if (formType === "Payment") {
                nextReminder.iconBg = "rgba(59, 130, 246, 0.14)";
                nextReminder.iconFg = "#3b82f6";
                nextReminder.icon = (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M3 7h18" />
                        <path d="M7 12h10" />
                        <path d="M9 17h6" />
                    </svg>
                );
            } else if (formType === "Collection") {
                nextReminder.iconBg = "rgba(16, 185, 129, 0.14)";
                nextReminder.iconFg = "#10b981";
                nextReminder.icon = (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="9" cy="7" r="4" />
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
                );
            } else if (formType === "Expense") {
                nextReminder.iconBg = "rgba(239, 68, 68, 0.14)";
                nextReminder.iconFg = "#ef4444";
                nextReminder.icon = (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 2v20" />
                        <path d="M7 5h10" />
                        <path d="M7 19h10" />
                    </svg>
                );
            } else if (formType === "Borrow") {
                nextReminder.iconBg = "rgba(245, 158, 11, 0.14)";
                nextReminder.iconFg = "#f59e0b";
                nextReminder.icon = (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 1v22" />
                        <path d="M7 5h10" />
                        <path d="M17 19H7" />
                    </svg>
                );
            } else if (formType === "Lend") {
                nextReminder.iconBg = "rgba(139, 92, 246, 0.14)";
                nextReminder.iconFg = "#8b5cf6";
                nextReminder.icon = (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 1l3 5H9l3-5z" />
                        <path d="M21 10H3" />
                        <path d="M17 10l-5 13-5-13" />
                    </svg>
                );
            }

            const next = prev.map((r) => (r.id === editingId ? nextReminder : r));
            persistRemindersToLocalStorage(next);
            return next;
        });

        closeModal();
        addToast?.({
            type: "info",
            title: "Reminder Updated",
            description: `${name} was updated successfully.`,
        });
    }, [
        addToast,
        formAmount,
        formDate,
        formName,
        formType,
        isEditMode,
        editingId,
        closeModal,
        persistRemindersToLocalStorage,
    ]);

    return (
        <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8" aria-label="Reminders">

            <div className="reminders-page__header flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-8">
                <div>
                    <h1 className="reminders-page__title text-3xl font-bold mb-1" style={{ color: "var(--text)" }}>Reminders</h1>
                    <p className="reminders-page__subtitle" style={{ color: "var(--text-muted)" }}>Manage your upcoming payments and reminders</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto sm:items-center sm:justify-end">
                    <div className="flex items-center gap-2 px-3 h-[48px] rounded-[14px] border w-full sm:w-[240px] flex-shrink-0" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
                        <label htmlFor="reminderMonthFilter" className="text-sm font-medium whitespace-nowrap" style={{ color: "var(--text-muted)" }}>
                            Month
                        </label>
                        <input
                            id="reminderMonthFilter"
                            type="month"
                            value={selectedMonth === "all" ? currentMonthKey() : selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value || currentMonthKey())}
                            aria-label="Month filter"
                            className="w-full bg-transparent border-none outline-none text-sm cursor-pointer min-w-0"
                            style={{ color: "var(--text)" }}
                        />
                        <button
                            type="button"
                            onClick={() => setSelectedMonth("all")}
                            className="text-xs font-semibold whitespace-nowrap"
                            style={{ color: selectedMonth === "all" ? "var(--accent)" : "var(--text-muted)" }}
                        >
                            All Months
                        </button>
                    </div>
                    <button type="button" className="reminders-page__add-btn px-5 py-2.5 rounded-xl font-medium shadow-sm transition-colors flex items-center justify-center gap-2 w-full sm:w-auto" style={{ background: "var(--accent-gradient-strong)", color: "var(--hero-contrast)" }} onClick={handleAddReminder}>
                        <span className="reminders-page__add-plus text-lg font-semibold" aria-hidden="true">+</span>
                        Add Reminder
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="rounded-[16px] shadow-sm border p-5 hover:-translate-y-1 hover:shadow-md transition-all duration-200" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
                    <div className="text-sm font-medium mb-1" style={{ color: "var(--danger)" }}>Overdue</div>
                    <div className="text-3xl font-bold" style={{ color: "var(--text)" }}>{derived.counts.overdue}</div>
                </div>
                <div className="rounded-[16px] shadow-sm border p-5 hover:-translate-y-1 hover:shadow-md transition-all duration-200" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
                    <div className="text-sm font-medium mb-1" style={{ color: "var(--accent)" }}>Upcoming</div>
                    <div className="text-3xl font-bold" style={{ color: "var(--text)" }}>{derived.counts.upcoming}</div>
                </div>
                <div className="rounded-[16px] shadow-sm border p-5 hover:-translate-y-1 hover:shadow-md transition-all duration-200" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
                    <div className="text-sm font-medium mb-1" style={{ color: "var(--success)" }}>Completed</div>
                    <div className="text-3xl font-bold" style={{ color: "var(--text)" }}>{derived.counts.completed}</div>
                </div>
                <div className="rounded-[16px] shadow-sm border p-5 hover:-translate-y-1 hover:shadow-md transition-all duration-200" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
                    <div className="text-sm font-medium mb-1" style={{ color: "var(--violet)" }}>Total</div>
                    <div className="text-3xl font-bold" style={{ color: "var(--text)" }}>{derived.counts.total}</div>
                </div>
            </div>

            <div className="p-4 rounded-[16px] shadow-sm border flex flex-col md:flex-row md:items-center gap-3 mb-8" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
                <div className="flex items-center gap-3 w-full md:w-[60%] h-[48px] px-4 rounded-[14px] border transition-all flex-shrink-0" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
                    <Search size={18} style={{ color: "var(--text-muted)" }} />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search reminders..."
                        aria-label="Search reminders"
                        className="w-full h-full bg-transparent border-none outline-none"
                        style={{ color: "var(--text)" }}
                    />
                </div>
                
                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto md:flex-1 md:justify-end">
                    <div className="flex items-center gap-2 px-3 h-[48px] rounded-[14px] border w-full sm:w-[180px] flex-shrink-0" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
                        <Clock3 size={16} style={{ color: "var(--text-muted)" }} className="flex-shrink-0" />
                        <select
                            value={viewMode}
                            onChange={(e) => {
                                setStatusFilter(e.target.value);
                                setViewMode(e.target.value);
                            }}
                            aria-label="Status dropdown filter"
                            className="bg-transparent border-none outline-none text-sm cursor-pointer w-full"
                            style={{ color: "var(--text)" }}
                        >
                            <option value="All">All statuses</option>
                            <option value="Overdue">Overdue</option>
                            <option value="Upcoming">Upcoming</option>
                            <option value="Completed">Completed</option>
                        </select>
                    </div>
                    <div className="flex items-center gap-2 px-3 h-[48px] rounded-[14px] border w-full sm:w-[180px] flex-shrink-0" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
                        <CalendarClock size={16} style={{ color: "var(--text-muted)" }} className="flex-shrink-0" />
                        <select
                            value={sortMode}
                            onChange={(e) => setSortMode(e.target.value)}
                            aria-label="Sort dropdown"
                            className="bg-transparent border-none outline-none text-sm cursor-pointer w-full"
                            style={{ color: "var(--text)" }}
                        >
                            <option value="Default">Overdue first</option>
                            <option value="DueDate">Sort by due date</option>
                            <option value="Title">Sort by title</option>
                        </select>
                    </div>
                </div>
            </div>


            {derived.filteredSorted.length === 0 ? (
                <div className="reminders-card__empty flex flex-col items-center justify-center py-12 text-center">
                    <Bell size={48} style={{ color: "var(--text-muted)" }} className="mb-4" />
                    <h2 className="text-xl font-semibold mb-2">
                        {derived.hasAnyReminders ? `No reminders found for ${monthFilterLabel}.` : "No Reminders Yet"}
                    </h2>
                    <p className="mb-4" style={{ color: "var(--text-muted)" }}>
                        {derived.hasAnyReminders
                            ? `Try another month or adjust your filters to see reminders for ${monthFilterLabel}.`
                            : "Create reminders for payments, expenses and important events."}
                    </p>
                    <button type="button" className="btn btn-primary" onClick={handleAddReminder}>+ Add Reminder</button>
                </div>
            ) : (
                <ul className="reminders-page__cards" aria-label="Reminder cards">
                    {derived.filteredSorted.map((item) => (
                        <RemindersCardItem
                            key={item.id}
                            item={item}
                            onEdit={onEdit}
                            onDelete={onDelete}
                            onMarkComplete={onMarkComplete}
                        />
                    ))}
                </ul>
            )}

            <div className="reminders-page__tips">
                <div className="reminders-page__tips-icon" aria-hidden="true">
                    <ListOrdered size={16} />
                </div>
                <div>
                    <strong>Overdue tip:</strong> Overdue reminders will stay at the top. Mark them complete once payment is done.
                </div>
            </div>

            {isModalOpen &&
                createPortal(
                    (
                        <div
                            className="reminders-portal-overlay"
                            role="dialog"
                            aria-modal="true"
                            aria-label="Add reminder"
                            onMouseDown={(e) => {
                                if (e.target === e.currentTarget) closeModal();
                            }}
                        >
                            <div className="reminders-portal-backdrop" aria-hidden="true" />
                            <div className="modal reminders-modal" onClick={(e) => e.stopPropagation()}>
                                <header className="modal__header reminders-modal__header">
                                    <h3 className="modal__title">Add reminder</h3>
                                    <button
                                        type="button"
                                        className="modal__close"
                                        onClick={closeModal}
                                        aria-label="Close"
                                    >
                                        &times;
                                    </button>
                                </header>

                                <div className="modal__body">
                                    <form
                                        onSubmit={(e) => {
                                            e.preventDefault();
                                            validateAndSave();
                                        }}
                                        className="reminders-modal__form"
                                    >
                                        <div className="reminders-modal__row">
                                            <label htmlFor="reminderName">Reminder Name</label>
                                            <input
                                                id="reminderName"
                                                type="text"
                                                value={formName}
                                                onChange={(e) => {
                                                    setFormName(e.target.value);
                                                    if (fieldErrors.name)
                                                        setFieldErrors((prev) => ({ ...prev, name: "" }));
                                                }}
                                                placeholder="e.g. Pay rent"
                                                className={fieldErrors.name ? "input--error" : ""}
                                            />
                                            {fieldErrors.name ? (
                                                <div className="reminders-modal__error">{fieldErrors.name}</div>
                                            ) : null}
                                        </div>

                                        <div className="reminders-modal__row">
                                            <label htmlFor="reminderDate">Reminder Date</label>
                                            <input
                                                id="reminderDate"
                                                type="date"
                                                value={formDate}
                                                onChange={(e) => {
                                                    setFormDate(e.target.value);
                                                    if (fieldErrors.date)
                                                        setFieldErrors((prev) => ({ ...prev, date: "" }));
                                                }}
                                                className={fieldErrors.date ? "input--error" : ""}
                                            />
                                            {fieldErrors.date ? (
                                                <div className="reminders-modal__error">{fieldErrors.date}</div>
                                            ) : null}
                                        </div>

                                        <div className="reminders-modal__row">
                                            <label htmlFor="reminderAmount">Amount (optional)</label>
                                            <input
                                                id="reminderAmount"
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={formAmount}
                                                onChange={(e) => setFormAmount(e.target.value)}
                                                placeholder="0"
                                            />
                                        </div>

                                        <div className="reminders-modal__row">
                                            <label htmlFor="reminderType">Reminder Type</label>
                                            <select
                                                id="reminderType"
                                                value={formType}
                                                onChange={(e) => setFormType(e.target.value)}
                                            >
                                                {["Payment", "Collection", "Expense", "Borrow", "Lend"].map(
                                                    (opt) => (
                                                        <option key={opt} value={opt}>
                                                            {opt}
                                                        </option>
                                                    )
                                                )}
                                            </select>
                                        </div>

                                        <div className="reminders-modal__actions">
                                            <button
                                                type="button"
                                                className="btn reminders-modal__btn"
                                                onClick={closeModal}
                                            >
                                                Cancel
                                            </button>
                                            <button type="submit" className="btn btn--primary reminders-modal__btn">
                                                Save reminder
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        </div>
                    ),
                    document.body
                )}
        </div>
    );
}

