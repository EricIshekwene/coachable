import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { FiArrowLeft, FiCheck, FiMail } from "react-icons/fi";
import { useAuth } from "../../context/AuthContext";

const CODE_LENGTH = 6;

export default function ProfileEmailVerification() {
  const { pendingEmailChange, confirmEmailChange, cancelEmailChange, requestEmailChange } = useAuth();
  const navigate = useNavigate();
  const [digits, setDigits] = useState(Array(CODE_LENGTH).fill(""));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(60);
  const inputRefs = useRef([]);

  useEffect(() => {
    if (!pendingEmailChange?.nextEmail) {
      navigate("/app/profile", { replace: true });
    }
  }, [pendingEmailChange, navigate]);

  // Countdown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  // Auto-focus first input
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const submitCode = useCallback(
    async (code) => {
      if (submitting) return;
      setSubmitting(true);
      setError("");
      try {
        await confirmEmailChange(code);
        setShowSuccess(true);
        setTimeout(() => navigate("/app/profile"), 900);
      } catch (err) {
        setError(err.message || "Invalid or expired code.");
        setDigits(Array(CODE_LENGTH).fill(""));
        inputRefs.current[0]?.focus();
      } finally {
        setSubmitting(false);
      }
    },
    [submitting, confirmEmailChange, navigate]
  );

  const handleChange = (index, value) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[index] = digit;
    setDigits(next);

    if (digit && index < CODE_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    if (digit && index === CODE_LENGTH - 1 && next.every((d) => d)) {
      submitCode(next.join(""));
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
    if (pasted.length === CODE_LENGTH) submitCode(pasted);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const code = digits.join("");
    if (code.length !== CODE_LENGTH) {
      setError("Please enter the full 6-digit code.");
      return;
    }
    submitCode(code);
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || !pendingEmailChange?.nextEmail) return;
    try {
      await requestEmailChange(pendingEmailChange.nextEmail);
      setResendCooldown(60);
      setError("");
    } catch (err) {
      setError(err.message || "Could not resend code.");
    }
  };

  const handleBack = () => {
    cancelEmailChange();
    navigate("/app/profile");
  };

  return (
    <div className="mx-auto max-w-lg px-6 py-8 md:px-10 md:py-12">
      <button
        type="button"
        onClick={handleBack}
        className="mb-6 inline-flex items-center gap-2 text-sm text-BrandGray transition hover:text-BrandText"
      >
        <FiArrowLeft className="text-sm" />
        Back to Profile
      </button>

      <div className="rounded-xl border border-BrandGray2/20 bg-BrandBlack2/30 p-6">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-BrandOrange/15 text-BrandOrange">
          <FiMail className="text-lg" />
        </div>

        <h1 className="mt-4 font-Manrope text-xl font-bold tracking-tight">Verify your new email</h1>
        <p className="mt-2 text-sm text-BrandGray2">
          We sent a 6-digit code to{" "}
          <span className="font-semibold text-BrandText">{pendingEmailChange?.nextEmail}</span>.
          Enter it below to confirm your email change.
        </p>

        <form onSubmit={handleSubmit} className="mt-6">
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
                className="h-14 w-12 rounded-lg border-2 border-BrandGray2/30 bg-BrandBlack2/50 text-center font-Manrope text-2xl font-bold text-BrandText outline-none transition hover:border-BrandGray2 focus:border-BrandOrange focus:shadow-[0_0_0_3px_rgba(255,122,24,0.1)] sm:h-16 sm:w-14"
                disabled={submitting}
              />
            ))}
          </div>

          {error && <p className="mt-3 text-xs text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={submitting || digits.some((d) => !d)}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-BrandOrange py-2.5 text-sm font-semibold text-white transition hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
          >
            {showSuccess ? (
              <>
                <FiCheck />
                Email Updated
              </>
            ) : submitting ? (
              "Verifying..."
            ) : (
              "Confirm email change"
            )}
          </button>
        </form>

        <div className="mt-4 text-center">
          <p className="text-sm text-BrandGray2">
            Didn't get the code?{" "}
            <button
              onClick={handleResend}
              disabled={resendCooldown > 0}
              className="font-semibold text-BrandOrange transition hover:opacity-80 disabled:opacity-40"
            >
              {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend code"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
