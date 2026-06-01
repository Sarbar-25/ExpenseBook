import React, { useState, useEffect, useMemo } from "react";
import { collection, query, getDocs, where } from "firebase/firestore";
import { db } from "./firebase";
import { saveToFirebase, addDocToFirebase, updateInFirebase, deleteFromFirebase, formatMoney, formatDateDisplay, todayISO } from "./utils";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import ExpenseInsights from "./components/ExpenseInsights.jsx";

export default function LendBorrowPage({ user, addToast, requestConfirm, updateGlobalBalance }) {
  const CONTACTS_STORAGE_KEY = "expensebook_person_whatsapp_contacts";

  const [activeTab, setActiveTab] = useState("lend"); // "lend" or "borrow"
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);

  // Form states
  const [editingId, setEditingId] = useState(null);
  const [personName, setPersonName] = useState("");
  const [personPhone, setPersonPhone] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayISO());
  const [note, setNote] = useState("");

  // Repayment Modal states
  const [repayModalOpen, setRepayModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [repayAmount, setRepayAmount] = useState("");
  const [repayDate, setRepayDate] = useState(todayISO());
  const [repayNote, setRepayNote] = useState("");

  // Search/Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [allRecordsModalOpen, setAllRecordsModalOpen] = useState(false);
  const [personSearch, setPersonSearch] = useState("");

  // Ledger states
  const [ledgerModalOpen, setLedgerModalOpen] = useState(false);
  const [selectedLedgerSummary, setSelectedLedgerSummary] = useState(null);
  const [whatsAppModalMessage, setWhatsAppModalMessage] = useState("");

  // Bulk Repayment Modal states
  const [bulkRepayModalOpen, setBulkRepayModalOpen] = useState(false);
  const [bulkRepayAmount, setBulkRepayAmount] = useState("");
  const [bulkRepayDate, setBulkRepayDate] = useState(todayISO());
  const [bulkRepayNote, setBulkRepayNote] = useState("");

  // Received Money Modal states (new feature)
  const [receivedMoneyModalOpen, setReceivedMoneyModalOpen] = useState(false);
  const [receivedMoneyAmount, setReceivedMoneyAmount] = useState("");
  const [receivedMoneyType, setReceivedMoneyType] = useState("Received");
  const [receivedMoneyDate, setReceivedMoneyDate] = useState(todayISO());
  const [receivedMoneyNote, setReceivedMoneyNote] = useState("");

  const getStoredWhatsAppContacts = () => {
    try {
      const raw = localStorage.getItem(CONTACTS_STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (error) {
      return {};
    }
  };

  const setStoredWhatsAppContact = (name, phoneNumber) => {
    const key = (name || "").trim().toLowerCase();
    if (!key) return;

    const contacts = getStoredWhatsAppContacts();
    if (phoneNumber) {
      contacts[key] = phoneNumber;
    } else {
      delete contacts[key];
    }
    localStorage.setItem(CONTACTS_STORAGE_KEY, JSON.stringify(contacts));
  };

  const getStoredWhatsAppContact = (name) => {
    const key = (name || "").trim().toLowerCase();
    if (!key) return "";
    const contacts = getStoredWhatsAppContacts();
    return contacts[key] || "";
  };

  const normalizeIndianPhoneNumber = (value) => {
    const input = (value || "").trim();
    if (!input) return "";

    let digits = input.replace(/[^\d+]/g, "");
    if (digits.startsWith("+")) {
      digits = digits.slice(1);
    }
    if (digits.startsWith("0")) {
      digits = digits.slice(1);
    }
    if (digits.startsWith("91") && digits.length === 12) {
      digits = digits.slice(2);
    }
    if (!/^[6-9]\d{9}$/.test(digits)) {
      return null;
    }
    return `91${digits}`;
  };

  const formatWhatsAppDisplayNumber = (phoneNumber) => {
    const normalized = normalizeIndianPhoneNumber(phoneNumber);
    if (!normalized) return "";
    const localNumber = normalized.slice(2);
    return `+91 ${localNumber.slice(0, 5)} ${localNumber.slice(5)}`;
  };

  const syncWhatsAppContactInRecords = async (name, phoneNumber) => {
    const normalizedName = (name || "").trim();
    if (!user || !normalizedName) return;

    const existingDocs = await getDocs(collection(db, "users", user.uid, "lendBorrow"));

    const updates = [];
    existingDocs.forEach((document) => {
      const data = { id: document.id, ...document.data() };
      if (data.userId && data.userId !== user.uid) return;
      const personName = (document.data()?.personName || "").trim();
      if (personName.toLowerCase() !== normalizedName.toLowerCase()) return;
      updates.push(updateInFirebase(user.uid, "lendBorrow", document.id, { phoneNumber }));
    });
    await Promise.all(updates);
  };

  // WhatsApp share states
  const [whatsAppShareLoading, setWhatsAppShareLoading] = useState(false);
  const [whatsAppCopied, setWhatsAppCopied] = useState(false);

  const loadRecords = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const snapshot = await getDocs(collection(db, "users", user.uid, "lendBorrow"));
      const data = [];
      snapshot.forEach((doc) => {
        const item = { id: doc.id, ...doc.data() };
        if (!item.userId || item.userId === user.uid) data.push(item);
      });
      data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setRecords(data);
    } catch (err) {
      console.error("Error loading lend/borrow records", err);
      addToast("Failed to load records", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecords();
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!personName || !amount) return;

    const trimmedName = personName.trim();
    const rawPhoneInput = personPhone.trim();
    const normalizedPhoneNumber = rawPhoneInput
      ? normalizeIndianPhoneNumber(rawPhoneInput)
      : (editingId ? "" : getStoredWhatsAppContact(trimmedName));

    if (rawPhoneInput && !normalizedPhoneNumber) {
      addToast("Enter a valid Indian WhatsApp number", "error");
      return;
    }

    const data = {
      type: activeTab,
      personName: trimmedName,
      phoneNumber: normalizedPhoneNumber || "",
      amount: parseFloat(amount),
      date: date || todayISO(),
      note: note.trim(),
      createdAt: new Date().toISOString()
    };

    try {
      const existingRecord = editingId ? records.find(r => r.id === editingId) : null;

      if (editingId) {
        await updateInFirebase(user.uid, "lendBorrow", editingId, data);

        if (existingRecord && existingRecord.creationTxId) {
          await updateInFirebase(user.uid, "transactions", existingRecord.creationTxId, {
            name: activeTab === 'lend' ? `Lent money to ${trimmedName}` : `Borrowed money from ${trimmedName}`,
            type: activeTab === 'lend' ? "Debit" : "Credit",
            amount: parseFloat(amount),
            date: date || todayISO()
          });
        }
        if (existingRecord && existingRecord.repaymentTxId) {
          await updateInFirebase(user.uid, "transactions", existingRecord.repaymentTxId, {
            amount: parseFloat(amount),
            date: date || todayISO()
          });
        }
        addToast("Record updated successfully", "success");
      } else {
        const creationTxId = await addDocToFirebase(user.uid, "transactions", {
          name: activeTab === 'lend' ? `Lent money to ${trimmedName}` : `Borrowed money from ${trimmedName}`,
          type: activeTab === 'lend' ? 'Debit' : 'Credit',
          amount: parseFloat(amount),
          date: date || todayISO(),
          createdAt: new Date().toISOString()
        });

        const lbData = {
          ...data,
          userId: user.uid,
          status: "Pending", // Always Pending on create
          creationTxId
        };
        await saveToFirebase(user.uid, "lendBorrow", lbData);
        addToast("Record added successfully", "success");
      }

      if (existingRecord && existingRecord.personName.trim().toLowerCase() !== trimmedName.toLowerCase()) {
        setStoredWhatsAppContact(existingRecord.personName, "");
      }
      setStoredWhatsAppContact(trimmedName, normalizedPhoneNumber || "");
      await syncWhatsAppContactInRecords(trimmedName, normalizedPhoneNumber || "");
      resetForm();
      loadRecords();
      updateGlobalBalance?.();
    } catch (err) {
      addToast("Failed to save record", "error");
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setPersonName("");
    setPersonPhone("");
    setAmount("");
    setDate(todayISO());
    setNote("");
  };

  const handleEdit = (record) => {
    setActiveTab(record.type);
    setEditingId(record.id);
    setPersonName(record.personName);
    setPersonPhone(record.phoneNumber || getStoredWhatsAppContact(record.personName));
    setAmount(record.amount);
    setDate(record.date);
    setNote(record.note || "");
    document.getElementById("lendBorrowForm")?.scrollIntoView({ behavior: "smooth" });
  };

  const handleDelete = async (record) => {
    requestConfirm?.({
      title: "Delete lend/borrow record?",
      message: "This action cannot be undone and will also remove linked transactions.",
      confirmLabel: "Delete Record",
      onConfirm: async () => {
        try {
          await deleteFromFirebase(user.uid, "lendBorrow", record.id);
          if (record.creationTxId) await deleteFromFirebase(user.uid, "transactions", record.creationTxId);
          if (record.repayments && record.repayments.length > 0) {
            for (const rep of record.repayments) {
              if (rep.transactionId) await deleteFromFirebase(user.uid, "transactions", rep.transactionId);
            }
          }
          if (record.repaymentTxId) await deleteFromFirebase(user.uid, "transactions", record.repaymentTxId); // Legacy
          addToast({
            type: "success",
            title: "Record Deleted",
            description: "The lend/borrow record and linked entries were removed successfully.",
          });
          loadRecords();
          updateGlobalBalance?.();
        } catch (err) {
          addToast({
            type: "error",
            title: "Delete Failed",
            description: "We could not delete that lend/borrow record.",
          });
        }
      },
    });
  };

  const handleOpenRepay = (record) => {
    const repaid = record.repayments ? record.repayments.reduce((s, rep) => s + (parseFloat(rep.amount) || 0), 0) : 0;
    const remaining = (parseFloat(record.amount) || 0) - repaid;
    if (remaining <= 0) return;

    setSelectedRecord(record);
    setRepayAmount(remaining.toString());
    setRepayDate(todayISO());
    setRepayNote("");
    setRepayModalOpen(true);
  };

  const handlePersonNameBlur = () => {
    if (!personName.trim() || personPhone.trim()) return;
    const storedPhone = getStoredWhatsAppContact(personName.trim());
    if (storedPhone) {
      setPersonPhone(formatWhatsAppDisplayNumber(storedPhone));
    }
  };

  const handleOpenWhatsAppChat = (summary) => {
    if (!summary?.phoneNumber) {
      setWhatsAppModalMessage("No WhatsApp number added");
      return;
    }

    window.open(`https://wa.me/${summary.phoneNumber}`, "_blank");
  };

  const handleRepaySubmit = async (e) => {
    e.preventDefault();
    if (!selectedRecord || !repayAmount) return;

    const amtToRepay = parseFloat(repayAmount);
    if (amtToRepay <= 0) {
      addToast("Amount must be greater than 0", "error");
      return;
    }

    const repaidSoFar = selectedRecord.repayments ? selectedRecord.repayments.reduce((s, rep) => s + (parseFloat(rep.amount) || 0), 0) : 0;
    const originalAmt = parseFloat(selectedRecord.amount) || 0;
    const remaining = originalAmt - repaidSoFar;

    if (amtToRepay > remaining) {
      addToast("Cannot repay more than remaining amount", "error");
      return;
    }

    try {
      const repType = selectedRecord.type === 'lend' ? 'Credit' : 'Debit';
      const repName = selectedRecord.type === 'lend' ? `Repayment received from ${selectedRecord.personName}` : `Repaid money to ${selectedRecord.personName}`;

      const newTxId = await addDocToFirebase(user.uid, "transactions", {
        name: repayNote ? `${repName} - ${repayNote}` : repName,
        type: repType,
        amount: amtToRepay,
        date: repayDate || todayISO(),
        createdAt: new Date().toISOString()
      });

      const newRepayment = {
        id: "rep_" + Date.now(),
        amount: amtToRepay,
        date: repayDate || todayISO(),
        note: repayNote,
        transactionId: newTxId
      };

      const updatedRepayments = [...(selectedRecord.repayments || []), newRepayment];
      const newTotalRepaid = repaidSoFar + amtToRepay;

      let newStatus = selectedRecord.status;
      if (newTotalRepaid >= originalAmt) {
        newStatus = "Paid";
      } else if (newTotalRepaid > 0) {
        newStatus = "Partial";
      }

      await updateInFirebase(user.uid, "lendBorrow", selectedRecord.id, {
        repayments: updatedRepayments,
        status: newStatus
      });

      addToast("Repayment recorded successfully", "success");
      setRepayModalOpen(false);
      loadRecords();
      updateGlobalBalance?.();
    } catch (err) {
      addToast("Failed to record repayment", "error");
    }
  };

  const handleReceivedMoneySubmit = async (e) => {
    e.preventDefault();
    if (!activeLedgerSummary || !receivedMoneyAmount) return;

    const amtToRepay = parseFloat(receivedMoneyAmount);
    if (isNaN(amtToRepay) || amtToRepay <= 0) {
      addToast("Please enter a valid amount greater than 0", "error");
      return;
    }

    // Determine which records to apply the payment to based on type
    const isReceived = receivedMoneyType === "Received";

    // Get the appropriate pending records based on transaction type
    const pendingRecords = activeLedgerSummary.originalRecords
      .filter(r => {
        // If "Received", apply to lend records (money we lent and getting back)
        // If "Paid", apply to borrow records (money we borrowed and paying back)
        return isReceived ? r.type === 'lend' : r.type === 'borrow';
      })
      .filter(r => r.status !== 'Paid')
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    if (pendingRecords.length === 0) {
      addToast(`No pending ${isReceived ? 'lent' : 'borrowed'} records to apply payment`, "error");
      return;
    }

    // Calculate total remaining across all pending records
    const totalRemaining = pendingRecords.reduce((sum, r) => {
      const repaid = r.repayments ? r.repayments.reduce((s, rep) => s + (parseFloat(rep.amount) || 0), 0) : 0;
      return sum + Math.max(0, (parseFloat(r.amount) || 0) - repaid);
    }, 0);

    if (amtToRepay > totalRemaining) {
      addToast(`Cannot ${isReceived ? 'receive' : 'pay'} more than remaining amount (${formatMoney(totalRemaining)})`, "error");
      return;
    }

    try {
      setLoading(true);

      // Create a transaction record
      const repName = isReceived
        ? `Payment from ${activeLedgerSummary.personName}`
        : `Repaid money to ${activeLedgerSummary.personName}`;

      const newTxId = await addDocToFirebase(user.uid, "transactions", {
        name: receivedMoneyNote ? `${repName} - ${receivedMoneyNote}` : repName,
        type: isReceived ? 'Credit' : 'Debit',
        amount: amtToRepay,
        date: receivedMoneyDate || todayISO(),
        createdAt: new Date().toISOString()
      });

      // Apply payment FIFO across pending records
      let remainingAmount = amtToRepay;
      const updates = [];

      for (const record of pendingRecords) {
        if (remainingAmount <= 0) break;

        const repaidSoFar = record.repayments ? record.repayments.reduce((s, rep) => s + (parseFloat(rep.amount) || 0), 0) : 0;
        const originalAmt = parseFloat(record.amount) || 0;
        const remainingForRecord = originalAmt - repaidSoFar;

        if (remainingForRecord <= 0) continue;

        const amountToApply = Math.min(remainingForRecord, remainingAmount);

        const newRepayment = {
          id: "rep_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9),
          amount: amountToApply,
          date: receivedMoneyDate || todayISO(),
          note: receivedMoneyNote || (isReceived ? "Received Payment" : "Repayment"),
          transactionId: newTxId,
          transactionType: receivedMoneyType
        };

        const updatedRepayments = [...(record.repayments || []), newRepayment];
        const newTotalRepaid = repaidSoFar + amountToApply;

        let newStatus = record.status;
        if (newTotalRepaid >= originalAmt) {
          newStatus = "Paid";
        } else if (newTotalRepaid > 0) {
          newStatus = "Partial";
        }

        updates.push(updateInFirebase(user.uid, "lendBorrow", record.id, {
          repayments: updatedRepayments,
          status: newStatus
        }));

        remainingAmount -= amountToApply;
      }

      await Promise.all(updates);

      // Await records reload before closing modal and clearing form
      await loadRecords();
      updateGlobalBalance?.();

      setReceivedMoneyModalOpen(false);
      setReceivedMoneyAmount("");
      setReceivedMoneyType("Received");
      setReceivedMoneyDate(todayISO());
      setReceivedMoneyNote("");

      const actionText = isReceived ? 'Received' : 'Paid';
      addToast(`${actionText} ${formatMoney(amtToRepay)} successfully`, "success");
    } catch (err) {
      console.error("Received money error:", err);
      addToast(`Failed to process ${isReceived ? 'receipt' : 'payment'}`, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleBulkRepaySubmit = async (e) => {
    e.preventDefault();
    if (!activeLedgerSummary || !bulkRepayAmount) return;

    const totalToReceive = parseFloat(bulkRepayAmount);
    if (totalToReceive <= 0) {
      addToast("Amount must be greater than 0", "error");
      return;
    }

    if (totalToReceive > activeLedgerSummary.pendingAmount) {
      addToast("Cannot receive more than net pending amount", "error");
      return;
    }

    try {
      setLoading(true);

      // 1. Create a single transaction for the bulk receipt
      const repName = `Payment from ${activeLedgerSummary.personName}`;
      const bulkTxId = await addDocToFirebase(user.uid, "transactions", {
        name: bulkRepayNote ? `${repName} - ${bulkRepayNote}` : repName,
        type: 'Credit',
        amount: totalToReceive,
        date: bulkRepayDate || todayISO(),
        createdAt: new Date().toISOString()
      });

      // 2. Extract and sort pending 'lend' records for this person
      const pendingLendRecords = activeLedgerSummary.originalRecords
        .filter(r => r.type === 'lend' && r.status !== 'Paid')
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      let remainingBulkAmount = totalToReceive;
      const updates = [];

      // 3. FIFO processing
      for (const record of pendingLendRecords) {
        if (remainingBulkAmount <= 0) break;

        const repaidSoFar = record.repayments ? record.repayments.reduce((s, rep) => s + (parseFloat(rep.amount) || 0), 0) : 0;
        const originalAmt = parseFloat(record.amount) || 0;
        const remainingForRecord = originalAmt - repaidSoFar;

        if (remainingForRecord <= 0) continue;

        const amountToApply = Math.min(remainingForRecord, remainingBulkAmount);

        const newRepayment = {
          id: "rep_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9),
          amount: amountToApply,
          date: bulkRepayDate || todayISO(),
          note: bulkRepayNote || "Bulk Repayment",
          transactionId: bulkTxId
        };

        const updatedRepayments = [...(record.repayments || []), newRepayment];
        const newTotalRepaid = repaidSoFar + amountToApply;

        let newStatus = record.status;
        if (newTotalRepaid >= originalAmt) {
          newStatus = "Paid";
        } else if (newTotalRepaid > 0) {
          newStatus = "Partial";
        }

        updates.push(updateInFirebase(user.uid, "lendBorrow", record.id, {
          repayments: updatedRepayments,
          status: newStatus
        }));

        remainingBulkAmount -= amountToApply;
      }

      // 4. Execute all updates concurrently
      await Promise.all(updates);

      addToast(`₹${totalToReceive} received successfully from ${activeLedgerSummary.personName}`, "success");
      setBulkRepayModalOpen(false);
      loadRecords();
      updateGlobalBalance?.();
    } catch (err) {
      console.error("Bulk repay error:", err);
      addToast("Failed to process payment", "error");
    } finally {
      setLoading(false);
    }
  };

  const summaries = useMemo(() => {
    let totalLent = 0;
    let totalBorrowed = 0;
    let pendingReceive = 0;
    let pendingPay = 0;

    records.forEach(r => {
      const amt = Number(r.amount) || 0;
      const repaid = r.repayments ? r.repayments.reduce((s, rep) => s + (parseFloat(rep.amount) || 0), 0) : 0;
      const remaining = amt - repaid;

      if (r.type === "lend") {
        totalLent += amt;
        if (remaining > 0) pendingReceive += remaining;
      } else {
        totalBorrowed += amt;
        if (remaining > 0) pendingPay += remaining;
      }
    });

    return { totalLent, totalBorrowed, pendingReceive, pendingPay };
  }, [records]);

  const peopleSummaries = useMemo(() => {
    const map = new Map();
    const storedContacts = getStoredWhatsAppContacts();

    records.forEach(r => {
      const nameKey = (r.personName || "").trim().toLowerCase();
      if (!nameKey) return;

      const pName = r.personName.trim();
      const amt = parseFloat(r.amount) || 0;
      const repaid = r.repayments ? r.repayments.reduce((s, rep) => s + (parseFloat(rep.amount) || 0), 0) : 0;

      if (!map.has(nameKey)) {
        map.set(nameKey, {
          nameKey,
          personName: pName,
          totalLent: 0,
          totalBorrowed: 0,
          totalReceived: 0,
          totalRepaid: 0,
          pendingAmount: 0,
          numEntries: 0,
          lastDate: r.date,
          phoneNumber: "",
          originalRecords: []
        });
      }

      const p = map.get(nameKey);
      p.numEntries += 1;
      p.originalRecords.push(r);
      if (new Date(r.date) > new Date(p.lastDate)) {
        p.lastDate = r.date;
      }
      if (r.phoneNumber) {
        p.phoneNumber = r.phoneNumber;
      }

      if (r.type === 'lend') {
        p.totalLent += amt;
        p.totalReceived += repaid;
        p.pendingAmount += (amt - repaid);
      } else {
        p.totalBorrowed += amt;
        p.totalRepaid += repaid;
        p.pendingAmount -= (amt - repaid);
      }
    });

    const arr = Array.from(map.values());
    arr.forEach((person) => {
      if (!person.phoneNumber && storedContacts[person.nameKey]) {
        person.phoneNumber = storedContacts[person.nameKey];
      }
    });
    arr.sort((a, b) => b.numEntries - a.numEntries);
    return arr;
  }, [records]);

  const filteredPeople = useMemo(() => {
    if (!personSearch.trim()) return peopleSummaries;
    const term = personSearch.toLowerCase();
    return peopleSummaries.filter(p => p.personName.toLowerCase().includes(term));
  }, [peopleSummaries, personSearch]);

  const filteredRecords = useMemo(() => {
    return records
      .filter(r => r.type === activeTab)
      .filter(r => filterStatus === "All" || r.status === filterStatus)
      .filter(r => {
        const queryTerm = searchQuery.toLowerCase();
        return r.personName.toLowerCase().includes(queryTerm) ||
          (r.note && r.note.toLowerCase().includes(queryTerm));
      });
  }, [records, activeTab, filterStatus, searchQuery]);

  const displayedRecords = filteredRecords.slice(0, 4);
  const activeLedgerSummary = ledgerModalOpen && selectedLedgerSummary
    ? peopleSummaries.find(p => p.nameKey === selectedLedgerSummary.nameKey) || selectedLedgerSummary
    : null;

  const formatWhatsAppAmount = (amount) => {
    const value = Number(amount) || 0;
    const hasDecimals = Math.abs(value % 1) > 0;
    const formatted = Math.abs(value).toLocaleString("en-IN", {
      minimumFractionDigits: hasDecimals ? 2 : 0,
      maximumFractionDigits: 2
    });
    return `${value < 0 ? "-" : ""}₹${formatted}`;
  };

  const generateWhatsAppLedgerMessage = (summary) => {
    if (!summary) return "";

    // Determine status emoji
    let statusEmoji = "✅";
    let statusText = "Settled";
    if (summary.pendingAmount > 0) {
      statusEmoji = "🟢";
      statusText = "Owes You";
    } else if (summary.pendingAmount < 0) {
      statusEmoji = "🔴";
      statusText = "You Owe";
    }

    // Format current date and time
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
    const timeStr = now.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });

    // Build the message
    const message =
      `━━━━━━━━━━━━━━━━━━━━━
📒 *EXPENSE BOOK*
━━━━━━━━━━━━━━━━━━━━━

👤 *Ledger:* ${summary.personName}

${statusEmoji} *Status:* ${statusText} ${Math.abs(summary.pendingAmount) > 0 ? formatWhatsAppAmount(Math.abs(summary.pendingAmount)) : ''}

💸 *Lent:* ${formatWhatsAppAmount(summary.totalLent)}
💰 *Received:* ${formatWhatsAppAmount(summary.totalReceived)}

📤 *Borrowed:* ${formatWhatsAppAmount(summary.totalBorrowed)}
📥 *Repaid:* ${formatWhatsAppAmount(summary.totalRepaid)}

📊 *Total Entries:* ${summary.numEntries}
📅 *Last Activity:* ${formatDateDisplay(summary.lastDate)}

━━━━━━━━━━━━━━━━━━━━━
🧾 *Net Pending:* ${formatWhatsAppAmount(Math.abs(summary.pendingAmount))}
━━━━━━━━━━━━━━━━━━━━━

✨ Generated by Expense Book
🕒 ${dateStr}, ${timeStr}`;

    return message;
  };

  const renderRecordRow = (r) => {
    const repaid = r.repayments ? r.repayments.reduce((s, rep) => s + (parseFloat(rep.amount) || 0), 0) : 0;
    const remaining = (parseFloat(r.amount) || 0) - repaid;
    return (
      <tr key={r.id}>
        <td>
          <div style={{ fontWeight: 600 }}>{r.personName}</div>
          {r.note && <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{r.note}</div>}
          {r.repayments && r.repayments.length > 0 && (
            <div style={{ fontSize: '0.75rem', marginTop: '4px', opacity: 0.8 }}>
              {r.repayments.length} payment{r.repayments.length > 1 ? 's' : ''} logged
            </div>
          )}
        </td>
        <td>{formatDateDisplay(r.date)}</td>
        <td className="align-right">{formatMoney(r.amount)}</td>
        <td className="align-right" style={{ color: 'var(--primary)' }}>{formatMoney(repaid)}</td>
        <td className="align-right" style={{ fontWeight: 600 }}>{formatMoney(remaining)}</td>
        <td>
          <span className={`badge ${r.status === 'Paid' ? 'badge--credit' : r.status === 'Partial' ? 'badge--warning' : 'badge--debit'}`}>
            {r.status}
          </span>
        </td>
        <td style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
          {r.status !== 'Paid' && (
            <button
              className="btn btn--primary"
              style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem', marginRight: '5px' }}
              onClick={() => handleOpenRepay(r)}
              title={activeTab === 'lend' ? 'Receive payment' : 'Repay balance'}
            >
              {activeTab === 'lend' ? 'Receive' : 'Repay'}
            </button>
          )}
          <button
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--icon-info)', padding: '0.4rem' }}
            onClick={() => { handleEdit(r); setAllRecordsModalOpen(false); }}
            title="Edit"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
          <button
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--icon-danger)', padding: '0.4rem' }}
            onClick={() => handleDelete(r)}
            title="Delete"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              <line x1="10" y1="11" x2="10" y2="17" />
              <line x1="14" y1="11" x2="14" y2="17" />
            </svg>
          </button>
        </td>
      </tr>
    );
  };

  // PDF generation for ledger
  const generateLedgerPDF = (summary, options = {}) => {
    if (!summary) return;
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 36;
    let y = margin;

    // Watermark
    doc.setFontSize(60);
    doc.setTextColor(230, 240, 255);
    doc.text("Expense Book", pageWidth / 2, pageHeight / 2, { align: "center", angle: 30, opacity: 0.1 });

    // App Logo/Name
    doc.setFontSize(22);
    doc.setTextColor(24, 36, 64);
    doc.setFont("helvetica", "bold");
    doc.text("EXPENSE BOOK", margin, y);
    y += 32;

    // Person Name
    doc.setFontSize(16);
    doc.setTextColor(24, 36, 64);
    doc.setFont("helvetica", "bold");
    doc.text(`Ledger: ${summary.personName}`, margin, y);
    y += 24;

    // Ledger Summary
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(80, 80, 80);
    doc.text(`Total Entries: ${summary.numEntries}`, margin, y);
    doc.text(`Last Activity: ${formatDateDisplay(summary.lastDate)}`, pageWidth - margin, y, { align: "right" });
    y += 18;

    // Divider
    doc.setDrawColor(44, 62, 80);
    doc.setLineWidth(1.2);
    doc.line(margin, y, pageWidth - margin, y);
    y += 12;

    // Net Pending
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    let pendingColor = summary.pendingAmount > 0 ? [16, 185, 129] : summary.pendingAmount < 0 ? [239, 68, 68] : [24, 36, 64];
    doc.setTextColor(...pendingColor);
    doc.text(`Net Pending: ${formatMoney(Math.abs(summary.pendingAmount))}`, margin, y);
    let status = summary.pendingAmount === 0 ? "PAID" : summary.pendingAmount > 0 ? "PENDING" : "PARTIAL";
    let badgeColor = summary.pendingAmount === 0 ? [16, 185, 129] : summary.pendingAmount > 0 ? [241, 196, 15] : [239, 68, 68];
    doc.setFillColor(...badgeColor);
    doc.roundedRect(pageWidth - margin - 70, y - 14, 70, 22, 8, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.text(status, pageWidth - margin - 35, y + 2, { align: "center" });
    y += 28;

    // Lent/Borrowed, Received/Repaid
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(24, 36, 64);
    doc.text(`Lent: ${formatMoney(summary.totalLent)}`, margin, y);
    doc.setTextColor(16, 185, 129);
    doc.text(`Received: ${formatMoney(summary.totalReceived)}`, margin + 160, y);
    doc.setTextColor(24, 36, 64);
    doc.text(`Borrowed: ${formatMoney(summary.totalBorrowed)}`, margin + 320, y);
    doc.setTextColor(239, 68, 68);
    doc.text(`Repaid: ${formatMoney(summary.totalRepaid)}`, margin + 480, y);
    y += 22;

    // Divider
    doc.setDrawColor(230, 236, 245);
    doc.setLineWidth(1);
    doc.line(margin, y, pageWidth - margin, y);
    y += 14;

    // Transaction Table
    doc.setFontSize(14);
    doc.setTextColor(24, 36, 64);
    doc.setFont("helvetica", "bold");
    doc.text("Transaction History", margin, y);
    y += 18;
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(80, 80, 80);
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [["Date", "Type", "Note", "Original", "Remaining", "Status"]],
      body: summary.originalRecords.map(r => {
        const repaid = r.repayments ? r.repayments.reduce((s, rep) => s + (parseFloat(rep.amount) || 0), 0) : 0;
        const remaining = (parseFloat(r.amount) || 0) - repaid;
        let status = r.status === 'Paid' ? 'PAID' : r.status === 'Partial' ? 'PARTIAL' : 'PENDING';
        return [
          formatDateDisplay(r.date),
          r.type === 'lend' ? 'Lent' : 'Borrowed',
          r.note || '',
          formatMoney(r.amount),
          formatMoney(remaining),
          status
        ];
      }),
      styles: {
        font: "helvetica",
        fontSize: 11,
        cellPadding: 6,
        valign: 'middle',
        textColor: [24, 36, 64],
        lineColor: [230, 236, 245],
        lineWidth: 1
      },
      headStyles: {
        fillColor: [24, 36, 64],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        halign: 'center',
        fontSize: 12,
        lineWidth: 0
      },
      bodyStyles: {
        halign: 'center',
        fontSize: 11,
        cellPadding: 6,
        minCellHeight: 18,
        textColor: [24, 36, 64],
        lineWidth: 0.5
      },
      alternateRowStyles: {
        fillColor: [245, 248, 255]
      },
      columnStyles: {
        0: { cellWidth: 70 },
        1: { cellWidth: 70 },
        2: { cellWidth: 120 },
        3: { cellWidth: 70 },
        4: { cellWidth: 70 },
        5: { cellWidth: 60 }
      },
      didDrawPage: (data) => {
        // Page number
        const pageCount = doc.internal.getNumberOfPages();
        doc.setFontSize(10);
        doc.setTextColor(180, 180, 180);
        doc.text(`Page ${doc.internal.getCurrentPageInfo().pageNumber} of ${pageCount}`, pageWidth / 2, pageHeight - 18, { align: "center" });
      }
    });
    y = doc.lastAutoTable.finalY + 16;

    // Repayment History
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(24, 36, 64);
    doc.text("Repayment History", margin, y);
    y += 16;
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(80, 80, 80);
    let repayments = [];
    summary.originalRecords.forEach(r => {
      if (r.repayments && r.repayments.length > 0) {
        r.repayments.forEach(rep => {
          repayments.push({
            date: rep.date,
            note: rep.note,
            amount: rep.amount,
            parentType: r.type,
            parentDate: r.date,
            parentNote: r.note
          });
        });
      }
    });
    if (repayments.length > 0) {
      autoTable(doc, {
        startY: y,
        margin: { left: margin, right: margin },
        head: [["Date", "Amount", "Note", "Type", "Parent Date"]],
        body: repayments.map(rep => [
          formatDateDisplay(rep.date),
          formatMoney(rep.amount),
          rep.note || '',
          rep.parentType === 'lend' ? 'Lent' : 'Borrowed',
          formatDateDisplay(rep.parentDate)
        ]),
        styles: {
          font: "helvetica",
          fontSize: 11,
          cellPadding: 6,
          valign: 'middle',
          textColor: [24, 36, 64],
          lineColor: [230, 236, 245],
          lineWidth: 1
        },
        headStyles: {
          fillColor: [24, 36, 64],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          halign: 'center',
          fontSize: 12,
          lineWidth: 0
        },
        bodyStyles: {
          halign: 'center',
          fontSize: 11,
          cellPadding: 6,
          minCellHeight: 18,
          textColor: [24, 36, 64],
          lineWidth: 0.5
        },
        alternateRowStyles: {
          fillColor: [245, 248, 255]
        },
        columnStyles: {
          0: { cellWidth: 70 },
          1: { cellWidth: 70 },
          2: { cellWidth: 120 },
          3: { cellWidth: 70 },
          4: { cellWidth: 70 }
        }
      });
      y = doc.lastAutoTable.finalY + 16;
    } else {
      doc.setFontSize(11);
      doc.setTextColor(180, 180, 180);
      doc.text("No repayments recorded.", margin, y);
      y += 16;
    }

    // Divider
    doc.setDrawColor(230, 236, 245);
    doc.setLineWidth(1);
    doc.line(margin, y, pageWidth - margin, y);
    y += 18;

    // Generated by section
    doc.setFontSize(12);
    doc.setTextColor(24, 36, 64);
    doc.setFont("helvetica", "bold");
    doc.text("━━━━━━━━━━━━━━━━━━", margin, y);
    y += 16;
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text("Generated by:", margin, y);
    y += 14;
    doc.setFont("helvetica", "bold");
    doc.text("Sarba Alam", margin, y);
    y += 14;
    doc.setFont("helvetica", "normal");
    doc.text("Expense Book", margin, y);
    y += 14;
    doc.setFont("helvetica", "bold");
    doc.text("━━━━━━━━━━━━━━━━━━", margin, y);
    y += 18;

    // Date/time
    doc.setFontSize(10);
    doc.setTextColor(120, 120, 120);
    doc.setFont("helvetica", "normal");
    const now = new Date();
    doc.text(`Generated: ${now.toLocaleDateString()} ${now.toLocaleTimeString()}`, margin, y);

    // Return doc
    return doc;
  };

  const handleShareLedgerOnWhatsApp = async () => {
    if (!activeLedgerSummary) return;

    setWhatsAppShareLoading(true);

    try {
      // Simulate message generation with a small delay for UX feedback
      await new Promise(resolve => setTimeout(resolve, 300));

      const message = generateWhatsAppLedgerMessage(activeLedgerSummary);
      const encoded = encodeURIComponent(message);

      // Try to open WhatsApp
      window.open(
        `https://wa.me/?text=${encoded}`,
        "_blank"
      );

      // Also copy to clipboard as fallback
      try {
        await navigator.clipboard.writeText(message);
        setWhatsAppCopied(true);
        addToast("Message copied to clipboard (WhatsApp fallback)", "success");
        setTimeout(() => setWhatsAppCopied(false), 3000);
      } catch (clipErr) {
        console.log("Clipboard API not available", clipErr);
      }
    } catch (err) {
      console.error("Error sharing ledger", err);
      addToast("Failed to generate message", "error");
    } finally {
      setWhatsAppShareLoading(false);
    }
  };

  const handleDownloadLedgerPDF = () => {
    if (!activeLedgerSummary) return;
    const doc = generateLedgerPDF(activeLedgerSummary);
    const name = activeLedgerSummary.personName.replace(/\s+/g, '-').toLowerCase();
    const date = new Date().toISOString().slice(0, 10);
    doc.save(`ledger-${name}-${date}.pdf`);
  };

  const handleWhatsAppLedgerPDF = async () => {
    if (!activeLedgerSummary) return;
    setWhatsAppShareLoading(true);
    try {
      const doc = generateLedgerPDF(activeLedgerSummary);
      const name = activeLedgerSummary.personName.replace(/\s+/g, '-').toLowerCase();
      const date = new Date().toISOString().slice(0, 10);
      const filename = `ledger-${name}-${date}.pdf`;
      // Save PDF to blob
      const pdfBlob = doc.output('blob');
      // Download PDF
      doc.save(filename);
      // Open WhatsApp (user must attach PDF manually)
      window.open('https://wa.me/', '_blank');
      addToast('PDF downloaded. Attach it in WhatsApp chat.', 'success');
    } catch (err) {
      addToast('Failed to generate PDF', 'error');
    } finally {
      setWhatsAppShareLoading(false);
    }
  };

  return (
    <div className="fade-in">
      <header className="main-header">
        <div className="main-header__greeting">
          <h1 className="section__title" style={{ margin: 0 }}>Lend & Borrow</h1>
        </div>
      </header>

      <div className="summary-grid">
        <article className="card card--summary">
          <div className="card__icon" style={{ backgroundColor: 'var(--icon-info-bg)', color: 'var(--icon-info)', padding: '10px', borderRadius: '50%' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </div>
          <h3 className="card__label">Total Lent</h3>
          <p className="card__value amount--credit">{formatMoney(summaries.totalLent)}</p>
        </article>

        <article className="card card--summary">
          <div className="card__icon" style={{ backgroundColor: 'var(--icon-warning-bg)', color: 'var(--icon-warning)', padding: '10px', borderRadius: '50%' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </div>
          <h3 className="card__label">Pending Receive</h3>
          <p className="card__value" style={{ color: 'var(--warning)' }}>{formatMoney(summaries.pendingReceive)}</p>
        </article>

        <article className="card card--summary">
          <div className="card__icon" style={{ backgroundColor: 'var(--icon-danger-bg)', color: 'var(--icon-danger)', padding: '10px', borderRadius: '50%' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </div>
          <h3 className="card__label">Total Borrowed</h3>
          <p className="card__value amount--debit">{formatMoney(summaries.totalBorrowed)}</p>
        </article>

        <article className="card card--summary">
          <div className="card__icon" style={{ backgroundColor: 'var(--warning-soft)', color: 'var(--warning)', padding: '10px', borderRadius: '50%' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </div>
          <h3 className="card__label">Pending Pay</h3>
          <p className="card__value" style={{ color: 'var(--danger)' }}>{formatMoney(summaries.pendingPay)}</p>
        </article>
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <button
          className={`btn ${activeTab === 'lend' ? 'btn--primary' : ''}`}
          style={{ flex: 1, padding: '0.8rem', outline: activeTab === 'lend' ? 'none' : '1px solid var(--border)' }}
          onClick={() => { setActiveTab('lend'); resetForm(); }}
        >
          Lend Money (You Gave)
        </button>
        <button
          className={`btn ${activeTab === 'borrow' ? 'btn--primary' : ''}`}
          style={{ flex: 1, padding: '0.8rem', outline: activeTab === 'borrow' ? 'none' : '1px solid var(--border)' }}
          onClick={() => { setActiveTab('borrow'); resetForm(); }}
        >
          Borrow Money (You Received)
        </button>
      </div>

      <div className="expense-grid">
        <div className="card" id="lendBorrowForm">
          <h3 className="card__heading">
            {editingId ? "Edit Record" : `Add New ${activeTab === 'lend' ? 'Lent' : 'Borrowed'} Record`}
          </h3>
          <form className="expense-form" onSubmit={handleSubmit}>
            <div className="form-row">
              <label htmlFor="personName">Person Name</label>
              <input
                type="text"
                id="personName"
                required
                placeholder="e.g. John Doe"
                autoComplete="off"
                value={personName}
                onChange={(e) => setPersonName(e.target.value)}
                onBlur={handlePersonNameBlur}
              />
            </div>

            <div className="form-row">
              <label htmlFor="personPhone">WhatsApp Number (Optional)</label>
              <input
                type="tel"
                id="personPhone"
                placeholder="e.g. 9876543210"
                autoComplete="off"
                value={personPhone}
                onChange={(e) => setPersonPhone(e.target.value)}
              />
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.35rem" }}>
                Indian numbers only. We automatically use +91 for WhatsApp chat links.
              </div>
            </div>

            <div className="form-row">
              <label htmlFor="lbAmount">Amount</label>
              <div className="input-group">
                <span className="input-prefix">Rs</span>
                <input
                  type="number"
                  id="lbAmount"
                  min="0"
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
            </div>

            <div className="form-row">
              <label htmlFor="lbDate">Date</label>
              <input
                type="date"
                id="lbDate"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>

            <div className="form-row">
              <label htmlFor="lbNote">Note (Optional)</label>
              <input
                type="text"
                id="lbNote"
                placeholder="Reason or details..."
                autoComplete="off"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>



            <div style={{ display: 'flex', gap: '10px', marginTop: '1rem' }}>
              <button type="submit" className="btn btn--primary" style={{ flex: 1 }}>
                {editingId ? "Update Record" : "Save Record"}
              </button>
              {editingId && (
                <button type="button" className="btn" style={{ flex: 1, backgroundColor: 'var(--surface-hover)' }} onClick={resetForm}>
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        <div className="card">
          <div className="card__header-row" style={{ marginBottom: "1rem", flexWrap: 'wrap', gap: '10px' }}>
            <h3 className="card__heading" style={{ margin: 0 }}>
              {activeTab === 'lend' ? 'Money You Lent' : 'Money You Borrowed'}
            </h3>
          </div>

          <div style={{ display: 'flex', gap: '10px', marginBottom: '1rem', flexWrap: 'wrap' }}>
            <input
              type="text"
              className="month-input"
              style={{ flex: 2, border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "0.6rem 0.7rem", fontFamily: "inherit", fontSize: "0.9rem", background: "var(--surface)", color: "var(--text)" }}
              placeholder="Search by name or note..."
              autoComplete="off"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              style={{ flex: 1, border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "0.6rem 0.7rem", fontFamily: "inherit", fontSize: "0.9rem", background: "var(--surface)", color: "var(--text)" }}
            >
              <option value="All">All Status</option>
              <option value="Pending">Pending</option>
              <option value="Paid">Paid</option>
            </select>
          </div>

          {loading ? (
            <p>Loading records...</p>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Person</th>
                    <th>Date</th>
                    <th className="align-right">Original</th>
                    <th className="align-right">Repaid</th>
                    <th className="align-right">Remaining</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="empty-state">
                        No {activeTab} records found.
                      </td>
                    </tr>
                  ) : (
                    displayedRecords.map(renderRecordRow)
                  )}
                </tbody>
              </table>
            </div>
          )}

          {filteredRecords.length > 4 && (
            <div style={{ textAlign: 'center', marginTop: '1rem' }}>
              <button
                className="btn"
                onClick={() => setAllRecordsModalOpen(true)}
                style={{ background: 'var(--surface-hover)', outline: '1px solid var(--border)' }}
              >
                View All {filteredRecords.length} Records
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="card" style={{ marginTop: '2rem' }}>
        <div className="card__header-row" style={{ marginBottom: "1rem", flexWrap: 'wrap', gap: '10px' }}>
          <h3 className="card__heading" style={{ margin: 0 }}>People Summary</h3>
        </div>

        <div style={{ display: 'flex', gap: '10px', marginBottom: '1.5rem' }}>
          <input
            type="text"
            placeholder="Search person..."
            className="month-input"
            value={personSearch}
            onChange={(e) => setPersonSearch(e.target.value)}
            style={{ flex: 1, border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "0.6rem 0.7rem", fontFamily: "inherit", fontSize: "0.9rem", background: "var(--surface)", color: "var(--text)" }}
          />
        </div>

        {filteredPeople.length === 0 ? (
          <p className="empty-state">No people found matching your criteria.</p>
        ) : (
          <div className="people-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '15px' }}>
            {filteredPeople.map(p => (
              <article key={p.nameKey} className="card person-summary-card" style={{ padding: '1.2rem', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', background: 'var(--surface)' }}>
                <div className="ledger-card-top-row" style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', marginBottom: '14px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', fontWeight: 'bold', flexShrink: 0 }}>
                    {p.personName.charAt(0).toUpperCase()}
                  </div>
                  <span style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--text)' }}>{p.personName}</span>
                </div>
                <div className="person-summary-card__header">
                  <h4 className="person-summary-card__title" style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text)' }}>
                  </h4>
                  <div className="person-summary-card__actions">
                    <div className="whatsapp-quick-action">
                      <button
                        type="button"
                        className="whatsapp-quick-btn"
                        title="Chat on WhatsApp"
                        aria-label={`Chat with ${p.personName} on WhatsApp`}
                        onClick={() => handleOpenWhatsAppChat(p)}
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                          <path
                            d="M20.52 3.48A11.9 11.9 0 0 0 12.07 0C5.5 0 .16 5.34.16 11.91c0 2.1.55 4.16 1.6 5.98L0 24l6.29-1.65a11.87 11.87 0 0 0 5.77 1.47h.01c6.57 0 11.91-5.34 11.91-11.91 0-3.18-1.24-6.17-3.46-8.43Zm-8.45 18.37h-.01a9.9 9.9 0 0 1-5.03-1.37l-.36-.21-2.99.78.8-2.91-.23-.38a9.89 9.89 0 1 1 8.4 4.09Zm5.43-7.41c-.3-.15-1.77-.88-2.05-.98-.27-.1-.47-.15-.67.15-.2.3-.77.98-.94 1.18-.17.2-.35.22-.65.07-.3-.15-1.25-.46-2.38-1.46-.88-.78-1.47-1.75-1.64-2.05-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.53.15-.17.2-.3.3-.5.1-.2.05-.38-.03-.53-.08-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.53.08-.8.38-.27.3-1.05 1.03-1.05 2.5 0 1.47 1.08 2.89 1.23 3.09.15.2 2.12 3.24 5.14 4.54.72.31 1.29.49 1.73.62.73.23 1.4.2 1.92.12.59-.09 1.77-.72 2.02-1.41.25-.69.25-1.29.17-1.41-.07-.12-.27-.2-.57-.35Z"
                            fill="currentColor"
                          />
                        </svg>
                      </button>
                      <span className="whatsapp-quick-tooltip">Chat on WhatsApp</span>
                    </div>
                    <span className="person-summary-card__entries">{p.numEntries} entries</span>
                  </div>
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '0.9rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Net Pending:</span>
                    <span style={{ fontWeight: 'bold', color: p.pendingAmount > 0 ? '#f39c12' : p.pendingAmount < 0 ? '#e74c3c' : 'var(--text)' }}>
                      {p.pendingAmount > 0 ? `Owes you ${formatMoney(p.pendingAmount)}` : p.pendingAmount < 0 ? `You owe ${formatMoney(Math.abs(p.pendingAmount))}` : 'Settled'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem', fontSize: '0.85rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Lent / Received:</span>
                    <span><span className="amount--credit">{formatMoney(p.totalLent)}</span> / {formatMoney(p.totalReceived)}</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.8rem', fontSize: '0.85rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Borrowed / Repaid:</span>
                    <span><span className="amount--debit">{formatMoney(p.totalBorrowed)}</span> / {formatMoney(p.totalRepaid)}</span>
                  </div>

                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Last transacted: {formatDateDisplay(p.lastDate)}
                  </div>
                  {p.phoneNumber && (
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                      WhatsApp: {formatWhatsAppDisplayNumber(p.phoneNumber)}
                    </div>
                  )}
                </div>

                <button
                  className="btn btn--primary"
                  style={{ marginTop: '1rem', width: '100%' }}
                  onClick={() => { setSelectedLedgerSummary(p); setLedgerModalOpen(true); }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px' }}>
                    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                  </svg>
                  Open Ledger
                </button>
              </article>
            ))}
          </div>
        )}
      </div>



      {allRecordsModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 900,
          padding: '1rem', backdropFilter: 'blur(3px)'
        }}>
          <div className="card fade-in" style={{ width: '100%', maxWidth: '900px', maxHeight: '90vh', backgroundColor: 'var(--surface)', borderRadius: 'var(--radius)', position: 'relative', display: 'flex', flexDirection: 'column' }}>
            <button
              onClick={() => setAllRecordsModalOpen(false)}
              style={{ position: 'absolute', top: '15px', right: '15px', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>

            <h3 className="card__heading" style={{ marginTop: 0, marginBottom: '1rem' }}>
              All {activeTab === 'lend' ? 'Lent' : 'Borrowed'} Records
            </h3>

            <div style={{ overflowY: 'auto', flex: 1, paddingRight: '5px' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Person</th>
                    <th>Date</th>
                    <th className="align-right">Original</th>
                    <th className="align-right">Repaid</th>
                    <th className="align-right">Remaining</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.map(renderRecordRow)}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {repayModalOpen && selectedRecord && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100,
          padding: '1rem', backdropFilter: 'blur(3px)'
        }}>
          <div className="card fade-in" style={{ width: '100%', maxWidth: '450px', backgroundColor: 'var(--surface)', borderRadius: 'var(--radius)', position: 'relative' }}>
            <button
              onClick={() => setRepayModalOpen(false)}
              style={{ position: 'absolute', top: '15px', right: '15px', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>

            <h3 className="card__heading" style={{ marginTop: 0, marginBottom: '0.5rem' }}>
              {selectedRecord.type === 'lend' ? 'Receive Back Money' : 'Repay Money'}
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              Recording settlement for <strong>{selectedRecord.personName}</strong>
            </p>

            <form onSubmit={handleRepaySubmit} className="expense-form">
              <div className="form-row">
                <label>Amount (Max: {formatMoney((parseFloat(selectedRecord.amount) || 0) - (selectedRecord.repayments ? selectedRecord.repayments.reduce((s, rep) => s + (parseFloat(rep.amount) || 0), 0) : 0))})</label>
                <div className="input-group">
                  <span className="input-prefix">Rs</span>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    max={(parseFloat(selectedRecord.amount) || 0) - (selectedRecord.repayments ? selectedRecord.repayments.reduce((s, rep) => s + (parseFloat(rep.amount) || 0), 0) : 0)}
                    required
                    value={repayAmount}
                    onChange={(e) => setRepayAmount(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-row">
                <label>Date</label>
                <input
                  type="date"
                  required
                  value={repayDate}
                  onChange={(e) => setRepayDate(e.target.value)}
                />
              </div>

              <div className="form-row">
                <label>Note / Reference</label>
                <input
                  type="text"
                  placeholder="e.g. Bank transfer, Cash..."
                  value={repayNote}
                  onChange={(e) => setRepayNote(e.target.value)}
                />
              </div>

              <button type="submit" className="btn btn--primary" style={{ width: '100%', marginTop: '1rem', padding: '0.8rem' }}>
                Confirm {selectedRecord.type === 'lend' ? 'Receipt' : 'Payment'}
              </button>
            </form>
          </div>
        </div>
      )}

      {ledgerModalOpen && activeLedgerSummary && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
          padding: '1rem', backdropFilter: 'blur(3px)'
        }}>
          <div className="card fade-in" style={{ width: '100%', maxWidth: '750px', maxHeight: '90vh', backgroundColor: 'var(--surface)', borderRadius: 'var(--radius)', position: 'relative', display: 'flex', flexDirection: 'column' }}>
            <button
              onClick={() => setLedgerModalOpen(false)}
              style={{ position: 'absolute', top: '15px', right: '15px', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.2rem', width: '100%' }}>
              <h3 className="card__heading" style={{ margin: 0 }}>
                Ledger: {activeLedgerSummary.personName}
              </h3>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1rem' }}>
              Complete history of exchanges
            </p>

            <div style={{ display: 'flex', gap: '10px', marginBottom: '1rem', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '120px', backgroundColor: 'var(--bg)', padding: '0.8rem', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Lent / Borrowed</div>
                <div style={{ fontWeight: 600 }}>{formatMoney(activeLedgerSummary.totalLent)} / {formatMoney(activeLedgerSummary.totalBorrowed)}</div>
              </div>
              <div style={{ flex: 1, minWidth: '120px', backgroundColor: 'var(--bg)', padding: '0.8rem', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Received / Repaid</div>
                <div style={{ fontWeight: 600 }}>{formatMoney(activeLedgerSummary.totalReceived)} / {formatMoney(activeLedgerSummary.totalRepaid)}</div>
              </div>
              <div style={{ flex: 1, minWidth: '150px', backgroundColor: activeLedgerSummary.pendingAmount === 0 ? 'rgba(46, 204, 113, 0.1)' : 'var(--bg)', padding: '0.8rem', borderRadius: 'var(--radius-sm)', border: activeLedgerSummary.pendingAmount === 0 ? '1px solid #2ecc71' : '1px solid transparent', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
                <div>
                  <div style={{ fontSize: '0.8rem', color: activeLedgerSummary.pendingAmount === 0 ? '#27ae60' : 'var(--text-muted)' }}>Net Pending</div>
                  <div style={{ fontWeight: 600, color: activeLedgerSummary.pendingAmount === 0 ? '#27ae60' : activeLedgerSummary.pendingAmount > 0 ? '#f39c12' : '#e74c3c' }}>
                    {activeLedgerSummary.pendingAmount === 0 ? 'All Settled ✅' : activeLedgerSummary.pendingAmount > 0 ? `Owes you ${formatMoney(activeLedgerSummary.pendingAmount)}` : `You owe ${formatMoney(Math.abs(activeLedgerSummary.pendingAmount))}`}
                  </div>
                </div>
                {activeLedgerSummary.pendingAmount > 0 && (
                  <button
                    className="btn btn--primary"
                    style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', whiteSpace: 'nowrap' }}
                    onClick={() => {
                      setBulkRepayAmount(activeLedgerSummary.pendingAmount.toString());
                      setBulkRepayDate(todayISO());
                      setBulkRepayNote("");
                      setBulkRepayModalOpen(true);
                    }}
                  >
                    Payment
                  </button>
                )}
              </div>
            </div>

            <div style={{ overflowY: 'auto', flex: 1, paddingRight: '5px' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th className="align-right">Original</th>
                    <th className="align-right">Remaining</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {activeLedgerSummary.originalRecords.map((r) => {
                    const repaid = r.repayments ? r.repayments.reduce((s, rep) => s + (parseFloat(rep.amount) || 0), 0) : 0;
                    const remaining = (parseFloat(r.amount) || 0) - repaid;
                    return (
                      <React.Fragment key={r.id}>
                        <tr>
                          <td style={{ fontWeight: 600 }}>{formatDateDisplay(r.date)}</td>
                          <td>
                            <span style={{ color: r.type === 'lend' ? '#3498db' : '#e74c3c', fontWeight: 'bold' }}>
                              {r.type === 'lend' ? 'Lent' : 'Borrowed'}
                            </span>
                            {r.note && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{r.note}</div>}
                          </td>
                          <td className="align-right">{formatMoney(r.amount)}</td>
                          <td className="align-right">{formatMoney(remaining)}</td>
                          <td>
                            <span className={`badge ${r.status === 'Paid' ? 'badge--credit' : r.status === 'Partial' ? 'badge--warning' : 'badge--debit'}`}>
                              {r.status}
                            </span>
                          </td>
                          <td>
                            {r.status !== 'Paid' && (
                              <button
                                className="btn btn--primary"
                                style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}
                                onClick={() => handleOpenRepay(r)}
                              >
                                {r.type === 'lend' ? 'Receive' : 'Repay'}
                              </button>
                            )}
                          </td>
                        </tr>
                        {r.repayments && r.repayments.length > 0 && (
                          <tr>
                            <td colSpan="6" style={{ padding: '0 0.8rem 1rem 0.8rem', background: 'var(--surface)' }}>
                              <div style={{ background: 'var(--bg)', borderRadius: 'var(--radius-sm)', padding: '0.8rem', fontSize: '0.85rem' }}>
                                <div style={{ fontWeight: 'bold', marginBottom: '0.4rem', color: 'var(--text-muted)' }}>Repayment History:</div>
                                {r.repayments.map(rep => (
                                  <div key={rep.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.3rem 0', borderBottom: '1px solid var(--border)' }}>
                                    <span>{formatDateDisplay(rep.date)} {rep.note && <span style={{ opacity: 0.7 }}>- {rep.note}</span>}</span>
                                    <span style={{ fontWeight: 600, color: 'var(--primary)' }}>+{formatMoney(rep.amount)}</span>
                                  </div>
                                ))}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div className="ledger-modal__footer">
              <button
                type="button"
                className={`btn ledger-modal__whatsapp-btn ${whatsAppShareLoading ? 'loading' : ''} ${whatsAppCopied ? 'copied' : ''}`}
                onClick={handleShareLedgerOnWhatsApp}
                disabled={whatsAppShareLoading}
                title="Share professional ledger summary on WhatsApp"
                style={{ position: 'relative' }}
              >
                {whatsAppShareLoading ? (
                  <>
                    <span className="loading-spinner" style={{
                      display: 'inline-block',
                      width: '16px',
                      height: '16px',
                      marginRight: '8px',
                      border: '2px solid rgba(255,255,255,0.3)',
                      borderTop: '2px solid #fff',
                      borderRadius: '50%',
                      animation: 'spin 0.6s linear infinite'
                    }} />
                    Generating...
                  </>
                ) : whatsAppCopied ? (
                  <>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ marginRight: '6px', display: 'inline-block' }}>
                      <polyline points="20 6 9 17 4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Copied!
                  </>
                ) : (
                  <>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ marginRight: '6px', display: 'inline-block' }}>
                      <path
                        d="M20.52 3.48A11.9 11.9 0 0 0 12.07 0C5.5 0 .16 5.34.16 11.91c0 2.1.55 4.16 1.6 5.98L0 24l6.29-1.65a11.87 11.87 0 0 0 5.77 1.47h.01c6.57 0 11.91-5.34 11.91-11.91 0-3.18-1.24-6.17-3.46-8.43Zm-8.45 18.37h-.01a9.9 9.9 0 0 1-5.03-1.37l-.36-.21-2.99.78.8-2.91-.23-.38a9.89 9.89 0 1 1 8.4 4.09Zm5.43-7.41c-.3-.15-1.77-.88-2.05-.98-.27-.1-.47-.15-.67.15-.2.3-.77.98-.94 1.18-.17.2-.35.22-.65.07-.3-.15-1.25-.46-2.38-1.46-.88-.78-1.47-1.75-1.64-2.05-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.53.15-.17.2-.3.3-.5.1-.2.05-.38-.03-.53-.08-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.53.08-.8.38-.27.3-1.05 1.03-1.05 2.5 0 1.47 1.08 2.89 1.23 3.09.15.2 2.12 3.24 5.14 4.54.72.31 1.29.49 1.73.62.73.23 1.4.2 1.92.12.59-.09 1.77-.72 2.02-1.41.25-.69.25-1.29.17-1.41-.07-.12-.27-.2-.57-.35Z"
                        fill="currentColor"
                      />
                    </svg>
                    Share Ledger
                  </>
                )}
              </button>
              <button className="btn" onClick={() => setLedgerModalOpen(false)}>Close Ledger</button>
            </div>
          </div>
        </div>
      )}

      {!!whatsAppModalMessage && (
        <div className="modal-overlay is-open" onClick={() => setWhatsAppModalMessage("")} style={{ zIndex: 1100 }}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <header className="modal__header">
              <h3 className="modal__title">WhatsApp</h3>
              <button type="button" className="modal__close" onClick={() => setWhatsAppModalMessage("")}>&times;</button>
            </header>
            <div className="modal__body">
              <p style={{ marginTop: 0, marginBottom: "1.25rem" }}>{whatsAppModalMessage}</p>
              <button
                type="button"
                className="btn btn--primary"
                style={{ width: "100%" }}
                onClick={() => setWhatsAppModalMessage("")}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {bulkRepayModalOpen && activeLedgerSummary && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200,
          padding: '1rem', backdropFilter: 'blur(3px)'
        }}>
          <div className="card fade-in" style={{ width: '100%', maxWidth: '450px', backgroundColor: 'var(--surface)', borderRadius: 'var(--radius)', position: 'relative' }}>
            <button
              onClick={() => setBulkRepayModalOpen(false)}
              style={{ position: 'absolute', top: '15px', right: '15px', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>

            <h3 className="card__heading" style={{ marginTop: 0, marginBottom: '0.5rem' }}>
              Payment
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              From <strong>{activeLedgerSummary.personName}</strong>
            </p>

            <form onSubmit={handleBulkRepaySubmit} className="expense-form">
              <div className="form-row">
                <label>Amount (Max: {formatMoney(activeLedgerSummary.pendingAmount)})</label>
                <div className="input-group">
                  <span className="input-prefix">Rs</span>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    max={activeLedgerSummary.pendingAmount}
                    required
                    value={bulkRepayAmount}
                    onChange={(e) => setBulkRepayAmount(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-row">
                <label>Date</label>
                <input
                  type="date"
                  required
                  value={bulkRepayDate}
                  onChange={(e) => setBulkRepayDate(e.target.value)}
                />
              </div>

              <div className="form-row">
                <label>Note / Reference</label>
                <input
                  type="text"
                  placeholder="e.g. Bank transfer, Cash..."
                  value={bulkRepayNote}
                  onChange={(e) => setBulkRepayNote(e.target.value)}
                />
              </div>

              <button type="submit" className="btn btn--primary" style={{ width: '100%', marginTop: '1rem', padding: '0.8rem' }} disabled={loading}>
                {loading ? 'Processing...' : 'Confirm Payment'}
              </button>
            </form>
          </div>
        </div>
      )}

      {receivedMoneyModalOpen && activeLedgerSummary && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200,
          padding: '1rem', backdropFilter: 'blur(3px)'
        }}>
          <div className="card fade-in" style={{ width: '100%', maxWidth: '450px', backgroundColor: 'var(--surface)', borderRadius: 'var(--radius)', position: 'relative' }}>
            <button
              onClick={() => setReceivedMoneyModalOpen(false)}
              style={{ position: 'absolute', top: '15px', right: '15px', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>

            <h3 className="card__heading" style={{ marginTop: 0, marginBottom: '0.5rem' }}>
              Payment
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              For <strong>{activeLedgerSummary.personName}</strong>
            </p>

            <form onSubmit={handleReceivedMoneySubmit} className="expense-form">
              <div className="form-row">
                <label>Amount</label>
                <div className="input-group">
                  <span className="input-prefix">Rs</span>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    required
                    value={receivedMoneyAmount}
                    onChange={(e) => setReceivedMoneyAmount(e.target.value)}
                    placeholder="Enter amount"
                  />
                </div>
              </div>

              <div className="form-row">
                <label>Transaction Type</label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <label style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px', padding: '0.6rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', background: receivedMoneyType === 'Received' ? 'rgba(52, 152, 219, 0.1)' : 'var(--surface)' }}>
                    <input
                      type="radio"
                      name="transactionType"
                      value="Received"
                      checked={receivedMoneyType === 'Received'}
                      onChange={(e) => setReceivedMoneyType(e.target.value)}
                      style={{ accentColor: '#3498db' }}
                    />
                    <span style={{ fontWeight: 500 }}>Received</span>
                  </label>
                  <label style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px', padding: '0.6rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', background: receivedMoneyType === 'Paid' ? 'rgba(231, 76, 60, 0.1)' : 'var(--surface)' }}>
                    <input
                      type="radio"
                      name="transactionType"
                      value="Paid"
                      checked={receivedMoneyType === 'Paid'}
                      onChange={(e) => setReceivedMoneyType(e.target.value)}
                      style={{ accentColor: '#e74c3c' }}
                    />
                    <span style={{ fontWeight: 500 }}>Paid</span>
                  </label>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                  {receivedMoneyType === 'Received'
                    ? 'Record payment received from this person (applies to lent records)'
                    : 'Record payment paid to this person (applies to borrowed records)'}
                </div>
              </div>

              <div className="form-row">
                <label>Date</label>
                <input
                  type="date"
                  required
                  value={receivedMoneyDate}
                  onChange={(e) => setReceivedMoneyDate(e.target.value)}
                />
              </div>

              <div className="form-row">
                <label>Note / Reference (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Bank transfer, Cash, UPI..."
                  value={receivedMoneyNote}
                  onChange={(e) => setReceivedMoneyNote(e.target.value)}
                />
              </div>

              <button type="submit" className="btn btn--primary" style={{ width: '100%', marginTop: '1rem', padding: '0.8rem' }} disabled={loading}>
                {loading ? 'Processing...' : 'Confirm'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
