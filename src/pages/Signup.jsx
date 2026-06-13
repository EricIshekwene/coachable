import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useAppMessage } from "../context/AppMessageContext";
import logo from "../assets/logos/full_Coachable_logo.png";
import whiteLogo from "../assets/logos/White_Full_Coachable.png";
import brandImage from "../assets/pictures/female_football_coach_short.png";
import { validateEmail, validateName, validatePassword, validateConfirmPassword, INPUT_LIMITS } from "../utils/inputValidation";
import { FiArrowLeft } from "react-icons/fi";

export default function Signup() {
  const [searchParams] = useSearchParams();
  const inviteCode = searchParams.get("invite") || "";
  const returnTo = searchParams.get("returnTo") || "";
  const sportSlug = searchParams.get("sport") || null;

  const [name, setName] = useState("");
  const [email, setEmail] = useState(searchParams.get("email") || "");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const { signup } = useAuth();
  const { showMessage } = useAppMessage();
  const navigate = useNavigate();

  /** Validate a single field and return the error string (or ""). */
  const validateField = (field, value) => {
    if (field === "name") return validateName(value);
    if (field === "email") return validateEmail(value);
    if (field === "password") return validatePassword(value);
    if (field === "confirm") return validateConfirmPassword(password, value);
    return "";
  };

  /** Mark a field touched and show its error on blur. */
  const handleBlur = (field, value) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    setErrors((prev) => ({ ...prev, [field]: validateField(field, value) }));
  };

  /** Re-validate touched fields as the user types. */
  const handleChange = (field, value, setter) => {
    setter(value);
    if (touched[field]) {
      setErrors((prev) => ({ ...prev, [field]: validateField(field, value) }));
    }
    // Confirm password depends on password — re-validate it when password changes
    if (field === "password" && touched.confirm) {
      setErrors((prev) => ({ ...prev, confirm: validateConfirmPassword(value, confirm) }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const newErrors = {
      name: validateField("name", name),
      email: validateField("email", email),
      password: validateField("password", password),
      confirm: validateConfirmPassword(password, confirm),
    };
    setErrors(newErrors);
    setTouched({ name: true, email: true, password: true, confirm: true });

    if (Object.values(newErrors).some(Boolean)) return;

    setSubmitting(true);
    try {
      const result = await signup(name.trim(), email.trim(), password);
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
          <Link
            to={sportSlug ? `/${sportSlug}` : "/"}
            className="mb-6 inline-flex items-center gap-1.5 text-xs text-BrandGray2 transition hover:text-BrandBlack"
          >
            <FiArrowLeft className="text-sm" />
            {sportSlug ? `Back to ${sportSlug.replace(/-/g, " ")} home` : "Back to home"}
          </Link>

          <img src={logo} alt="Coachable" className="mb-10 block h-7 w-auto self-start object-contain" />

          <h1 className="font-Manrope text-2xl font-bold tracking-tight text-BrandBlack">
            {inviteCode ? "Create your account to join" : "Create your account"}
          </h1>
          <p className="mt-1.5 text-sm text-BrandGray2">
            {inviteCode ? "Sign up and you'll be added to your team automatically." : "Get started with Coachable in seconds."}
          </p>

          <form noValidate onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-BrandBlack">Full name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => handleChange("name", e.target.value, setName)}
                onBlur={(e) => handleBlur("name", e.target.value)}
                placeholder="Jane Smith"
                maxLength={INPUT_LIMITS.NAME}
                autoComplete="name"
                className={fieldClass("name")}
              />
              {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-BrandBlack">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => handleChange("email", e.target.value, setEmail)}
                onBlur={(e) => handleBlur("email", e.target.value)}
                placeholder="you@example.com"
                maxLength={INPUT_LIMITS.EMAIL}
                autoComplete="email"
                className={fieldClass("email")}
              />
              {errors.email && <p className="text-xs text-red-500">{errors.email}</p>}
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-BrandBlack">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => handleChange("password", e.target.value, setPassword)}
                onBlur={(e) => handleBlur("password", e.target.value)}
                placeholder="At least 8 characters, include a number"
                maxLength={INPUT_LIMITS.PASSWORD_MAX}
                autoComplete="new-password"
                className={fieldClass("password")}
              />
              {errors.password && <p className="text-xs text-red-500">{errors.password}</p>}
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-BrandBlack">Confirm password</label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => handleChange("confirm", e.target.value, setConfirm)}
                onBlur={(e) => handleBlur("confirm", e.target.value)}
                placeholder="Re-enter your password"
                maxLength={INPUT_LIMITS.PASSWORD_MAX}
                autoComplete="new-password"
                className={fieldClass("confirm")}
              />
              {errors.confirm && <p className="text-xs text-red-500">{errors.confirm}</p>}
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
            <Link
              to={(() => {
                const p = new URLSearchParams();
                if (inviteCode) p.set("invite", inviteCode);
                if (returnTo) p.set("returnTo", returnTo);
                const q = p.toString();
                return `/login${q ? `?${q}` : ""}`;
              })()}
              className="font-semibold text-BrandOrange transition hover:opacity-80"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>

      {/* Right - Brand panel */}
      <div className="relative hidden overflow-hidden md:flex md:w-1/2">
        <img src={brandImage} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/60 to-black/80" />
        <div className="relative z-10 flex h-full w-full flex-col items-start justify-end px-10 pb-16 lg:px-16 lg:pb-20">
          <img src={whiteLogo} alt="Coachable" className="absolute left-10 top-10 block h-7 w-auto object-contain opacity-70 lg:left-16 lg:top-14" />
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.25em] text-BrandOrange">Get started for free</p>
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
            <span className="text-xs font-medium tracking-wide text-white/40">No credit card required</span>
          </div>
        </div>
      </div>
    </div>
  );
}
