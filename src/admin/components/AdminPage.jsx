/**
 * Centered content wrapper with consistent max-width and padding.
 * @param {{ children: React.ReactNode, className?: string, wide?: boolean }} props
 */
export default function AdminPage({ children, className = "", wide = false }) {
  return (
    <div className={`mx-auto px-4 py-5 sm:px-6 sm:py-8 ${wide ? "max-w-7xl" : "max-w-6xl"} ${className}`}>
      {children}
    </div>
  );
}
