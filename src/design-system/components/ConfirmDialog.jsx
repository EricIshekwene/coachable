import Modal from "./Modal";
import Button from "./Button";

/**
 * Confirmation dialog for destructive or irreversible actions.
 * Built on Modal; provides pre-wired confirm/cancel button slots.
 *
 * @param {{
 *   open: boolean,
 *   title: string,
 *   description?: string,
 *   confirmLabel?: string,
 *   cancelLabel?: string,
 *   tone?: "default" | "danger",
 *   loading?: boolean,
 *   onConfirm: () => void,
 *   onCancel: () => void,
 * }} props
 */
export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "default",
  loading = false,
  onConfirm,
  onCancel,
}) {
  return (
    <div data-component="ConfirmDialog">
      <Modal open={open} onClose={onCancel} title={title} size="sm">
        {description && (
          <p className="mb-4 text-sm leading-relaxed" style={{ color: "var(--ui-text-muted)" }}>
            {description}
          </p>
        )}
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="outline" onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            variant={tone === "danger" ? "danger" : "primary"}
            loading={loading}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
