import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useAppMessage } from "../context/AppMessageContext";
import logo from "../assets/logos/full_Coachable_logo.png";
import { MdOutlineCreateNewFolder } from "react-icons/md";
import { FaRegHandshake } from "react-icons/fa6";
import { FiArrowRight, FiChevronDown } from "react-icons/fi";

const SPORTS = [
  "Rugby", "Soccer", "Basketball", "Football", "Baseball",
  "Field Hockey", "Ice Hockey", "Lacrosse", "Volleyball",
  "Cricket", "Water Polo", "Ultimate Frisbee", "Handball",
  "Softball", "Other",
];

export default function Onboarding() {
  const [teamAction, setTeamAction] = useState("create");
  const [teamName, setTeamName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [sport, setSport] = useState("");
  const [sportOpen, setSportOpen] = useState(false);

  const { completeOnboarding } = useAuth();
  const { showMessage } = useAppMessage();
  const navigate = useNavigate();

  const canAdvance =
    teamAction === "create"
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

    setSubmitting(true);
    try {
      await completeOnboarding({
        teamName: teamName.trim(),
        teamAction,
        inviteCode: inviteCode.trim(),
        sport,
      });
      navigate("/app/plays");
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

  return (
    <div className="flex h-screen font-DmSans">
      <div className="flex w-full flex-col justify-center overflow-auto bg-white px-8 sm:px-16 md:w-3/5 lg:px-24 xl:px-32">
        <div className="mx-auto w-full max-w-lg">
          <img src={logo} alt="Coachable" className="mb-10 h-7" />

          <h1 className="font-Manrope text-2xl font-bold tracking-tight text-BrandBlack">
            Set up your team
          </h1>
          <p className="mt-1.5 text-sm text-BrandGray2">
            Create a new team or join an existing one.
          </p>

          <div className="mt-8 grid grid-cols-2 gap-3">
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
          </div>

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

          {/* Finish button */}
          <div className="mt-8">
            <button
              type="button"
              disabled={!canAdvance || submitting}
              onClick={handleFinish}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-BrandBlack py-2.5 text-sm font-semibold text-white transition hover:bg-BrandBlack2 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Finish setup
              <FiArrowRight className="text-sm" />
            </button>
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="hidden flex-col items-center justify-center bg-BrandBlack md:flex md:w-2/5">
        <div className="flex flex-col items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-BrandOrange/10">
            <MdOutlineCreateNewFolder className="text-3xl text-BrandOrange" />
          </div>
          <p className="max-w-xs text-center text-sm leading-relaxed text-BrandGray2">
            {teamAction === "create"
              ? "As the team creator, you'll be the coach. You can invite players after setup."
              : "Your invite code determines your role. Ask your coach for the right code."}
          </p>
        </div>
      </div>
    </div>
  );
}
