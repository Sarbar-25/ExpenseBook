import { useEffect, useRef } from "react";
import Chart from "chart.js/auto";
import { formatMoney } from "./utils";

/**
 * Flexible chart component: Bar or Pie/Doughnut (Chart.js).
 */
export default function SummaryChart({ type = "bar", data = [], labels = [] }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;

    const config = {
      type: type,
      data: {
        labels: labels.length ? labels : ["N/A"],
        datasets: [
          {
            label: type === "bar" ? "Amount (INR)" : "Distribution",
            data: data.length ? data : [0],
            backgroundColor: type === "bar" 
              ? ["rgba(5, 150, 105, 0.65)", "rgba(220, 38, 38, 0.65)", "rgba(71, 85, 105, 0.65)"]
              : ["#3b82f6", "#8b5cf6", "#f59e0b", "#10b981", "#ec4899"],
            borderColor: type === "bar" 
              ? ["#059669", "#dc2626", "#475569"]
              : "transparent",
            borderWidth: type === "bar" ? 1 : 0,
            borderRadius: type === "bar" ? 8 : 0,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: type !== "bar", position: "bottom" },
          tooltip: {
            callbacks: {
              label: (ctx) => formatMoney(ctx.raw),
            },
          },
        },
        scales: type === "bar" ? {
          y: {
            beginAtZero: true,
            ticks: { callback: (v) => `₹${v}` },
            grid: { color: "rgba(148, 163, 184, 0.1)" },
          },
          x: { grid: { display: false } },
        } : {
          y: { display: false },
          x: { display: false }
        },
      },
    };

    const chart = new Chart(el, config);
    chartRef.current = chart;

    return () => {
      chart.destroy();
      chartRef.current = null;
    };
  }, [type]); // Re-create chart if type changes

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    chart.data.labels = labels.length ? labels : ["N/A"];
    chart.data.datasets[0].data = data.length ? data : [0];
    chart.update();
  }, [data, labels]);

  return (
    <div className="chart-wrap" style={{ height: "100%", width: "100%" }}>
      <canvas
        ref={canvasRef}
        aria-label={`${type} chart of financial data`}
      />
    </div>
  );
}