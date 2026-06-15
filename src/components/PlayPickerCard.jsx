import { Badge, Button, Card, Chip, Spinner } from "../design-system/components";
import PlayPreviewCard from "./PlayPreviewCard";
import { FiCheck, FiChevronRight, FiLayout, FiPlus, FiTag } from "react-icons/fi";

/**
 * Play card for browse / add-to-playbook contexts.
 * Distinct from PlayCard (owned play management) — different info hierarchy and no edit actions.
 * @param {{ id: string, title: string, description?: string, tags?: string[], playData?: Object }} play
 * @param {boolean} added - Whether this play has already been added to the playbook
 * @param {boolean} [addLoading=false]
 * @param {boolean} [addSuccess=false]
 * @param {() => void} onAdd
 * @param {() => void} [onClick]
 * @param {string} [className]
 */
export default function PlayPickerCard({ play, added, addLoading = false, addSuccess = false, onAdd, onClick, className = "" }) {
  return (
    <div data-component="PlayPickerCard" className={className}>
      <Card
        padding="none"
        interactive
        onClick={onClick}
        className="group flex cursor-pointer flex-col overflow-hidden rounded-3xl border border-[color:var(--ui-border)] transition hover:border-BrandOrange/25 hover:shadow-[0_18px_50px_rgba(0,0,0,0.24)]"
        style={{ background: "linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0)),var(--ui-surface)" }}
      >
        <div className="relative block w-full text-left">
          <div className="border-b border-white/6 bg-BrandBlack/40 p-3">
            {play.playData ? (
              <PlayPreviewCard
                playData={play.playData}
                autoplay="hover"
                shape="landscape"
                cameraMode="fit-distribution"
                background="field"
                paddingPx={20}
                minSpanPx={100}
                showHoverHint={false}
                className="overflow-hidden rounded-2xl"
              />
            ) : (
              <div className="flex aspect-video w-full items-center justify-center rounded-2xl" style={{ backgroundColor: "var(--ui-surface-2)" }}>
                <FiLayout className="text-2xl opacity-40" style={{ color: "var(--ui-text-subtle)" }} />
              </div>
            )}
            {play.tags?.length > 0 && (
              <Badge className="pointer-events-none absolute right-5 top-5 backdrop-blur-sm" size="xs">
                {play.tags.length} tag{play.tags.length !== 1 ? "s" : ""}
              </Badge>
            )}
          </div>
        </div>

        <div className="flex flex-1 flex-col p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h4 className="truncate font-Manrope text-sm font-bold" style={{ color: "var(--ui-text)" }}>{play.title}</h4>
              <p className="mt-1 text-[11px] uppercase tracking-[0.16em]" style={{ color: "var(--ui-text-subtle)" }}>
                Play Preview
              </p>
            </div>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[color:var(--ui-border)] text-[color:var(--ui-text-muted)] transition group-hover:border-BrandOrange/30 group-hover:text-BrandOrange" style={{ backgroundColor: "rgba(0,0,0,0.35)" }}>
              <FiChevronRight className="text-sm" />
            </div>
          </div>
          {play.description && (
            <p className="mt-2 line-clamp-2 text-xs leading-relaxed" style={{ color: "var(--ui-text-muted)" }}>
              {play.description}
            </p>
          )}
          {play.tags?.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {play.tags.map((tag) => (
                <Chip key={tag} leadingIcon={<FiTag className="text-[8px]" />}>{tag}</Chip>
              ))}
            </div>
          )}

          {onAdd && (
            <Button
              variant="primary"
              onClick={(e) => { e.stopPropagation(); onAdd(); }}
              disabled={added || addLoading}
              className={`mt-4 flex w-full items-center justify-center gap-1.5 rounded-full py-2.5 text-xs font-semibold transition disabled:opacity-70 ${
                added || addSuccess
                  ? "bg-green-500/10 text-green-400"
                  : "border border-BrandOrange/20 bg-BrandOrange/10 text-BrandOrange hover:bg-BrandOrange/18"
              }`}
            >
              {addLoading ? (
                <Spinner size="sm" />
              ) : added || addSuccess ? (
                <><FiCheck className="text-xs" /> Added to Playbook</>
              ) : (
                <><FiPlus className="text-xs" /> Add to Playbook</>
              )}
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
