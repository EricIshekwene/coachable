import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import AdminSpinner from "../components/AdminSpinner";

const SPORT_COLORS = [
  "#FF7A18", // orange — primary
  "#3b82f6", // blue
  "#22c55e", // green
  "#a855f7", // purple
  "#ec4899", // pink
  "#f59e0b", // amber
  "#14b8a6", // teal
  "#6b7280", // gray
];

/** Capitalize first letter of each word, replace underscores. */
function fmtSport(s) {
  return (s || "unknown")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Donut chart showing team distribution by sport.
 *
 * @param {{ data: Array<{ sport: string, teams: number }>|null, height?: number }} props
 */
export default function SportMixChart({ data, height = 180 }) {
  if (!data) return <div style={{ height, display: "flex", alignItems: "center", justifyContent: "center" }}><AdminSpinner /></div>;
  if (!data.length) return <p style={{ color: "var(--adm-muted)", fontSize: 13, textAlign: "center", paddingTop: 60 }}>No teams yet</p>;

  const chartData = data.map((d) => ({ ...d, name: fmtSport(d.sport) }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={chartData}
          dataKey="teams"
          nameKey="name"
          cx="50%"
          cy="50%"
          innerRadius={42}
          outerRadius={68}
          strokeWidth={0}
          paddingAngle={2}
        >
          {chartData.map((_, i) => (
            <Cell key={i} fill={SPORT_COLORS[i % SPORT_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          formatter={(v, name) => [`${v} teams`, name]}
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
          wrapperStyle={{ fontSize: 11, color: "var(--adm-muted)" }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
