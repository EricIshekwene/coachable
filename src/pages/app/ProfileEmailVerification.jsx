import { Alert, Button, Card, CodeInput, IconBubble } from "../../design-system/components";
import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { FiArrowLeft, FiCheck, FiMail } from "react-icons/fi";
import { useAuth } from "../../context/AuthContext";

const CODE_LENGTH = 6;

export default function ProfileEmailVerification() {
  const { pendingEmailChange, confirmEmailChange, cancelEmailChange, requestEmailChange } = useAuth();
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(60);

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
        setCode("");
      } finally {
        setSubmitting(false);
      }
    },
    [submitting, confirmEmailChange, navigate]
  );

  const handleCodeChange = (val) => {
    setCode(val);
    if (val.length === CODE_LENGTH) submitCode(val);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
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
      <Button variant="ghost"
        type="button"
        onClick={handleBack}
        className="mb-6 inline-flex items-center gap-2 text-sm text-[color:var(--ui-text-muted)] transition hover:text-[color:var(--ui-text)]"
      >
        <FiArrowLeft className="text-sm" />
        Back to Profile
      </Button>

      <Card padding="lg" style={{ backgroundColor: "var(--ui-surface-2)" }}>
        <IconBubble icon={<FiMail className="text-lg" />} tone="orange" size="lg" />

        <h1 className="mt-4 font-Manrope text-xl font-bold tracking-tight">Verify your new email</h1>
        <p className="mt-2 text-sm" style={{ color: "var(--ui-text-subtle)" }}>
          We sent a 6-digit code to{" "}
          <span className="font-semibold" style={{ color: "var(--ui-text)" }}>{pendingEmailChange?.nextEmail}</span>.
          Enter it below to confirm your email change.
        </p>

        <form onSubmit={handleSubmit} className="mt-6">
          <CodeInput
            length={CODE_LENGTH}
            value={code}
            onChange={handleCodeChange}
            disabled={submitting}
            autoFocus
          />

          {error && <Alert className="mt-3" tone="error" title="Verification failed">{error}</Alert>}

          <Button variant="primary"
            type="submit"
            disabled={submitting || code.length < CODE_LENGTH}
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
          </Button>
        </form>

        <div className="mt-4 text-center">
          <p className="text-sm" style={{ color: "var(--ui-text-subtle)" }}>
            Didn't get the code?{" "}
            <Button variant="ghost"
              onClick={handleResend}
              disabled={resendCooldown > 0}
              className="font-semibold text-BrandOrange transition hover:opacity-80 disabled:opacity-40"
            >
              {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend code"}
            </Button>
          </p>
        </div>
      </Card>
    </div>
  );
}
