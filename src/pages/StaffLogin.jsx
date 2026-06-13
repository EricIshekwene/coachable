import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { adminApi } from "../admin/adminTransport";
import { validateEmail } from "../utils/inputValidation";

/**
 * Login page for the scoped staff-admin area. Uses the standard /auth/login
 * endpoint, then verifies that the resulting user has an active staff_admins
 * row (or is the owner) via GET /staff/session.
 *
 * Lives at /staff/login.
 */
export default function StaffLogin() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const validateField = (field, value) => {
    if (field === "email") return validateEmail(value);
    if (field === "password") return value.trim() ? "" : "Password is required";
    return "";
  };

  const handleBlur = (field, value) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    setFieldErrors((prev) => ({ ...prev, [field]: validateField(field, value) }));
  };

  const handleChange = (field, value, setter) => {
    setter(value);
    if (touched[field]) setFieldErrors((prev) => ({ ...prev, [field]: validateField(field, value) }));
  };

  const fieldClass = (field) =>
    `w-full rounded-lg px-4 py-3 text-sm outline-none transition ${
      fieldErrors[field]
        ? "bg-red-500/10 border border-red-500/40 focus:border-red-400"
        : "bg-white/5 border border-white/10 focus:border-BrandOrange"
    }`;

  async function handleSubmit(e) {
    e.preventDefault();
    const emailErr = validateField("email", email);
    const passwordErr = validateField("password", password);
    setFieldErrors({ email: emailErr, password: passwordErr });
    setTouched({ email: true, password: true });
    if (emailErr || passwordErr) return;

    setError("");
    setLoading(true);
    try {
      await login(email, password);
      // Verify the user has staff access before routing into /staff
      try {
        await adminApi("/staff/session");
        navigate("/staff", { replace: true });
      } catch (sessionErr) {
        setError(
          sessionErr?.status === 401
            ? "Your account doesn't have staff access. Ask the owner to invite you."
            : "Failed to verify staff session. Try again."
        );
      }
    } catch (err) {
      setError(err?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-BrandBlack text-white flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-BrandOrange">coachable</h1>
          <p className="mt-1 text-sm text-white/60">Staff admin sign-in</p>
        </div>
        <form noValidate onSubmit={handleSubmit} className="space-y-3">
          <div className="flex flex-col gap-1">
            <input
              type="email"
              value={email}
              onChange={(e) => handleChange("email", e.target.value, setEmail)}
              onBlur={(e) => handleBlur("email", e.target.value)}
              placeholder="Email"
              autoComplete="email"
              maxLength={254}
              className={fieldClass("email")}
            />
            {fieldErrors.email && <p className="text-xs text-red-400">{fieldErrors.email}</p>}
          </div>
          <div className="flex flex-col gap-1">
            <input
              type="password"
              value={password}
              onChange={(e) => handleChange("password", e.target.value, setPassword)}
              onBlur={(e) => handleBlur("password", e.target.value)}
              placeholder="Password"
              autoComplete="current-password"
              maxLength={256}
              className={fieldClass("password")}
            />
            {fieldErrors.password && <p className="text-xs text-red-400">{fieldErrors.password}</p>}
          </div>
          {error && (
            <div className="rounded-md bg-red-500/10 border border-red-500/30 px-3 py-2 text-xs text-red-300">
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-BrandOrange py-3 text-sm font-semibold text-white disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
        <p className="text-center text-xs text-white/40">
          Owner? <a href="/admin" className="underline hover:text-white/70">Use the admin login</a>
        </p>
      </div>
    </div>
  );
}
