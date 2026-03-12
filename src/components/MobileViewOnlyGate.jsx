import { useEffect, useState } from "react";

/** Breakpoint below which the editor is replaced by view-only mode (px). */
const MOBILE_BREAKPOINT = 768;

/**
 * Detects viewport width and injects `viewOnly={true}` into its child (Slate)
 * when the screen is too narrow for the full editor.
 *
 * Also shows a small dismissible banner on mobile explaining why editing is disabled.
 *
 * Usage:
 *   <MobileViewOnlyGate>
 *     <Slate ... />
 *   </MobileViewOnlyGate>
 *
 * The child must accept a `viewOnly` prop.
 */
export default function MobileViewOnlyGate({ children, breakpoint = MOBILE_BREAKPOINT }) {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth < breakpoint : false
  );
  const [bannerDismissed, setBannerDismissed] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const handler = (e) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    setIsMobile(mq.matches);
    return () => mq.removeEventListener("change", handler);
  }, [breakpoint]);

  // Clone child with viewOnly=true when mobile
  const child = Array.isArray(children) ? children[0] : children;
  const enhancedChild = isMobile
    ? { ...child, props: { ...child.props, viewOnly: true } }
    : child;

  return (
    <>
      {enhancedChild}
      {isMobile && !bannerDismissed && (
        <div className="fixed top-0 inset-x-0 z-[10000] flex items-center justify-between bg-BrandBlack2/95 backdrop-blur-sm px-4 py-2.5 border-b border-BrandGray2/20">
          <span className="text-xs font-DmSans text-BrandGray">
            View-only mode — editing requires a larger screen
          </span>
          <button
            onClick={() => setBannerDismissed(true)}
            className="text-xs font-DmSans text-BrandOrange hover:text-BrandOrange/80 transition ml-3 flex-shrink-0"
          >
            Dismiss
          </button>
        </div>
      )}
    </>
  );
}
