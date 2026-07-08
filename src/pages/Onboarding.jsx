import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
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
 * Sports available for onboarding sport selection.
 * Each entry provides a visual field image matching what the user sees in
 * the play editor at /slate — "Blank Canvas" is the deliberate opt-out.
 */
const SPORTS = [
  { key: "rugby",           label: "Rugby",            image: RugbyField,           color: "#4FA85D" },
  { key: "soccer",          label: "Soccer",           image: SoccerField,          color: "#3E8E5B" },
  { key: "football",        label: "Football",         image: FootballField,        color: "#1F5F3F" },
  { key: "lacrosse",        label: "Lacrosse",         image: LacrosseField,        color: "#4FA85D" },
  { key: "womens lacrosse", label: "Women's Lacrosse", image: WomensLacrosseField,  color: "#4FA85D" },
  { key: "basketball",      label: "Basketball",       image: BasketballField,      color: "#D8C3A5" },
  { key: "field hockey",    label: "Field Hockey",     image: FieldHockeyField,     color: "#3E8E5B" },
  { key: "ice hockey",      label: "Ice Hockey",       image: IceHockeyField,       color: "#ECF8FE", imageRotation: 90 },
  { key: "",                label: "Blank Canvas",     image: null,                 color: "#4FA85D" },
];

/**
 * Main onboarding page.
 *
 * Flow for "create team": step 1 (choose) → step 2 (team name) → step 3 (sport)
 * Flow for "join team":   step 1 (choose) → step 2 (invite code) → submit
 * Flow for "just make plays": step 1 (choose) → step 3 (sport, click-to-submit)
 *
 * The sport step slides in with a dark (BrandBlack) panel matching the /slate
 * SportPickerPage aesthetic so both feel like part of the same editor entry flow.
 */
