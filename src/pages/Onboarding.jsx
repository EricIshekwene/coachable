import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useAppMessage } from "../context/AppMessageContext";
import logo from "../assets/logos/full_Coachable_logo.png";
import whiteLogo from "../assets/logos/White_Full_Coachable.png";
import brandImage from "../assets/pictures/female_football_coach_short.png";
import { MdOutlineCreateNewFolder } from "react-icons/md";
import { FaRegHandshake } from "react-icons/fa6";
import { FiArrowRight, FiChevronDown, FiEdit } from "react-icons/fi";

const SPORTS = [
  "Rugby", "Soccer", "Basketball", "Football", "Baseball",
  "Field Hockey", "Ice Hockey", "Lacrosse", "Volleyball",
  "Cricket", "Water Polo", "Ultimate Frisbee", "Handball",
  "Softball", "Other",
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
  const [sportOpen, setSportOpen] = useState(false);

  const { completeOnboarding } = useAuth();
  const { showMessage } = useAppMessage();
  const navigate = useNavigate();

  const canAdvance =
    teamAction === "solo"
      ? true
      : teamAction === "create"
        ? teamName.trim().length > 0
        : inviteCode.trim().length > 0;

  const [submitting, setSubmitting] = useState(false);

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

    // Solo mode needs no validation

    setSubmitting(true);
    try {
      await completeOnboarding({
        teamName: teamName.trim(),
        teamAction,
        inviteCode: inviteCode.trim(),
        sport,
      });
      navigate(returnTo || "/app/plays");
    } catch (err) {
      showMessage("Setup failed", err.message || "Could not complete setup.", "error");
    } finally {
      setSubmitting(false);
    }
  };

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
      <div className="flex h-screen font-DmSans">
        <div className="flex w-full flex-col justify-center overflow-auto bg-white px-8 sm:px-16 md:w-3/5 lg:px-24 xl:px-32">
          <div className="mx-auto w-full max-w-lg">
            <img src={logo} alt="Coachable" className="mb-10 h-7" />

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
            <img src={whiteLogo} alt="Coachable" className="absolute left-10 top-10 h-7 opacity-70 lg:left-14 lg:top-14" />
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
    <div className="flex h-screen font-DmSans">
      <div className="flex w-full flex-col justify-center overflow-auto bg-white px-8 sm:px-16 md:w-3/5 lg:px-24 xl:px-32">
        <div className="mx-auto w-full max-w-lg">
          <img src={logo} alt="Coachable" className="mb-10 h-7" />

          <h1 className="font-Manrope text-2xl font-bold tracking-tight text-BrandBlack">
            Get started
          </h1>
          <p className="mt-1.5 text-sm text-BrandGray2">
            Create a team, join one, or jump straight into making plays.
          </p>

          <div className="mt-8 grid grid-cols-3 gap-3">
            <button type="button" onClick={() => setTeamAction("create")} className={optionCard(teamAction === "create")}>
              <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-lg transition ${teamAction === "create" ? "bg-BrandOrange/20" : "bg-BrandGray/10"}`}>
                <MdOutlineCreateNewFolder className="text-xl text-BrandBlack" />
              </div>
              <p className="font-semibold text-sm text-BrandBlack">Create Team</p>
              <p className="text-xs text-BrandGray2 mt-0.5">Start fresh</p>
            </button>

            <button type="button" onClick={() => setTeamAction("join")} className={optionCard(teamAction === "join")}>
              <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-lg transition ${teamAction === "join" ? "bg-BrandOrange/20" : "bg-BrandGray/10"}`}>
                <FaRegHandshake className="text-xl text-BrandBlack" />
              </div>
              <p className="font-semibold text-sm text-BrandBlack">Join Team</p>
              <p className="text-xs text-BrandGray2 mt-0.5">Use invite code</p>
            </button>

            <button type="button" onClick={() => setTeamAction("solo")} className={optionCard(teamAction === "solo")}>
              <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-lg transition ${teamAction === "solo" ? "bg-BrandOrange/20" : "bg-BrandGray/10"}`}>
                <FiEdit className="text-xl text-BrandBlack" />
              </div>
              <p className="font-semibold text-sm text-BrandBlack">Just Make Plays</p>
              <p className="text-xs text-BrandGray2 mt-0.5">No team needed</p>
            </button>
          </div>

          {teamAction !== "solo" && (
          <div className="mt-6 flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-BrandBlack">
                {teamAction === "create" ? "Team name" : "Invite code"}
              </label>
              {teamAction === "create" ? (
                <input
                  type="text"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="e.g. Riverside Rugby"
                  className={inputClass}
                />
              ) : (
                <>
                  <input
                    type="text"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value)}
                    placeholder="Paste your invite code"
                    className={inputClass}
                  />
                  <p className="text-[11px] text-BrandGray">
                    Your role (coach or player) is determined by the code your team shared with you.
                  </p>
                </>
              )}
            </div>

            {teamAction === "create" && (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-BrandBlack">
                  Sport <span className="font-normal text-BrandGray">(optional)</span>
                </label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setSportOpen(!sportOpen)}
                    className={`${inputClass} flex items-center justify-between text-left ${sport ? "text-BrandBlack" : "text-BrandGray"}`}
                  >
                    <span>{sport ? SPORTS.find((s) => s.toLowerCase() === sport) || sport : "Select a sport"}</span>
                    <FiChevronDown className={`text-sm text-BrandGray transition ${sportOpen ? "rotate-180" : ""}`} />
                  </button>
                  {sportOpen && (
                    <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-52 overflow-auto rounded-lg border border-BrandGray/30 bg-white shadow-lg">
                      {SPORTS.map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => {
                            setSport(s.toLowerCase());
                            setSportOpen(false);
                          }}
                          className={`flex w-full items-center px-3.5 py-2.5 text-left text-sm transition hover:bg-BrandOrange/5 ${
                            sport === s.toLowerCase()
                              ? "font-semibold text-BrandOrange bg-BrandOrange/5"
                              : "text-BrandBlack"
                          }`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          )}

          {teamAction === "solo" && (
            <div className="mt-6 rounded-lg border border-BrandGray/20 bg-BrandGray/5 px-4 py-3">
              <p className="text-sm text-BrandGray2">
                You can create and edit plays right away. You can always create or join a team later from Settings.
              </p>
            </div>
          )}

          {/* Finish button */}
          <div className="mt-8">
            <button
              type="button"
              disabled={!canAdvance || submitting}
              onClick={handleFinish}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-BrandBlack py-2.5 text-sm font-semibold text-white transition hover:bg-BrandBlack2 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {teamAction === "solo" ? "Get started" : "Finish setup"}
              <FiArrowRight className="text-sm" />
            </button>
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="relative hidden overflow-hidden md:flex md:w-2/5">
        <img src={brandImage} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/60 to-black/80" />
        <div className="relative z-10 flex h-full w-full flex-col items-start justify-end px-10 pb-16 lg:px-14 lg:pb-20">
          <img src={whiteLogo} alt="Coachable" className="absolute left-10 top-10 h-7 opacity-70 lg:left-14 lg:top-14" />
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
