import React, { useRef, useEffect, useState } from 'react';
import uPlot from 'uplot';
import 'uplot/dist/uPlot.min.css';
import './chart.css';

/**
 * Reusable uPlot chart wrapper styled for the Etica pool dark theme.
 *
 * Props:
 *   data      - uPlot columnar data: [[timestamps], [y1], [y2], ...]
 *   series    - Array of series configs: [{ label, color, width?, dash?, scale?, value? }, ...]
 *               series[0] is always the time axis (auto-handled).
 *   title     - Chart title string (top-left).
 *   timeRange - Array of { label, value, active? } for timeframe pills (top-right).
 *               value is opaque — passed back via onTimeRangeChange.
 *   onTimeRangeChange - Callback(value) when a pill is clicked.
 *   stats     - Array of { label, value, color? } for stats row below chart.
 *   legend    - Array of { label, color } for footer legend.
 *   height    - Chart pixel height (default 300).
 *   axes      - Optional override for uPlot axes config array.
 *   scales    - Optional override for uPlot scales config.
 */
export default function PoolChart({
  data,
  series = [],
  title,
  timeRange,
  onTimeRangeChange,
  stats,
  legend,
  height = 300,
  axes: axesOverride,
  scales: scalesOverride,
}) {
  const containerRef = useRef(null);
  const chartRef = useRef(null);
  const [width, setWidth] = useState(0);

  // Keep series/scales/axes in a ref so the chart effect doesn't re-fire on every render
  const seriesRef = useRef(series);
  const scalesRef = useRef(scalesOverride);
  const axesRef = useRef(axesOverride);
  seriesRef.current = series;
  scalesRef.current = scalesOverride;
  axesRef.current = axesOverride;

  // Derive series colors for scale indicators
  const primaryColor = series[0]?.color || '#34d399';
  const secondaryColor = series.length > 1 ? series[1]?.color : null;

  // ResizeObserver to track container width
  useEffect(() => {
    const el = containerRef.current?.parentElement;
    if (!el) return;

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = Math.floor(entry.contentRect.width);
        if (w > 0) setWidth((prev) => (prev === w ? prev : w));
      }
    });
    ro.observe(el);

    // Initial measurement
    const initW = Math.floor(el.getBoundingClientRect().width);
    if (initW > 0) setWidth(initW);

    return () => ro.disconnect();
  }, []);

  // Create / recreate chart when data or width changes
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !data || data.length === 0 || !data[0] || data[0].length === 0) return;

    // Use state width, or measure directly as fallback
    let w = width;
    if (w <= 0) {
      const parent = container.parentElement;
      if (parent) w = Math.floor(parent.getBoundingClientRect().width);
      if (w <= 0) return;
    }

    const s = seriesRef.current;
    const pc = s[0]?.color || '#34d399';
    const sc = s.length > 1 ? s[1]?.color : null;
    const font = '11px "JetBrains Mono", "Fira Code", "Consolas", monospace';
    const gridStroke = 'rgba(255,255,255,0.04)';
    const tickStroke = 'rgba(255,255,255,0.08)';

    // Build axes
    const defaultAxes = [
      {
        stroke: 'rgba(255,255,255,0.15)',
        grid: { stroke: gridStroke, width: 1 },
        ticks: { stroke: tickStroke, width: 1 },
        font,
        gap: 8,
      },
      {
        stroke: pc,
        grid: { stroke: gridStroke, width: 1 },
        ticks: { stroke: tickStroke, width: 1 },
        font,
        gap: 8,
        size: 80,
      },
    ];

    if (s.length > 1 && s[1]?.scale) {
      defaultAxes.push({
        side: 1,
        scale: s[1].scale,
        stroke: sc || '#6b7280',
        grid: { show: false },
        ticks: { stroke: tickStroke, width: 1 },
        font,
        gap: 8,
        size: 70,
      });
    }

    // Build uPlot series config: index 0 is time (empty), rest from props
    const uSeries = [{}];
    for (const item of s) {
      uSeries.push({
        label: item.label || '',
        stroke: item.color || pc,
        width: item.width ?? 2,
        fill: item.fill || undefined,
        dash: item.dash || undefined,
        scale: item.scale || 'y',
        value: item.value || undefined,
        points: { show: false },
      });
    }

    const hasRightAxis = s.length > 1 && s[1]?.scale;

    const opts = {
      width: w,
      height,
      padding: [16, hasRightAxis ? 16 : 12, 0, 8],
      cursor: {
        drag: { setScale: false },
        focus: { prox: 30 },
        points: { size: 6, width: 2 },
      },
      legend: { show: false },
      scales: scalesRef.current || {
        x: { time: true },
        y: { auto: true },
      },
      axes: axesRef.current || defaultAxes,
      series: uSeries,
    };

    // Destroy previous instance
    if (chartRef.current) {
      chartRef.current.destroy();
      chartRef.current = null;
    }

    // Clear any leftover DOM from previous uPlot instance
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }

    chartRef.current = new uPlot(opts, data, container);

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, [data, width, height]);

  // Check for empty/missing data
  const hasData = data && data.length > 0 && data[0] && data[0].length > 1;

  return (
    <div className="os-chart-card">
      {/* Header */}
      {(title || timeRange) && (
        <div className="os-chart-header">
          {title && <span className="os-chart-title">{title}</span>}
          {timeRange && timeRange.length > 0 && (
            <div className="os-chart-pills">
              {timeRange.map((tr) => (
                <button
                  key={tr.value}
                  className={`os-chart-pill${tr.active ? ' active' : ''}`}
                  onClick={() => onTimeRangeChange?.(tr.value)}
                >
                  {tr.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Chart body */}
      <div className="os-chart-body">
        {/* Scale indicators only when data exists */}
        {hasData && (
          <>
            <div
              className="os-chart-scale-left"
              style={{
                background: primaryColor,
                boxShadow: `0 0 8px ${primaryColor}40`,
              }}
            />
            {secondaryColor && (
              <div
                className="os-chart-scale-right"
                style={{
                  background: secondaryColor,
                  boxShadow: `0 0 8px ${secondaryColor}40`,
                }}
              />
            )}
          </>
        )}

        {/* uPlot mount point */}
        <div className="os-chart-uplot" ref={containerRef} />
        {!hasData && (
          <div className="os-chart-empty" style={{ height }}>
            Not enough data yet — chart requires at least 2 data points
          </div>
        )}
      </div>

      {/* Stats row */}
      {stats && stats.length > 0 && (
        <div className="os-chart-stats">
          {stats.map((s, i) => (
            <div key={i} className="os-chart-stat">
              <div className="os-chart-stat-label">{s.label}</div>
              <div className="os-chart-stat-value" style={s.color ? { color: s.color } : undefined}>
                {s.value}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Legend */}
      {legend && legend.length > 0 && (
        <div className="os-chart-legend">
          {legend.map((l, i) => (
            <div key={i} className="os-chart-legend-item">
              <span className="os-chart-legend-dot" style={{ background: l.color }} />
              {l.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
