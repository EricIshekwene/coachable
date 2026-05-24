/**
 * AdminFlagGate
 *
 * Wraps an admin page section and renders a disabled placeholder when the
 * named feature flag has `enabled: false`. Fetches flag status from the
 * admin-only /flags/admin endpoint so it works without regular user auth.
 *
 * This only checks the global kill-switch (`enabled`). Targeting rules are
 * for end-user segmentation and are not evaluated here.
 *
 * @param {{ flagName: string, children: React.ReactNode }} props
 */

import { useEffect, useState } from "react";
import { adminApi } from "./adminTransport";
import AdminEmptyState from "./components/AdminEmptyState";
import AdminSpinner from "./components/AdminSpinner";
import { FiToggleLeft } from "react-icons/fi";

export default function AdminFlagGate({ flagName, children }) {
  const [status, setStatus] = useState("loading"); // "loading" | "enabled" | "disabled"

  useEffect(() => {
    let cancelled = false;
    adminApi("/flags/admin")
      .then((data) => {
        if (cancelled) return;
        const flag = (data.flags || []).find((f) => f.name === flagName);
        // If the flag doesn't exist yet, treat as enabled (fail open for admin)
        setStatus(!flag || flag.enabled ? "enabled" : "disabled");
      })
      .catch(() => {
        if (!cancelled) setStatus("enabled"); // fail open — don't block admin on API error
      });
    return () => { cancelled = true; };
  }, [flagName]);

  if (status === "loading") {
    return (
      <div className="flex h-64 items-center justify-center">
        <AdminSpinner />
      </div>
    );
  }

  if (status === "disabled") {
    return (
      <AdminEmptyState
        icon={<FiToggleLeft size={20} />}
        title="Feature disabled"
        subtitle={`The "${flagName}" feature flag is globally disabled. Enable it from Admin → Feature Flags to use this page.`}
      />
    );
  }

  return children;
}
