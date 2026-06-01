import { useEffect, useMemo, useState } from "react";
import { generateAIResponse } from "../services/gemini.js";

const insightCards = [
  { key: "overview", title: "Overview", icon: "◎" },
  { key: "spendingAnalysis", title: "Spending Analysis", icon: "◔" },
  { key: "financialSuggestions", title: "Financial Suggestions", icon: "✦" },
  { key: "monthlySummary", title: "Monthly AI Summary", icon: "◫" },
  { key: "smartRecommendations", title: "Smart Recommendations", icon: "➜" },
  { key: "budgetAdvice", title: "Budget Advice", icon: "₹" },
];

function SkeletonCard() {
  return (
    <div
      style={{
        minHeight: 156,
        borderRadius: 22,
        padding: 18,
        border: "1px solid var(--insight-border)",
        background: "var(--insight-surface-alt)",
      }}
    >
      <div
        style={{
          width: "44%",
          height: 12,
          borderRadius: 999,
          background: "var(--skeleton-pill)",
          marginBottom: 18,
          animation: "insightPulse 1.1s infinite ease-in-out",
        }}
      />
      {[0, 1, 2, 3].map((item) => (
        <div
          key={item}
          style={{
            width: item === 3 ? "68%" : "100%",
            height: 10,
            borderRadius: 999,
            background: "var(--skeleton-line)",
            marginBottom: 12,
            animation: `insightPulse 1.1s ${item * 0.08}s infinite ease-in-out`,
          }}
        />
      ))}
    </div>
  );
}

