import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useAppMessage } from "../context/AppMessageContext";
import { apiFetch } from "../utils/api";
import logo from "../assets/logos/full_Coachable_logo.png";
import whiteLogo from "../assets/logos/White_Full_Coachable.png";

const CODE_LENGTH = 6;

export default function VerifyEmail() {
  const [digits, setDigits] = useState(Array(CODE_LENGTH).fill(""));
  const [submitting, setSubmitting] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const inputRefs = useRef([]);
  const { user, refreshUser } = useAuth();
  const { showMessage } = useAppMessage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const inviteCode = searchParams.get("invite") || "";

  // Start cooldown on mount (code was just sent during signup)
  useEffect(() => {
    setResendCooldown(60);
  }, []);

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

  const handleChange = (index, value) => {
    // Only allow digits
    const digit = value.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[index] = digit;
    setDigits(next);

    // Auto-advance
    if (digit && index < CODE_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all digits filled
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

  const submitCode = useCallback(
    async (code) => {
      if (submitting) return;
      setSubmitting(true);
      try {
        await apiFetch("/verification/verify", {
          method: "POST",
          body: { code },
        });
        showMessage("Email verified", "Your email has been verified successfully.", "success");
        if (refreshUser) await refreshUser();
        navigate(inviteCode ? `/onboarding?invite=${encodeURIComponent(inviteCode)}` : "/onboarding");
      } catch (err) {
        showMessage("Verification failed", err.message || "Invalid or expired code.", "error");
        setDigits(Array(CODE_LENGTH).fill(""));
        inputRefs.current[0]?.focus();
      } finally {
        setSubmitting(false);
      }
    },
    [submitting, showMessage, navigate, refreshUser]
  );

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    try {
      await apiFetch("/verification/send", { method: "POST" });
      showMessage("Code sent", "A new verification code has been sent to your email.", "success");
      setResendCooldown(60);
    } catch (err) {
      showMessage("Error", err.message || "Could not resend code.", "error");
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const code = digits.join("");
    if (code.length !== CODE_LENGTH) {
      showMessage("Incomplete code", "Please enter the full 6-digit code.", "error");
      return;
    }
    submitCode(code);
  };

  const maskedEmail = user?.email
    ? user.email.replace(/^(.{2})(.*)(@)/, (_, a, b, c) => a + "*".repeat(b.length) + c)
    : "";

  return (
    <div className="flex h-screen font-DmSans">
      {/* Left - Form */}
      <div className="flex w-full flex-col justify-center overflow-auto bg-white px-8 sm:px-16 md:w-1/2 lg:px-24 xl:px-32">
        <div className="mx-auto w-full max-w-md">
          <img src={logo} alt="Coachable" className="mb-10 h-7" />

          <h1 className="font-Manrope text-2xl font-bold tracking-tight text-BrandBlack">
            Check your email
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

            <button
              type="submit"
              disabled={submitting || digits.some((d) => !d)}
              className="mt-6 w-full rounded-lg bg-BrandBlack py-2.5 text-sm font-semibold text-white transition hover:bg-BrandBlack2 active:scale-[0.98] disabled:opacity-50"
            >
              {submitting ? "Verifying..." : "Verify email"}
            </button>
          </form>

          <div className="mt-6 text-center">
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

      {/* Right - Brand panel */}
      <div className="hidden flex-col items-center justify-center bg-BrandBlack md:flex md:w-1/2">
        <img src={whiteLogo} alt="Coachable" className="mb-6 h-10 opacity-60" />
        <p className="max-w-xs text-center text-sm leading-relaxed text-BrandGray2">
          The modern playbook platform for coaches and teams.
        </p>
      </div>
    </div>
  );
}
