/**
 * DangerModeModal.jsx
 *
 * Shared two-step Danger Mode elevation modal.
 * Step 1: admin password (may elevate immediately if no security email is set).
 * Step 2: OTP sent to the configured security email.
 *
 * Controlled entirely by the `useDangerMode` hook — pass its return value
 * as props.
 */
import AdminModal from "./AdminModal";
import AdminInput from "./AdminInput";
import AdminBtn from "./AdminBtn";

/**
 * @param {{
 *   dangerMode: import("../hooks/useDangerMode").DangerModeState,
 *   setPassword: (v: string) => void,
 *   setCode: (v: string) => void,
 *   onSubmit: (e: React.FormEvent) => void,
 *   onCancel: () => void,
 * }} props
 */
export default function DangerModeModal({
  dangerMode,
  setPassword,
  setCode,
  onSubmit,
  onCancel,
}) {
  const { open, step, password, code, maskedEmail, error, loading } = dangerMode;

  return (
    <>
      <AdminModal
        open={open && step === "password"}
        onClose={onCancel}
        title="Danger Mode Required"
        width="max-w-sm"
        hideClose
      >
        <p className="mb-4 text-xs" style={{ color: "var(--adm-danger)" }}>
          Re-enter your admin password to unlock destructive actions for 10 minutes.
        </p>
        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <AdminInput
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Admin password"
            autoFocus
          />
          {error && (
            <p className="text-xs" style={{ color: "var(--adm-danger)" }}>{error}</p>
          )}
          <div className="flex gap-2">
            <AdminBtn
              variant="secondary"
              type="button"
              onClick={onCancel}
              className="flex-1 justify-center"
            >
              Cancel
            </AdminBtn>
            <AdminBtn
              variant="danger"
              type="submit"
              disabled={loading || !password}
              className="flex-1 justify-center"
            >
              {loading ? "Sending…" : "Send Code"}
            </AdminBtn>
          </div>
        </form>
      </AdminModal>

      <AdminModal
        open={open && step === "code"}
        onClose={onCancel}
        title="Check Your Email"
        width="max-w-sm"
        hideClose
      >
        <p className="mb-1 text-xs" style={{ color: "var(--adm-text2)" }}>
          A 6-digit code was sent to:
        </p>
        <p className="mb-4 text-sm font-semibold" style={{ color: "var(--adm-text)" }}>
          {maskedEmail}
        </p>
        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <AdminInput
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            placeholder="6-digit code"
            autoFocus
          />
          {error && (
            <p className="text-xs" style={{ color: "var(--adm-danger)" }}>{error}</p>
          )}
          <div className="flex gap-2">
            <AdminBtn
              variant="secondary"
              type="button"
              onClick={onCancel}
              className="flex-1 justify-center"
            >
              Cancel
            </AdminBtn>
            <AdminBtn
              variant="danger"
              type="submit"
              disabled={loading || code.length !== 6}
              className="flex-1 justify-center"
            >
              {loading ? "Verifying…" : "Unlock"}
            </AdminBtn>
          </div>
        </form>
      </AdminModal>
    </>
  );
}
