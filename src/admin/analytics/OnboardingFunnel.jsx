import { useId } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Cell, ResponsiveContainer, LabelList } from "recharts";
import AdminSpinner from "../components/AdminSpinner";

function FunnelHoverCursor({ x, y, width, height, gradientId }) {
  return (
    <rect
      x={x}
      y={y}
      width={width}
      height={height}
      rx={10}
      ry={10}
      fill={`url(#${gradientId})`}
      stroke="rgba(74, 222, 128, 0.28)"
      strokeWidth={1}
    />
  );
}

/**
 * Horizontal funnel chart showing the onboarding conversion steps.
 *
 * @param {{
 *   data: {
 *     registered: number,
 *     email_verified: number,
 *     onboarded: number,
 *     has_team: number,
 *     has_plays: number,
 *   }|null
 *   height?: number,
 * }} props
 */
export default function OnboardingFunnel({ data, height = 180 }) {
  const hoverGradientId = `funnelHover${useId().replace(/:/g, "")}`;
  if (!data) return <div style={{ height, display: "flex", alignItems: "center", justifyContent: "center" }}><AdminSpinner /></div>;

  const total = data.registered || 1;

  const steps = [
    { label: "Registered",     value: data.registered    ?? 0 },
    { label: "Email Verified", value: data.email_verified ?? 0 },
    { label: "Onboarded",      value: data.onboarded      ?? 0 },
    { label: "Has Team",       value: data.has_team       ?? 0 },
    { label: "Has Plays",      value: data.has_plays      ?? 0 },
  ];

  const muted  = "var(--adm-muted)";

  // Color fade: brightest at top, dimmer as funnel narrows
  function fillColor(index) {
    const opacity = 1 - index * 0.14;
    return `rgba(255, 122, 24, ${opacity})`;
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        layout="vertical"
        data={steps}
        margin={{ top: 0, right: 40, left: 8, bottom: 0 }}
      >
        <defs>
          <linearGradient id={hoverGradientId} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="rgba(255, 122, 24, 0.06)" />
            <stop offset="55%" stopColor="rgba(255, 122, 24, 0.12)" />
            <stop offset="100%" stopColor="rgba(74, 222, 128, 0.18)" />
          </linearGradient>
        </defs>
        <XAxis
          type="number"
          tick={{ fill: muted, fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          domain={[0, total]}
        />
        <YAxis
          type="category"
          dataKey="label"
          tick={{ fill: muted, fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={90}
        />
        <Tooltip
          cursor={<FunnelHoverCursor gradientId={hoverGradientId} />}
          formatter={(v) => [`${v} (${Math.round((v / total) * 100)}%)`, "Users"]}
          contentStyle={{
            backgroundColor: "var(--adm-surface2)",
            border: "1px solid var(--adm-border)",
            borderRadius: 8,
            fontSize: 12,
            color: "var(--adm-text)",
          }}
        />
        <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={18}>
          {steps.map((_, i) => (
            <Cell key={i} fill={fillColor(i)} />
          ))}
          <LabelList
            dataKey="value"
            position="right"
            style={{ fill: muted, fontSize: 11 }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
