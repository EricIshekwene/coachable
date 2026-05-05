import { useState } from "react";

/**
 * Single KPI tile in the analytics bento strip.
 *
 * @param {{
 *   label: string,
 *   value: string|number,
 *   delta: number|null,
 *   deltaLabel?: string,
 *   featured?: boolean,
 *   accent?: "danger"|"warn"|null,
 *   footer?: string,
 *   className?: string,
 *   onClick?: () => void,
 * }} props
 */
export default function KpiCard({
  label,
  value,
  delta,
  deltaLabel = "",
  featured = false,
  accent = null,
  footer = "",
  className = "",
  onClick,
}) {
  const [hovered, setHovered] = useState(false);
  const interactive = Boolean(onClick);

  const deltaColor =
    delta == null ? "var(--adm-muted)"
    : delta > 0   ? "var(--adm-success)"
    : delta < 0   ? "var(--adm-danger)"
    :               "var(--adm-muted)";

  const deltaText =
    delta == null ? null
    : `${delta > 0 ? "+" : ""}${delta}${deltaLabel ? " " + deltaLabel : ""}`;

  const accentBorder =
    accent === "danger" ? "1px solid rgba(239, 68, 68, 0.35)"
    : accent === "warn" ? "1px solid rgba(251, 191, 36, 0.35)"
    : featured ? "1px solid rgba(255, 122, 24, 0.18)"
    : "1px solid var(--adm-border)";

  const accentValueColor =
    accent === "danger" ? "var(--adm-danger)"
    : accent === "warn" ? "var(--adm-warning)"
    : "var(--adm-text)";

  const glowColor =
    accent === "danger" ? "rgba(239, 68, 68, 0.22)"
    : accent === "warn" ? "rgba(251, 191, 36, 0.22)"
    : featured ? "rgba(255, 122, 24, 0.18)"
    : "rgba(59, 130, 246, 0.12)";

  const background =
    accent === "danger"
      ? "linear-gradient(160deg, rgba(239, 68, 68, 0.08) 0%, var(--adm-surface2) 65%)"
      : accent === "warn"
        ? "linear-gradient(160deg, rgba(251, 191, 36, 0.08) 0%, var(--adm-surface2) 65%)"
        : featured
          ? "linear-gradient(160deg, rgba(255, 122, 24, 0.08) 0%, var(--adm-surface) 28%, var(--adm-surface2) 100%)"
          : "linear-gradient(180deg, var(--adm-surface2) 0%, var(--adm-surface) 100%)";

  const footerText = deltaText || footer || "\u00A0";
  const valueFontSize = featured ? 38 : 28;

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={className}
      style={{
        position: "relative",
        overflow: "hidden",
        width: "100%",
        height: "100%",
        minHeight: featured ? 148 : 118,
        background,
        border: accentBorder,
        borderRadius: "var(--adm-radius-lg)",
        padding: featured ? "20px 22px" : "16px 18px",
        textAlign: "left",
        cursor: interactive ? "pointer" : "default",
        transition: "transform 0.18s ease, box-shadow 0.18s ease",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        gap: 10,
        boxShadow: hovered ? "var(--adm-shadow)" : "var(--adm-shadow-sm)",
        transform: interactive && hovered ? "translateY(-2px)" : "translateY(0)",
      }}
    >
      <span
        aria-hidden="true"
        style={{
          position: "absolute",
          right: featured ? -30 : -22,
          bottom: featured ? -48 : -34,
          width: featured ? 136 : 100,
          height: featured ? 136 : 100,
          borderRadius: 999,
          background: glowColor,
          filter: "blur(12px)",
          opacity: hovered ? 0.85 : 0.65,
          transition: "opacity 0.18s ease",
        }}
      />

      <div
        style={{
          position: "relative",
          display: "flex",
          height: "100%",
          flexDirection: "column",
          gap: 14,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 10,
          }}
        >
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: "var(--adm-muted)",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
            }}
          >
            {label}
          </span>
          {interactive && (
            <span
              style={{
                flexShrink: 0,
                borderRadius: 999,
                border: "1px solid var(--adm-border)",
                backgroundColor: "rgba(255, 255, 255, 0.04)",
                padding: "4px 8px",
                fontSize: 10,
                fontWeight: 700,
                color: "var(--adm-muted)",
              }}
            >
              View
            </span>
          )}
        </div>

        <div
          style={{
            display: "flex",
            flex: 1,
            flexDirection: "column",
            justifyContent: "space-between",
            gap: 8,
          }}
        >
          <span
            style={{
              fontSize: valueFontSize,
              fontWeight: 700,
              color: accentValueColor,
              lineHeight: 1,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {value ?? "-"}
          </span>

          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: deltaText ? deltaColor : "var(--adm-muted)",
            }}
          >
            {footerText}
          </span>
        </div>
      </div>
    </button>
  );
}
