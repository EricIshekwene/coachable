import { useId } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import AdminSpinner from "../components/AdminSpinner";

function ActivityHoverCursor({ x, y, width, height, gradientId }) {
  return (
    <rect
      x={x}
      y={y}
      width={width}
      height={height}
      rx={12}
      ry={12}
      fill={`url(#${gradientId})`}
      stroke="rgba(96, 165, 250, 0.32)"
      strokeWidth={1}
    />
  );
}

function fmtDate(str) {
  const d = new Date(str + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/**
 * Grouped bar chart showing plays created vs updated per day.
 *
 * @param {{ data: Array<{ date: string, created: number, updated: number }>|null, height?: number }} props
 */
export default function PlayActivityChart({ data, height = 180 }) {
  const hoverGradientId = `playActivityHover${useId().replace(/:/g, "")}`;
  if (!data) return <div style={{ height, display: "flex", alignItems: "center", justifyContent: "center" }}><AdminSpinner /></div>;
  if (!data.length) return <p style={{ color: "var(--adm-muted)", fontSize: 13, textAlign: "center", paddingTop: 60 }}>No play activity in this period</p>;

  const accent  = "#FF7A18";
  const accent2 = "#3b82f6"; // blue for "updated"
  const muted   = "var(--adm-muted)";
  const border  = "var(--adm-border)";

  const step = Math.max(1, Math.floor(data.length / 6));
  const ticks = data.filter((_, i) => i % step === 0).map((d) => d.date);

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id={hoverGradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(96, 165, 250, 0.18)" />
            <stop offset="55%" stopColor="rgba(59, 130, 246, 0.10)" />
            <stop offset="100%" stopColor="rgba(255, 122, 24, 0.14)" />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={border} vertical={false} />
        <XAxis
          dataKey="date"
          ticks={ticks}
          tickFormatter={fmtDate}
          tick={{ fill: muted, fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: muted, fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          allowDecimals={false}
        />
        <Tooltip
          cursor={<ActivityHoverCursor gradientId={hoverGradientId} />}
          labelFormatter={(l) => fmtDate(l)}
          contentStyle={{
            backgroundColor: "var(--adm-surface2)",
            border: "1px solid var(--adm-border)",
            borderRadius: 8,
            fontSize: 12,
            color: "var(--adm-text)",
          }}
        />
        <Legend
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: 11, color: muted, paddingTop: 6 }}
        />
        <Bar dataKey="created" name="Created" fill={accent}  radius={[3,3,0,0]} maxBarSize={20} />
        <Bar dataKey="updated" name="Updated" fill={accent2} radius={[3,3,0,0]} maxBarSize={20} />
      </BarChart>
    </ResponsiveContainer>
  );
}
