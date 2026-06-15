import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FiArrowLeft } from "react-icons/fi";
import whiteLogo from "../assets/logos/White_Full_Coachable.png";
import brandImage from "../assets/pictures/Rugby_coach_holding_ipad_long.png";
import RugbyField from "../assets/objects/Field Vectors/Rugby_Field.png";
import SoccerField from "../assets/objects/Field Vectors/Soccer_Field.png";
import FootballField from "../assets/objects/Field Vectors/Football_Field.png";
import LacrosseField from "../assets/objects/Field Vectors/Lacrosse_Field.png";
import WomensLacrosseField from "../assets/objects/Field Vectors/Womans_Lacrosse_Field.png";
import BasketballField from "../assets/objects/Field Vectors/Basketball_Field.png";
import FieldHockeyField from "../assets/objects/Field Vectors/Field_Hockey_Field.png";
import IceHockeyField from "../assets/objects/Field Vectors/Ice_Hockey_Field.png";
import { getAuthToken } from "../api/api";
import PlayPreviewCard from "../components/PlayPreviewCard";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

const SPORTS = [
  { key: "rugby", label: "Rugby", image: RugbyField, color: "#4FA85D" },
  { key: "soccer", label: "Soccer", image: SoccerField, color: "#3E8E5B" },
  { key: "football", label: "Football", image: FootballField, color: "#1F5F3F" },
  { key: "lacrosse", label: "Lacrosse", image: LacrosseField, color: "#4FA85D" },
  { key: "womens lacrosse", label: "Women's Lacrosse", image: WomensLacrosseField, color: "#4FA85D" },
  { key: "basketball", label: "Basketball", image: BasketballField, color: "#D8C3A5" },
  { key: "field hockey", label: "Field Hockey", image: FieldHockeyField, color: "#3E8E5B" },
  { key: "ice hockey", label: "Ice Hockey", image: IceHockeyField, color: "#ECF8FE", imageRotation: 90 },
  { key: "blank", label: "Blank Canvas", image: null, color: "#4FA85D" },
];

/**
 * Fetch published sport presets for a given sport key.
 * Returns an empty array if the request fails or the user is not authenticated.
 * @param {string} sportKey - Sport identifier (e.g. "football")
 * @returns {Promise<Array<{id: string, name: string, playData: Object}>>}
 */
