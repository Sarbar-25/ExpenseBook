import React, { useState } from "react";
import { SettingsCard, ConfirmDialog } from "./SettingsComponents";

export default function SettingsPage({
  user,
  onLogout,
  onReset,
  theme,
  setTheme,
  userCurrency,
  setUserCurrency,
  userName,
  setUserName,
  addToast
}) {
  const [isResetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [isLogoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editNameInput, setEditNameInput] = useState("");

  return (
    <div className="settings-container">
      <div className="settings-header">
        <h2>Settings</h2>
        <p>Manage your account, preferences, and data.</p>
      </div>

      <div className="settings-section">
        <SettingsCard
          title="Account Settings"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          }
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
            <div>
              <p style={{ margin: 0, fontWeight: 500, color: "var(--text)" }}>Logged in as</p>
              <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "0.9rem" }}>
                {userName} {user?.email ? `(${user.email})` : ''}
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button type="button" className="btn btn--outline" onClick={() => {
                setEditNameInput(userName === "User" ? "" : userName);
                setIsEditingName(true);
              }}>
                Edit Name
              </button>
              <button type="button" className="btn btn--outline" onClick={() => setLogoutConfirmOpen(true)}>
                Logout
              </button>
            </div>
          </div>
          {isEditingName && (
            <div style={{ marginTop: '1rem', padding: '1rem', background: 'var(--surface-soft)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
              <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.5rem', fontWeight: 500, color: 'var(--text)' }}>Update Name</label>
              <input
                type="text"
                value={editNameInput}
                onChange={(e) => setEditNameInput(e.target.value)}
                placeholder="Enter your name"
                maxLength={20}
                style={{ width: "100%", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "0.6rem 0.7rem", fontFamily: "inherit", fontSize: "0.9rem", background: "var(--surface)", color: "var(--text)", marginBottom: '0.75rem' }}
              />
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  className="btn btn--primary"
                  onClick={() => {
                    const trimmed = editNameInput.trim();
                    if (!trimmed) {
                      addToast("Name cannot be empty", "error");
                      return;
                    }
                    if (trimmed.length > 20) {
                      addToast("Name must be under 20 characters", "error");
                      return;
                    }
                    try {
                      localStorage.setItem("expensebook_username", trimmed);
                    } catch {
                      // ignore storage failures in private/incognito mode
                    }
                    setUserName(trimmed);
                    setIsEditingName(false);
                    addToast({
                      type: "success",
                      title: "Profile Updated",
                      description: "Your display name was updated successfully.",
                    });
                  }}
                >
                  Save
                </button>
                <button className="btn btn--outline" onClick={() => setIsEditingName(false)}>Cancel</button>
              </div>
            </div>
          )}
        </SettingsCard>

        <SettingsCard
          title="App Preferences"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          }
        >
          <div className="form-row">
            <label htmlFor="currencySelect" style={{ fontWeight: 500, color: "var(--text)" }}>Default Currency</label>
            <select
              id="currencySelect"
              value={userCurrency}
              onChange={(e) => {
                setUserCurrency(e.target.value);
                localStorage.setItem("userCurrency", e.target.value);
                window.dispatchEvent(new Event('storage')); // trigger updates if needed
                addToast({
                  type: "info",
                  title: "Currency Updated",
                  description: `Default currency changed to ${e.target.value}.`,
                });
              }}
              style={{ width: "100%", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "0.6rem 0.7rem", fontFamily: "inherit", fontSize: "0.9rem", background: "var(--surface)", color: "var(--text)" }}
            >
              <option value="INR">₹ INR (Indian Rupee)</option>
              <option value="USD">$ USD (US Dollar)</option>
              <option value="EUR">€ EUR (Euro)</option>
              <option value="GBP">£ GBP (British Pound)</option>
            </select>
          </div>


        </SettingsCard>

        <SettingsCard
          title="Theme Settings"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="5" />
              <line x1="12" y1="1" x2="12" y2="3" />
              <line x1="12" y1="21" x2="12" y2="23" />
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
              <line x1="1" y1="12" x2="3" y2="12" />
              <line x1="21" y1="12" x2="23" y2="12" />
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
            </svg>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
            {[
              { id: "light", label: "Light Mode" },
              { id: "dark", label: "Dark Mode" },
            ].map((t) => (
              <label key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: 'var(--text)' }}>
                <input
                  type="radio"
                  name="theme"
                  value={t.id}
                  checked={theme === t.id}
                  onChange={(e) => {
                    setTheme(e.target.value);
                    addToast({
                      type: "info",
                      title: "Theme Updated",
                      description: `${t.label} is now active across ExpensePr.`,
                    });
                  }}
                  style={{ width: '16px', height: '16px', accentColor: 'var(--accent)' }}
                />
                <span className={`theme-swatch theme-swatch--${t.id}`}></span>
                {t.label}
              </label>
            ))}
          </div>
          <p style={{ margin: "1rem 0 0 0", color: "var(--text-muted)", fontSize: "0.85rem" }}>
            Select an application theme. Changes apply instantly.
          </p>
        </SettingsCard>

        <SettingsCard
          title="Data Management"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
          }
        >
          <p style={{ margin: "0 0 1rem 0", color: "var(--text-muted)", fontSize: "0.9rem" }}>
            Warning: Resetting your data will permanently delete all expenses, transactions, and senders. This action cannot be undone.
          </p>
          <button
            type="button"
            className="btn--danger-reset"
            style={{ width: "fit-content" }}
            onClick={() => setResetConfirmOpen(true)}
          >
            Reset All Data
          </button>
        </SettingsCard>

        <ConfirmDialog
          isOpen={isResetConfirmOpen}
          title="Reset All Data?"
          message="Are you completely sure you want to wipe all transactions, expenses, and senders? This action cannot be undone and will permanently wipe your cloud backup as well."
          onConfirm={() => {
            onReset();
            setResetConfirmOpen(false);
          }}
          onCancel={() => setResetConfirmOpen(false)}
        />
        <ConfirmDialog
          isOpen={isLogoutConfirmOpen}
          title="Logout?"
          message="Are you sure you want to log out from this session?"
          onConfirm={() => {
            onLogout();
            setLogoutConfirmOpen(false);
          }}
          onCancel={() => setLogoutConfirmOpen(false)}
        />
      </div>
    </div>
  );
}
