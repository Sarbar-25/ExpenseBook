import { useEffect, useRef } from "react";
import Chart from "chart.js/auto";
import { formatMoney } from "./utils";

/**
 * Bar chart: credit vs debit vs expenses (Chart.js).
 */
export default function SummaryChart({ totalCredit, totalDebit, totalExpenses }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;

    const chart = new Chart(el, {
      type: "bar",
      data: {
        labels: ["Credit", "Debit", "Expenses"],
        datasets: [
          {
            label: "Amount (INR)",
            data: [totalCredit, totalDebit, totalExpenses],
            backgroundColor: [
              "rgba(5, 150, 105, 0.65)",
              "rgba(220, 38, 38, 0.65)",
              "rgba(71, 85, 105, 0.65)",
            ],
            borderColor: ["#059669", "#dc2626", "#475569"],
            borderWidth: 1,
            borderRadius: 8,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => formatMoney(ctx.raw),
            },
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: (v) => `Rs ${v}`,
            },
            grid: { color: "rgba(148, 163, 184, 0.2)" },
          },
          x: {
            grid: { display: false },
          },
        },
      },
    });
    chartRef.current = chart;
    return () => {
      chart.destroy();
      chartRef.current = null;
    };
  }, []);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    chart.data.datasets[0].data = [totalCredit, totalDebit, totalExpenses];
    chart.update();
  }, [totalCredit, totalDebit, totalExpenses]);

  return (
    <div className="chart-wrap">
      <canvas
        ref={canvasRef}
        height={220}
        aria-label="Bar chart of credit, debit, and expenses"
      />
    </div>
  );
}