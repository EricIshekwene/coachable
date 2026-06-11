import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useAppMessage } from "../context/AppMessageContext";
import logo from "../assets/logos/full_Coachable_logo.png";
import whiteLogo from "../assets/logos/White_Full_Coachable.png";
import brandImage from "../assets/pictures/female_football_coach_short.png";
import RugbyField from "../assets/objects/Field Vectors/Rugby_Field.png";
import SoccerField from "../assets/objects/Field Vectors/Soccer_Field.png";
import FootballField from "../assets/objects/Field Vectors/Football_Field.png";
import LacrosseField from "../assets/objects/Field Vectors/Lacrosse_Field.png";
import WomensLacrosseField from "../assets/objects/Field Vectors/Womans_Lacrosse_Field.png";
import BasketballField from "../assets/objects/Field Vectors/Basketball_Field.png";
import FieldHockeyField from "../assets/objects/Field Vectors/Field_Hockey_Field.png";
import IceHockeyField from "../assets/objects/Field Vectors/Ice_Hockey_Field.png";
import { MdOutlineCreateNewFolder } from "react-icons/md";
import { FaRegHandshake } from "react-icons/fa6";
import { FiArrowRight, FiArrowLeft, FiEdit } from "react-icons/fi";
import { INPUT_LIMITS } from "../utils/inputValidation";

/**
 * Sports available when creating a team during onboarding.
 * Each entry provides a visual field image so coaches understand
 * what field layout they'll get in the play editor.
 * "Blank Canvas" is listed last as a deliberate opt-out, not the default.
 */
const SPORTS_FOR_CREATE = [
  { key: "rugby",          label: "Rugby",             image: RugbyField,           color: "#4FA85D" },
  { key: "soccer",         label: "Soccer",            image: SoccerField,          color: "#3E8E5B" },
  { key: "football",       label: "Football",          image: FootballField,        color: "#1F5F3F" },
  { key: "lacrosse",       label: "Lacrosse",          image: LacrosseField,        color: "#4FA85D" },
  { key: "womens lacrosse",label: "Women's Lacrosse",  image: WomensLacrosseField,  color: "#4FA85D" },
  { key: "basketball",     label: "Basketball",        image: BasketballField,      color: "#D8C3A5" },
  { key: "field hockey",   label: "Field Hockey",      image: FieldHockeyField,     color: "#3E8E5B" },
  { key: "ice hockey",     label: "Ice Hockey",        image: IceHockeyField,       color: "#ECF8FE", imageRotation: 90 },
  { key: "",               label: "Blank Canvas",      image: null,                 color: "#6B7280" },
];

