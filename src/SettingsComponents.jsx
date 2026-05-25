import React from "react";

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
            backgroundColor: checked ? "var(--primary)" : "var(--surface-hover, #ccc)",
            transition: "0.4s",
            borderRadius: "24px"
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
              backgroundColor: "white",
              transition: "0.4s",
              borderRadius: "50%"
            }}
          />
        </span>
      </div>
    </label>
  );
}

export function ConfirmDialog({ isOpen, onConfirm, onCancel, title, message }) {
  if (!isOpen) return null;
  return (
    <div className="modal-overlay is-open" onClick={onCancel} style={{ zIndex: 1000 }}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <header className="modal__header">
          <h3 className="modal__title" style={{ color: "var(--debit, #ff5c5c)" }}>{title}</h3>
          <button type="button" className="modal__close" onClick={onCancel}>&times;</button>
        </header>
        <div className="modal__body">
          <p style={{ marginBottom: "1.5rem" }}>{message}</p>
          <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end" }}>
            <button type="button" className="btn btn--ghost" onClick={onCancel}>Cancel</button>
            <button type="button" className="btn btn--primary" style={{ backgroundColor: "var(--debit, #ff5c5c)" }} onClick={onConfirm}>Confirm</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ToastContainer({ toasts, onClose }) {
  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast toast--${toast.type}`}>
          <div className={`toast__icon toast__${toast.type}-icon`}>
            {toast.type === "success" ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="15" y1="9" x2="9" y2="15"></line>
                <line x1="9" y1="9" x2="15" y2="15"></line>
              </svg>
            )}
          </div>
          <div style={{ flex: 1 }}>{toast.message}</div>
          <button
            type="button"
            onClick={() => onClose(toast.id)}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.2rem' }}
          >
            &times;
          </button>
        </div>
      ))}
    </div>
  );
}
