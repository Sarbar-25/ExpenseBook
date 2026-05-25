import React, { useState, useEffect, useCallback } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "./firebase";
import { saveToFirebase, todayISO, formatMoney, formatDateDisplay } from "./utils";

// Minimal, stable Sender module (clean component)
// - Single state only: senders
// - No grouping/filtering/visible layers
// - Fetch → setSenders → render directly
// - Add Sender: payload → saveToFirebase → append to setSenders

const Modal = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;
    return (
        <div className="modal-overlay is-open" onClick={onClose} style={{ zIndex: 1100 }}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
                <header className="modal__header">
                    <h3 className="modal__title">{title}</h3>
                    <button type="button" className="modal__close" onClick={onClose}>
                        &times;
                    </button>
                </header>
                <div className="modal__body">{children}</div>
            </div>
        </div>
    );
};

function getInitials(name) {
    return (name || "")
        .split(/\s+/)
        .map((word) => word[0] || "")
        .join("")
        .slice(0, 2)
        .toUpperCase();
}

// Safe normalization (as requested)
const normalizeIndianPhoneNumber = (value) => {
    const input = (value || "").trim();
    if (!input) return "";
    let digits = input.replace(/[^\d+]/g, "");
    if (digits.startsWith("+")) digits = digits.slice(1);
    if (digits.startsWith("0")) digits = digits.slice(1);
    if (digits.startsWith("91") && digits.length === 12) digits = digits.slice(2);
    if (!/^[6-9]\d{9}$/.test(digits)) return null;
    return `91${digits}`;
};

export default function MoneyRecordsPageClean({ user, addToast }) {
    // Only state requested: senders
    const [senders, setSenders] = useState([]);

    // Simple local state for modal + form controls (NOT senders)
    const [isAddSenderModalOpen, setAddSenderModalOpen] = useState(false);
    const [newSenderName, setNewSenderName] = useState("");
    const [newSenderPhone, setNewSenderPhone] = useState("");

    const fetchSenders = useCallback(async () => {
        if (!user?.uid) return;
        const q = query(collection(db, "senders"), where("userId", "==", user.uid));
        const snapshot = await getDocs(q);
        const raw = [];
        snapshot.forEach((docSnap) => raw.push({ id: docSnap.id, ...docSnap.data() }));
        // No grouping; just direct
        setSenders(raw);
        console.log("FETCHED SENDERS:", raw);
    }, [user]);

    useEffect(() => {
        fetchSenders().catch((err) => {
            console.error("Error fetching senders:", err);
            addToast?.("Failed to load senders.", "error");
        });
    }, [fetchSenders, addToast]);

    const handleAddSender = async (e) => {
        e.preventDefault();
        const cleanName = (newSenderName || "").trim();
        const normalizedName = (cleanName || "").trim().toLowerCase();

        if (!normalizedName || normalizedName.length < 1) {
            addToast?.("Enter valid sender name", "error");
            return;
        }

        const rawPhone = (newSenderPhone || "").trim();
        const normalizedPhoneNumber = rawPhone ? normalizeIndianPhoneNumber(rawPhone) : "";
        if (rawPhone && !normalizedPhoneNumber) {
            addToast?.("Enter a valid Indian WhatsApp number", "error");
            return;
        }

        const createdAt = Date.now();
        const payload = {
            id: `sender_${createdAt}`,
            userId: user.uid,
            name: cleanName,
            type: "sender",
            amount: 0,
            createdAt,
        };

        console.log("SAVE PAYLOAD:", payload);

        try {
            const savedId = await saveToFirebase(user.uid, "senders", {
                userId: payload.userId,
                id: payload.id,
                name: payload.name,
                type: payload.type,
                amount: payload.amount,
                date: todayISO(),
                createdAt: payload.createdAt,
            });

            console.log("[Clean] saveToFirebase(sender) success", { savedId });

            const newSender = {
                id: payload.id,
                ...payload,
                date: todayISO(),
                phoneNumber: normalizedPhoneNumber || "",
            };

            // Append immediately (as requested)
            setSenders((prev) => {
                const next = [...prev, newSender];
                console.log("FINAL SENDERS STATE:", next);
                return next;
            });

            // persistence refresh
            await fetchSenders();

            setNewSenderName("");
            setNewSenderPhone("");
            setAddSenderModalOpen(false);
            addToast?.("Sender added successfully", "success");
        } catch (error) {
            console.error("Error adding sender:", error);
            addToast?.("Failed to add sender", "error");
        }
    };

    return (
        <section className="section" style={{ animation: "fadeIn 0.3s ease-out" }}>
            <header className="card__header-row" style={{ marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem", alignItems: "center" }}>
                <h2 className="section__title" style={{ margin: 0 }}>
                    Senders
                </h2>
                <button type="button" className="btn btn--primary" onClick={() => setAddSenderModalOpen(true)}>
                    + Add Sender
                </button>
            </header>

            {senders.length === 0 ? (
                <div className="card empty-state">
                    <div className="empty-state__icon">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                            <circle cx="9" cy="7" r="4" />
                        </svg>
                    </div>
                    <h3>No senders added yet</h3>
                    <p>Add a sender to start tracking received money.</p>
                </div>
            ) : (
                <div className="records-grid">
                    {senders.map((sender) => (
                        <article key={sender.id} className="card record-card">
                            <div className="record-card__header">
                                <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                                    <div className="record-avatar sender">{getInitials(sender.name)}</div>
                                    <div>
                                        <h3 className="record-name">{sender.name}</h3>
                                        <p className="record-subtitle">Money Received</p>
                                    </div>
                                </div>
                            </div>

                            <div className="record-card__body">
                                <div className="record-amount credit">
                                    <p className="label">Total Received</p>
                                    <p className="value">{formatMoney(Number(sender.amount) || 0)}</p>
                                </div>

                                <div className="record-info">
                                    <span>
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <rect x="3" y="4" width="18" height="18" rx="2" />
                                            <path d="M16 2v4M8 2v4M3 10h18" />
                                        </svg>
                                        Last: {sender.date ? formatDateDisplay(sender.date) : "N/A"}
                                    </span>
                                    {sender.phoneNumber ? (
                                        <span>
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                                            </svg>
                                            {sender.phoneNumber}
                                        </span>
                                    ) : null}
                                </div>
                            </div>
                        </article>
                    ))}
                </div>
            )}

            <Modal isOpen={isAddSenderModalOpen} onClose={() => setAddSenderModalOpen(false)} title="Add New Sender">
                <form onSubmit={handleAddSender} className="expense-form">
                    <div className="form-row">
                        <label htmlFor="newSenderName">Sender Name</label>
                        <input
                            type="text"
                            id="newSenderName"
                            required
                            placeholder="e.g. John Doe"
                            autoComplete="off"
                            value={newSenderName}
                            onChange={(e) => setNewSenderName(e.target.value)}
                        />
                    </div>
                    <div className="form-row">
                        <label htmlFor="newSenderPhone">WhatsApp Number (Optional)</label>
                        <input
                            type="tel"
                            id="newSenderPhone"
                            placeholder="e.g. 9876543210"
                            autoComplete="off"
                            value={newSenderPhone}
                            onChange={(e) => setNewSenderPhone(e.target.value)}
                        />
                    </div>
                    <button type="submit" className="btn btn--primary btn--block">
                        Create Sender
                    </button>
                </form>
            </Modal>
        </section>
    );
}

