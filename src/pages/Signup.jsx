import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useAppMessage } from "../context/AppMessageContext";
import logo from "../assets/logos/full_Coachable_logo.png";
import whiteLogo from "../assets/logos/White_Full_Coachable.png";
import brandImage from "../assets/pictures/female_football_coach_short.png";
import { isValidEmail } from "../utils/inputValidation";

export default function Signup() {
  const [name, setName] = useState("");
  const [searchParams] = useSearchParams();
  const inviteCode = searchParams.get("invite") || "";
  const returnTo = searchParams.get("returnTo") || "";
  const [email, setEmail] = useState(searchParams.get("email") || "");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { signup } = useAuth();
  const { showMessage } = useAppMessage();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();
    const trimmedConfirm = confirm.trim();

    if (!trimmedName || !trimmedEmail || !trimmedPassword || !trimmedConfirm) {
      showMessage("Missing fields", "Please fill in all required fields.", "error");
      return;
    }

    if (trimmedName.length < 2) {
      showMessage("Invalid name", "Name must be at least 2 characters.", "error");
      return;
    }

    if (!isValidEmail(trimmedEmail)) {
      showMessage("Invalid email", "Please enter a valid email address.", "error");
      return;
    }

    if (trimmedPassword.length < 8) {
      showMessage("Weak password", "Password must be at least 8 characters.", "error");
      return;
    }

    if (trimmedPassword !== trimmedConfirm) {
      showMessage("Password mismatch", "Passwords do not match.", "error");
      return;
    }

    setSubmitting(true);
    try {
      const result = await signup(trimmedName, trimmedEmail, trimmedPassword);
      const params = new URLSearchParams();
      if (inviteCode) params.set("invite", inviteCode);
      if (returnTo) params.set("returnTo", returnTo);
      const qs = params.toString() ? `?${params.toString()}` : "";
      if (result.requiresVerification) {
        navigate(`/verify-email${qs}`);
      } else {
        navigate(`/onboarding${qs}`);
      }
    } catch (err) {
      showMessage("Signup failed", err.message || "Could not create account.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass =
    "w-full rounded-lg border border-BrandGray/40 bg-white px-3.5 py-2.5 font-DmSans text-sm outline-none transition placeholder:text-BrandGray hover:border-BrandGray focus:border-BrandOrange focus:shadow-[0_0_0_3px_rgba(255,122,24,0.1)]";

  return (
    <div className="flex h-screen font-DmSans">
      {/* Left - Form */}
      <div className="flex w-full flex-col justify-center overflow-auto bg-white px-8 sm:px-16 md:w-1/2 lg:px-24 xl:px-32">
        <div className="mx-auto w-full max-w-md">
          <img src={logo} alt="Coachable" className="mb-10 h-7" />

          <h1 className="font-Manrope text-2xl font-bold tracking-tight text-BrandBlack">
            {inviteCode ? "Create your account to join" : "Create your account"}
          </h1>
          <p className="mt-1.5 text-sm text-BrandGray2">
            {inviteCode ? "Sign up and you'll be added to your team automatically." : "Get started with Coachable in seconds."}
          </p>

          <form noValidate onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-BrandBlack">Full name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jane Smith"
                className={inputClass}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-BrandBlack">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className={inputClass}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-BrandBlack">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                className={inputClass}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-BrandBlack">Confirm password</label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Re-enter your password"
                className={inputClass}
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="mt-2 w-full rounded-lg bg-BrandBlack py-2.5 text-sm font-semibold text-white transition hover:bg-BrandBlack2 active:scale-[0.98] disabled:opacity-50"
            >
              {submitting ? "Creating account..." : "Create account"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-BrandGray2">
            Already have an account?{" "}
            <Link to={(() => { const p = new URLSearchParams(); if (inviteCode) p.set("invite", inviteCode); if (returnTo) p.set("returnTo", returnTo); const q = p.toString(); return `/login${q ? `?${q}` : ""}`; })()} className="font-semibold text-BrandOrange transition hover:opacity-80">
              Sign in
            </Link>
          </p>
        </div>
      </div>

      {/* Right - Brand panel */}
      <div className="relative hidden overflow-hidden md:flex md:w-1/2">
        <img
          src={brandImage}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/60 to-black/80" />
        <div className="relative z-10 flex h-full w-full flex-col items-start justify-end px-10 pb-16 lg:px-16 lg:pb-20">
          <img src={whiteLogo} alt="Coachable" className="absolute left-10 top-10 h-7 opacity-70 lg:left-16 lg:top-14" />
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.25em] text-BrandOrange">
            Get started for free
          </p>
          <h2 className="font-Manrope text-5xl font-extrabold leading-[1.1] tracking-tight text-white lg:text-6xl xl:text-7xl">
            Your<br />
            <span className="text-white/40">playbook,</span><br />
            <span className="text-BrandOrange">reimagined.</span>
          </h2>
          <p className="mt-6 max-w-sm text-base leading-relaxed text-white/50 lg:text-lg">
            Collaborate with your coaching staff, animate game plans, and bring your strategy to life.
          </p>
          <div className="mt-8 flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <span className="text-xs font-medium tracking-wide text-white/40">
              No credit card required
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
