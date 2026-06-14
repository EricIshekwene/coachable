const TONE_STYLES = {
  orange: { backgroundColor: "var(--ui-accent-muted)", color: "var(--ui-accent)" },
  purple: { backgroundColor: "rgba(168,85,247,0.15)", color: "rgb(192,132,252)" },
  green:  { backgroundColor: "rgba(34,197,94,0.15)",  color: "var(--ui-success)" },
  red:    { backgroundColor: "rgba(239,68,68,0.15)",  color: "var(--ui-danger)" },
  blue:   { backgroundColor: "rgba(59,130,246,0.15)", color: "rgb(96,165,250)" },
  gray:   { backgroundColor: "var(--ui-surface-2)",   color: "var(--ui-text-muted)" },
};

const SIZE_CLASSES = {
  sm: "h-8 w-8 rounded-lg",
  md: "h-10 w-10 rounded-xl",
  lg: "h-12 w-12 rounded-2xl",
};

/**
 * Rounded icon container with tinted background. Not for user avatars — use Avatar.
 * @param {import("react").ReactNode} icon
 * @param {"orange"|"purple"|"green"|"red"|"blue"|"gray"} [tone="orange"]
 * @param {"sm"|"md"|"lg"} [size="md"]
 * @param {string} [className]
 */
export default function IconBubble({ icon, tone = "orange", size = "md", className = "" }) {
  return (
    <div
      data-component="IconBubble"
      className={`flex shrink-0 items-center justify-center ${SIZE_CLASSES[size] ?? SIZE_CLASSES.md} ${className}`}
      style={TONE_STYLES[tone] ?? TONE_STYLES.orange}
    >
      {icon}
    </div>
  );
}