export default function Onboarding() {
  const [searchParams] = useSearchParams();
  const inviteFromUrl = searchParams.get("invite") || "";
  const returnTo = searchParams.get("returnTo") || "";
  const hasInvite = inviteFromUrl.length > 0;

  // "choose" → "details" → "sport" (create)
  // "choose" → "details" → submit  (join, no sport step)
  // "choose" → "sport"             (solo, skips details)
  const [step, setStep] = useState("choose");
  const [teamAction, setTeamAction] = useState(hasInvite ? "join" : "create");
  const [teamName, setTeamName] = useState("");
  const [inviteCode, setInviteCode] = useState(inviteFromUrl);
  const [sport, setSport] = useState("");
  const [sportChosen, setSportChosen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const { completeOnboarding, logout } = useAuth();
  const { showMessage } = useAppMessage();
  const navigate = useNavigate();

  /**
   * Submit the completed onboarding form.
   * @param {string} [sportOverride] - Pass when sport state hasn't updated yet (e.g. click handler).
   */
  const handleFinish = async (sportOverride) => {
    const finalSport = sportOverride !== undefined ? sportOverride : sport;

    if (teamAction === "create") {
      const trimmed = teamName.trim();
      if (!trimmed) { showMessage("Missing team name", "Please enter a team name to continue.", "error"); return; }
      if (trimmed.length < 2) { showMessage("Invalid team name", "Team name must be at least 2 characters.", "error"); return; }
    }

    if (teamAction === "join") {
      const trimmed = inviteCode.trim();
      if (!trimmed) { showMessage("Missing invite code", "Enter an invite code to join a team.", "error"); return; }
      if (trimmed.length < 6) { showMessage("Invalid invite code", "Invite code looks too short.", "error"); return; }
    }

    setSubmitting(true);
    try {
      await completeOnboarding({
        teamName: teamName.trim(),
        teamAction,
        inviteCode: inviteCode.trim(),
        sport: finalSport,
      });
      if (teamAction === "solo") {
        navigate(returnTo || `/slate/${finalSport || "blank"}`);
      } else {
        navigate(returnTo || "/app/plays");
      }
    } catch (err) {
      showMessage("Setup failed", err.message || "Could not complete setup.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  /** Advance from the details step: join → submit, create → sport step. */
  const handleDetailsNext = () => {
    if (teamAction === "join") { handleFinish(); }
    else { setStep("sport"); }
  };

  const canAdvanceDetails =
    teamAction === "create"
      ? teamName.trim().length >= 2
      : inviteCode.trim().length >= 6;

  const onSportStep = step === "sport";

  const inputClass =
    "w-full rounded-lg border border-BrandGray/40 bg-white px-3.5 py-2.5 font-DmSans text-sm outline-none transition placeholder:text-BrandGray hover:border-BrandGray focus:border-BrandOrange focus:shadow-[0_0_0_3px_rgba(255,122,24,0.1)]";

  const optionCard =
    "group flex cursor-pointer flex-col items-start rounded-xl border border-BrandGray/30 p-5 text-left transition duration-200 hover:border-BrandGray hover:shadow-sm";

  // ── Invite-link shortcut (pre-filled code, no action choice) ──────────────
  if (hasInvite) {
    return (
      <div
        className="font-DmSans md:flex md:overflow-hidden"
        style={{ minHeight: "var(--app-viewport-height)", height: "var(--app-viewport-height)" }}
      >
        <div
          className="flex w-full flex-col bg-white md:w-3/5 md:h-full md:overflow-hidden"
        >
          <div
            className="overflow-y-auto hide-scroll h-full px-8 sm:px-16 lg:px-24 xl:px-32"
            style={{
              paddingTop: "max(2rem, env(safe-area-inset-top))",
              paddingBottom: "calc(2rem + env(safe-area-inset-bottom) + var(--app-keyboard-inset))",
            }}
          >
            <div className="mx-auto flex min-h-full w-full max-w-lg flex-col justify-start md:justify-center">
              <button type="button" onClick={() => { logout(); navigate("/home"); }} className="mb-6 inline-flex items-center gap-1.5 text-xs text-BrandGray2 transition hover:text-BrandBlack">
                <FiArrowLeft className="text-sm" /> Back to home
              </button>
              <img src={logo} alt="Coachable" className="mb-10 block h-7 w-auto self-start object-contain" />
              <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-BrandOrange/10">
                <FaRegHandshake className="text-2xl text-BrandOrange" />
              </div>
              <h1 className="font-Manrope text-2xl font-bold tracking-tight text-BrandBlack">Join your team</h1>
              <p className="mt-1.5 text-sm text-BrandGray2">Your invite code has been pre-filled. Tap the button below to join.</p>
              <div className="mt-6 flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-BrandBlack">Invite code</label>
                <div className="rounded-lg border border-BrandOrange/40 bg-BrandOrange/5 px-3.5 py-2.5 font-mono text-sm font-semibold tracking-wider text-BrandBlack">
                  {inviteCode}
                </div>
                <p className="text-[11px] text-BrandGray">Your role (coach or player) is determined by the code.</p>
              </div>
              <div className="mt-8">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => handleFinish()}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-BrandBlack py-2.5 text-sm font-semibold text-white transition hover:bg-BrandBlack2 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {submitting ? "Joining..." : "Join team"}
                  {!submitting && <FiArrowRight className="text-sm" />}
                </button>
              </div>
            </div>
          </div>
        </div>
        <div className="relative hidden overflow-hidden md:flex md:w-2/5">
          <img src={brandImage} alt="" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/60 to-black/80" />
          <div className="relative z-10 flex h-full w-full flex-col items-start justify-end px-10 pb-16 lg:px-14 lg:pb-20">
            <img src={whiteLogo} alt="Coachable" className="absolute left-10 top-10 block h-7 w-auto object-contain opacity-70 lg:left-14 lg:top-14" />
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.25em] text-BrandOrange">Welcome to the team</p>
            <h2 className="font-Manrope text-4xl font-extrabold leading-[1.1] tracking-tight text-white lg:text-5xl xl:text-6xl">
              Step on<br /><span className="text-white/40">the field,</span><br /><span className="text-BrandOrange">together.</span>
            </h2>
            <p className="mt-6 max-w-sm text-base leading-relaxed text-white/50 lg:text-lg">
              Your invite code determines your role. You'll be added to the team automatically.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Main flow ─────────────────────────────────────────────────────────────
  return (
    // Outer locked to viewport on md+; natural scroll on mobile via minHeight only
    <div
      className="font-DmSans md:flex md:overflow-hidden"
      style={{ minHeight: "var(--app-viewport-height)", height: "var(--app-viewport-height)" }}
    >
      {/* Left panel */}
      {/* h-full is required: both step panels are absolute inset-0, so this panel has no intrinsic height */}
      <div className="relative flex h-full w-full flex-col bg-white md:w-3/5 overflow-hidden">
        {/* Steps 1 & 2 — white, slide out left when sport step is active */}
        <div
          className="absolute inset-0 overflow-y-auto hide-scroll px-8 sm:px-16 lg:px-24 xl:px-32"
          style={{
            opacity: !onSportStep ? 1 : 0,
            transform: !onSportStep ? "translateX(0)" : "translateX(-32px)",
            pointerEvents: !onSportStep ? "auto" : "none",
            transition: "opacity 0.25s ease, transform 0.25s ease",
            paddingTop: "max(2rem, env(safe-area-inset-top))",
            paddingBottom: "calc(2rem + env(safe-area-inset-bottom) + var(--app-keyboard-inset))",
          }}
        >
          <div className="mx-auto flex min-h-full w-full max-w-lg flex-col justify-start md:justify-center">
            <button type="button" onClick={() => { logout(); navigate("/home"); }} className="mb-6 inline-flex items-center gap-1.5 text-xs text-BrandGray2 transition hover:text-BrandBlack">
              <FiArrowLeft className="text-sm" /> Back to home
            </button>
            <img src={logo} alt="Coachable" className="mb-10 block h-7 w-auto self-start object-contain" />

            {/* ── Step 1: choose action ── */}
            {step === "choose" && (
              <>
                <h1 className="font-Manrope text-2xl font-bold tracking-tight text-BrandBlack">Get started</h1>
                <p className="mt-1.5 text-sm text-BrandGray2">Create a team, join one, or jump straight into making plays.</p>

                <div className="mt-8 grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => { setTeamAction("create"); setSport(""); setSportChosen(false); setStep("details"); }}
                    className={optionCard}
                  >
                    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-BrandGray/10 transition group-hover:bg-BrandGray/20">
                      <MdOutlineCreateNewFolder className="text-xl text-BrandBlack" />
                    </div>
                    <p className="font-semibold text-sm text-BrandBlack">Create Team</p>
                    <p className="text-xs text-BrandGray2 mt-0.5">Start fresh</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => { setTeamAction("join"); setSport(""); setSportChosen(false); setStep("details"); }}
                    className={optionCard}
                  >
                    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-BrandGray/10 transition group-hover:bg-BrandGray/20">
                      <FaRegHandshake className="text-xl text-BrandBlack" />
                    </div>
                    <p className="font-semibold text-sm text-BrandBlack">Join Team</p>
                    <p className="text-xs text-BrandGray2 mt-0.5">Use invite code</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => { setTeamAction("solo"); setSport(""); setSportChosen(false); setStep("sport"); }}
                    className={optionCard}
                  >
                    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-BrandGray/10 transition group-hover:bg-BrandGray/20">
                      <FiEdit className="text-xl text-BrandBlack" />
                    </div>
                    <p className="font-semibold text-sm text-BrandBlack">Just Make Plays</p>
                    <p className="text-xs text-BrandGray2 mt-0.5">No team needed</p>
                  </button>
                </div>
              </>
            )}

            {/* ── Step 2: details (team name or invite code) ── */}
            {step === "details" && (
              <>
                <button
                  type="button"
                  onClick={() => setStep("choose")}
                  className="mb-6 self-start inline-flex items-center gap-1.5 text-xs text-BrandGray2 transition hover:text-BrandBlack"
                >
                  <FiArrowLeft className="text-sm" /> Back
                </button>
                <h1 className="font-Manrope text-2xl font-bold tracking-tight text-BrandBlack">
                  {teamAction === "create" ? "Name your team" : "Join a team"}
                </h1>
                <p className="mt-1.5 text-sm text-BrandGray2">
                  {teamAction === "create"
                    ? "Give your team a name to get started."
                    : "Enter the invite code your coach shared with you."}
                </p>

                <div className="mt-6 flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-BrandBlack">
                    {teamAction === "create" ? "Team name" : "Invite code"}
                  </label>
                  {teamAction === "create" ? (
                    <input
                      type="text"
                      value={teamName}
                      onChange={(e) => setTeamName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && canAdvanceDetails && handleDetailsNext()}
                      placeholder="e.g. Riverside Rugby"
                      maxLength={INPUT_LIMITS.NAME}
                      className={inputClass}
                      autoFocus
                    />
                  ) : (
                    <>
                      <input
                        type="text"
                        value={inviteCode}
                        onChange={(e) => setInviteCode(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && canAdvanceDetails && handleDetailsNext()}
                        placeholder="Paste your invite code"
                        maxLength={INPUT_LIMITS.INVITE_CODE}
                        autoCapitalize="characters"
                        className={inputClass}
                        autoFocus
                      />
                      <p className="text-[11px] text-BrandGray">
                        Your role (coach or player) is determined by the code.
                      </p>
                    </>
                  )}
                </div>

                <div className="mt-8">
                  <button
                    type="button"
                    disabled={!canAdvanceDetails || submitting}
                    onClick={handleDetailsNext}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-BrandBlack py-2.5 text-sm font-semibold text-white transition hover:bg-BrandBlack2 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {submitting ? "Joining..." : teamAction === "create" ? "Continue" : "Join team"}
                    {!submitting && <FiArrowRight className="text-sm" />}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* ── Step 3: sport selection — slides in from right ── */}
        <div
          className="absolute inset-0 overflow-y-auto hide-scroll px-8 sm:px-16 lg:px-24 xl:px-32"
          style={{
            opacity: onSportStep ? 1 : 0,
            transform: onSportStep ? "translateX(0)" : "translateX(32px)",
            pointerEvents: onSportStep ? "auto" : "none",
            transition: "opacity 0.25s ease, transform 0.25s ease",
            paddingTop: "max(2rem, env(safe-area-inset-top))",
            paddingBottom: "calc(2rem + env(safe-area-inset-bottom) + var(--app-keyboard-inset))",
          }}
        >
          <div className="mx-auto w-full max-w-lg flex flex-col min-h-full">
            {/* Top nav row */}
            <div className="mb-6 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setSportChosen(false);
                  setSport("");
                  setStep(teamAction === "solo" ? "choose" : "details");
                }}
                className="inline-flex items-center gap-1.5 text-xs text-BrandGray2 transition hover:text-BrandBlack"
              >
                <FiArrowLeft className="text-sm" /> Back
              </button>
              <button type="button" onClick={() => { logout(); navigate("/home"); }} className="text-xs text-BrandGray2 transition hover:text-BrandBlack">
                Back to home
              </button>
            </div>

            {/* Logo */}
            <img src={logo} alt="Coachable" className="mb-10 block h-7 w-auto self-start object-contain" />

            {/* Header */}
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.25em] text-BrandOrange">
              {teamAction === "solo" ? "Play Designer" : "Team Setup"}
            </p>
            <h1 className="font-Manrope text-2xl font-bold tracking-tight text-BrandBlack">
              Choose your sport
            </h1>
            <p className="mt-1.5 text-sm text-BrandGray2">
              {teamAction === "solo"
                ? "Select a sport to open the editor with the right field and defaults."
                : "Sets the field and player defaults in the play editor. You can change it later in settings."}
            </p>

            {/* Sport grid — identical card design to SportPickerPage (/slate) */}
            <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {SPORTS.map((s) => {
                const isSelected = sportChosen && sport === s.key;
                return (
                  <button
                    key={s.key === "" ? "blank" : s.key}
                    type="button"
                    disabled={submitting}
                    onClick={() => {
                      setSport(s.key);
                      setSportChosen(true);
                      // Solo: one click → immediate submit (matches SportPickerPage UX)
                      if (teamAction === "solo") handleFinish(s.key);
                    }}
                    className="group relative flex flex-col items-center justify-end aspect-square rounded-xl border border-black/8 overflow-hidden transition-all duration-200 hover:border-BrandOrange/50 hover:shadow-[0_0_24px_-6px_rgba(255,122,24,0.25)] cursor-pointer focus:outline-none focus:ring-2 focus:ring-BrandOrange/40 disabled:opacity-50 disabled:cursor-wait"
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
                    ) : null}
                    <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/20 to-transparent" />
                    <span className="relative z-10 mb-3 text-sm sm:text-base font-semibold text-white group-hover:text-BrandOrange transition-colors">
                      {s.label}
                    </span>
                    {isSelected && (
                      <div className="absolute top-1.5 right-1.5 z-20 flex h-5 w-5 items-center justify-center rounded-full bg-BrandOrange shadow">
                        <svg className="h-3 w-3 text-white" viewBox="0 0 12 12" fill="none">
                          <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Create: confirm button after selecting a sport */}
            {teamAction === "create" && (
              <div className="mt-auto pt-6" style={{ paddingBottom: "calc(0.5rem + env(safe-area-inset-bottom))" }}>
                <button
                  type="button"
                  disabled={!sportChosen || submitting}
                  onClick={() => handleFinish()}
                  className="w-full rounded-xl bg-BrandOrange px-6 py-3 text-sm font-semibold text-white transition hover:brightness-110 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-BrandOrange/40 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {submitting ? "Setting up..." : "Finish Setup"}
                </button>
                <div className="mt-4 flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-BrandOrange/60" />
                  <span className="text-xs text-BrandGray">You can change the sport anytime in team settings</span>
                </div>
              </div>
            )}

            {/* Solo: loading state indicator while submitting */}
            {teamAction === "solo" && submitting && (
              <div className="mt-auto pt-6 flex items-center justify-center gap-2 py-3">
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-BrandGray/20 border-t-BrandOrange" />
                <span className="text-sm text-BrandGray2">Setting up...</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right panel — brand photo with contextual copy */}
      <div className="relative hidden overflow-hidden md:flex md:w-2/5">
        <img src={brandImage} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/60 to-black/80" />
        <div className="relative z-10 flex h-full w-full flex-col items-start justify-end px-10 pb-16 lg:px-14 lg:pb-20">
          <img src={whiteLogo} alt="Coachable" className="absolute left-10 top-10 block h-7 w-auto object-contain opacity-70 lg:left-14 lg:top-14" />
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.25em] text-BrandOrange">
            {onSportStep ? "The modern playbook" : "Set up your space"}
          </p>
          <h2 className="font-Manrope text-4xl font-extrabold leading-[1.1] tracking-tight text-white lg:text-5xl xl:text-6xl">
            Build.<br />
            <span className="text-white/40">Strategize.</span><br />
            <span className="text-BrandOrange">Win.</span>
          </h2>
          <p className="mt-6 max-w-sm text-base leading-relaxed text-white/50 lg:text-lg">
            {onSportStep
              ? teamAction === "solo"
                ? "Start designing plays instantly. You can create or join a team anytime."
                : "Sets the right field, positions, and player defaults in the play editor."
              : teamAction === "create"
                ? "As the team creator, you'll be the coach. Invite players after setup."
                : "Your invite code determines your role. Ask your coach for the right code."}
          </p>
        </div>
      </div>
    </div>
  );
}
