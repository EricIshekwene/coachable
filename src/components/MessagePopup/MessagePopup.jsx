import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  IoAlertCircleOutline,
  IoCheckmarkCircleOutline,
  IoClose,
  IoInformationCircleOutline,
  IoWarningOutline,
} from "react-icons/io5";
import { POPUP_TOAST_SURFACE_CLASS } from "../subcomponents/popupStyles";

const TYPE_STYLES = {
  error: {
    icon: IoAlertCircleOutline,
    iconColor: "text-red-200",
    iconContainer: "bg-red-500/15 ring-red-300/35",
    title: "text-red-100",
    text: "text-red-100/80",
    border: "border-red-400/40",
    accent: "from-red-400/75 via-red-400/45 to-red-500/10",
  },
  success: {
    icon: IoCheckmarkCircleOutline,
    iconColor: "text-emerald-200",
    iconContainer: "bg-emerald-500/15 ring-emerald-300/35",
    title: "text-emerald-100",
    text: "text-emerald-100/80",
    border: "border-emerald-400/40",
    accent: "from-emerald-400/75 via-emerald-400/45 to-emerald-500/10",
  },
  warning: {
    icon: IoWarningOutline,
    iconColor: "text-amber-200",
    iconContainer: "bg-amber-500/15 ring-amber-300/35",
    title: "text-amber-100",
    text: "text-amber-100/80",
    border: "border-amber-300/45",
    accent: "from-amber-300/75 via-amber-300/45 to-amber-400/10",
  },
  standard: {
    icon: IoInformationCircleOutline,
    iconColor: "text-BrandOrange",
    iconContainer: "bg-BrandOrange/10 ring-BrandOrange/30",
    title: "text-BrandWhite",
    text: "text-BrandGray",
    border: "border-BrandOrange/45",
    accent: "from-BrandOrange/80 via-BrandOrange/50 to-BrandOrange/10",
  },
};

export default function MessagePopup({
  message,
  subtitle,
  visible,
  type = "standard",
  onClose,
  autoHideDuration = 3000,
}) {
  const [isVisible, setIsVisible] = useState(visible);

  useEffect(() => {
    setIsVisible(visible);
  }, [visible]);

  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const hide = useCallback(() => {
    setIsVisible(false);
    onCloseRef.current?.();
  }, []);

  // Reset timer when a new message arrives (message/subtitle/type change)
  // or when visibility toggles. `hide` is stable so it won't cause resets.
  useEffect(() => {
    if (!isVisible || autoHideDuration <= 0) return undefined;

    const timer = setTimeout(hide, autoHideDuration);
    return () => clearTimeout(timer);
  }, [isVisible, autoHideDuration, hide, message, subtitle, type]);

  const styles = useMemo(() => TYPE_STYLES[type] || TYPE_STYLES.standard, [type]);
  const StatusIcon = styles.icon;

  if (!isVisible) return null;

  return (
    <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[100] w-[min(92vw,460px)] px-2">
      <div
        className={`relative overflow-hidden bg-BrandBlack/95 ${POPUP_TOAST_SURFACE_CLASS} ${styles.border}`}
        role="status"
        aria-live="polite"
      >
        <div className={`absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r ${styles.accent}`} />
        <div className="flex items-start gap-3 p-3 sm:px-4 sm:py-3.5">
          <div className={`mt-[2px] flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-1 ${styles.iconContainer}`}>
            <StatusIcon className={`text-lg ${styles.iconColor}`} aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className={`${styles.title} text-xs sm:text-sm font-DmSans font-semibold leading-tight`}>
              {message}
            </h2>
            {subtitle ? (
              <p className={`${styles.text} mt-1 text-[11px] sm:text-xs font-DmSans leading-relaxed break-words`}>
                {subtitle}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={hide}
            aria-label="Dismiss message"
            className="shrink-0 rounded-md p-1 text-BrandGray hover:text-BrandWhite hover:bg-white/5 transition-colors"
          >
            <IoClose className="text-sm" aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );
}
