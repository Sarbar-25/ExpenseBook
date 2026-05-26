import { useEffect, useRef } from "react";
import Chart from "chart.js/auto";
import { formatMoney } from "./utils";

/**
 * Flexible chart component: Bar or Pie/Doughnut (Chart.js).
 * Uses CSS variables for theme-aware colors.
 */
export default function SummaryChart({ type = "bar", data = [], labels = [] }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  // Get theme-aware colors from CSS variables
  const getChartColors = () => {
    const computedStyle = getComputedStyle(document.documentElement);
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';

    return {
      barColors: [
        computedStyle.getPropertyValue('--chart-bar-1').trim() || (isDark ? 'rgba(52, 211, 153, 0.7)' : 'rgba(16, 185, 129, 0.65)'),
        computedStyle.getPropertyValue('--chart-bar-2').trim() || (isDark ? 'rgba(248, 113, 113, 0.7)' : 'rgba(239, 68, 68, 0.65)'),
        computedStyle.getPropertyValue('--chart-bar-3').trim() || (isDark ? 'rgba(96, 165, 250, 0.7)' : 'rgba(59, 130, 246, 0.65)')
      ],
      pieColors: [
        computedStyle.getPropertyValue('--chart-pie-1').trim() || (isDark ? '#34d399' : '#10b981'),
        computedStyle.getPropertyValue('--chart-pie-2').trim() || (isDark ? '#60a5fa' : '#3b82f6'),
        computedStyle.getPropertyValue('--chart-pie-3').trim() || (isDark ? '#fbbf24' : '#f59e0b'),
        computedStyle.getPropertyValue('--chart-pie-4').trim() || (isDark ? '#a78bfa' : '#8b5cf6'),
        computedStyle.getPropertyValue('--chart-pie-5').trim() || (isDark ? '#f87171' : '#ef4444')
      ],
      gridColor: computedStyle.getPropertyValue('--chart-grid').trim() || (isDark ? 'rgba(148, 163, 184, 0.15)' : 'rgba(148, 163, 184, 0.1)')
    };
  };

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;

    const colors = getChartColors();

    const config = {
      type: type,
      data: {
        labels: labels.length ? labels : ["N/A"],
        datasets: [
          {
            label: type === "bar" ? "Amount (INR)" : "Distribution",
            data: data.length ? data : [0],
            backgroundColor: type === "bar"
              ? colors.barColors
              : colors.pieColors,
            borderColor: type === "bar"
              ? colors.barColors.map(c => c.replace(/[\d.]+\)$/, '1)')) // More opaque border
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
          legend: {
            display: type !== "bar",
            position: "bottom",
            labels: {
              color: getComputedStyle(document.documentElement).getPropertyValue('--text-muted').trim() || '#64748b'
            }
          },
          tooltip: {
            callbacks: {
              label: (ctx) => formatMoney(ctx.raw),
            },
            backgroundColor: getComputedStyle(document.documentElement).getPropertyValue('--card').trim() || 'rgba(255,255,255,0.9)',
            titleColor: getComputedStyle(document.documentElement).getPropertyValue('--text').trim() || '#0f172a',
            bodyColor: getComputedStyle(document.documentElement).getPropertyValue('--text-muted').trim() || '#64748b',
            borderColor: getComputedStyle(document.documentElement).getPropertyValue('--border').trim() || 'rgba(15,23,42,0.08)',
            borderWidth: 1,
          },
        },
        scales: type === "bar" ? {
          y: {
            beginAtZero: true,
            ticks: {
              callback: (v) => `₹${v}`,
              color: getComputedStyle(document.documentElement).getPropertyValue('--text-muted').trim() || '#64748b'
            },
            grid: { color: colors.gridColor },
          },
          x: {
            grid: { display: false },
            ticks: {
              color: getComputedStyle(document.documentElement).getPropertyValue('--text-muted').trim() || '#64748b'
            }
          },
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

  // Update chart when data or labels change
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    chart.data.labels = labels.length ? labels : ["N/A"];
    chart.data.datasets[0].data = data.length ? data : [0];
    chart.update();
  }, [data, labels]);

  // Update chart colors when theme changes
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    const colors = getChartColors();
    const textColor = getComputedStyle(document.documentElement).getPropertyValue('--text-muted').trim() || '#64748b';
    const textPrimary = getComputedStyle(document.documentElement).getPropertyValue('--text').trim() || '#0f172a';
    const cardBg = getComputedStyle(document.documentElement).getPropertyValue('--card').trim() || 'rgba(255,255,255,0.9)';
    const borderColor = getComputedStyle(document.documentElement).getPropertyValue('--border').trim() || 'rgba(15,23,42,0.08)';

    // Update dataset colors
    if (type === "bar") {
      chart.data.datasets[0].backgroundColor = colors.barColors;
      chart.data.datasets[0].borderColor = colors.barColors.map(c => c.replace(/[\d.]+\)$/, '1)'));
    } else {
      chart.data.datasets[0].backgroundColor = colors.pieColors;
    }

    // Update scale colors
    if (type === "bar" && chart.options.scales) {
      chart.options.scales.y.ticks.color = textColor;
      chart.options.scales.y.grid.color = colors.gridColor;
      chart.options.scales.x.ticks.color = textColor;
    }

    // Update legend colors
    if (chart.options.plugins.legend) {
      chart.options.plugins.legend.labels.color = textColor;
    }

    // Update tooltip colors
    chart.options.plugins.tooltip.backgroundColor = cardBg;
    chart.options.plugins.tooltip.titleColor = textPrimary;
    chart.options.plugins.tooltip.bodyColor = textColor;
    chart.options.plugins.tooltip.borderColor = borderColor;

    chart.update();
  }, [type]); // Re-run when type changes (which is when theme might change too)

  return (
    <div className="chart-wrap" style={{ height: "100%", width: "100%" }}>
      <canvas
        ref={canvasRef}
        aria-label={`${type} chart of financial data`}
      />
    </div>
  );
}
