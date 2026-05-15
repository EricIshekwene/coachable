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
    iconColor: "text-red-300/95",
    iconContainer: "bg-red-500/10",
    title: "text-BrandWhite",
    text: "text-white/68",
  },
  success: {
    icon: IoCheckmarkCircleOutline,
    iconColor: "text-emerald-300/95",
    iconContainer: "bg-emerald-500/10",
    title: "text-BrandWhite",
    text: "text-white/68",
  },
  warning: {
    icon: IoWarningOutline,
    iconColor: "text-amber-300/95",
    iconContainer: "bg-amber-400/10",
    title: "text-BrandWhite",
    text: "text-white/68",
  },
  standard: {
    icon: IoInformationCircleOutline,
    iconColor: "text-BrandOrange",
    iconContainer: "bg-BrandOrange/10",
    title: "text-BrandWhite",
    text: "text-white/68",
  },
  info: {
    icon: IoInformationCircleOutline,
    iconColor: "text-sky-300/95",
    iconContainer: "bg-sky-400/10",
    title: "text-BrandWhite",
    text: "text-white/68",
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
    <div className="pointer-events-none fixed inset-x-0 top-3 z-[120] flex justify-center px-3 md:top-4">
      <div
        className={`pointer-events-auto w-full max-w-[min(92vw,460px)] border border-white/10 bg-[rgba(18,18,18,0.92)] ${POPUP_TOAST_SURFACE_CLASS} animate-[fadeInUp_0.2s_ease-out]`}
        role="status"
        aria-live="polite"
      >
        <div className="flex items-start gap-3 px-3 py-2.5 sm:px-3.5 sm:py-3">
          <div className={`mt-[1px] flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${styles.iconContainer}`}>
            <StatusIcon className={`text-[17px] ${styles.iconColor}`} aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className={`${styles.title} text-[13px] font-DmSans font-medium leading-[1.2] tracking-[0.01em]`}>
              {message}
            </h2>
            {subtitle ? (
              <p className={`${styles.text} mt-0.5 text-[11px] font-DmSans leading-[1.4] break-words`}>
                {subtitle}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={hide}
            aria-label="Dismiss message"
            className="shrink-0 rounded-full p-1.5 text-BrandGray hover:text-BrandWhite hover:bg-white/[0.04] transition-colors"
          >
            <IoClose className="text-[14px]" aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );
}
