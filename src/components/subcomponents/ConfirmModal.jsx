/**
 * ConfirmModal — a custom confirmation dialog that replaces window.confirm().
 *
 * Renders a dark-themed modal overlay with a title, optional subtitle,
 * and configurable confirm/cancel buttons. The confirm button can be styled
 * as a "danger" (destructive) action.
 *
 * @param {Object}   props
 * @param {boolean}  props.open          - Whether the modal is visible
 * @param {string}   props.message       - Primary message / question text
 * @param {string}   [props.subtitle]    - Optional secondary detail text
 * @param {string}   [props.confirmLabel="Confirm"] - Confirm button label
 * @param {string}   [props.cancelLabel="Cancel"]   - Cancel button label
 * @param {boolean}  [props.danger=false]            - Use red destructive styling for confirm button
 * @param {Function} props.onConfirm     - Called when user clicks confirm
 * @param {Function} props.onCancel      - Called when user clicks cancel or overlay
 */
export default function ConfirmModal({
  open,
  message,
  subtitle,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  danger = false,
  onConfirm,
  onCancel,
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/65 backdrop-blur-[1px]"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div className="bg-BrandBlack border border-BrandGray2/80 rounded-xl shadow-[0_18px_38px_-18px_rgba(0,0,0,0.95)] w-full max-w-sm mx-4 p-6">
        <p className="text-BrandWhite font-DmSans font-semibold text-sm sm:text-base leading-snug">
          {message}
        </p>
        {subtitle && (
          <p className="mt-2 text-BrandGray text-xs font-DmSans leading-relaxed">
            {subtitle}
          </p>
        )}
        <div className="mt-5 flex flex-col gap-2">
          <button
            autoFocus
            onClick={onConfirm}
            className={`w-full py-2.5 rounded-lg font-DmSans font-semibold text-xs sm:text-sm transition-all duration-200 active:scale-[0.98] ${
              danger
                ? "bg-red-600 text-white border border-red-500/80 hover:bg-red-500"
                : "bg-BrandOrange text-BrandBlack border border-BrandOrange/80 hover:bg-BrandOrange/95 hover:border-BrandOrange"
            }`}
          >
            {confirmLabel}
          </button>
          <button
            onClick={onCancel}
            className="w-full py-2.5 rounded-lg bg-BrandBlack2 text-BrandWhite font-DmSans font-semibold text-xs sm:text-sm border border-BrandGray transition-colors hover:bg-BrandBlack hover:border-BrandGray2"
          >
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