function normalizeText(text) {
  return String(text || "").replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

function parseSectionedResponse(text) {
  const sections = {
    overview: "",
    spendingAnalysis: "",
    financialSuggestions: "",
    monthlySummary: "",
    smartRecommendations: "",
    budgetAdvice: "",
  };

  const patterns = {
    overview: "OVERVIEW",
    spendingAnalysis: "SPENDING_ANALYSIS",
    financialSuggestions: "FINANCIAL_SUGGESTIONS",
    monthlySummary: "MONTHLY_SUMMARY",
    smartRecommendations: "SMART_RECOMMENDATIONS",
    budgetAdvice: "BUDGET_ADVICE",
  };

  Object.entries(patterns).forEach(([key, label]) => {
    const regex = new RegExp(
      `${label}:([\\s\\S]*?)(?=OVERVIEW:|SPENDING_ANALYSIS:|FINANCIAL_SUGGESTIONS:|MONTHLY_SUMMARY:|SMART_RECOMMENDATIONS:|BUDGET_ADVICE:|$)`,
      "i"
    );
    const match = text.match(regex);
    sections[key] = normalizeText(match?.[1] || "");
  });

  return sections;
}

function buildInsightsPrompt({
  userName = "User",
  transactions = [],
  expenses = [],
  receiverTransactions = [],
  globalMetrics = {},
  lendBorrowRecords = [],
  records = [],
  monthLabel = "current month",
}) {
  const payload = {
    userName,
    transactions,
    expenses,
    receiverTransactions,
    globalMetrics,
    lendBorrowRecords: records.length > 0 ? records : lendBorrowRecords,
    monthLabel,
  };

  return `
You are a practical financial analyst inside an expense tracker app.
Use only the data provided below. If data is missing, say so clearly.
Keep each section short, specific, and useful.

Return the answer using exactly these section labels:
OVERVIEW:
SPENDING_ANALYSIS:
FINANCIAL_SUGGESTIONS:
MONTHLY_SUMMARY:
SMART_RECOMMENDATIONS:
BUDGET_ADVICE:

Financial context:
${JSON.stringify(payload, null, 2)}
  `.trim();
}

export default function ExpenseInsights({
  userName,
  transactions = [],
  expenses = [],
  receiverTransactions = [],
  globalMetrics = {},
  lendBorrowRecords = [],
  records = [],
  monthLabel = "current month",
  addToast,
  title = "AI Expense Insights",
  subtitle = "Generate Gemini-powered analysis from your live financial data.",
  autoRun = false,
}) {
  const [loading, setLoading] = useState(Boolean(autoRun));
  const [error, setError] = useState(null);
  const [insights, setInsights] = useState(null);
  const geminiConfigured = Boolean(
    String(import.meta.env.VITE_GEMINI_API_KEY || "").trim()
  );

  const hasInputData =
    expenses.length > 0 ||
    transactions.length > 0 ||
    receiverTransactions.length > 0 ||
    lendBorrowRecords.length > 0 ||
    records.length > 0;

  const prompt = useMemo(
    () =>
      buildInsightsPrompt({
        userName,
        transactions,
        expenses,
        receiverTransactions,
        globalMetrics,
        lendBorrowRecords,
        records,
        monthLabel,
      }),
    [
      userName,
      transactions,
      expenses,
      receiverTransactions,
      globalMetrics,
      lendBorrowRecords,
      records,
      monthLabel,
    ]
  );

  useEffect(() => {
    if (!error || !addToast) {
      return;
    }

    addToast(error, "error");
  }, [addToast, error]);

  const handleGenerate = async () => {
    if (!geminiConfigured) {
      setError("Gemini API key is missing. Add VITE_GEMINI_API_KEY to your Vite env file and restart the dev server.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const aiReply = await generateAIResponse(prompt);
      const parsed = parseSectionedResponse(aiReply);
      setInsights(parsed);
      if (addToast) {
        addToast("AI insights generated successfully.", "success");
      }
    } catch (err) {
      const message = err?.message || "Unable to generate expense insights right now.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (autoRun && hasInputData) {
      handleGenerate();
    }
  }, [autoRun, hasInputData, prompt]);

  return (
    <section
      className="card"
      style={{
        marginTop: "1.5rem",
        padding: 0,
        overflow: "hidden",
        borderRadius: 28,
        border: "1px solid var(--insight-border)",
        background: "var(--insight-surface)",
      }}
    >
      <div
        style={{
          padding: "22px 22px 16px",
          background: "var(--insight-header-bg)",
          borderBottom: "1px solid var(--insight-border)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <div>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                padding: "8px 12px",
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 700,
                color: "var(--text)",
                background: "var(--insight-pill-bg)",
                border: "1px solid var(--insight-border)",
                marginBottom: 14,
              }}
            >
              <span>Gemini 1.5 Flash</span>
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: geminiConfigured ? "var(--success)" : "var(--insight-pill-dot-off)",
                }}
              />
            </div>
            <h3 style={{ margin: 0, fontSize: 24, color: "var(--text)" }}>{title}</h3>
            <p style={{ margin: "8px 0 0", color: "var(--text-muted)", maxWidth: 720 }}>
              {subtitle}
            </p>
          </div>

          <button
            type="button"
            onClick={handleGenerate}
            disabled={loading || !hasInputData}
            style={{
              border: "none",
              borderRadius: 18,
              padding: "14px 18px",
              minWidth: 180,
              color: "var(--hero-contrast)",
              fontWeight: 700,
              cursor: loading || !hasInputData ? "not-allowed" : "pointer",
              opacity: loading || !hasInputData ? 0.7 : 1,
              background: "var(--accent-gradient-strong)",
            }}
          >
            {loading ? "Analyzing..." : "Generate Insights"}
          </button>
        </div>

        {!geminiConfigured && (
          <div
            style={{
              marginTop: 14,
              padding: "12px 14px",
              borderRadius: 18,
              background: "var(--insight-warning-bg)",
              border: "1px solid var(--insight-warning-border)",
              color: "var(--insight-warning-text)",
              fontSize: 13,
            }}
          >
            `VITE_GEMINI_API_KEY` is not configured.
          </div>
        )}

        {error && (
          <div
            style={{
              marginTop: 14,
              padding: "12px 14px",
              borderRadius: 18,
              background: "var(--insight-error-bg)",
              border: "1px solid var(--insight-error-border)",
              color: "var(--insight-error-text)",
              fontSize: 13,
            }}
          >
            {error}
          </div>
        )}
      </div>

      <div style={{ padding: 22 }}>
        {!hasInputData && !loading && (
          <div
            style={{
              borderRadius: 22,
              padding: 24,
              textAlign: "center",
              color: "var(--text-muted)",
              border: "1px dashed var(--border)",
              background: "var(--insight-muted-surface)",
            }}
          >
            Add transactions, expenses, or lend/borrow records to unlock AI analysis.
          </div>
        )}

        {loading && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
              gap: 16,
            }}
          >
            {Array.from({ length: 6 }).map((_, index) => (
              <SkeletonCard key={index} />
            ))}
          </div>
        )}

        {!loading && insights && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
              gap: 16,
            }}
          >
            {insightCards.map((card) => (
              <article
                key={card.key}
                style={{
                  minHeight: 170,
                  borderRadius: 24,
                  padding: 18,
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                  border: "1px solid var(--insight-border)",
                  background: "var(--insight-surface-alt)",
                  boxShadow: "var(--shadow-sm)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    color: "var(--text)",
                    fontWeight: 700,
                  }}
                >
                  <span
                    style={{
                      width: 34,
                      height: 34,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: 12,
                      background: "var(--insight-card-icon-bg)",
                    }}
                  >
                    {card.icon}
                  </span>
                  <span>{card.title}</span>
                </div>
                <p
                  style={{
                    margin: 0,
                    color: "var(--text-muted)",
                    lineHeight: 1.65,
                    fontSize: 14,
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {insights[card.key]}
                </p>
              </article>
            ))}
          </div>
        )}
      </div>

      <style>
        {`
          @keyframes insightPulse {
            0%, 100% {
              opacity: 0.55;
            }
            50% {
              opacity: 1;
            }
          }
        `}
      </style>
    </section>
  );
}
