import ConfirmDialog from "../../design-system/components/ConfirmDialog";

/**
 * ConfirmModal — compatibility shim over ConfirmDialog.
 * New code should import ConfirmDialog from the design-system barrel directly.
 *
 * @param {Object}   props
 * @param {boolean}  props.open
 * @param {string}   props.message       - Maps to ConfirmDialog `title`
 * @param {string}   [props.subtitle]    - Maps to ConfirmDialog `description`
 * @param {string}   [props.confirmLabel="Confirm"]
 * @param {string}   [props.cancelLabel="Cancel"]
 * @param {boolean}  [props.danger=false] - Maps to tone="danger"
 * @param {Function} props.onConfirm
 * @param {Function} props.onCancel
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
  return (
    <ConfirmDialog
      open={open}
      title={message}
      description={subtitle}
      confirmLabel={confirmLabel}
      cancelLabel={cancelLabel}
      tone={danger ? "danger" : "default"}
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
}