async function fetchSportPresets(sportKey) {
  try {
    const token = getAuthToken();
    const res = await fetch(
      `${API_URL}/sport-presets/${encodeURIComponent(sportKey)}`,
      {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: "include",
      }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return data.presets || [];
  } catch {
    return [];
  }
}

/**
 * Full-screen sport picker page shown at /slate.
 *
 * Flow:
 *  Step 1 (sport) — grid of sport cards.
 *  Step 2 (preset) — preset picker for the selected sport, animated in.
 *    For football, also shows an editor-mode picker (Drawing vs Keyframe).
 *
 * On confirm the user is navigated to /slate/:sport with location state
 * carrying the chosen presetPlayData and mode.
 */
export default function SportPickerPage() {
  const navigate = useNavigate();

  // "sport" | "preset"
  const [step, setStep] = useState("sport");
  const [selectedSport, setSelectedSport] = useState(null);
  const [presets, setPresets] = useState([]);
  const [loadingPresets, setLoadingPresets] = useState(false);
  // null = blank canvas selected
  const [presetSelection, setPresetSelection] = useState(null);
  // "keyframe" | "drawing" — football only
  const [editorMode, setEditorMode] = useState("drawing");

  const isFootball = selectedSport?.key === "football";

  /**
   * Handle a sport card click. If the sport has published presets, animate to
   * the preset picker step. Otherwise navigate directly to /slate/:sport.
   * @param {Object} sport - Entry from SPORTS array
   */
  const handleSportClick = async (sport) => {
    if (sport.key === "blank") {
      navigate("/slate/blank");
      return;
    }

    setLoadingPresets(true);
    const fetched = await fetchSportPresets(sport.key);
    setLoadingPresets(false);

    if (fetched.length === 0) {
      navigate(`/slate/${encodeURIComponent(sport.key)}`);
      return;
    }

    setSelectedSport(sport);
    setPresets(fetched);
    setPresetSelection(null);
    setEditorMode("drawing");
    setStep("preset");
  };

  /** Navigate to the editor with the chosen preset and mode. */
  const handleConfirm = () => {
    if (!selectedSport) return;
    navigate(`/slate/${encodeURIComponent(selectedSport.key)}`, {
      state: {
        presetPlayData: presetSelection?.playData ?? null,
        mode: isFootball ? editorMode : "keyframe",
      },
    });
  };

  /** Go back to sport selection. */
  const handleBack = () => {
    setStep("sport");
    setSelectedSport(null);
    setPresets([]);
    setPresetSelection(null);
  };

  return (
    // Outer: min-height for mobile (natural scroll); locked to viewport on md+
    <div
      className="font-DmSans md:flex md:overflow-hidden"
      style={{ minHeight: "var(--app-viewport-height)", height: "var(--app-viewport-height)" }}
    >
      {/* Left panel — scrolls naturally on mobile; fixed height + internal scroll on md+ */}
      <div
        className="flex w-full flex-col bg-BrandBlack px-6 sm:px-12 md:w-1/2 md:h-full md:overflow-hidden lg:px-20 xl:px-24"
        style={{
          minHeight: "var(--app-viewport-height)",
          paddingTop: "max(2rem, env(safe-area-inset-top))",
        }}
      >
        <div className="mx-auto w-full max-w-lg flex flex-col flex-1 md:h-full md:overflow-hidden">
          {/* Step 1: Sport picker — scrollable on mobile, fits viewport on md+ */}
          <div
            className="flex flex-col flex-1 overflow-y-auto hide-scroll md:h-full transition-all duration-300 ease-in-out"
            style={{
              paddingBottom: "calc(2rem + env(safe-area-inset-bottom) + var(--app-keyboard-inset))",
              opacity: step === "sport" ? 1 : 0,
              transform: step === "sport" ? "translateX(0)" : "translateX(-32px)",
              pointerEvents: step === "sport" ? "auto" : "none",
              position: step === "sport" ? "relative" : "absolute",
              inset: step === "sport" ? "auto" : 0,
            }}
          >
            {/* Back to home */}
            <Link to="/" className="mb-4 inline-flex items-center gap-1.5 text-xs text-white/40 transition hover:text-white/80">
              <FiArrowLeft className="text-sm" /> Back to home
            </Link>

            {/* Logo */}
            <img src={whiteLogo} alt="Coachable" className="mb-8 block h-6 w-auto self-start object-contain opacity-70" />

            {/* Header */}
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.25em] text-BrandOrange">
              Play Designer
            </p>
            <h1 className="font-Manrope text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Choose your sport
            </h1>
            <p className="mt-1.5 text-xs text-white/40 max-w-sm">
              Select a sport to open the editor with the right field, positions, and defaults.
            </p>

            {/* Sport cards */}
            <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {SPORTS.map((sport) => (
                <button
                  key={sport.key}
                  type="button"
                  onClick={() => handleSportClick(sport)}
                  disabled={loadingPresets}
                  className="group relative flex flex-col items-center justify-end aspect-square rounded-xl border border-white/6 overflow-hidden transition-all duration-200 hover:border-BrandOrange/50 hover:shadow-[0_0_24px_-6px_rgba(255,122,24,0.25)] cursor-pointer focus:outline-none focus:ring-2 focus:ring-BrandOrange/40 disabled:opacity-50 disabled:cursor-wait"
                  style={{ backgroundColor: sport.color }}
                >
                  {sport.image ? (
                    <img
                      src={sport.image}
                      alt=""
                      className="absolute inset-0 w-full h-full object-contain opacity-60 group-hover:opacity-80 group-hover:scale-105 transition-all duration-200"
                      style={sport.imageRotation ? { transform: `rotate(${sport.imageRotation}deg)` } : undefined}
                      draggable={false}
                    />
                  ) : (
                    <div className="absolute inset-0 opacity-10 group-hover:opacity-20 transition-opacity duration-200"
                      style={{
                        backgroundImage: "linear-gradient(rgba(255,255,255,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.4) 1px, transparent 1px)",
                        backgroundSize: "24px 24px",
                      }}
                    />
                  )}
                  <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/20 to-transparent" />
                  <span className="relative z-10 mb-3 text-sm sm:text-base font-semibold text-white group-hover:text-BrandOrange transition-colors">
                    {sport.label}
                  </span>
                </button>
              ))}
            </div>

            {/* Footer */}
            <div className="mt-auto pt-6 flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-BrandOrange/60" />
              <span className="text-xs text-white/25">
                You can change the sport anytime in Advanced Settings
              </span>
            </div>
          </div>

          {/* Step 2: Preset picker — fixed header + scrollable presets + fixed footer */}
          <div
            className="flex flex-col flex-1 md:h-full transition-all duration-300 ease-in-out"
            style={{
              opacity: step === "preset" ? 1 : 0,
              transform: step === "preset" ? "translateX(0)" : "translateX(32px)",
              pointerEvents: step === "preset" ? "auto" : "none",
              position: step === "preset" ? "relative" : "absolute",
              inset: step === "preset" ? "auto" : 0,
            }}
          >
            {/* Fixed header */}
            <div
              className="shrink-0"
              style={{ paddingTop: "max(2rem, env(safe-area-inset-top))" }}
            >
              <button
                type="button"
                onClick={handleBack}
                className="mb-4 inline-flex items-center gap-1.5 text-xs text-white/40 transition hover:text-white/80 self-start"
              >
                <FiArrowLeft className="text-sm" /> Back to sports
              </button>

              <img src={whiteLogo} alt="Coachable" className="mb-6 block h-6 w-auto self-start object-contain opacity-70" />

              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.25em] text-BrandOrange">
                {selectedSport?.label}
              </p>
              <h1 className="font-Manrope text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                Choose a starting formation
              </h1>
              <p className="mt-1.5 text-xs text-white/40 max-w-sm">
                Pick a preset to pre-populate the field, or start from a blank canvas.
              </p>
            </div>

            {/* Scrollable preset grid — capped at ~2 rows for football (mode picker takes space below) */}
            <div
              className="overflow-y-auto hide-scroll mt-6 px-1"
              style={{ maxHeight: isFootball ? "clamp(160px, 28vh, 220px)" : undefined, flex: isFootball ? "0 0 auto" : "1 1 0" }}
            >
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pb-2">
                <BlankPresetTile
                  selected={presetSelection === null}
                  onClick={() => setPresetSelection(null)}
                  color={selectedSport?.color ?? "#4FA85D"}
                  fieldImage={selectedSport?.image ?? null}
                  imageRotation={selectedSport?.imageRotation}
                />
                {presets.map((preset) => (
                  <PresetTile
                    key={preset.id}
                    preset={preset}
                    selected={presetSelection?.id === preset.id}
                    onClick={() => setPresetSelection(preset)}
                  />
                ))}
              </div>
            </div>

            {/* Fixed footer: mode picker (football only) + confirm + hint */}
            <div
              className="shrink-0 pt-4"
              style={{ paddingBottom: "calc(2rem + env(safe-area-inset-bottom) + var(--app-keyboard-inset))" }}
            >
              {isFootball && (
                <div className="mb-4">
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.25em] text-white/40">
                    Editor mode
                  </p>
                  <div className="flex gap-2">
                    <ModeCard
                      emoji="✏️"
                      label="Drawing"
                      description="Draw animated routes on players"
                      selected={editorMode === "drawing"}
                      onClick={() => setEditorMode("drawing")}
                    />
                    <ModeCard
                      emoji="⏱"
                      label="Keyframe"
                      description="Animate players on a timeline"
                      selected={editorMode === "keyframe"}
                      onClick={() => setEditorMode("keyframe")}
                    />
                  </div>
                </div>
              )}
              <button
                type="button"
                onClick={handleConfirm}
                className="w-full rounded-xl bg-BrandOrange px-6 py-3 text-sm font-semibold text-white transition hover:brightness-110 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-BrandOrange/40"
              >
                Open Editor
              </button>
              <div className="mt-4 flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-BrandOrange/60" />
                <span className="text-xs text-white/25">
                  You can change the formation anytime in the editor
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right - Brand panel */}
      <div className="relative hidden overflow-hidden md:flex md:w-1/2">
        <img
          src={brandImage}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-linear-to-b from-black/70 via-black/50 to-black/80" />
        <div className="relative z-10 flex h-full w-full flex-col items-start justify-end px-10 pb-16 lg:px-16 lg:pb-20">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.25em] text-BrandOrange">
            The modern playbook
          </p>
          <h2 className="font-Manrope text-5xl font-extrabold leading-[1.1] tracking-tight text-white lg:text-6xl xl:text-7xl">
            Design.<br />
            <span className="text-white/40">Animate.</span><br />
            <span className="text-BrandOrange">Share.</span>
          </h2>
          <p className="mt-6 max-w-sm text-base leading-relaxed text-white/50 lg:text-lg">
            Build plays your team can actually follow — with real-time animation and one-click sharing.
          </p>
          <div className="mt-8 flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <span className="text-xs font-medium tracking-wide text-white/40">
              Trusted by coaches at every level
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Preset tile that renders an actual PlayPreviewCard so coaches can see
 * the player positions from the preset before selecting it.
 * @param {Object} props
 * @param {{id: string, name: string, playData: Object}} props.preset
 * @param {boolean} props.selected
 * @param {Function} props.onClick
 */
