import { Button, Card, Divider, Input, TagInput } from "../../design-system/components";
import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { FiArrowLeft, FiX, FiSearch } from "react-icons/fi";
import { useAppMessage } from "../../context/AppMessageContext";
import { useAuth } from "../../context/AuthContext";
import { createPlay, fetchTeamTags, fetchSportPresets } from "../../api/apiPlays";
import PlayPreviewCard from "../../components/PlayPreviewCard";
import {
  resolveFieldTypeFromSport,
  createDefaultAdvancedSettings,
  SPORT_DEFAULTS,
} from "../../features/slate/hooks/useAdvancedSettings";

const MAX_TITLE_LENGTH = 80;
const MAX_TAG_LENGTH = 24;
const MAX_TAG_COUNT = 12;

const NOW = "2026-04-28T00:00:00.000Z";

/** Builds blank preset preview data matching the editor's actual initial state for the given sport. */
function buildBlankPreviewData(fieldType) {
  const advancedSettings = createDefaultAdvancedSettings(fieldType);
  const sd = SPORT_DEFAULTS[fieldType] || {};
  const fieldRotation = sd.defaultFieldRotation ?? 0;
  return {
    schemaVersion: "play-export-v2",
    exportedAt: NOW,
    play: {
      name: "Blank",
      id: null,
      settings: {
        advancedSettings,
        allPlayersDisplay: { sizePercent: 100, color: "#ef4444", showNumber: true },
        currentPlayerColor: "#ef4444",
      },
      canvas: { camera: { x: 0, y: 0, zoom: 1 }, fieldRotation },
      entities: {
        playersById: {
          "player-1": { id: "player-1", x: 0, y: 0, number: 1, name: "", color: "#ef4444" },
        },
        representedPlayerIds: ["player-1"],
        ball: { id: "ball-1", x: 40, y: 0 },
        ballsById: { "ball-1": { id: "ball-1", x: 40, y: 0 } },
      },
      animation: {
        version: 1,
        durationMs: 30000,
        tracks: {},
        meta: { createdAt: NOW, updatedAt: NOW },
      },
      drawings: [],
      playback: { speedMultiplier: 50 },
      meta: { appVersion: "1.0.0" },
    },
  };
}

