import { useState } from "react";

export default function ChatbotButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {isOpen && (
        <div
          style={{
            position: "fixed",
            bottom: "80px",
            right: "20px",
            width: "320px",
            height: "400px",
            background: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: "20px",
            boxShadow: "var(--shadow-lg)",
            zIndex: 999998,
            color: "var(--text)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "16px",
              borderBottom: "1px solid var(--border)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              background: "var(--accent-gradient)",
              color: "var(--surface-solid)",
            }}
          >
            <span style={{ fontWeight: 700 }}>AI Assistant</span>
            <button
              onClick={() => setIsOpen(false)}
              style={{
                background: "transparent",
                border: "none",
                color: "inherit",
                cursor: "pointer",
                fontSize: "1.2rem",
              }}
            >
              ×
            </button>
          </div>
          <div
            style={{
              flex: 1,
              padding: "16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--text-muted)",
              fontSize: "0.9rem",
            }}
          >
            AI Chat coming soon...
          </div>
        </div>
      )}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: "fixed",
          bottom: "20px",
          right: "20px",
          width: "56px",
          height: "56px",
          borderRadius: "50%",
          background: "var(--accent-gradient)",
          color: "var(--surface-solid)",
          border: "none",
          boxShadow: "var(--shadow-md)",
          cursor: "pointer",
          zIndex: 999999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "1.5rem",
          transition: "transform 0.2s ease, box-shadow 0.2s ease",
        }}
        onMouseEnter={(e) => {
          e.target.style.transform = "scale(1.05)";
        }}
        onMouseLeave={(e) => {
          e.target.style.transform = "scale(1)";
        }}
        aria-label="Open AI Assistant"
      >
        💬
      </button>
    </>
  );
}