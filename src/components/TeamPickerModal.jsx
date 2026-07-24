import { createPortal } from "react-dom";
import { FiCheck, FiUser, FiX } from "react-icons/fi";

const ROLE_LABELS = {
  owner: "Owner",
  coach: "Coach",
  assistant_coach: "Asst. Coach",
  player: "Player",
};

/**
 * TeamPickerModal — lets a user with more than one team choose which team a
 * shared play/folder should be added to, instead of silently guessing.
 * Mirrors the team list styling used by the app sidebar's TeamSwitcher.
 *
 * @param {Object} props
 * @param {boolean} props.open - Whether the modal is visible.
 * @param {Array<{teamId: string, teamName: string, role: string, isPersonal?: boolean}>} props.teams
 *   - Candidate teams the user can add to (already filtered to coach-eligible roles).
 * @param {string} [props.title="Add to which team?"] - Modal heading.
 * @param {Function} props.onSelect - Called with the chosen `teamId`.
 * @param {Function} props.onCancel - Called when the user dismisses the modal.
 */
export default function TeamPickerModal({
  open,
  teams,
  title = "Add to which team?",
  onSelect,
  onCancel,
}) {
  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/65 backdrop-blur-[1px]"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div className="bg-BrandBlack border border-BrandGray2/80 rounded-xl shadow-[0_18px_38px_-18px_rgba(0,0,0,0.95)] w-full max-w-sm mx-4">
        <div className="flex items-center justify-between border-b border-BrandGray2/20 px-5 py-3.5">
          <p className="text-BrandWhite font-DmSans font-semibold text-sm">{title}</p>
          <button
            onClick={onCancel}
            className="rounded p-0.5 text-BrandGray2 hover:text-BrandWhite"
            aria-label="Cancel"
          >
            <FiX className="text-sm" />
          </button>
        </div>
        <div className="py-1 max-h-80 overflow-y-auto">
          {(teams || []).map((t) => (
            <button
              key={t.teamId}
              type="button"
              onClick={() => onSelect(t.teamId)}
              className="flex w-full items-center gap-2.5 px-5 py-3 text-left transition hover:bg-BrandBlack2/60"
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-BrandOrange/15 text-[11px] font-bold text-BrandOrange">
                {t.isPersonal ? <FiUser className="text-sm" /> : (t.teamName?.[0] || "?")}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-BrandWhite">
                  {t.isPersonal ? (t.teamName || "Personal Workspace") : t.teamName}
                </p>
                <p className="text-[11px] text-BrandGray2">
                  {t.isPersonal ? "solo" : ROLE_LABELS[t.role] || t.role}
                </p>
              </div>
              {t.isActive && <FiCheck className="shrink-0 text-sm text-BrandOrange" />}
            </button>
          ))}
        </div>
      </div>
    </div>,
    document.body
  );
}
