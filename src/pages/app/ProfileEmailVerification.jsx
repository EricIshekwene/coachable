import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiArrowLeft, FiCheck, FiMail } from "react-icons/fi";
import { useAuth } from "../../context/AuthContext";

export default function ProfileEmailVerification() {
  const { pendingEmailChange, confirmEmailChange, cancelEmailChange } = useAuth();
  const navigate = useNavigate();
  const [showSaved, setShowSaved] = useState(false);

  useEffect(() => {
    if (!pendingEmailChange?.nextEmail) {
      navigate("/app/profile", { replace: true });
    }
  }, [pendingEmailChange, navigate]);

  const handleConfirm = () => {
    const didConfirm = confirmEmailChange();
    if (!didConfirm) return;

    setShowSaved(true);
    setTimeout(() => navigate("/app/profile"), 900);
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
          We sent a verification link to <span className="font-semibold text-BrandText">{pendingEmailChange?.nextEmail}</span>.
          After confirming it in your inbox, click the button below.
        </p>

        <button
          type="button"
          onClick={handleConfirm}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-BrandOrange py-2.5 text-sm font-semibold text-white transition hover:brightness-110 active:scale-[0.98]"
        >
          {showSaved ? (
            <>
              <FiCheck />
              Email Updated
            </>
          ) : (
            "I verified this email"
          )}
        </button>
      </div>
    </div>
  );
}
