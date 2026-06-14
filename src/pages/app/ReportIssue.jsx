import { Alert, Badge, Button, Card, EmptyState, Input, Textarea } from "../../design-system/components";
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
        <EmptyState
          icon={<FiCheckCircle />}
          title="Issue Submitted"
          description="Thanks for the report! We'll look into it and get back to you if we need more details."
          action={<Button variant="primary" onClick={handleReset}>Report Another Issue</Button>}
        />
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
              <Badge tone="info" size="xs">Beta</Badge>
            </div>
            <p className="text-xs text-BrandGray2">Found something broken? Let us know.</p>
          </div>
        </div>

        <Card as="form" onSubmit={handleSubmit} className="flex flex-col gap-5">
          {/* Title */}
          <div>
            <Input
              label="Issue Title"
              hint={`${title.length}/${MAX_TITLE}`}
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value.slice(0, MAX_TITLE))}
              placeholder="e.g. Play editor crashes when dragging players"
              maxLength={MAX_TITLE}
              className="w-full rounded-xl border border-BrandGray2/30 bg-BrandBlack2/30 px-4 py-3 text-sm text-BrandText outline-none placeholder:text-BrandGray2/50 focus:border-BrandOrange transition"
              required
              disabled={submitting}
            />
          </div>

          {/* Description */}
          <div>
            <Textarea
              label="Description"
              hint={`${description.length}/${MAX_DESC}`}
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, MAX_DESC))}
              placeholder="Describe what happened, what you expected, and any steps to reproduce the issue..."
              rows={8}
              maxLength={MAX_DESC}
              className="w-full resize-none rounded-xl border border-BrandGray2/30 bg-BrandBlack2/30 px-4 py-3 text-sm text-BrandText outline-none placeholder:text-BrandGray2/50 focus:border-BrandOrange transition"
              required
              disabled={submitting}
            />
          </div>

          {error && (
            <Alert tone="error" title="Could not submit issue">{error}</Alert>
          )}

          <Button variant="primary"
            type="submit"
            disabled={submitting || !title.trim() || !description.trim()}
            className="rounded-xl bg-BrandOrange py-3 text-sm font-semibold text-white transition hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
          >
            {submitting ? "Submitting..." : "Submit Issue"}
          </Button>
        </Card>
      </div>
    </div>
  );
}
