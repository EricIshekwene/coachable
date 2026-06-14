import Card from "./Card";

/**
 * Shared surface shell for all auth forms: login, signup, reset, forgot password.
 * @param {string} title
 * @param {string} [subtitle]
 * @param {import("react").ReactNode} children - Form fields and primary action
 * @param {import("react").ReactNode} [footer] - e.g. "New here? Create account"
 * @param {string} [className]
 */
export default function AuthCard({ title, subtitle, children, footer, className = "" }) {
  return (
    <div data-component="AuthCard" className={`mx-auto w-full max-w-sm ${className}`}>
      <Card padding="lg">
        <h2 className="font-Manrope text-lg font-semibold" style={{ color: "var(--ui-text)" }}>{title}</h2>
        {subtitle && (
          <p className="mt-1 text-xs" style={{ color: "var(--ui-text-muted)" }}>{subtitle}</p>
        )}
        <div className="mt-5 space-y-3">{children}</div>
      </Card>
      {footer && (
        <div className="mt-4 text-center text-xs" style={{ color: "var(--ui-text-subtle)" }}>{footer}</div>
      )}
    </div>
  );
}
