import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import AdminSpinner from "../components/AdminSpinner";

/** Format "2025-04-05" → "Apr 5" for axis labels. */
function fmtDate(str) {
  const d = new Date(str + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/**
 * Area chart showing new user registrations per day.
 *
 * @param {{ data: Array<{ date: string, count: number }>|null, height?: number }} props
 */
export default function UserGrowthChart({ data, height = 180 }) {
  if (!data) return <div style={{ height, display: "flex", alignItems: "center", justifyContent: "center" }}><AdminSpinner /></div>;
  if (!data.length) return <p style={{ color: "var(--adm-muted)", fontSize: 13, textAlign: "center", paddingTop: 60 }}>No registrations in this period</p>;

  const accent = "#FF7A18";
  const muted = "var(--adm-muted)";
  const border = "var(--adm-border)";

  // Only show every Nth label to avoid crowding
  const step = Math.max(1, Math.floor(data.length / 6));
  const ticks = data.filter((_, i) => i % step === 0).map((d) => d.date);

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="userGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor={accent} stopOpacity={0.25} />
            <stop offset="95%" stopColor={accent} stopOpacity={0} />
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
          formatter={(v) => [v, "New users"]}
          labelFormatter={(l) => fmtDate(l)}
          contentStyle={{
            backgroundColor: "var(--adm-surface2)",
            border: "1px solid var(--adm-border)",
            borderRadius: 8,
            fontSize: 12,
            color: "var(--adm-text)",
          }}
        />
        <Area
          type="monotone"
          dataKey="count"
          stroke={accent}
          strokeWidth={2}
          fill="url(#userGrad)"
          dot={false}
          activeDot={{ r: 4, fill: accent }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
