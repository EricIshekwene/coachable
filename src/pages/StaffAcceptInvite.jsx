import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { adminApi } from "../admin/adminTransport";
import { useAuth } from "../context/AuthContext";

/**
 * Public page reached from the staff-invite email. Reads the `token` query
 * param, posts to /staff/accept-invite, and routes the user:
 *   - on success → /staff (their new dashboard)
 *   - if `needsSignup` → /signup with the email prefilled, then back here
 *   - if not authenticated and the invite maps to an existing user → /login
 *     with returnTo pointing back here so they can finish accepting
 *
 * Lives at /staff/accept-invite.
 */
export default function StaffAcceptInvite() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const token = searchParams.get("token");

  const [status, setStatus] = useState("pending"); // pending | success | needsSignup | needsLogin | error
  const [errorMessage, setErrorMessage] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setErrorMessage("Missing invite token in URL.");
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const data = await adminApi("/staff/accept-invite", {
          method: "POST",
          body: JSON.stringify({ token }),
        });
        if (cancelled) return;
        if (data.ok) {
          setStatus("success");
          setTimeout(() => navigate("/staff", { replace: true }), 800);
        } else if (data.needsSignup) {
          setStatus("needsSignup");
          setEmail(data.email);
        } else {
          setStatus("error");
          setErrorMessage(data.message || "Invite could not be accepted");
        }
      } catch (err) {
        if (cancelled) return;
        // 401: not logged in but invite matches an existing user → tell them to log in
        if (err?.status === 401 || err?.status === 403) {
          // Need to authenticate first
          setStatus("needsLogin");
          setEmail(err?.data?.invitedEmail || "");
        } else {
          setStatus("error");
          setErrorMessage(err?.message || "Unexpected error");
        }
      }
    })();
    return () => { cancelled = true; };
  }, [token, navigate]);

  return (
    <div className="min-h-screen bg-BrandBlack text-white flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-md space-y-5 text-center">
        <div>
          <h1 className="text-2xl font-bold text-BrandOrange">coachable</h1>
          <p className="mt-1 text-sm text-white/60">Staff admin invitation</p>
        </div>

        {status === "pending" && (
          <p className="text-sm text-white/70">Accepting your invitation…</p>
        )}

        {status === "success" && (
          <p className="text-sm text-emerald-300">
            ✓ You're in. Redirecting to /staff…
          </p>
        )}

        {status === "needsSignup" && (
          <div className="space-y-3 rounded-lg bg-white/5 border border-white/10 px-4 py-4 text-left">
            <p className="text-sm">
              No account found for <span className="text-BrandOrange">{email}</span>.
              Sign up with this exact email, then click the invite link again.
            </p>
            <a
              href={`/signup?email=${encodeURIComponent(email)}`}
              className="inline-block rounded-md bg-BrandOrange px-4 py-2 text-sm font-semibold"
            >
              Sign up
            </a>
          </div>
        )}

        {status === "needsLogin" && (
          <div className="space-y-3 rounded-lg bg-white/5 border border-white/10 px-4 py-4 text-left">
            <p className="text-sm">
              This invite is for <span className="text-BrandOrange">{email || "another account"}</span>.
              {user
                ? " You're logged in as a different user — log out first, then click the invite link."
                : " Log in to that account, then click the invite link again."}
            </p>
            <a
              href={`/login?returnTo=${encodeURIComponent(window.location.pathname + window.location.search)}`}
              className="inline-block rounded-md bg-BrandOrange px-4 py-2 text-sm font-semibold"
            >
              Log in
            </a>
          </div>
        )}

        {status === "error" && (
          <div className="rounded-md bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-300">
            {errorMessage}
          </div>
        )}
      </div>
    </div>
  );
}