function PresetTile({ preset, selected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex flex-col gap-1.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-BrandOrange/40"
    >
      <div
        className="relative w-full rounded-xl overflow-hidden transition-all duration-200"
        style={{
          outline: selected ? "2px solid rgba(255,122,24,0.9)" : "2px solid transparent",
          boxShadow: selected ? "0 0 0 3px rgba(255,122,24,0.25)" : undefined,
        }}
      >
        <PlayPreviewCard
          playData={preset.playData}
          shape="landscape"
          cameraMode="fit-distribution"
          autoplay="hover"
          className="rounded-xl"
        />
        {selected && (
          <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-BrandOrange flex items-center justify-center z-20 shadow">
            <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
              <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        )}
      </div>
      <span
        className="px-0.5 text-xs font-semibold leading-tight"
        style={{ color: selected ? "var(--color-BrandOrange)" : "rgba(255,255,255,0.7)" }}
      >
        {preset.name}
      </span>
    </button>
  );
}

/**
 * "Blank canvas" tile — no preset, just starts with an empty field.
 * @param {Object} props
 * @param {boolean} props.selected
 * @param {Function} props.onClick
 * @param {string} props.color - Sport background color
 * @param {string|null} props.fieldImage - Field image src
 * @param {number} [props.imageRotation]
 */
