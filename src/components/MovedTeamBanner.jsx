import { FiExternalLink } from "react-icons/fi";
import { useMigrationStatus } from "../context/MigrationStatusContext";
import { V2_APP_URL, shouldShowMovedBanner } from "../utils/migrationDestination";

/**
 * Slim, non-blocking banner for a partially-migrated coach.
 *
 * Shown only when SOME of the coach's teams have moved to the new Coachable
 * while the team they are currently working in has not. It never blocks the
 * app — the moved team's full interstitial appears only when that team is the
 * active one. Renders nothing at all when there is no migration information,
 * so an unmigrated coach sees zero change.
 *
 * Styled exactly like the existing AppLayout banners (Player View / Missing
 * Sport) — V1's own look, nothing new.
 *
 * @param {{ activeTeamId: string|null|undefined }} props
 */
export default function MovedTeamBanner({ activeTeamId }) {
  const status = useMigrationStatus();
  const { movedTeams } = status;

  // The active team having moved is handled by the full interstitial instead.
  if (!shouldShowMovedBanner(status, activeTeamId)) return null;

  const names = movedTeams.map((t) => t.teamName).join(", ");

  return (
    <div className="flex items-center justify-between gap-3 border-b border-BrandOrange/30 bg-BrandOrange/10 px-4 py-2">
      <div className="flex min-w-0 items-center gap-2">
        <FiExternalLink className="shrink-0 text-sm text-BrandOrange" />
        <span className="shrink-0 text-xs font-semibold text-BrandOrange">
          {movedTeams.length === 1 ? `${names} has moved` : "Some of your teams have moved"}
        </span>
        <span className="truncate text-xs text-BrandGray2">
          — {movedTeams.length === 1 ? "that team is" : `${names} are`} now on the new
          Coachable, with all of its plays. This team has not moved, so keep working here.
        </span>
      </div>
      <a
        href={V2_APP_URL}
        className="shrink-0 rounded-md bg-BrandOrange px-3 py-1.5 text-xs font-semibold text-white transition hover:brightness-110"
      >
        Open new Coachable
      </a>
    </div>
  );
}
