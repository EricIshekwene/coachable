/**
 * useDangerMode.js
 *
 * Shared hook for Danger Mode (elevated admin permissions).
 * Encapsulates the two-step elevation flow (password → optional OTP) and
 * exposes `ensureElevated()`, which returns a promise that resolves true
 * once the session is elevated, or false if the user cancels.
 *
 * Pair with <DangerModeModal> to render the UI.
 */
import { useState, useCallback, useRef } from "react";
import {
  isAdminElevated,
  setAdminElevated,
} from "../../utils/adminElevation";
import { adminUrl, readAdminSession } from "../adminTransport";

/**
 * @typedef {Object} DangerModeState
 * @property {boolean} open           - Whether the modal is open.
 * @property {"password"|"code"} step - Which step of the flow is active.
 * @property {string}  password       - Password field value (step 1).
 * @property {string}  code           - OTP field value (step 2).
 * @property {string}  maskedEmail    - Masked security email shown on step 2.
 * @property {string}  error          - Inline error message.
 * @property {boolean} loading        - True while a network request is in flight.
 */

/**
 * Hook that manages the Danger Mode elevation flow.
 *
 * @returns {{
 *   dangerMode: DangerModeState,
 *   ensureElevated: () => Promise<boolean>,
 *   handleSubmit: (e: React.FormEvent) => void,
 *   handleCancel: () => void,
 * }}
 */
export function useDangerMode() {
  const resolveRef = useRef(null);

  const [open, setOpen] = useState(false);
  const [step, setStep] = useState("password");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [maskedEmail, setMaskedEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  /** Open the modal and return a promise that resolves to true/false. */
  const ensureElevated = useCallback(() => {
    if (isAdminElevated()) return Promise.resolve(true);
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      setStep("password");
      setPassword("");
      setCode("");
      setMaskedEmail("");
      setError("");
      setOpen(true);
    });
  }, []);

  const handleCancel = useCallback(() => {
    setOpen(false);
    resolveRef.current?.(false);
  }, []);

  /**
   * Handle form submission for both steps.
   * @param {React.FormEvent} e
   */
  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const session = readAdminSession() || "";
    try {
      if (step === "password") {
        const res = await fetch(adminUrl("/admin/elevate/request"), {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            ...(session ? { "x-admin-session": session } : {}),
          },
          body: JSON.stringify({ password }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Wrong password");
        if (data.elevated) {
          setAdminElevated(data.elevatedUntil);
          setOpen(false);
          resolveRef.current?.(true);
        } else {
          setMaskedEmail(data.maskedEmail || "");
          setPassword("");
          setStep("code");
        }
      } else {
        const res = await fetch(adminUrl("/admin/elevate/confirm"), {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            ...(session ? { "x-admin-session": session } : {}),
          },
          body: JSON.stringify({ code }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Invalid code");
        setAdminElevated(data.elevatedUntil);
        setOpen(false);
        resolveRef.current?.(true);
      }
    } catch (err) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [step, password, code]);

  return {
    dangerMode: { open, step, password, code, maskedEmail, error, loading },
    setPassword,
    setCode,
    ensureElevated,
    handleSubmit,
    handleCancel,
  };
}
