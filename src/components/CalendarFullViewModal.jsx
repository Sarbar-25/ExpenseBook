import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { formatMoney, formatDateDisplay } from "../utils.js";

export default function CalendarFullViewModal({
    isOpen,
    selectedDate,
    entries,
    onClose,
}) {
    const [canRender, setCanRender] = useState(false);


    useEffect(() => {
        if (!isOpen) return;
        const t = window.setTimeout(() => setCanRender(true), 0);
        return () => window.clearTimeout(t);
    }, [isOpen]);

    const modalRoot = useMemo(() => {
        if (typeof document === "undefined") return null;
        return document.body;
    }, []);

    useEffect(() => {
        if (!isOpen) return;

        const onKeyDown = (e) => {
            if (e.key === "Escape") onClose?.();
        };

        document.addEventListener("keydown", onKeyDown);
        return () => document.removeEventListener("keydown", onKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen || !modalRoot) return null;
    if (!canRender) return null;

    return createPortal(
        <div
            className="calendar-modal-overlay is-open"
            role="dialog"
            aria-modal="true"
            aria-label="Full view"
            onMouseDown={(e) => {
                // close when clicking overlay
                if (e.target === e.currentTarget) onClose?.();
            }}
        >
            <div className="calendar-modal" onMouseDown={(e) => e.stopPropagation()}>
                <div className="calendar-modal__header">
                    <div className="calendar-modal__titles">
                        <h3 className="calendar-modal__title">Expenses - {formatDateDisplay(selectedDate)}</h3>
                        <p className="calendar-modal__subtitle">
                            {entries?.length ? `${entries.length} item${entries.length === 1 ? "" : "s"}` : "No expenses"}
                        </p>
                    </div>
                    <button type="button" className="calendar-modal__close" aria-label="Close" onClick={onClose}>
                        ×
                    </button>
                </div>

                <div className="calendar-modal__body">
                    {(!entries || entries.length === 0) ? (
                        <div className="calendar-modal__empty">No expenses found for this date.</div>
                    ) : (
                        <div className="calendar-modal__list" role="list">
                            {entries.map((e) => (
                                <div key={e.id} className="calendar-modal__row" role="listitem">
                                    <div className="calendar-modal__row-main">
                                        <div className="calendar-modal__row-top">
                                            <div className="calendar-modal__name">{e.name}</div>
                                            <div className="calendar-modal__amount">{formatMoney(e.amount)}</div>
                                        </div>

                                        <div className="calendar-modal__meta">
                                            <span className="calendar-modal__pill">Category: {e.category || "General"}</span>
                                            <span className="calendar-modal__pill">Date: {e.date ? formatDateDisplay(e.date) : ""}</span>
                                        </div>

                                        {e.description ? (
                                            <div className="calendar-modal__desc">
                                                <span className="calendar-modal__desc-label">Description:</span> {e.description}
                                            </div>
                                        ) : null}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="calendar-modal__footer">
                    <div className="calendar-modal__total">
                        Total: <strong>{formatMoney((entries || []).reduce((s, e) => s + (Number(e.amount) || 0), 0))}</strong>
                    </div>
                </div>
            </div>

            <style>
                {`
          .calendar-modal-overlay{
            position:fixed;
            inset:0;
            background:rgba(0,0,0,0.35);
            display:flex;
            align-items:center;
            justify-content:center;
            padding:16px;
            z-index:9999;
          }
          .calendar-modal{
            width:min(820px, 100%);
            max-height:min(78vh, 720px);
            overflow:hidden;
            border-radius:16px;
            background:var(--surface);
            box-shadow:var(--shadow-lg, 0 20px 60px rgba(0,0,0,0.35));
            border:1px solid var(--border);
            backdrop-filter: blur(14px);
            -webkit-backdrop-filter: blur(14px);
          }
          .calendar-modal__header{
            display:flex;
            align-items:flex-start;
            justify-content:space-between;
            gap:12px;
            padding:18px 18px 12px;
            border-bottom:1px solid var(--border);
          }
          .calendar-modal__title{ margin:0; font-size:1.2rem; font-weight:900; letter-spacing:-0.01em; }
          .calendar-modal__subtitle{ margin:6px 0 0; color:var(--text-muted); font-size:0.95rem; }
          .calendar-modal__close{
            appearance:none;
            border:0;
            background:transparent;
            font-size:28px;
            line-height:1;
            cursor:pointer;
            color:var(--text);
            padding:6px 10px;
            border-radius:10px;
          }
          .calendar-modal__close:hover{ background:rgba(255,255,255,0.08); }

          .calendar-modal__body{
            padding:14px 18px;
            overflow:auto;
            max-height:calc(min(78vh, 720px) - 128px);
          }

          .calendar-modal__empty{ padding:24px 0; color:var(--text-muted); text-align:center; }

          .calendar-modal__list{ display:flex; flex-direction:column; gap:10px; }
          .calendar-modal__row{
            border:1px solid var(--border);
            border-radius:14px;
            padding:12px 12px;
            background:rgba(255,255,255,0.03);
          }

          .calendar-modal__row-top{ display:flex; align-items:flex-start; justify-content:space-between; gap:12px; }
          .calendar-modal__name{ font-weight:800; }
          .calendar-modal__amount{ font-weight:900; color:var(--text); }

          .calendar-modal__meta{ margin-top:8px; display:flex; gap:8px; flex-wrap:wrap; }
          .calendar-modal__pill{
            font-size:0.85rem;
            padding:4px 10px;
            border-radius:999px;
            border:1px solid var(--border);
            background:rgba(255,255,255,0.04);
            color:var(--text-muted);
          }

          .calendar-modal__desc{ margin-top:10px; color:var(--text-muted); font-size:0.95rem; }
          .calendar-modal__desc-label{ font-weight:800; color:var(--text); margin-right:6px; }

          .calendar-modal__footer{ padding:12px 18px 16px; border-top:1px solid var(--border); }
          .calendar-modal__total{ color:var(--text-muted); text-align:right; }
        `}
            </style>
        </div>,
        modalRoot
    );
}

