/**
 * ReportIssue page — allows beta testers to submit issues they've encountered.
 * Only accessible to users with isBetaTester=true.
 *
 * @module ReportIssue
 */
import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { apiFetch } from "../../utils/api";
import { FiFlag, FiCheckCircle } from "react-icons/fi";

const MAX_TITLE = 200;
const MAX_DESC = 5000;

/**
 * Form for beta testers to submit an issue report.
 * Redirects non-beta-testers back to /app/plays.
 */
export default function ReportIssue() {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  if (!user?.isBetaTester) {
    return <Navigate to="/app/plays" replace />;
  }

  /** Submit the issue to the backend. */
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;
    setSubmitting(true);
    setError("");
    try {
      await apiFetch("/user-issues", {
        method: "POST",
        body: { title: title.trim(), description: description.trim() },
      });
      setSubmitted(true);
    } catch (err) {
      setError(err.message || "Failed to submit issue. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  /** Reset form to submit another issue. */
  const handleReset = () => {
    setTitle("");
    setDescription("");
    setSubmitted(false);
    setError("");
  };

  if (submitted) {
    return (
      <div className="overflow-y-auto" style={{ height: "100%" }}>
        <div className="mx-auto max-w-xl px-6 py-16 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-green-500/15">
            <FiCheckCircle className="text-2xl text-green-400" />
          </div>
          <h1 className="font-Manrope text-xl font-bold">Issue Submitted</h1>
          <p className="mt-2 text-sm text-BrandGray2">
            Thanks for the report! We'll look into it and get back to you if we need more details.
          </p>
          <button
            onClick={handleReset}
            className="mt-8 rounded-xl bg-BrandOrange px-6 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
          >
            Report Another Issue
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-y-auto" style={{ height: "100%" }}>
      <div className="mx-auto max-w-xl px-6 py-10">
        {/* Header */}
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/15">
            <FiFlag className="text-lg text-purple-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-Manrope text-lg font-bold">Report an Issue</h1>
              <span className="rounded bg-purple-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-purple-400">
                Beta
              </span>
            </div>
            <p className="text-xs text-BrandGray2">Found something broken? Let us know.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {/* Title */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-BrandGray">
              Issue Title
              <span className="ml-1 font-normal text-BrandGray2">({title.length}/{MAX_TITLE})</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value.slice(0, MAX_TITLE))}
              placeholder="e.g. Play editor crashes when dragging players"
              className="w-full rounded-xl border border-BrandGray2/30 bg-BrandBlack2/30 px-4 py-3 text-sm text-BrandText outline-none placeholder:text-BrandGray2/50 focus:border-BrandOrange transition"
              required
              disabled={submitting}
            />
          </div>

          {/* Description */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-BrandGray">
              Description
              <span className="ml-1 font-normal text-BrandGray2">({description.length}/{MAX_DESC})</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, MAX_DESC))}
              placeholder="Describe what happened, what you expected, and any steps to reproduce the issue..."
              rows={8}
              className="w-full resize-none rounded-xl border border-BrandGray2/30 bg-BrandBlack2/30 px-4 py-3 text-sm text-BrandText outline-none placeholder:text-BrandGray2/50 focus:border-BrandOrange transition"
              required
              disabled={submitting}
            />
          </div>

          {error && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || !title.trim() || !description.trim()}
            className="rounded-xl bg-BrandOrange py-3 text-sm font-semibold text-white transition hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
          >
            {submitting ? "Submitting..." : "Submit Issue"}
          </button>
        </form>
      </div>
    </div>
  );
}