function BlankPresetTile({ selected, onClick, color, fieldImage, imageRotation }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex flex-col gap-1.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-BrandOrange/40"
    >
      <div
        className="relative w-full aspect-16/10 rounded-xl overflow-hidden transition-all duration-200"
        style={{
          backgroundColor: color,
          outline: selected ? "2px solid color-mix(in srgb, var(--color-BrandOrange) 90%, transparent)" : "2px solid rgba(255,255,255,0.08)",
          boxShadow: selected ? "0 0 0 3px color-mix(in srgb, var(--color-BrandOrange) 25%, transparent)" : undefined,
        }}
      >
        {fieldImage ? (
          <img
            src={fieldImage}
            alt=""
            className="absolute inset-0 w-full h-full object-contain opacity-30 group-hover:opacity-50 transition-opacity duration-200"
            style={imageRotation ? { transform: `rotate(${imageRotation}deg)` } : undefined}
            draggable={false}
          />
        ) : (
          <div
            className="absolute inset-0 opacity-10 group-hover:opacity-20 transition-opacity duration-200"
            style={{
              backgroundImage: "linear-gradient(rgba(255,255,255,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.4) 1px, transparent 1px)",
              backgroundSize: "16px 16px",
            }}
          />
        )}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-semibold text-white/40 group-hover:text-white/60 transition-colors">Empty</span>
        </div>
        {selected && (
          <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-BrandOrange flex items-center justify-center z-20 shadow">
            <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
              <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        )}
      </div>
      <span
        className="px-0.5 text-xs font-semibold leading-tight"
        style={{ color: selected ? "var(--color-BrandOrange)" : "rgba(255,255,255,0.7)" }}
      >
        Blank
      </span>
    </button>
  );
}

/**
 * Editor mode card for the football mode picker.
 * @param {Object} props
 * @param {string} props.emoji - Icon emoji
 * @param {string} props.label - Mode name
 * @param {string} props.description - Short description
 * @param {boolean} props.selected - Whether this mode is active
 * @param {Function} props.onClick - Click handler
 */
function ModeCard({ emoji, label, description, selected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-1 flex-col items-center gap-1 rounded-xl border p-3 text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-BrandOrange/40"
      style={{
        borderColor: selected ? "color-mix(in srgb, var(--color-BrandOrange) 80%, transparent)" : "rgba(255,255,255,0.08)",
        backgroundColor: selected ? "color-mix(in srgb, var(--color-BrandOrange) 12%, transparent)" : "rgba(255,255,255,0.04)",
        color: selected ? "var(--color-BrandOrange)" : "rgba(255,255,255,0.6)",
        boxShadow: selected ? "0 0 0 1px color-mix(in srgb, var(--color-BrandOrange) 30%, transparent)" : undefined,
      }}
    >
      <span className="text-base">{emoji}</span>
      <span className="font-semibold">{label}</span>
      <span className="text-xs font-normal text-center" style={{ color: selected ? "color-mix(in srgb, var(--color-BrandOrange) 70%, transparent)" : "rgba(255,255,255,0.3)" }}>
        {description}
      </span>
    </button>
  );
}
