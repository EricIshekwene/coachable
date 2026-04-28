import { useState, useRef, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { FiArrowLeft, FiX, FiClock, FiSearch } from "react-icons/fi";
import { useAppMessage } from "../../context/AppMessageContext";
import { useAuth } from "../../context/AuthContext";
import { createPlay, fetchTeamTags, fetchSportPresets } from "../../utils/apiPlays";
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
  const [tagInput, setTagInput] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [teamTags, setTeamTags] = useState([]);
  const [sportPresets, setSportPresets] = useState([]);
  const [selectedPresetId, setSelectedPresetId] = useState("blank");
  const [presetSearch, setPresetSearch] = useState("");
  const inputRef = useRef(null);
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

  const suggestions = (() => {
    const query = tagInput.trim().toLowerCase();
    if (!query) {
      // Show recent team tags when focused with no input
      return teamTags.filter((t) => !tags.includes(t)).slice(0, 8);
    }
    const matches = teamTags.filter(
      (t) => t.toLowerCase().includes(query) && !tags.includes(t)
    );
    return matches.slice(0, 8);
  })();

  const isRecentSection = !tagInput.trim() && suggestions.length > 0;

  useEffect(() => {
    setHighlightedIndex(0);
  }, [tagInput]);

  const addTag = (tag) => {
    const trimmedTag = String(tag || "").trim();
    if (!trimmedTag) return;

    if (trimmedTag.length > MAX_TAG_LENGTH) {
      showMessage(
        "Tag too long",
        `Tags can be up to ${MAX_TAG_LENGTH} characters.`,
        "error"
      );
      return;
    }

    if (tags.includes(trimmedTag)) {
      showMessage("Duplicate tag", "That tag has already been added.", "warning");
      setTagInput("");
      setShowSuggestions(false);
      inputRef.current?.focus();
      return;
    }

    if (tags.length >= MAX_TAG_COUNT) {
      showMessage(
        "Tag limit reached",
        `You can add up to ${MAX_TAG_COUNT} tags.`,
        "warning"
      );
      return;
    }

    setTags((prev) => [...prev, trimmedTag]);
    setTagInput("");
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const removeTag = (tag) => {
    setTags(tags.filter((t) => t !== tag));
  };

  const handleTagKeyDown = (e) => {
    if (e.key === "Enter" || e.key === "Tab") {
      if (suggestions.length > 0 && showSuggestions) {
        e.preventDefault();
        addTag(suggestions[highlightedIndex]);
      } else if (e.key === "Enter" && tagInput.trim()) {
        e.preventDefault();
        addTag(tagInput.trim());
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Backspace" && !tagInput && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  };

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
    const playData = chosen?.playData ?? null;

    setSubmitting(true);
    try {
      const entry = await createPlay(user.teamId, {
        title: trimmedTitle,
        tags,
        playData,
      });
      navigate(`/app/plays/${entry.id}/edit`);
    } catch {
      showMessage("Save failed", "Could not create play. Please try again.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass =
    "w-full rounded-lg border border-BrandGray2/30 bg-BrandBlack2/50 px-3.5 py-2.5 font-DmSans text-sm text-BrandText outline-none transition placeholder:text-BrandGray2 hover:border-BrandGray2 focus:border-BrandOrange focus:shadow-[0_0_0_3px_rgba(255,122,24,0.1)]";

  return (
    <div className="mx-auto max-w-lg px-6 py-8 md:px-10 md:py-16">
      <button
        onClick={() => navigate("/app/plays")}
        className="mb-8 flex items-center gap-2 text-sm text-BrandGray transition hover:text-BrandText"
      >
        <FiArrowLeft />
        Back to Playbook
      </button>

      <h1 className="font-Manrope text-xl font-bold tracking-tight">Create New Play</h1>
      <p className="mt-1.5 text-sm text-BrandGray">
        Add some details, then open the editor.
      </p>

      <form onSubmit={handleCreate} className="mt-8 flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold">Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Inside Pass Loop"
            className={inputClass}
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
              <FiSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-BrandGray2" />
              <input
                type="text"
                value={presetSearch}
                onChange={(e) => setPresetSearch(e.target.value)}
                placeholder="Search presets..."
                className="w-full rounded-lg border border-BrandGray2/30 bg-BrandBlack2/50 py-2 pl-8 pr-3 font-DmSans text-sm text-BrandText outline-none transition placeholder:text-BrandGray2 hover:border-BrandGray2/50 focus:border-BrandOrange focus:shadow-[0_0_0_3px_rgba(255,122,24,0.1)]"
              />
            </div>
          )}

          {/* Scrollable grid — fixed height ≈ 3 card rows, scrollbar hidden */}
          <div
            className="overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
            style={{ maxHeight: 456 }}
          >
            {filteredPresets.length === 0 ? (
              <p className="py-8 text-center text-sm text-BrandGray2">No presets match your search.</p>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {filteredPresets.map(({ id, label, playData: tileData }) => {
                  const isSelected = selectedPresetId === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setSelectedPresetId(id)}
                      className={`group flex flex-col gap-1.5 rounded-xl border-2 p-1.5 text-left transition-all duration-200 focus:outline-none ${
                        isSelected
                          ? "border-BrandOrange shadow-[0_0_0_4px_rgba(255,122,24,0.12)] bg-BrandOrange/5"
                          : "border-BrandGray2/20 bg-BrandBlack2/40 hover:border-BrandGray2/50 hover:bg-BrandBlack2/70"
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
                        <span className={`truncate font-DmSans text-xs font-semibold transition-colors ${isSelected ? "text-BrandOrange" : "text-BrandGray group-hover:text-BrandText"}`}>
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
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold">
            Tags <span className="font-normal text-BrandGray2">(optional)</span>
          </label>

          {/* Tag chips + input */}
          <div
            className="flex min-h-10.5 flex-wrap items-center gap-1.5 rounded-lg border border-BrandGray2/30 bg-BrandBlack2/50 px-2.5 py-2 transition focus-within:border-BrandOrange focus-within:shadow-[0_0_0_3px_rgba(255,122,24,0.1)]"
            onClick={() => inputRef.current?.focus()}
          >
            {tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 rounded-md bg-BrandOrange/10 px-2 py-1 text-xs text-BrandOrange"
              >
                {tag}
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); removeTag(tag); }}
                  className="ml-0.5 rounded-sm text-BrandOrange/60 transition hover:text-BrandOrange"
                >
                  <FiX className="text-[10px]" />
                </button>
              </span>
            ))}
            <input
              ref={inputRef}
              type="text"
              value={tagInput}
              onChange={(e) => {
                setTagInput(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
              onKeyDown={handleTagKeyDown}
              placeholder={tags.length === 0 ? "Type to search tags..." : ""}
              className="min-w-30 flex-1 bg-transparent text-sm text-BrandText outline-none placeholder:text-BrandGray2"
            />
          </div>

          {/* Suggestions dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="relative">
              <div className="absolute left-0 right-0 top-0 z-20 max-h-56 overflow-auto rounded-lg border border-BrandGray2/30 bg-BrandBlack shadow-lg">
                {isRecentSection && (
                  <div className="flex items-center gap-1.5 border-b border-BrandGray2/15 px-3.5 py-1.5">
                    <FiClock className="text-[10px] text-BrandGray2" />
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-BrandGray2">Recent</span>
                  </div>
                )}
                {suggestions.map((tag, i) => (
                  <button
                    key={tag}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => addTag(tag)}
                    onMouseEnter={() => setHighlightedIndex(i)}
                    className={`flex w-full items-center px-3.5 py-2.5 text-left text-sm transition ${
                      i === highlightedIndex
                        ? "bg-BrandOrange/10 text-BrandOrange"
                        : "text-BrandGray hover:bg-BrandBlack2 hover:text-BrandText"
                    }`}
                  >
                    {tag}
                    <span className="ml-auto text-[10px] text-BrandGray2">
                      {i === highlightedIndex ? "Tab / Enter" : ""}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={!title.trim() || submitting}
          className="mt-2 flex w-full items-center justify-center rounded-lg bg-BrandOrange py-2.5 text-sm font-semibold text-white transition hover:brightness-110 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Create & Open Editor
        </button>
      </form>
    </div>
  );
}