export default function PlayNew() {
  const [title, setTitle] = useState("");
  const [tags, setTags] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [teamTags, setTeamTags] = useState([]);
  const [sportPresets, setSportPresets] = useState([]);
  const [selectedPresetId, setSelectedPresetId] = useState("blank");
  const [presetSearch, setPresetSearch] = useState("");
  const [editorMode, setEditorMode] = useState("drawing");
  const navigate = useNavigate();
  const { showMessage } = useAppMessage();
  const { user } = useAuth();

  const fieldType = useMemo(() => resolveFieldTypeFromSport(user?.sport), [user?.sport]);

  const blankPreviewData = useMemo(() => buildBlankPreviewData(fieldType), [fieldType]);

  const allPresets = useMemo(() => [
    { id: "blank", label: "Blank", playData: blankPreviewData },
    ...sportPresets.map((p) => ({ id: p.id, label: p.name, playData: p.playData })),
  ], [blankPreviewData, sportPresets]);

  const filteredPresets = useMemo(() => {
    const q = presetSearch.trim().toLowerCase();
    if (!q) return allPresets;
    return allPresets.filter((p) => p.label.toLowerCase().includes(q));
  }, [allPresets, presetSearch]);

  useEffect(() => {
    if (user?.teamId) {
      fetchTeamTags(user.teamId).then(setTeamTags).catch(() => {});
    }
  }, [user?.teamId]);

  useEffect(() => {
    if (!fieldType || fieldType === "Blank") return;
    fetchSportPresets(fieldType).then(setSportPresets);
  }, [fieldType]);

  const handleCreate = async (e) => {
    e.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      showMessage("Missing title", "Please enter a play title.", "error");
      return;
    }
    if (trimmedTitle.length > MAX_TITLE_LENGTH) {
      showMessage(
        "Title too long",
        `Title must be ${MAX_TITLE_LENGTH} characters or fewer.`,
        "error"
      );
      return;
    }

    const chosen = sportPresets.find((p) => p.id === selectedPresetId);
    const mode = fieldType === "Football" ? editorMode : "keyframe";

    // Presets only supply object positioning — never the editor mode. Each preset
    // bundle bakes in its own `meta.editorMode` (usually "keyframe"); left as-is it
    // would override the creation mode the user just picked above (the saved value
    // wins in PlayEditPage). Stamp the chosen mode onto the preset data so it both
    // opens and reopens in the right mode.
    let playData = chosen?.playData ?? null;
    if (playData?.play) {
      playData = {
        ...playData,
        play: {
          ...playData.play,
          meta: { ...(playData.play.meta || {}), editorMode: mode },
        },
      };
    }

    setSubmitting(true);
    try {
      const entry = await createPlay(user.teamId, {
        title: trimmedTitle,
        tags,
        playData,
      });
      navigate(`/app/plays/${entry.id}/edit`, { state: { mode } });
    } catch {
      showMessage("Save failed", "Could not create play. Please try again.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass =
    "w-full rounded-lg border border-[color:var(--ui-border)] px-3.5 py-2.5 font-DmSans text-sm text-[color:var(--ui-text)] outline-none transition hover:border-[color:var(--ui-border-strong)] focus:border-BrandOrange focus:shadow-[0_0_0_3px_rgba(255,122,24,0.1)]";
  const inputStyle = { backgroundColor: "var(--ui-surface-2)" };

  return (
    <div className="mx-auto max-w-lg px-6 py-8 md:px-10 md:py-16">
      <Button variant="ghost"
        onClick={() => navigate("/app/plays")}
        className="mb-8 flex items-center gap-2 text-sm text-[color:var(--ui-text-muted)] transition hover:text-[color:var(--ui-text)]"
      >
        <FiArrowLeft />
        Back to Playbook
      </Button>

      <h1 className="font-Manrope text-xl font-bold tracking-tight">Create New Play</h1>
      <p className="mt-1.5 text-sm" style={{ color: "var(--ui-text-muted)" }}>
        Add some details, then open the editor.
      </p>

      <form onSubmit={handleCreate} className="mt-8 flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <Input
            label="Title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Inside Pass Loop"
            className={inputClass}
            style={inputStyle}
            maxLength={MAX_TITLE_LENGTH}
            autoFocus
          />
        </div>

        {/* Preset picker */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold">Starting Canvas</label>

          {/* Search — only shown when there are more than 6 presets */}
          {allPresets.length > 6 && (
            <div className="relative">
              <FiSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs" style={{ color: "var(--ui-text-subtle)" }} />
              <Input
                type="text"
                value={presetSearch}
                onChange={(e) => setPresetSearch(e.target.value)}
                placeholder="Search presets..."
                maxLength={100}
                className="w-full rounded-lg border border-[color:var(--ui-border)] py-2 pl-8 pr-3 font-DmSans text-sm text-[color:var(--ui-text)] outline-none transition hover:border-[color:var(--ui-border-strong)] focus:border-BrandOrange focus:shadow-[0_0_0_3px_rgba(255,122,24,0.1)]"
                style={{ backgroundColor: "var(--ui-surface-2)" }}
              />
            </div>
          )}

          {/* Scrollable grid — fixed height ≈ 3 card rows, scrollbar hidden */}
          <div
            className="overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
            style={{ maxHeight: 304 }}
          >
            {filteredPresets.length === 0 ? (
              <p className="py-8 text-center text-sm" style={{ color: "var(--ui-text-subtle)" }}>No presets match your search.</p>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {filteredPresets.map(({ id, label, playData: tileData }) => {
                  const isSelected = selectedPresetId === id;
                  return (
                    <Card
                      as="button"
                      key={id}
                      type="button"
                      padding="sm"
                      interactive
                      selected={isSelected}
                      onClick={() => setSelectedPresetId(id)}
                      className={`group flex flex-col gap-1.5 rounded-xl border-2 p-1.5 text-left transition-all duration-200 focus:outline-none ${
                        isSelected
                          ? "border-BrandOrange shadow-[0_0_0_4px_rgba(255,122,24,0.12)] bg-BrandOrange/5"
                          : "border-[color:var(--ui-border)] bg-[color:var(--ui-surface-2)] hover:border-[color:var(--ui-border-strong)] hover:bg-[color:var(--ui-surface-3)]"
                      }`}
                    >
                      <div className="overflow-hidden rounded-lg ring-1 ring-white/5" style={{ height: 90 }}>
                        <PlayPreviewCard
                          playData={tileData}
                          autoplay="hover"
                          shape="landscape"
                          cameraMode="fit-distribution"
                          background="field"
                          paddingPx={20}
                          minSpanPx={100}
                          className="h-full w-full"
                        />
                      </div>
                      <div className="flex items-center justify-between px-0.5 pb-0.5">
                        <span className={`truncate font-DmSans text-xs font-semibold transition-colors ${isSelected ? "text-BrandOrange" : "text-[color:var(--ui-text-muted)] group-hover:text-[color:var(--ui-text)]"}`}>
                          {label}
                        </span>
                        {isSelected && (
                          <span className="ml-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-BrandOrange">
                            <svg className="h-2.5 w-2.5 text-white" viewBox="0 0 10 10" fill="currentColor">
                              <path d="M1.5 5.5 4 8l4.5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                            </svg>
                          </span>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Editor mode picker — Football only */}
        {fieldType === "Football" && (
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold">Editor Mode</label>
            <div className="flex gap-2">
              <Button variant="primary"
                type="button"
                onClick={() => setEditorMode("drawing")}
                className={`flex flex-1 flex-col items-center gap-1 rounded-xl border-2 px-3 py-3 text-sm font-medium transition-all duration-200 focus:outline-none ${
                  editorMode === "drawing"
                    ? "border-BrandOrange bg-BrandOrange/5 text-BrandOrange shadow-[0_0_0_4px_rgba(255,122,24,0.12)]"
                    : "border-[color:var(--ui-border)] bg-[color:var(--ui-surface-2)] text-[color:var(--ui-text-muted)] hover:border-[color:var(--ui-border-strong)] hover:bg-[color:var(--ui-surface-3)] hover:text-[color:var(--ui-text)]"
                }`}
              >
                <span className="text-base">✏️</span>
                Drawing
                <span className={`text-xs font-normal ${editorMode === "drawing" ? "text-BrandOrange/70" : "text-[color:var(--ui-text-subtle)]"}`}>
                  For simple routes
                </span>
              </Button>
              <Button variant="primary"
                type="button"
                onClick={() => setEditorMode("keyframe")}
                className={`flex flex-1 flex-col items-center gap-1 rounded-xl border-2 px-3 py-3 text-sm font-medium transition-all duration-200 focus:outline-none ${
                  editorMode === "keyframe"
                    ? "border-BrandOrange bg-BrandOrange/5 text-BrandOrange shadow-[0_0_0_4px_rgba(255,122,24,0.12)]"
                    : "border-[color:var(--ui-border)] bg-[color:var(--ui-surface-2)] text-[color:var(--ui-text-muted)] hover:border-[color:var(--ui-border-strong)] hover:bg-[color:var(--ui-surface-3)] hover:text-[color:var(--ui-text)]"
                }`}
              >
                <span className="text-base">⏱</span>
                Keyframe
                <span className={`text-xs font-normal ${editorMode === "keyframe" ? "text-BrandOrange/70" : "text-[color:var(--ui-text-subtle)]"}`}>
                  For complex movement
                </span>
              </Button>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold">
            Tags <span className="font-normal" style={{ color: "var(--ui-text-subtle)" }}>(optional)</span>
          </label>

          <TagInput
            value={tags}
            onChange={setTags}
            suggestions={teamTags}
            placeholder="Type to search tags..."
            maxTags={MAX_TAG_COUNT}
          />
        </div>

        <Divider />
        <Button variant="primary"
          type="submit"
          disabled={!title.trim() || submitting}
          className="mt-2 flex w-full items-center justify-center rounded-lg bg-BrandOrange py-2.5 text-sm font-semibold text-white transition hover:brightness-110 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Create & Open Editor
        </Button>
      </form>
    </div>
  );
}
