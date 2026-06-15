import Card from "./Card";
import IconBubble from "./IconBubble";

/**
 * Numbered question block for surveys and notification forms.
 * @param {number} number
 * @param {string} label
 * @param {boolean} [required=false]
 * @param {import("react").ReactNode} children - The answer field
 * @param {string} [className]
 */
export default function QuestionCard({ number, label, required = false, children, className = "" }) {
  return (
    <div data-component="QuestionCard" className={className}>
      <Card padding="sm" style={{ backgroundColor: "var(--ui-surface-2)" }}>
        <div className="mb-3 flex items-start gap-3">
          <IconBubble
            icon={<span className="text-xs font-bold leading-none">{number}</span>}
            tone="orange"
            size="sm"
          />
          <span className="pt-1.5 text-sm font-medium" style={{ color: "var(--ui-text)" }}>
            {label}
            {required && <span style={{ color: "var(--ui-accent)" }}> *</span>}
          </span>
        </div>
        <div className="pl-11">{children}</div>
      </Card>
    </div>
  );
}
