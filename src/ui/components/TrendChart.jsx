// TrendChart.jsx — رسم أعمدة بسيط (SVG) لتطور المصروفات شهريًا (بند 30/73).
// بدون أي مكتبة رسوم بيانية خارجية — نفس أسلوب الكود الحالي (CSS variables فقط).

export default function TrendChart({ data, labelKey = "monthValue", valueKey = "total" }) {
  if (!data || data.length === 0) {
    return <div className="dashboard-empty">لا توجد بيانات كافية لعرض الرسم البياني</div>;
  }

  const width = 640;
  const height = 220;
  const paddingBottom = 28;
  const paddingTop = 12;
  const chartHeight = height - paddingBottom - paddingTop;
  const barGap = 10;
  const barWidth = Math.max(18, (width - barGap * (data.length + 1)) / data.length);

  const maxValue = Math.max(...data.map((d) => d[valueKey]), 1);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="trend-chart"
      preserveAspectRatio="xMidYMid meet"
    >
      {data.map((d, i) => {
        const value = d[valueKey];
        const barHeight = (value / maxValue) * chartHeight;
        const x = barGap + i * (barWidth + barGap);
        const y = paddingTop + (chartHeight - barHeight);
        return (
          <g key={d[labelKey]}>
            <rect
              x={x}
              y={y}
              width={barWidth}
              height={barHeight}
              rx="4"
              fill="var(--primary)"
              opacity={i === data.length - 1 ? 1 : 0.55}
            />
            <text
              x={x + barWidth / 2}
              y={height - paddingBottom + 16}
              textAnchor="middle"
              fontSize="10"
              fill="var(--ink-muted)"
            >
              {d[labelKey]}
            </text>
            <text
              x={x + barWidth / 2}
              y={y - 4}
              textAnchor="middle"
              fontSize="10"
              fontWeight="700"
              fill="var(--ink)"
            >
              {Math.round(value)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
