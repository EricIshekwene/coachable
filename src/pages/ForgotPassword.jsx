import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAppMessage } from "../context/AppMessageContext";
import { apiFetch } from "../utils/api";
import { validateEmail, INPUT_LIMITS } from "../utils/inputValidation";
import logo from "../assets/logos/full_Coachable_logo.png";
import whiteLogo from "../assets/logos/White_Full_Coachable.png";

/**
 * Forgot password page — user enters their email to receive a 6-digit reset code.
 * On success, navigates to /reset-password with the email pre-filled.
 */
export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [emailTouched, setEmailTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { showMessage } = useAppMessage();
  const navigate = useNavigate();

  const fieldClass = emailError
    ? "w-full rounded-lg border border-red-400 bg-red-50/20 px-3.5 py-2.5 font-DmSans text-sm outline-none transition placeholder:text-BrandGray focus:border-red-500 focus:shadow-[0_0_0_3px_rgba(239,68,68,0.08)]"
    : "w-full rounded-lg border border-BrandGray/40 bg-white px-3.5 py-2.5 font-DmSans text-sm outline-none transition placeholder:text-BrandGray hover:border-BrandGray focus:border-BrandOrange focus:shadow-[0_0_0_3px_rgba(255,122,24,0.1)]";

  const handleSubmit = async (e) => {
    e.preventDefault();
    const err = validateEmail(email);
    setEmailError(err);
    setEmailTouched(true);
    if (err) return;

    setSubmitting(true);
    try {
      await apiFetch("/auth/forgot-password", {
        method: "POST",
        body: { email: email.trim() },
      });
      showMessage("Code sent", "If an account exists with that email, a reset code has been sent.", "success");
      navigate(`/reset-password?email=${encodeURIComponent(email.trim())}`);
    } catch (err) {
      showMessage("Error", err.message || "Something went wrong. Please try again.", "error");
    } finally {
      setSubmitting(false);
    }
  };

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
            Reset your password
          </h1>
          <p className="mt-1.5 text-sm text-BrandGray2">
            Enter your email and we&apos;ll send you a 6-digit code to reset your password.
          </p>

          <form noValidate onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-BrandBlack">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (emailTouched) setEmailError(validateEmail(e.target.value));
                }}
                onBlur={(e) => {
                  setEmailTouched(true);
                  setEmailError(validateEmail(e.target.value));
                }}
                placeholder="you@example.com"
                maxLength={INPUT_LIMITS.EMAIL}
                autoComplete="email"
                className={fieldClass}
                autoFocus
              />
              {emailError && <p className="text-xs text-red-500">{emailError}</p>}
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="mt-2 w-full rounded-lg bg-BrandBlack py-2.5 text-sm font-semibold text-white transition hover:bg-BrandBlack2 active:scale-[0.98] disabled:opacity-50"
            >
              {submitting ? "Sending code..." : "Send reset code"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-BrandGray2">
            Remember your password?{" "}
            <Link to="/login" className="font-semibold text-BrandOrange transition hover:opacity-80">
              Sign in
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
