import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
    collection,
    query,
    where,
    getDocs,
    doc,
    updateDoc,
    addDoc,
} from "firebase/firestore";
import { db } from "./firebase";
import {
    saveToFirebase,
    formatDateDisplay,
    formatMoney,
    todayISO,
} from "./utils.js";

const RELATIONS = ["Mother", "Father", "Sister", "Brother", "Friend", "Other"];
const SENDER_CONTACTS_STORAGE_KEY = "expensebook_sender_whatsapp_contacts";
const RECEIVER_CONTACTS_STORAGE_KEY = "expensebook_receiver_whatsapp_contacts";

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

function normalizeKey(value) {
    return (value || "").trim().toLowerCase();
}

function isSameDayOrLater(a, b) {
    return (a || "").localeCompare(b || "") >= 0;
}

export default function MoneyRecordsPage({ user, addToast, updateGlobalBalance }) {
    const [activeTab, setActiveTab] = useState("senders");
    const [searchTerm, setSearchTerm] = useState("");
    const [loading, setLoading] = useState(true);

    const [senderEntries, setSenderEntries] = useState([]);
    const [receiverEntries, setReceiverEntries] = useState([]);
    const [receiverTransactions, setReceiverTransactions] = useState([]);

    const [isAddSenderModalOpen, setAddSenderModalOpen] = useState(false);
    const [isEditSenderModalOpen, setEditSenderModalOpen] = useState(false);
    const [isAddMoneyModalOpen, setAddMoneyModalOpen] = useState(false);
    const [historySenderKey, setHistorySenderKey] = useState(null);
    const [selectedSenderKey, setSelectedSenderKey] = useState(null);

    const [isAddReceiverModalOpen, setAddReceiverModalOpen] = useState(false);
    const [isEditReceiverModalOpen, setEditReceiverModalOpen] = useState(false);
    const [isSendMoneyModalOpen, setSendMoneyModalOpen] = useState(false);
    const [historyReceiverId, setHistoryReceiverId] = useState(null);
    const [selectedReceiverId, setSelectedReceiverId] = useState(null);

    const [newSenderName, setNewSenderName] = useState("");
    const [newSenderPhone, setNewSenderPhone] = useState("");
    const [isSavingSender, setIsSavingSender] = useState(false);
    const [editSenderName, setEditSenderName] = useState("");
    const [editSenderPhone, setEditSenderPhone] = useState("");
    const [addMoneyAmount, setAddMoneyAmount] = useState("");
    const [addMoneyDate, setAddMoneyDate] = useState(todayISO());

    const [newReceiverName, setNewReceiverName] = useState("");
    const [newReceiverRelation, setNewReceiverRelation] = useState(RELATIONS[0]);
    const [newReceiverPhone, setNewReceiverPhone] = useState("");
    const [newReceiverNotes, setNewReceiverNotes] = useState("");

    const [editReceiverName, setEditReceiverName] = useState("");
    const [editReceiverRelation, setEditReceiverRelation] = useState(RELATIONS[0]);
    const [editReceiverPhone, setEditReceiverPhone] = useState("");
    const [editReceiverNotes, setEditReceiverNotes] = useState("");

    const [sendMoneyAmount, setSendMoneyAmount] = useState("");
    const [sendMoneyDate, setSendMoneyDate] = useState(todayISO());
    const [sendMoneyNote, setSendMoneyNote] = useState("");
    const [sendPaymentMethod, setSendPaymentMethod] = useState("Cash");
    const [sendCategory, setSendCategory] = useState("Family");

    const normalizeIndianPhoneNumber = useCallback((value) => {
        const input = (value || "").trim();
        if (!input) return "";
        let digits = input.replace(/[^\d+]/g, "");
        if (digits.startsWith("+")) digits = digits.slice(1);
        if (digits.startsWith("0")) digits = digits.slice(1);
        if (digits.startsWith("91") && digits.length === 12) digits = digits.slice(2);
        if (!/^[6-9]\d{9}$/.test(digits)) return null;
        return `91${digits}`;
    }, []);

    const formatWhatsAppDisplayNumber = useCallback((phoneNumber) => {
        const normalized = normalizeIndianPhoneNumber(phoneNumber);
        if (!normalized) return "";
        const localNumber = normalized.slice(2);
        return `+91 ${localNumber.slice(0, 5)} ${localNumber.slice(5)}`;
    }, [normalizeIndianPhoneNumber]);

    const getStoredContacts = useCallback((storageKey) => {
        try {
            const raw = localStorage.getItem(storageKey);
            return raw ? JSON.parse(raw) : {};
        } catch {
            return {};
        }
    }, []);

    const setStoredContact = useCallback((storageKey, name, phoneNumber) => {
        const key = normalizeKey(name);
        if (!key) return;
        const contacts = getStoredContacts(storageKey);
        if (phoneNumber) contacts[key] = phoneNumber;
        else delete contacts[key];
        localStorage.setItem(storageKey, JSON.stringify(contacts));
    }, [getStoredContacts]);

    const loadAll = useCallback(async () => {
        if (!user?.uid) return;
        setLoading(true);
        try {
            const sendersQuery = query(collection(db, "users", user.uid, "senders"));
            const receiversQuery = query(collection(db, "users", user.uid, "receivers"));
            const receiverTxQuery = query(collection(db, "users", user.uid, "receiver_transactions"));

            const [sendersSnap, receiversSnap, receiverTxSnap] = await Promise.all([
                getDocs(sendersQuery),
                getDocs(receiversQuery),
                getDocs(receiverTxQuery),
            ]);

            const senderRows = [];
            sendersSnap.forEach((docSnap) => senderRows.push({ id: docSnap.id, ...docSnap.data() }));
            const filteredSenderRows = senderRows.filter((item) => !item.userId || item.userId === user.uid);

            const receiverRows = [];
            receiversSnap.forEach((docSnap) => receiverRows.push({ id: docSnap.id, ...docSnap.data() }));
            const filteredReceiverRows = receiverRows.filter((item) => !item.userId || item.userId === user.uid);

            const receiverTxRows = [];
            receiverTxSnap.forEach((docSnap) => receiverTxRows.push({ id: docSnap.id, ...docSnap.data() }));
            const filteredReceiverTxRows = receiverTxRows.filter((item) => !item.userId || item.userId === user.uid);

            setSenderEntries(filteredSenderRows);
            setReceiverEntries(filteredReceiverRows);
            setReceiverTransactions(filteredReceiverTxRows);
        } catch (error) {
            console.error("Error loading money records:", error);
            addToast?.("Failed to load records.", "error");
        } finally {
            setLoading(false);
        }
    }, [user?.uid, addToast]);

    useEffect(() => {
        loadAll();
    }, [loadAll]);

    const groupedSenders = useMemo(() => {
        const map = new Map();
        const storedContacts = getStoredContacts(SENDER_CONTACTS_STORAGE_KEY);

        senderEntries.forEach((entry) => {
            const name = (entry.name || "").trim();
            if (!name) return;
            const key = normalizeKey(name);
            if (!map.has(key)) {
                map.set(key, {
                    id: key,
                    name,
                    phoneNumber: "",
                    totalAmount: 0,
                    lastDate: "",
                    history: [],
                });
            }

            const current = map.get(key);
            const amount = Number(entry.amount) || 0;
            current.totalAmount += amount;
            current.history.push({ ...entry, amount, date: entry.date || todayISO() });

            if (entry.phoneNumber) current.phoneNumber = entry.phoneNumber;
            if (isSameDayOrLater(entry.date, current.lastDate)) current.lastDate = entry.date || current.lastDate;
            current.name = name;
        });

        const rows = Array.from(map.values()).map((sender) => {
            const fallbackPhone = storedContacts[normalizeKey(sender.name)];
            return {
                ...sender,
                phoneNumber: sender.phoneNumber || fallbackPhone || "",
                history: [...sender.history].sort((a, b) => (b.date || "").localeCompare(a.date || "")),
            };
        });

        rows.sort((a, b) => (b.lastDate || "").localeCompare(a.lastDate || ""));
        return rows;
    }, [senderEntries, getStoredContacts]);

    const groupedReceivers = useMemo(() => {
        const txByReceiver = new Map();
        receiverTransactions.forEach((tx) => {
            if (!tx.receiver_id) return;
            if (!txByReceiver.has(tx.receiver_id)) txByReceiver.set(tx.receiver_id, []);
            txByReceiver.get(tx.receiver_id).push({ ...tx, amount: Number(tx.amount) || 0 });
        });

        const storedContacts = getStoredContacts(RECEIVER_CONTACTS_STORAGE_KEY);

        const rows = receiverEntries.map((receiver) => {
            const history = txByReceiver.get(receiver.id) || [];
            const totalSent = history.reduce((sum, tx) => sum + (Number(tx.amount) || 0), Number(receiver.startingBalance) || 0);
            const lastDate = history.reduce((max, tx) => (isSameDayOrLater(tx.date, max) ? tx.date || max : max), receiver.updatedAt || receiver.createdAt || "");
            const key = normalizeKey(receiver.name);
            return {
                id: receiver.id,
                name: receiver.name || "Unnamed Receiver",
                relation: receiver.relation || "Other",
                phoneNumber: receiver.phoneNumber || storedContacts[key] || "",
                startingBalance: Number(receiver.startingBalance) || 0,
                notes: receiver.notes || "",
                createdAt: receiver.createdAt || "",
                lastDate,
                history: [...history].sort((a, b) => (b.date || "").localeCompare(a.date || "")),
                totalSent,
            };
        });

        rows.sort((a, b) => b.totalSent - a.totalSent);
        return rows;
    }, [receiverEntries, receiverTransactions, getStoredContacts]);

    const selectedSender = useMemo(() => {
        if (!selectedSenderKey) return null;
        return groupedSenders.find((sender) => normalizeKey(sender.name) === selectedSenderKey) || null;
    }, [groupedSenders, selectedSenderKey]);

    const selectedReceiver = useMemo(() => {
        if (!selectedReceiverId) return null;
        return groupedReceivers.find((receiver) => receiver.id === selectedReceiverId) || null;
    }, [groupedReceivers, selectedReceiverId]);

    const visibleSenders = useMemo(() => {
        const term = searchTerm.trim().toLowerCase();
        return groupedSenders.filter((sender) => {
            if (!term) return true;
            return (
                sender.name.toLowerCase().includes(term) ||
                (sender.phoneNumber || "").includes(term)
            );
        });
    }, [groupedSenders, searchTerm]);

    const visibleReceivers = useMemo(() => {
        const term = searchTerm.trim().toLowerCase();
        return groupedReceivers.filter((receiver) => {
            if (!term) return true;
            return (
                receiver.name.toLowerCase().includes(term) ||
                (receiver.relation || "").toLowerCase().includes(term) ||
                (receiver.phoneNumber || "").includes(term)
            );
        });
    }, [groupedReceivers, searchTerm]);

    const handleTabChange = useCallback((tab) => {
        setActiveTab(tab);
        setSearchTerm("");
    }, []);

    const handleAddSender = async (e) => {
        e.preventDefault();

        // Prevent duplicate submissions
        if (isSavingSender) return;
        setIsSavingSender(true);

        const cleanName = (newSenderName || "").trim();
        if (cleanName.length < 2) {
            addToast?.("Enter valid sender name", "error");
            setIsSavingSender(false);
            return;
        }

        const normalizedPhoneNumber = newSenderPhone.trim()
            ? normalizeIndianPhoneNumber(newSenderPhone)
            : "";

        if (newSenderPhone.trim() && !normalizedPhoneNumber) {
            addToast?.("Enter a valid Indian WhatsApp number", "error");
            setIsSavingSender(false);
            return;
        }

        // Re-check against existing entries to avoid race-created duplicates
        const senderExists = Array.isArray(senderEntries) && senderEntries.some(
            (s) => (s.name || "").trim().toLowerCase() === cleanName.toLowerCase()
        );

        if (senderExists) {
            addToast?.("Sender already exists", "error");
            setIsSavingSender(false);
            return;
        }

        try {
            const createdAt = Date.now();
            const docData = {
                userId: user.uid,
                id: `sender_${createdAt}`,
                name: cleanName,
                type: "sender",
                amount: 0,
                date: todayISO(),
                createdAt,
                phoneNumber: normalizedPhoneNumber || "",
            };

            const savedId = await saveToFirebase(user.uid, "senders", docData);
            const rawEntry = { id: savedId || docData.id, ...docData };

            // Only add the single created record once.
            setSenderEntries((prev) => [...prev, rawEntry]);
            setStoredContact(SENDER_CONTACTS_STORAGE_KEY, cleanName, normalizedPhoneNumber || "");

            setNewSenderName("");
            setNewSenderPhone("");
            setAddSenderModalOpen(false);
            addToast?.("Sender added successfully", "success");
        } catch (error) {
            console.error("Error adding sender:", error);
            addToast?.("Failed to add sender", "error");
        } finally {
            setIsSavingSender(false);
        }
    };

    const handleAddMoneySender = async (e) => {
        e.preventDefault();

        const amt = Number.parseFloat(addMoneyAmount);
        if (Number.isNaN(amt) || amt <= 0) {
            addToast?.("Enter a valid amount", "error");
            return;
        }

        if (!selectedSender) return;

        try {
            const newDate = addMoneyDate || todayISO();
            const createdAt = Date.now();

            const savedId = await saveToFirebase(user.uid, "senders", {
                userId: user.uid,
                id: `sender_${createdAt}`,
                name: selectedSender.name,
                type: "sender",
                amount: amt,
                date: newDate,
                createdAt,
                phoneNumber: selectedSender.phoneNumber || "",
            });

            const rawEntry = {
                id: savedId || `sender_${createdAt}`,
                userId: user.uid,
                name: selectedSender.name,
                type: "sender",
                amount: amt,
                date: newDate,
                createdAt,
                phoneNumber: selectedSender.phoneNumber || "",
            };

            setSenderEntries((prev) => [...prev, rawEntry]);
            setAddMoneyAmount("");
            setAddMoneyModalOpen(false);
            await updateGlobalBalance?.();
            addToast?.("Money added successfully", "success");
        } catch (error) {
            console.error("Error adding money:", error);
            addToast?.("Failed to add money", "error");
        }
    };

    const handleEditSender = async (e) => {
        e.preventDefault();

        if (!selectedSender) return;

        const newName = (editSenderName || "").trim();
        if (!newName) {
            addToast?.("Enter valid sender name", "error");
            return;
        }

        const rawPhone = (editSenderPhone || "").trim();
        const normalizedPhoneNumber = rawPhone ? normalizeIndianPhoneNumber(rawPhone) : "";
        if (rawPhone && !normalizedPhoneNumber) {
            addToast?.("Enter a valid Indian WhatsApp number", "error");
            return;
        }

        const oldKey = normalizeKey(selectedSender.name);
        const newKey = normalizeKey(newName);

        try {
            const matchingRows = senderEntries.filter((row) => normalizeKey(row.name) === oldKey);
            const updates = matchingRows.map((row) =>
                updateDoc(doc(db, "users", user.uid, "senders", row.id), {
                    name: newName,
                    phoneNumber: normalizedPhoneNumber || "",
                })
            );
            await Promise.all(updates);

            setSenderEntries((prev) =>
                prev.map((row) =>
                    normalizeKey(row.name) === oldKey
                        ? { ...row, name: newName, phoneNumber: normalizedPhoneNumber || "" }
                        : row
                )
            );

            if (oldKey !== newKey) setStoredContact(SENDER_CONTACTS_STORAGE_KEY, selectedSender.name, "");
            setStoredContact(SENDER_CONTACTS_STORAGE_KEY, newName, normalizedPhoneNumber || "");

            setEditSenderModalOpen(false);
            addToast?.("Sender renamed successfully", "success");
        } catch (error) {
            console.error("Error renaming sender:", error);
            addToast?.("Failed to rename sender", "error");
        }
    };

    const handleCreateReceiver = async (e) => {
        e.preventDefault();

        const name = (newReceiverName || "").trim();
        if (!name) {
            addToast?.("Receiver name is required", "error");
            return;
        }

        const normalizedPhone = newReceiverPhone.trim()
            ? normalizeIndianPhoneNumber(newReceiverPhone)
            : "";

        if (newReceiverPhone.trim() && !normalizedPhone) {
            addToast?.("Enter a valid Indian phone number", "error");
            return;
        }

        try {
            const now = new Date().toISOString();
            const receiverDoc = await addDoc(collection(db, "users", user.uid, "receivers"), {
                name,
                relation: newReceiverRelation,
                phoneNumber: normalizedPhone || "",
                startingBalance: 0,
                notes: newReceiverNotes,
                createdAt: now,
                updatedAt: now,
                userId: user.uid,
            });

            const rawReceiver = {
                id: receiverDoc.id,
                name,
                relation: newReceiverRelation,
                phoneNumber: normalizedPhone || "",
                startingBalance: 0,
                notes: newReceiverNotes,
                createdAt: now,
                updatedAt: now,
                userId: user.uid,
            };

            setReceiverEntries((prev) => [...prev, rawReceiver]);
            setStoredContact(RECEIVER_CONTACTS_STORAGE_KEY, name, normalizedPhone || "");

            setNewReceiverName("");
            setNewReceiverPhone("");
            setNewReceiverNotes("");
            setAddReceiverModalOpen(false);
            addToast?.("Receiver added successfully", "success");
        } catch (error) {
            console.error("Error adding receiver:", error);
            addToast?.("Failed to add receiver", "error");
        }
    };

    const handleEditReceiver = async (e) => {
        e.preventDefault();
        if (!selectedReceiver) return;

        const name = (editReceiverName || "").trim();
        if (!name) {
            addToast?.("Receiver name is required", "error");
            return;
        }

        const normalizedPhone = editReceiverPhone.trim()
            ? normalizeIndianPhoneNumber(editReceiverPhone)
            : "";

        if (editReceiverPhone.trim() && !normalizedPhone) {
            addToast?.("Enter a valid Indian phone number", "error");
            return;
        }

        try {
            await updateDoc(doc(db, "users", user.uid, "receivers", selectedReceiver.id), {
                name,
                relation: editReceiverRelation,
                phoneNumber: normalizedPhone || "",
                notes: editReceiverNotes,
                updatedAt: new Date().toISOString(),
            });

            setReceiverEntries((prev) =>
                prev.map((receiver) =>
                    receiver.id === selectedReceiver.id
                        ? {
                            ...receiver,
                            name,
                            relation: editReceiverRelation,
                            phoneNumber: normalizedPhone || "",
                            notes: editReceiverNotes,
                            updatedAt: new Date().toISOString(),
                        }
                        : receiver
                )
            );

            setStoredContact(RECEIVER_CONTACTS_STORAGE_KEY, name, normalizedPhone || "");
            setEditReceiverModalOpen(false);
            addToast?.("Receiver updated", "success");
        } catch (error) {
            console.error("Error editing receiver:", error);
            addToast?.("Failed to update receiver", "error");
        }
    };

    const handleSendMoneyReceiver = async (e) => {
        e.preventDefault();
        if (!selectedReceiver) return;

        const amount = Number.parseFloat(sendMoneyAmount);
        if (Number.isNaN(amount) || amount <= 0) {
            addToast?.("Enter a valid amount", "error");
            return;
        }

        try {
            const now = new Date().toISOString();
            const txDoc = await addDoc(collection(db, "users", user.uid, "receiver_transactions"), {
                receiver_id: selectedReceiver.id,
                amount,
                note: sendMoneyNote,
                payment_method: sendPaymentMethod,
                category: sendCategory,
                date: sendMoneyDate || todayISO(),
                createdAt: now,
                userId: user.uid,
            });

            const rawTx = {
                id: txDoc.id,
                receiver_id: selectedReceiver.id,
                amount,
                note: sendMoneyNote,
                payment_method: sendPaymentMethod,
                category: sendCategory,
                date: sendMoneyDate || todayISO(),
                createdAt: now,
                userId: user.uid,
            };

            setReceiverTransactions((prev) => [...prev, rawTx]);
            setSendMoneyAmount("");
            setSendMoneyNote("");
            setSendMoneyModalOpen(false);
            await updateGlobalBalance?.();
            addToast?.("Money sent successfully", "success");
        } catch (error) {
            console.error("Error sending money:", error);
            addToast?.("Unable to record payment", "error");
        }
    };

    const handleWhatsAppShare = (receiver) => {
        if (!receiver?.phoneNumber) {
            addToast?.("No WhatsApp number saved for this receiver", "error");
            return;
        }

        const lastTx = [...(receiver.history || [])].sort((a, b) => (b.date || "").localeCompare(a.date || ""))[0];
        const amountText = formatMoney(lastTx?.amount || receiver.totalSent || 0);
        const dateText = lastTx?.date ? formatDateDisplay(lastTx.date) : formatDateDisplay(todayISO());
        const method = lastTx?.payment_method || "UPI";
        const message = `Hello ${receiver.name || "there"},\nI have sent you ${amountText}.\n\nDate: ${dateText}\nPayment Method: ${method}\n\nGenerated by Expense Book`;
        window.open(`https://wa.me/${receiver.phoneNumber}?text=${encodeURIComponent(message)}`, "_blank");
    };

    if (loading) {
        return (
            <div className="section" style={{ display: "flex", justifyContent: "center", padding: "4rem" }}>
                <p>Loading records...</p>
            </div>
        );
    }

    return (
        <section className="section" style={{ animation: "fadeIn 0.3s ease-out" }}>
            <header className="card__header-row" style={{ marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem", alignItems: "center" }}>
                <h2 className="section__title" style={{ margin: 0 }}>Senders & Receivers</h2>

                <div style={{ position: "relative", flex: "1 1 300px", minWidth: "200px" }}>
                    <input
                        type="search"
                        placeholder={activeTab === "senders" ? "Search sender name or phone..." : "Search receiver, relation or phone..."}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{ width: "100%", paddingLeft: "2.5rem" }}
                    />
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }}>
                        <circle cx="11" cy="11" r="8" />
                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                </div>

                <button
                    type="button"
                    className="btn btn--primary"
                    onClick={() => (activeTab === "senders" ? setAddSenderModalOpen(true) : setAddReceiverModalOpen(true))}
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: "6px" }}>
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    {activeTab === "senders" ? "Add Sender" : "Add Receiver"}
                </button>
            </header>

            <div className="tabs-container" style={{ marginBottom: "2rem" }}>
                <div className="tabs-switcher">
                    <button
                        type="button"
                        className={`tab-btn ${activeTab === "senders" ? "is-active" : ""}`}
                        onClick={() => handleTabChange("senders")}
                    >
                        Senders
                    </button>
                    <button
                        type="button"
                        className={`tab-btn ${activeTab === "receivers" ? "is-active" : ""}`}
                        onClick={() => handleTabChange("receivers")}
                    >
                        Receivers
                    </button>
                    <div className={`tab-indicator ${activeTab}`} />
                </div>
            </div>

            <div className="tab-content" key={activeTab} style={{ animation: "slideUp 0.4s ease-out" }}>
                {activeTab === "senders" ? (
                    <>
                        {visibleSenders.length === 0 ? (
                            <div className="card empty-state">
                                <div className="empty-state__icon">
                                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                        <circle cx="9" cy="7" r="4" />
                                        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                                        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                                    </svg>
                                </div>
                                <h3>{searchTerm ? "No senders match your search" : "No senders added yet"}</h3>
                                <p>Add a sender to start tracking received money.</p>
                                {!searchTerm && (
                                    <button className="btn btn--primary" style={{ marginTop: "1rem" }} onClick={() => setAddSenderModalOpen(true)}>
                                        + Add Sender
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div className="records-grid">
                                {visibleSenders.map((sender) => (
                                    <article key={sender.id} className="card record-card">
                                        <div className="record-card__header">
                                            <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                                                <div className="record-avatar sender">{getInitials(sender.name)}</div>
                                                <div>
                                                    <h3 className="record-name">{sender.name}</h3>
                                                    <p className="record-subtitle">Money Received</p>
                                                </div>
                                            </div>
                                            <div className="record-actions">
                                                <button
                                                    type="button"
                                                    className="icon-btn whatsapp"
                                                    onClick={() => window.open(`https://wa.me/${sender.phoneNumber || ""}`, "_blank")}
                                                    title="Chat on WhatsApp"
                                                >
                                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                                                        <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.771-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.984-.365-1.739-.757-2.874-2.513-2.96-2.63-.086-.116-.694-.926-.694-1.769 0-.843.433-1.258.589-1.428.156-.171.339-.214.453-.214.114 0 .228.003.326.005.106.002.25.026.39.358.144.346.491 1.197.534 1.282.043.085.071.184.014.3-.057.117-.085.189-.171.29-.086.101-.186.225-.266.302-.09.085-.184.178-.079.358.105.18.467.771.999 1.247.687.614 1.265.805 1.444.894.178.09.285.074.392-.05.106-.124.453-.527.575-.706.121-.179.243-.15.41-.09.167.06.1 .482.1.482z" />
                                                    </svg>
                                                </button>
                                                <button
                                                    type="button"
                                                    className="icon-btn edit"
                                                    onClick={() => {
                                                        setSelectedSenderKey(normalizeKey(sender.name));
                                                        setEditSenderName(sender.name);
                                                        setEditSenderPhone(sender.phoneNumber || "");
                                                        setEditSenderModalOpen(true);
                                                    }}
                                                >
                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </div>

                                        <div className="record-card__body">
                                            <div className="record-amount credit">
                                                <p className="label">Total Received</p>
                                                <p className="value">{formatMoney(sender.totalAmount)}</p>
                                            </div>
                                            <div className="record-info">
                                                <span>
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <rect x="3" y="4" width="18" height="18" rx="2" />
                                                        <path d="M16 2v4M8 2v4M3 10h18" />
                                                    </svg>
                                                    Last: {sender.lastDate ? formatDateDisplay(sender.lastDate) : "N/A"}
                                                </span>
                                                {sender.phoneNumber ? (
                                                    <span>
                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                                                        </svg>
                                                        {formatWhatsAppDisplayNumber(sender.phoneNumber)}
                                                    </span>
                                                ) : null}
                                            </div>
                                        </div>

                                        <div className="record-card__footer">
                                            <button type="button" className="btn btn--secondary btn--sm" onClick={() => setHistorySenderKey(normalizeKey(sender.name))}>
                                                History
                                            </button>
                                            <button
                                                type="button"
                                                className="btn btn--primary btn--sm"
                                                onClick={() => {
                                                    setSelectedSenderKey(normalizeKey(sender.name));
                                                    setAddMoneyDate(todayISO());
                                                    setAddMoneyAmount("");
                                                    setAddMoneyModalOpen(true);
                                                }}
                                            >
                                                Add Money
                                            </button>
                                        </div>
                                    </article>
                                ))}
                            </div>
                        )}
                    </>
                ) : (
                    <>
                        {visibleReceivers.length === 0 ? (
                            <div className="card empty-state">
                                <div className="empty-state__icon">
                                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                        <circle cx="9" cy="7" r="4" />
                                    </svg>
                                </div>
                                <h3>{searchTerm ? "No receivers match your search" : "No receivers added yet"}</h3>
                                <p>Add a receiver to start tracking money you sent.</p>
                                {!searchTerm && (
                                    <button className="btn btn--primary" style={{ marginTop: "1rem" }} onClick={() => setAddReceiverModalOpen(true)}>
                                        + Add Receiver
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div className="records-grid">
                                {visibleReceivers.map((receiver) => (
                                    <article key={receiver.id} className="card record-card">
                                        <div className="record-card__header">
                                            <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                                                <div className="record-avatar receiver">{getInitials(receiver.name)}</div>
                                                <div>
                                                    <h3 className="record-name">{receiver.name}</h3>
                                                    <p className="record-subtitle">{receiver.relation}</p>
                                                </div>
                                            </div>
                                            <div className="record-actions">
                                                <button
                                                    type="button"
                                                    className="icon-btn whatsapp"
                                                    onClick={() => handleWhatsAppShare(receiver)}
                                                    title="Share on WhatsApp"
                                                >
                                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                                                        <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.771-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.984-.365-1.739-.757-2.874-2.513-2.96-2.63-.086-.116-.694-.926-.694-1.769 0-.843.433-1.258.589-1.428.156-.171.339-.214.453-.214.114 0 .228.003.326.005.106.002.25.026.39.358.144.346.491 1.197.534 1.282.043.085.071.184.014.3-.057.117-.085.189-.171.29-.086.101-.186.225-.266.302-.09.085-.184.178-.079.358.105.18.467.771.999 1.247.687.614 1.265.805 1.444.894.178.09.285.074.392-.05.106-.124.453-.527.575-.706.121-.179.243-.15.41-.09.167.06.1 .482.1.482z" />
                                                    </svg>
                                                </button>
                                                <button
                                                    type="button"
                                                    className="icon-btn edit"
                                                    onClick={() => {
                                                        setSelectedReceiverId(receiver.id);
                                                        setEditReceiverName(receiver.name);
                                                        setEditReceiverRelation(receiver.relation || RELATIONS[0]);
                                                        setEditReceiverPhone(receiver.phoneNumber || "");
                                                        setEditReceiverNotes(receiver.notes || "");
                                                        setEditReceiverModalOpen(true);
                                                    }}
                                                >
                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </div>

                                        <div className="record-card__body">
                                            <div className="record-amount debit">
                                                <p className="label">Total Sent</p>
                                                <p className="value">{formatMoney(receiver.totalSent)}</p>
                                            </div>
                                            <div className="record-info">
                                                <span>
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <rect x="3" y="4" width="18" height="18" rx="2" />
                                                        <path d="M16 2v4M8 2v4M3 10h18" />
                                                    </svg>
                                                    Last: {receiver.lastDate ? formatDateDisplay(receiver.lastDate) : "N/A"}
                                                </span>
                                                {receiver.phoneNumber ? (
                                                    <span>
                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                                                        </svg>
                                                        {formatWhatsAppDisplayNumber(receiver.phoneNumber)}
                                                    </span>
                                                ) : null}
                                            </div>
                                        </div>

                                        <div className="record-card__footer">
                                            <button type="button" className="btn btn--secondary btn--sm" onClick={() => setHistoryReceiverId(receiver.id)}>
                                                History
                                            </button>
                                            <button
                                                type="button"
                                                className="btn btn--primary btn--sm"
                                                onClick={() => {
                                                    setSelectedReceiverId(receiver.id);
                                                    setSendMoneyDate(todayISO());
                                                    setSendMoneyAmount("");
                                                    setSendMoneyNote("");
                                                    setSendPaymentMethod("Cash");
                                                    setSendCategory("Family");
                                                    setSendMoneyModalOpen(true);
                                                }}
                                            >
                                                Send Money
                                            </button>
                                        </div>
                                    </article>
                                ))}
                            </div>
                        )}
                    </>
                )}
            </div>

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
                    <button type="submit" className="btn btn--primary btn--block" disabled={isSavingSender} aria-busy={isSavingSender}>
                        {isSavingSender ? "Creating..." : "Create Sender"}
                    </button>
                </form>
            </Modal>

            <Modal isOpen={isEditSenderModalOpen} onClose={() => setEditSenderModalOpen(false)} title="Edit Sender">
                <form onSubmit={handleEditSender} className="expense-form">
                    <div className="form-row">
                        <label htmlFor="editSenderName">Sender Name</label>
                        <input
                            type="text"
                            id="editSenderName"
                            required
                            value={editSenderName}
                            onChange={(e) => setEditSenderName(e.target.value)}
                        />
                    </div>
                    <div className="form-row">
                        <label htmlFor="editSenderPhone">WhatsApp Number (Optional)</label>
                        <input
                            type="tel"
                            id="editSenderPhone"
                            value={editSenderPhone}
                            onChange={(e) => setEditSenderPhone(e.target.value)}
                        />
                    </div>
                    <button type="submit" className="btn btn--primary btn--block">Save Changes</button>
                </form>
            </Modal>

            <Modal isOpen={isAddMoneyModalOpen} onClose={() => setAddMoneyModalOpen(false)} title={`Add Money from ${selectedSender?.name || "Sender"}`}>
                <form onSubmit={handleAddMoneySender} className="expense-form">
                    <div className="form-row">
                        <label htmlFor="addMoneyDate">Date</label>
                        <input
                            type="date"
                            id="addMoneyDate"
                            required
                            value={addMoneyDate}
                            onChange={(e) => setAddMoneyDate(e.target.value)}
                        />
                    </div>
                    <div className="form-row">
                        <label htmlFor="addMoneyAmount">Amount</label>
                        <div className="input-group">
                            <span className="input-prefix">Rs</span>
                            <input
                                type="number"
                                id="addMoneyAmount"
                                min="0"
                                step="0.01"
                                required
                                placeholder="0.00"
                                value={addMoneyAmount}
                                onChange={(e) => setAddMoneyAmount(e.target.value)}
                            />
                        </div>
                    </div>
                    <button type="submit" className="btn btn--primary btn--block">Add Money</button>
                </form>
            </Modal>

            <Modal isOpen={!!historySenderKey} onClose={() => setHistorySenderKey(null)} title={`${selectedSender?.name || "Sender"}'s History`}>
                <ul className="expense-list" style={{ maxHeight: "400px", overflowY: "auto" }}>
                    {selectedSender?.history?.length ? (
                        [...selectedSender.history].sort((a, b) => (b.date || "").localeCompare(a.date || "")).map((tx, idx) => (
                            <li key={tx.id || idx} className="expense-item">
                                <span className="expense-item__name">
                                    Received
                                    <span className="expense-item__date">{formatDateDisplay(tx.date)}</span>
                                </span>
                                <span className="expense-item__amount amount--credit">+{formatMoney(tx.amount)}</span>
                            </li>
                        ))
                    ) : (
                        <li className="empty-state">No transaction history yet.</li>
                    )}
                </ul>
            </Modal>

            <Modal isOpen={isAddReceiverModalOpen} onClose={() => setAddReceiverModalOpen(false)} title="Add Receiver">
                <form onSubmit={handleCreateReceiver} className="expense-form">
                    <div className="form-row">
                        <label htmlFor="receiverName">Receiver Name</label>
                        <input
                            id="receiverName"
                            type="text"
                            required
                            placeholder="e.g. Mother"
                            value={newReceiverName}
                            onChange={(e) => setNewReceiverName(e.target.value)}
                        />
                    </div>
                    <div className="form-row">
                        <label htmlFor="receiverRelation">Relation</label>
                        <select
                            id="receiverRelation"
                            value={newReceiverRelation}
                            onChange={(e) => setNewReceiverRelation(e.target.value)}
                        >
                            {RELATIONS.map((r) => (
                                <option key={r} value={r}>{r}</option>
                            ))}
                        </select>
                    </div>
                    <div className="form-row">
                        <label htmlFor="receiverPhone">Phone Number</label>
                        <input
                            id="receiverPhone"
                            type="tel"
                            placeholder="e.g. 9876543210"
                            value={newReceiverPhone}
                            onChange={(e) => setNewReceiverPhone(e.target.value)}
                        />
                    </div>
                    <div className="form-row">
                        <label htmlFor="receiverNotes">Notes</label>
                        <textarea
                            id="receiverNotes"
                            rows="3"
                            placeholder="Optional details"
                            value={newReceiverNotes}
                            onChange={(e) => setNewReceiverNotes(e.target.value)}
                        />
                    </div>
                    <button type="submit" className="btn btn--primary btn--block">Create Receiver</button>
                </form>
            </Modal>

            <Modal isOpen={isEditReceiverModalOpen} onClose={() => setEditReceiverModalOpen(false)} title="Edit Receiver">
                <form onSubmit={handleEditReceiver} className="expense-form">
                    <div className="form-row">
                        <label htmlFor="editReceiverName">Receiver Name</label>
                        <input
                            id="editReceiverName"
                            type="text"
                            required
                            value={editReceiverName}
                            onChange={(e) => setEditReceiverName(e.target.value)}
                        />
                    </div>
                    <div className="form-row">
                        <label htmlFor="editReceiverRelation">Relation</label>
                        <select
                            id="editReceiverRelation"
                            value={editReceiverRelation}
                            onChange={(e) => setEditReceiverRelation(e.target.value)}
                        >
                            {RELATIONS.map((r) => (
                                <option key={r} value={r}>{r}</option>
                            ))}
                        </select>
                    </div>
                    <div className="form-row">
                        <label htmlFor="editReceiverPhone">Phone Number</label>
                        <input
                            id="editReceiverPhone"
                            type="tel"
                            value={editReceiverPhone}
                            onChange={(e) => setEditReceiverPhone(e.target.value)}
                        />
                    </div>
                    <div className="form-row">
                        <label htmlFor="editReceiverNotes">Notes</label>
                        <textarea
                            id="editReceiverNotes"
                            rows="3"
                            value={editReceiverNotes}
                            onChange={(e) => setEditReceiverNotes(e.target.value)}
                        />
                    </div>
                    <button type="submit" className="btn btn--primary btn--block">Save Changes</button>
                </form>
            </Modal>

            <Modal isOpen={isSendMoneyModalOpen} onClose={() => setSendMoneyModalOpen(false)} title={`Send Money to ${selectedReceiver?.name || "Receiver"}`}>
                <form onSubmit={handleSendMoneyReceiver} className="expense-form">
                    <div className="form-row">
                        <label htmlFor="sendMoneyDate">Date</label>
                        <input
                            id="sendMoneyDate"
                            type="date"
                            required
                            value={sendMoneyDate}
                            onChange={(e) => setSendMoneyDate(e.target.value)}
                        />
                    </div>
                    <div className="form-row">
                        <label htmlFor="sendMoneyAmount">Amount</label>
                        <div className="input-group">
                            <span className="input-prefix">Rs</span>
                            <input
                                id="sendMoneyAmount"
                                type="number"
                                min="0"
                                step="0.01"
                                required
                                placeholder="0.00"
                                value={sendMoneyAmount}
                                onChange={(e) => setSendMoneyAmount(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="form-row">
                        <label htmlFor="sendMoneyNote">Note</label>
                        <textarea
                            id="sendMoneyNote"
                            rows="3"
                            placeholder="Reason for payment"
                            value={sendMoneyNote}
                            onChange={(e) => setSendMoneyNote(e.target.value)}
                        />
                    </div>
                    <div className="form-row">
                        <label htmlFor="paymentMethod">Payment Method</label>
                        <select id="paymentMethod" value={sendPaymentMethod} onChange={(e) => setSendPaymentMethod(e.target.value)}>
                            <option>Cash</option>
                            <option>UPI</option>
                            <option>Bank Transfer</option>
                        </select>
                    </div>
                    <div className="form-row">
                        <label htmlFor="sendCategory">Category</label>
                        <select id="sendCategory" value={sendCategory} onChange={(e) => setSendCategory(e.target.value)}>
                            <option>Family</option>
                            <option>Personal</option>
                            <option>Emergency</option>
                            <option>Education</option>
                            <option>Other</option>
                        </select>
                    </div>
                    <button type="submit" className="btn btn--primary btn--block">Send Money</button>
                </form>
            </Modal>

            <Modal isOpen={!!historyReceiverId} onClose={() => setHistoryReceiverId(null)} title={`${groupedReceivers.find((r) => r.id === historyReceiverId)?.name || "Receiver"}'s History`}>
                <ul className="expense-list" style={{ maxHeight: "400px", overflowY: "auto" }}>
                    {(() => {
                        const receiver = groupedReceivers.find((r) => r.id === historyReceiverId);
                        const history = receiver?.history || [];
                        if (history.length === 0) {
                            return <li className="empty-state">No transaction history yet.</li>;
                        }
                        return [...history]
                            .sort((a, b) => (b.date || "").localeCompare(a.date || ""))
                            .map((tx, idx) => (
                                <li key={tx.id || idx} className="expense-item">
                                    <span className="expense-item__name">
                                        Sent
                                        <span className="expense-item__date">{formatDateDisplay(tx.date)}</span>
                                    </span>
                                    <span className="expense-item__amount amount--debit">-{formatMoney(tx.amount)}</span>
                                </li>
                            ));
                    })()}
                </ul>
            </Modal>

            <style>{`
        .tabs-container {
          display: flex;
          justify-content: center;
          width: 100%;
        }
        .tabs-switcher {
          display: flex;
          position: relative;
          background: var(--surface-light, #f8fafc);
          padding: 4px;
          border-radius: 12px;
          border: 1px solid var(--border);
          gap: 4px;
        }
        .tab-btn {
          padding: 10px 32px;
          border-radius: 8px;
          border: none;
          background: transparent;
          color: var(--text-muted);
          font-weight: 600;
          cursor: pointer;
          position: relative;
          z-index: 1;
          transition: color 0.3s ease;
        }
        .tab-btn.is-active {
          color: var(--primary);
        }
        .tab-indicator {
          position: absolute;
          top: 4px;
          left: 4px;
          height: calc(100% - 8px);
          width: calc(50% - 4px);
          background: white;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.05);
          transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .tab-indicator.receivers {
          transform: translateX(100%);
        }
        .icon-btn.whatsapp {
          background: #25D366;
          color: white;
          border: none;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s ease;
          box-shadow: 0 2px 4px rgba(37, 211, 102, 0.2);
        }
        .icon-btn.whatsapp:hover {
          background: #128C7E;
          transform: scale(1.1);
          box-shadow: 0 4px 8px rgba(37, 211, 102, 0.3);
        }
        .icon-btn.whatsapp svg {
          filter: drop-shadow(0 1px 1px rgba(0,0,0,0.1));
        }
        .records-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 1.5rem;
        }
        .record-card {
          display: flex;
          flex-direction: column;
          padding: 1.5rem;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .record-card:hover {
          transform: translateY(-4px);
          box-shadow: var(--shadow-lg);
        }
        .record-card__header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 1.25rem;
        }
        .record-avatar {
          width: 48px;
          height: 48px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 1.1rem;
          color: white;
        }
        .record-avatar.sender { background: var(--primary); }
        .record-avatar.receiver { background: #9b59b6; }
        .record-name { margin: 0; font-size: 1.15rem; font-weight: 600; }
        .record-subtitle { margin: 2px 0 0; color: var(--text-muted); font-size: 0.9rem; }
        .record-actions { display: flex; gap: 0.5rem; }
        .icon-btn {
          width: 34px;
          height: 34px;
          border-radius: 8px;
          border: 1px solid var(--border);
          background: white;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: var(--text-muted);
          transition: all 0.2s;
        }
        .icon-btn:hover { background: var(--border); color: var(--text); }
        .icon-btn.whatsapp:hover { color: #25D366; border-color: #25D366; }
        .record-card__body { flex: 1; margin-bottom: 1.25rem; }
        .record-amount { margin-bottom: 1rem; }
        .record-amount .label { color: var(--text-muted); font-size: 0.85rem; margin-bottom: 4px; }
        .record-amount .value { font-size: 1.6rem; font-weight: 700; margin: 0; }
        .record-amount.credit .value { color: var(--success, #2ecc71); }
        .record-amount.debit .value { color: var(--danger, #e74c3c); }
        .record-info { display: flex; flex-direction: column; gap: 6px; color: var(--text-muted); font-size: 0.85rem; }
        .record-info span { display: flex; align-items: center; gap: 6px; }
        .record-card__footer {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.75rem;
          border-top: 1px solid var(--border);
          margin-top: auto;
          padding-top: 1rem;
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
        </section>
    );
}