export default function Onboarding() {
  const [searchParams] = useSearchParams();
  const inviteFromUrl = searchParams.get("invite") || "";
  const returnTo = searchParams.get("returnTo") || "";
  const hasInvite = inviteFromUrl.length > 0;

  const [teamAction, setTeamAction] = useState(hasInvite ? "join" : "create");
  const [teamName, setTeamName] = useState("");
  const [inviteCode, setInviteCode] = useState(inviteFromUrl);
  const [sport, setSport] = useState("");
  const [soloSport, setSoloSport] = useState("");

  // Multi-step state for the "create" flow: "name" → "sport"
  const [createStep, setCreateStep] = useState("name");
  /** Whether the coach explicitly selected a sport on the sport step (including Blank Canvas). */
  const [sportChosen, setSportChosen] = useState(false);

  const { completeOnboarding } = useAuth();
  const { showMessage } = useAppMessage();
  const navigate = useNavigate();

  /**
   * Switch the active team action card and reset create-flow step state.
   * @param {"create"|"join"|"solo"} action
   */
  const handleSetTeamAction = (action) => {
    setTeamAction(action);
    setCreateStep("name");
    setSportChosen(false);
    setSport("");
  };

  const canAdvance =
    teamAction === "solo"
      ? true
      : teamAction === "create"
        ? createStep === "name"
          ? teamName.trim().length > 0
          : sportChosen
        : inviteCode.trim().length > 0;

  const [submitting, setSubmitting] = useState(false);

  /**
   * Submit the completed onboarding form to the server.
   * Validates required fields before calling completeOnboarding.
   */
  const handleFinish = async () => {
    if (teamAction === "create") {
      const trimmedTeamName = teamName.trim();
      if (!trimmedTeamName) {
        showMessage("Missing team name", "Please enter a team name to continue.", "error");
        return;
      }
      if (trimmedTeamName.length < 2) {
        showMessage("Invalid team name", "Team name must be at least 2 characters.", "error");
        return;
      }
    }

    if (teamAction === "join") {
      const trimmedInviteCode = inviteCode.trim();
      if (!trimmedInviteCode) {
        showMessage("Missing invite code", "Enter an invite code to join a team.", "error");
        return;
      }
      if (trimmedInviteCode.length < 6) {
        showMessage("Invalid invite code", "Invite code looks too short.", "error");
        return;
      }
    }

    setSubmitting(true);
    try {
      await completeOnboarding({
        teamName: teamName.trim(),
        teamAction,
        inviteCode: inviteCode.trim(),
        sport,
      });
      if (teamAction === "solo") {
        navigate(returnTo || `/slate/${soloSport || "blank"}`);
      } else {
        navigate(returnTo || "/app/plays");
      }
    } catch (err) {
      showMessage("Setup failed", err.message || "Could not complete setup.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * Handle the primary action button.
   * For the create flow on the name step, advances to the sport step.
   * Otherwise calls handleFinish to submit.
   */
  const handlePrimaryAction = () => {
    if (teamAction === "create" && createStep === "name") {
      setCreateStep("sport");
      return;
    }
    handleFinish();
  };

  const primaryButtonLabel =
    teamAction === "create" && createStep === "name"
      ? "Continue"
      : teamAction === "solo"
        ? "Get started"
        : "Finish setup";

  const inputClass =
    "w-full rounded-lg border border-BrandGray/40 bg-white px-3.5 py-2.5 font-DmSans text-sm outline-none transition placeholder:text-BrandGray hover:border-BrandGray focus:border-BrandOrange focus:shadow-[0_0_0_3px_rgba(255,122,24,0.1)]";

  const optionCard = (selected) =>
    `group flex cursor-pointer flex-col items-start rounded-xl border p-5 text-left transition duration-200 ${
      selected
        ? "border-BrandOrange bg-BrandOrange/5 shadow-[0_0_0_3px_rgba(255,122,24,0.1)]"
        : "border-BrandGray/30 hover:border-BrandGray hover:shadow-sm"
    }`;

  // Simplified flow when arriving via invite link — skip create/join choice
  if (hasInvite) {
    return (
      <div className="font-DmSans md:flex" style={{ minHeight: "var(--app-viewport-height)" }}>
        <div
          className="flex w-full flex-col overflow-y-auto bg-white px-8 sm:px-16 md:w-3/5 lg:px-24 xl:px-32"
          style={{
            minHeight: "var(--app-viewport-height)",
            paddingTop: "max(2rem, env(safe-area-inset-top))",
            paddingBottom: "calc(2rem + env(safe-area-inset-bottom) + var(--app-keyboard-inset))",
            scrollPaddingTop: "2rem",
            scrollPaddingBottom: "calc(8rem + var(--app-keyboard-inset))",
          }}
        >
          <div className="mx-auto flex min-h-full w-full max-w-lg flex-col justify-start md:justify-center">
            <Link to="/" className="mb-6 inline-flex items-center gap-1.5 text-xs text-BrandGray2 transition hover:text-BrandBlack">
              <FiArrowLeft className="text-sm" /> Back to home
            </Link>

            <img src={logo} alt="Coachable" className="mb-10 block h-7 w-auto self-start object-contain" />

            <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-BrandOrange/10">
              <FaRegHandshake className="text-2xl text-BrandOrange" />
            </div>

            <h1 className="font-Manrope text-2xl font-bold tracking-tight text-BrandBlack">
              Join your team
            </h1>
            <p className="mt-1.5 text-sm text-BrandGray2">
              Your invite code has been pre-filled. Tap the button below to join.
            </p>

            <div className="mt-6 flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-BrandBlack">Invite code</label>
              <div className="rounded-lg border border-BrandOrange/40 bg-BrandOrange/5 px-3.5 py-2.5 font-mono text-sm font-semibold tracking-wider text-BrandBlack">
                {inviteCode}
              </div>
              <p className="text-[11px] text-BrandGray">
                Your role (coach or player) is determined by the code.
              </p>
            </div>

            <div className="mt-8">
              <button
                type="button"
                disabled={submitting}
                onClick={handleFinish}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-BrandBlack py-2.5 text-sm font-semibold text-white transition hover:bg-BrandBlack2 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {submitting ? "Joining..." : "Join team"}
                {!submitting && <FiArrowRight className="text-sm" />}
              </button>
            </div>
          </div>
        </div>

        {/* Right panel */}
        <div className="relative hidden overflow-hidden md:flex md:w-2/5">
          <img src={brandImage} alt="" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/60 to-black/80" />
          <div className="relative z-10 flex h-full w-full flex-col items-start justify-end px-10 pb-16 lg:px-14 lg:pb-20">
            <img src={whiteLogo} alt="Coachable" className="absolute left-10 top-10 block h-7 w-auto object-contain opacity-70 lg:left-14 lg:top-14" />
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.25em] text-BrandOrange">
              Welcome to the team
            </p>
            <h2 className="font-Manrope text-4xl font-extrabold leading-[1.1] tracking-tight text-white lg:text-5xl xl:text-6xl">
              Step on<br />
              <span className="text-white/40">the field,</span><br />
              <span className="text-BrandOrange">together.</span>
            </h2>
            <p className="mt-6 max-w-sm text-base leading-relaxed text-white/50 lg:text-lg">
              Your invite code determines your role. You'll be added to the team automatically.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="font-DmSans md:flex" style={{ minHeight: "var(--app-viewport-height)" }}>
      <div
        className="flex w-full flex-col overflow-y-auto bg-white px-8 sm:px-16 md:w-3/5 lg:px-24 xl:px-32"
        style={{
          minHeight: "var(--app-viewport-height)",
          paddingTop: "max(2rem, env(safe-area-inset-top))",
          paddingBottom: "calc(2rem + env(safe-area-inset-bottom) + var(--app-keyboard-inset))",
          scrollPaddingTop: "2rem",
          scrollPaddingBottom: "calc(8rem + var(--app-keyboard-inset))",
        }}
      >
        <div className="mx-auto flex min-h-full w-full max-w-lg flex-col justify-start md:justify-center">
          <Link to="/" className="mb-6 inline-flex items-center gap-1.5 text-xs text-BrandGray2 transition hover:text-BrandBlack">
            <FiArrowLeft className="text-sm" /> Back to home
          </Link>

          <img src={logo} alt="Coachable" className="mb-10 block h-7 w-auto self-start object-contain" />

          <h1 className="font-Manrope text-2xl font-bold tracking-tight text-BrandBlack">
            Get started
          </h1>
          <p className="mt-1.5 text-sm text-BrandGray2">
            Create a team, join one, or jump straight into making plays.
          </p>

          <div className="mt-8 grid grid-cols-3 gap-3">
            <button type="button" onClick={() => handleSetTeamAction("create")} className={optionCard(teamAction === "create")}>
              <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-lg transition ${teamAction === "create" ? "bg-BrandOrange/20" : "bg-BrandGray/10"}`}>
                <MdOutlineCreateNewFolder className="text-xl text-BrandBlack" />
              </div>
              <p className="font-semibold text-sm text-BrandBlack">Create Team</p>
              <p className="text-xs text-BrandGray2 mt-0.5">Start fresh</p>
            </button>

            <button type="button" onClick={() => handleSetTeamAction("join")} className={optionCard(teamAction === "join")}>
              <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-lg transition ${teamAction === "join" ? "bg-BrandOrange/20" : "bg-BrandGray/10"}`}>
                <FaRegHandshake className="text-xl text-BrandBlack" />
              </div>
              <p className="font-semibold text-sm text-BrandBlack">Join Team</p>
              <p className="text-xs text-BrandGray2 mt-0.5">Use invite code</p>
            </button>

            <button type="button" onClick={() => handleSetTeamAction("solo")} className={optionCard(teamAction === "solo")}>
              <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-lg transition ${teamAction === "solo" ? "bg-BrandOrange/20" : "bg-BrandGray/10"}`}>
                <FiEdit className="text-xl text-BrandBlack" />
              </div>
              <p className="font-semibold text-sm text-BrandBlack">Just Make Plays</p>
              <p className="text-xs text-BrandGray2 mt-0.5">No team needed</p>
            </button>
          </div>

          {/* Create team — step 1: team name */}
          {teamAction === "create" && createStep === "name" && (
            <div className="mt-6 flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-BrandBlack">Team name</label>
                <input
                  type="text"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="e.g. Riverside Rugby"
                  maxLength={INPUT_LIMITS.NAME}
                  className={inputClass}
                />
              </div>
            </div>
          )}

          {/* Create team — step 2: sport selection (required) */}
          {teamAction === "create" && createStep === "sport" && (
            <div className="mt-6 flex flex-col gap-3">
              <button
                type="button"
                onClick={() => setCreateStep("name")}
                className="self-start inline-flex items-center gap-1.5 text-xs text-BrandGray2 transition hover:text-BrandBlack"
              >
                <FiArrowLeft className="text-sm" /> Back to team name
              </button>

              <div>
                <p className="text-xs font-semibold text-BrandBlack">
                  What sport does your team play?
                </p>
                <p className="mt-0.5 text-[11px] text-BrandGray2">
                  This sets the right field and player defaults in the play editor. You can change it later in team settings.
                </p>
              </div>

              <SportSelectionGrid
                sports={SPORTS_FOR_CREATE}
                selectedKey={sportChosen ? sport : null}
                onSelect={(key) => {
                  setSport(key);
                  setSportChosen(true);
                }}
              />
            </div>
          )}

          {/* Join team */}
          {teamAction === "join" && (
            <div className="mt-6 flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-BrandBlack">Invite code</label>
                <input
                  type="text"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  placeholder="Paste your invite code"
                  maxLength={INPUT_LIMITS.INVITE_CODE}
                  autoCapitalize="characters"
                  className={inputClass}
                />
                <p className="text-[11px] text-BrandGray">
                  Your role (coach or player) is determined by the code your team shared with you.
                </p>
              </div>
            </div>
          )}

          {/* Solo mode: optional sport picker */}
          {teamAction === "solo" && (
            <div className="mt-6 flex flex-col gap-3">
              <div>
                <p className="text-xs font-semibold text-BrandBlack">
                  Sport <span className="font-normal text-BrandGray">(optional)</span>
                </p>
                <p className="mt-0.5 text-[11px] text-BrandGray2">
                  Pick a sport to pre-load the right field. Skip to start on a blank canvas.
                </p>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { key: "", label: "Blank Canvas" },
                  { key: "rugby", label: "Rugby" },
                  { key: "soccer", label: "Soccer" },
                  { key: "football", label: "Football" },
                  { key: "lacrosse", label: "Lacrosse" },
                  { key: "womens lacrosse", label: "Women's Lacrosse" },
                  { key: "basketball", label: "Basketball" },
                  { key: "field hockey", label: "Field Hockey" },
                  { key: "ice hockey", label: "Ice Hockey" },
                ].map((s) => (
                  <button
                    key={s.key || "blank"}
                    type="button"
                    onClick={() => setSoloSport(s.key)}
                    className={`rounded-lg border px-3 py-2 text-left text-xs font-medium transition ${
                      soloSport === s.key
                        ? "border-BrandOrange bg-BrandOrange/5 text-BrandBlack shadow-[0_0_0_3px_rgba(255,122,24,0.1)]"
                        : "border-BrandGray/30 text-BrandGray2 hover:border-BrandGray hover:text-BrandBlack"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Primary action button */}
          <div className="mt-8">
            <button
              type="button"
              disabled={!canAdvance || submitting}
              onClick={handlePrimaryAction}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-BrandBlack py-2.5 text-sm font-semibold text-white transition hover:bg-BrandBlack2 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {submitting ? "Setting up..." : primaryButtonLabel}
              {!submitting && <FiArrowRight className="text-sm" />}
            </button>
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="relative hidden overflow-hidden md:flex md:w-2/5">
        <img src={brandImage} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/60 to-black/80" />
        <div className="relative z-10 flex h-full w-full flex-col items-start justify-end px-10 pb-16 lg:px-14 lg:pb-20">
          <img src={whiteLogo} alt="Coachable" className="absolute left-10 top-10 block h-7 w-auto object-contain opacity-70 lg:left-14 lg:top-14" />
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.25em] text-BrandOrange">
            Set up your space
          </p>
          <h2 className="font-Manrope text-4xl font-extrabold leading-[1.1] tracking-tight text-white lg:text-5xl xl:text-6xl">
            Build.<br />
            <span className="text-white/40">Strategize.</span><br />
            <span className="text-BrandOrange">Win.</span>
          </h2>
          <p className="mt-6 max-w-sm text-base leading-relaxed text-white/50 lg:text-lg">
            {teamAction === "solo"
              ? "Start designing plays instantly. You can create or join a team anytime."
              : teamAction === "create"
                ? "As the team creator, you'll be the coach. Invite players after setup."
                : "Your invite code determines your role. Ask your coach for the right code."}
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Visual sport selection grid used on the "create team" sport step.
 * Each card shows a field image thumbnail so coaches immediately understand
 * what field layout they'll get in the play editor.
 *
 * @param {Object} props
 * @param {Array<{key: string, label: string, image: string|null, color: string, imageRotation?: number}>} props.sports
 * @param {string|null} props.selectedKey - Currently selected sport key, or null if none chosen yet
 * @param {Function} props.onSelect - Called with the sport key when a card is clicked
 */
function SportSelectionGrid({ sports, selectedKey, onSelect }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {sports.map((s) => {
        const isSelected = selectedKey !== null && selectedKey === s.key;
        return (
          <button
            key={s.key === "" ? "blank" : s.key}
            type="button"
            onClick={() => onSelect(s.key)}
            className={`group relative flex flex-col items-center justify-end aspect-square rounded-xl overflow-hidden transition-all duration-200 focus:outline-none ${
              isSelected
                ? "ring-2 ring-BrandOrange shadow-[0_0_0_3px_rgba(255,122,24,0.2)]"
                : "ring-1 ring-black/10 hover:ring-BrandGray/60 hover:shadow-sm"
            }`}
            style={{ backgroundColor: s.color }}
          >
            {s.image ? (
              <img
                src={s.image}
                alt=""
                className="absolute inset-0 w-full h-full object-contain opacity-60 group-hover:opacity-80 group-hover:scale-105 transition-all duration-200"
                style={s.imageRotation ? { transform: `rotate(${s.imageRotation}deg)` } : undefined}
                draggable={false}
              />
            ) : (
              <div
                className="absolute inset-0 opacity-15 group-hover:opacity-25 transition-opacity duration-200"
                style={{
                  backgroundImage:
                    "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
                  backgroundSize: "20px 20px",
                }}
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
            <span
              className="relative z-10 mb-2 px-1 text-center text-[11px] font-semibold leading-tight text-white transition-colors group-hover:text-BrandOrange"
              style={isSelected ? { color: "#FF7A18" } : undefined}
            >
              {s.label}
            </span>
            {isSelected && (
              <div className="absolute top-1.5 right-1.5 z-20 flex h-4 w-4 items-center justify-center rounded-full bg-BrandOrange shadow">
                <svg className="h-2.5 w-2.5 text-white" viewBox="0 0 12 12" fill="none">
                  <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
