import React from "react";
import {
  Bell,
  CheckCircle2,
  Clock3,
  Info,
  TriangleAlert,
  X,
  XCircle,
} from "lucide-react";

export function SettingsCard({ title, icon, children }) {
  return (
    <div className="settings-card">
      <div className="settings-card__header">
        <div className="settings-card__icon">
          {icon}
        </div>
        <h3 className="settings-card__title">{title}</h3>
      </div>
      <div className="settings-card__content">
        {children}
      </div>
    </div>
  );
}

export function ToggleSwitch({ checked, onChange, label }) {
  return (
    <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}>
      <span style={{ fontWeight: 500, color: "var(--text)" }}>{label}</span>
      <div style={{ position: "relative", width: "44px", height: "24px" }}>
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          style={{ opacity: 0, width: 0, height: 0, position: "absolute" }}
        />
        <span
          style={{
            position: "absolute",
            cursor: "pointer",
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: checked ? "var(--accent)" : "var(--surface-hover)",
            transition: "0.4s",
            borderRadius: "24px",
            border: "1px solid var(--border)"
          }}
        >
          <span
            style={{
              position: "absolute",
              content: '""',
              height: "18px",
              width: "18px",
              left: checked ? "22px" : "3px",
              bottom: "3px",
              backgroundColor: "var(--surface-solid)",
              transition: "0.4s",
              borderRadius: "50%"
            }}
          />
        </span>
      </div>
    </label>
  );
}

export function ConfirmDialog({ isOpen, onConfirm, onCancel, title, message, confirmLabel = "Confirm" }) {
  if (!isOpen) return null;
  return (
    <div className="modal-overlay is-open" onClick={onCancel} style={{ zIndex: 1000 }}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <header className="modal__header">
          <h3 className="modal__title" style={{ color: "var(--danger-text)" }}>{title}</h3>
          <button type="button" className="modal__close" onClick={onCancel}>&times;</button>
        </header>
        <div className="modal__body">
          <p style={{ marginBottom: "1.5rem" }}>{message}</p>
          <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end" }}>
            <button type="button" className="btn btn--ghost" onClick={onCancel}>Cancel</button>
            <button type="button" className="btn btn--primary" style={{ background: "linear-gradient(135deg, var(--danger) 0%, var(--danger-text) 100%)" }} onClick={onConfirm}>{confirmLabel}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function formatNotificationTime(timestamp) {
  if (!timestamp) return "";

  try {
    const date = new Date(timestamp);
    const now = new Date();
    const sameDay = date.toDateString() === now.toDateString();

    return sameDay
      ? date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
      : date.toLocaleDateString([], { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

function NotificationTypeIcon({ type }) {
  if (type === "success") return <CheckCircle2 size={18} />;
  if (type === "error") return <XCircle size={18} />;
  if (type === "warning") return <TriangleAlert size={18} />;
  if (type === "info") return <Info size={18} />;
  return <Bell size={18} />;
}

export function NotificationPanel({
  notifications,
  unreadCount,
  onMarkAllRead,
  onClearAll,
  onItemClick,
}) {
  return (
    <div className="notif-dropdown notif-dropdown--panel is-open" role="dialog" aria-label="Notifications panel">
      <div className="notif-panel__header">
        <div>
          <p className="notif-panel__eyebrow">Notification Center</p>
          <h3 className="notif-panel__title">Activity</h3>
        </div>
        <span className="notif-panel__count">{unreadCount} unread</span>
      </div>

      <div className="notif-panel__actions">
        <button type="button" className="notif-panel__action" onClick={onMarkAllRead}>
          Mark All Read
        </button>
        <button type="button" className="notif-panel__action" onClick={onClearAll}>
          Clear All
        </button>
      </div>

      <div className="notif-panel__list" role="list">
        {notifications.length === 0 ? (
          <div className="notif-panel__empty">
            <span className="notif-panel__emptyIcon" aria-hidden="true">
              <Bell size={18} />
            </span>
            <div>
              <p className="notif-panel__emptyTitle">No notifications yet</p>
              <p className="notif-panel__emptyText">Your latest ExpensePr activity will appear here.</p>
            </div>
          </div>
        ) : (
          notifications.map((notification) => (
            <button
              key={notification.id}
              type="button"
              className={`notif-entry notif-entry--${notification.type}${notification.read ? "" : " is-unread"}`}
              onClick={() => onItemClick?.(notification.id)}
            >
              <span className={`notif-entry__icon notif-entry__icon--${notification.type}`} aria-hidden="true">
                <NotificationTypeIcon type={notification.type} />
              </span>

              <span className="notif-entry__content">
                <span className="notif-entry__topline">
                  <span className="notif-entry__title">{notification.title}</span>
                  <span className="notif-entry__time">
                    <Clock3 size={12} />
                    {formatNotificationTime(notification.timestamp)}
                  </span>
                </span>
                <span className="notif-entry__description">{notification.description}</span>
              </span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

export function ToastContainer({ toasts, onClose }) {
  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast toast--${toast.type}${toast.isClosing ? " is-closing" : ""}`}>
          <div className={`toast__icon toast__icon--${toast.type}`}>
            <NotificationTypeIcon type={toast.type} />
          </div>
          <div className="toast__content">
            <div className="toast__topline">
              <strong className="toast__title">{toast.title}</strong>
              <span className="toast__time">{formatNotificationTime(toast.timestamp)}</span>
            </div>
            <p className="toast__description">{toast.description || toast.message}</p>
          </div>
          <button
            type="button"
            className="toast__close"
            onClick={() => onClose(toast.id)}
            aria-label="Dismiss notification"
          >
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}
