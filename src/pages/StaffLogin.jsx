import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { adminApi } from "../admin/adminTransport";

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
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
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
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            required
            autoComplete="email"
            maxLength={254}
            className="w-full rounded-lg bg-white/5 border border-white/10 px-4 py-3 text-sm outline-none focus:border-BrandOrange"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            required
            autoComplete="current-password"
            maxLength={256}
            className="w-full rounded-lg bg-white/5 border border-white/10 px-4 py-3 text-sm outline-none focus:border-BrandOrange"
          />
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
