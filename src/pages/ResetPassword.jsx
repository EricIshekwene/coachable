import { useState, useRef, useEffect, useCallback } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAppMessage } from "../context/AppMessageContext";
import { apiFetch } from "../utils/api";
import { validatePassword, validateConfirmPassword, INPUT_LIMITS } from "../utils/inputValidation";
import logo from "../assets/logos/full_Coachable_logo.png";
import whiteLogo from "../assets/logos/White_Full_Coachable.png";

const CODE_LENGTH = 6;

/**
 * Reset password page — user enters the 6-digit code from their email
 * plus a new password. On success, redirects to /login.
 */
export default function ResetPassword() {
  const [digits, setDigits] = useState(Array(CODE_LENGTH).fill(""));
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(60);
  const inputRefs = useRef([]);
  const { showMessage } = useAppMessage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const email = searchParams.get("email") || "";

  // Redirect if no email param
  useEffect(() => {
    if (!email) navigate("/forgot-password", { replace: true });
  }, [email, navigate]);

  // Countdown timer for resend
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  // Auto-focus first input
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handleChange = (index, value) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[index] = digit;
    setDigits(next);

    if (digit && index < CODE_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, CODE_LENGTH);
    if (!pasted) return;
    const next = Array(CODE_LENGTH).fill("");
    for (let i = 0; i < pasted.length; i++) next[i] = pasted[i];
    setDigits(next);
    const focusIdx = Math.min(pasted.length, CODE_LENGTH - 1);
    inputRefs.current[focusIdx]?.focus();
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    try {
      await apiFetch("/auth/forgot-password", {
        method: "POST",
        body: { email },
      });
      showMessage("Code sent", "A new reset code has been sent to your email.", "success");
      setResendCooldown(60);
    } catch (err) {
      showMessage("Error", err.message || "Could not resend code.", "error");
    }
  };

  const handleSubmit = useCallback(
    async (e) => {
      if (e) e.preventDefault();
      if (submitting) return;

      const code = digits.join("");
      if (code.length !== CODE_LENGTH) {
        showMessage("Incomplete code", "Please enter the full 6-digit code.", "error");
        return;
      }

      const passwordErr = validatePassword(password);
      const confirmErr = validateConfirmPassword(password, confirmPassword);
      setErrors({ password: passwordErr, confirm: confirmErr });
      setTouched({ password: true, confirm: true });
      if (passwordErr || confirmErr) return;

      setSubmitting(true);
      try {
        await apiFetch("/auth/reset-password", {
          method: "POST",
          body: { email, code, password },
        });
        showMessage("Password reset", "Your password has been reset. Please sign in.", "success");
        navigate("/login");
      } catch (err) {
        showMessage("Reset failed", err.message || "Invalid or expired code.", "error");
        setDigits(Array(CODE_LENGTH).fill(""));
        inputRefs.current[0]?.focus();
      } finally {
        setSubmitting(false);
      }
    },
    [submitting, digits, password, confirmPassword, email, showMessage, navigate]
  );

  const maskedEmail = email
    ? email.replace(/^(.{2})(.*)(@)/, (_, a, b, c) => a + "*".repeat(b.length) + c)
    : "";

  const fieldClass = (field) =>
    `w-full rounded-lg border px-3.5 py-2.5 font-DmSans text-sm outline-none transition placeholder:text-BrandGray ${
      errors[field]
        ? "border-red-400 bg-red-50/20 focus:border-red-500 focus:shadow-[0_0_0_3px_rgba(239,68,68,0.08)]"
        : "border-BrandGray/40 bg-white hover:border-BrandGray focus:border-BrandOrange focus:shadow-[0_0_0_3px_rgba(255,122,24,0.1)]"
    }`;

  return (
    <div className="font-DmSans md:flex" style={{ minHeight: "var(--app-viewport-height)" }}>
      {/* Left - Form */}
      <div
        className="flex w-full flex-col overflow-y-auto bg-white px-8 sm:px-16 md:w-1/2 lg:px-24 xl:px-32"
        style={{
          minHeight: "var(--app-viewport-height)",
          paddingTop: "max(2rem, env(safe-area-inset-top))",
          paddingBottom: "calc(2rem + env(safe-area-inset-bottom) + var(--app-keyboard-inset))",
          scrollPaddingTop: "2rem",
          scrollPaddingBottom: "calc(8rem + var(--app-keyboard-inset))",
        }}
      >
        <div className="mx-auto flex min-h-full w-full max-w-md flex-col justify-start md:justify-center">
          <img src={logo} alt="Coachable" className="mb-10 block h-7 w-auto self-start object-contain" />

          <h1 className="font-Manrope text-2xl font-bold tracking-tight text-BrandBlack">
            Enter reset code
          </h1>
          <p className="mt-1.5 text-sm text-BrandGray2">
            We sent a 6-digit code to{" "}
            <span className="font-semibold text-BrandBlack">{maskedEmail}</span>
          </p>

          <form onSubmit={handleSubmit} className="mt-8">
            {/* Code inputs */}
            <div className="flex justify-between gap-2">
              {digits.map((d, i) => (
                <input
                  key={i}
                  ref={(el) => (inputRefs.current[i] = el)}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={d}
                  onChange={(e) => handleChange(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  onPaste={i === 0 ? handlePaste : undefined}
                  className="h-14 w-12 rounded-lg border-2 border-BrandGray/30 bg-white text-center font-Manrope text-2xl font-bold text-BrandBlack outline-none transition hover:border-BrandGray focus:border-BrandOrange focus:shadow-[0_0_0_3px_rgba(255,122,24,0.1)] sm:h-16 sm:w-14"
                  disabled={submitting}
                />
              ))}
            </div>

            {/* New password fields */}
            <div className="mt-6 flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-BrandBlack">New password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (touched.password) setErrors((prev) => ({ ...prev, password: validatePassword(e.target.value) }));
                    if (touched.confirm) setErrors((prev) => ({ ...prev, confirm: validateConfirmPassword(e.target.value, confirmPassword) }));
                  }}
                  onBlur={(e) => {
                    setTouched((prev) => ({ ...prev, password: true }));
                    setErrors((prev) => ({ ...prev, password: validatePassword(e.target.value) }));
                  }}
                  placeholder="At least 8 characters"
                  maxLength={INPUT_LIMITS.PASSWORD_MAX}
                  autoComplete="new-password"
                  className={fieldClass("password")}
                  disabled={submitting}
                />
                {errors.password && <p className="text-xs text-red-500">{errors.password}</p>}
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-BrandBlack">Confirm password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (touched.confirm) setErrors((prev) => ({ ...prev, confirm: validateConfirmPassword(password, e.target.value) }));
                  }}
                  onBlur={(e) => {
                    setTouched((prev) => ({ ...prev, confirm: true }));
                    setErrors((prev) => ({ ...prev, confirm: validateConfirmPassword(password, e.target.value) }));
                  }}
                  placeholder="Confirm your new password"
                  maxLength={INPUT_LIMITS.PASSWORD_MAX}
                  autoComplete="new-password"
                  className={fieldClass("confirm")}
                  disabled={submitting}
                />
                {errors.confirm && <p className="text-xs text-red-500">{errors.confirm}</p>}
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting || digits.some((d) => !d)}
              className="mt-6 w-full rounded-lg bg-BrandBlack py-2.5 text-sm font-semibold text-white transition hover:bg-BrandBlack2 active:scale-[0.98] disabled:opacity-50"
            >
              {submitting ? "Resetting..." : "Reset password"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-BrandGray2">
              Didn&apos;t get the code?{" "}
              <button
                onClick={handleResend}
                disabled={resendCooldown > 0}
                className="font-semibold text-BrandOrange transition hover:opacity-80 disabled:opacity-40"
              >
                {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend code"}
              </button>
            </p>
          </div>

          <p className="mt-4 text-center text-sm text-BrandGray2">
            <Link to="/login" className="font-semibold text-BrandOrange transition hover:opacity-80">
              Back to sign in
            </Link>
          </p>
        </div>
      </div>

      {/* Right - Brand panel */}
      <div className="hidden flex-col items-center justify-center bg-BrandBlack md:flex md:w-1/2">
        <img src={whiteLogo} alt="Coachable" className="mb-6 block h-10 w-auto object-contain opacity-60" />
        <p className="max-w-xs text-center text-sm leading-relaxed text-BrandGray2">
          The modern playbook platform for coaches and teams.
        </p>
      </div>
    </div>
  );
}
