import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { FiArrowLeft } from "react-icons/fi";
import { useAuth } from "../../context/AuthContext";
import { useAppMessage } from "../../context/AppMessageContext";
import whiteLogo from "../../assets/logos/White_Full_Coachable.png";
import brandImage from "../../assets/pictures/Rugby_coach_holding_ipad_long.png";
import RugbyField from "../../assets/objects/Field Vectors/Rugby_Field.png";
import SoccerField from "../../assets/objects/Field Vectors/Soccer_Field.png";
import FootballField from "../../assets/objects/Field Vectors/Football_Field.png";
import LacrosseField from "../../assets/objects/Field Vectors/Lacrosse_Field.png";
import WomensLacrosseField from "../../assets/objects/Field Vectors/Womans_Lacrosse_Field.png";
import BasketballField from "../../assets/objects/Field Vectors/Basketball_Field.png";
import FieldHockeyField from "../../assets/objects/Field Vectors/Field_Hockey_Field.png";
import IceHockeyField from "../../assets/objects/Field Vectors/Ice_Hockey_Field.png";
import { dismissSportBanner } from "../../utils/sportBanner";

/**
 * Sports available for team sport selection — identical set and card visuals
 * to SportPickerPage (/slate) and the onboarding sport step. "Blank Canvas"
 * is the deliberate opt-out: it keeps the team sport unset and dismisses the
 * missing-sport banner for the rest of the session.
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
  { key: "blank",           label: "Blank Canvas",     image: null,                 color: "#4FA85D" },
];

/**
 * Full-screen sport selector at /app/select-sport, reached from the
 * missing-sport banner in the app shell.
 *
 * One click on a sport card saves it as the active team's sport
 * (PATCH /teams/:teamId/settings via AuthContext.updateTeamDefaults) and
 * returns to the page the user came from — matching the click-to-submit UX
 * of SportPickerPage and the solo onboarding flow. "Blank Canvas" keeps the
 * sport unset and just dismisses the banner for the session.
 *
 * Only owners/coaches can change the team sport; anyone else is bounced
 * straight back.
 */
export default function SelectSport() {
  const { user, updateTeamDefaults } = useAuth();
  const { showMessage } = useAppMessage();
  const navigate = useNavigate();
  const location = useLocation();
  const [submitting, setSubmitting] = useState(false);

  const from = location.state?.from || "/app/plays";
  const canEdit = user?.role === "owner" || user?.role === "coach";
  const isPersonal = user?.isPersonalTeam;

  // The settings endpoint rejects players, so this page is a dead end for them.
  useEffect(() => {
    if (user && !canEdit) navigate(from, { replace: true });
  }, [user, canEdit, from, navigate]);

  /**
   * Handle a sport card click: save the sport and return to the app.
   * Blank Canvas skips the save and dismisses the banner for this session.
   * @param {Object} sport - Entry from SPORTS array
   */
  const handleSportClick = async (sport) => {
    if (submitting) return;

    if (sport.key === "blank") {
      dismissSportBanner(user?.teamId);
      navigate(from);
      return;
    }

    setSubmitting(true);
    try {
      await updateTeamDefaults({ sport: sport.key });
      navigate(from);
    } catch (err) {
      showMessage("Could not save sport", err.message || "Please try again.", "error");
      setSubmitting(false);
    }
  };

  return (
    <div
      className="font-DmSans md:flex md:overflow-hidden"
      style={{ minHeight: "var(--app-viewport-height)", height: "var(--app-viewport-height)" }}
    >
      {/* Left panel — dark, matching SportPickerPage */}
      <div
        className="flex w-full flex-col bg-BrandBlack px-6 sm:px-12 md:w-1/2 md:h-full md:overflow-hidden lg:px-20 xl:px-24"
        style={{
          minHeight: "var(--app-viewport-height)",
          paddingTop: "max(2rem, env(safe-area-inset-top))",
        }}
      >
        <div className="mx-auto w-full max-w-lg flex flex-col flex-1 md:h-full md:overflow-hidden">
          <div
            className="flex flex-col flex-1 overflow-y-auto hide-scroll md:h-full"
            style={{ paddingBottom: "calc(2rem + env(safe-area-inset-bottom) + var(--app-keyboard-inset))" }}
          >
            {/* Back to app */}
            <button
              type="button"
              onClick={() => navigate(from)}
              className="mb-4 inline-flex items-center gap-1.5 self-start text-xs text-white/40 transition hover:text-white/80"
            >
              <FiArrowLeft className="text-sm" /> Back to app
            </button>

            {/* Logo */}
            <img src={whiteLogo} alt="Coachable" className="mb-8 block h-6 w-auto self-start object-contain opacity-70" />

            {/* Header */}
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.25em] text-BrandOrange">
              {isPersonal ? "Your Workspace" : user?.teamName || "Your Team"}
            </p>
            <h1 className="font-Manrope text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Choose your sport
            </h1>
            <p className="mt-1.5 text-xs text-white/40 max-w-sm">
              {isPersonal
                ? "Your workspace doesn't have a sport yet. Pick one to get the right field, positions, and defaults in the play editor."
                : "Your team doesn't have a sport yet. Pick one to get the right field, positions, and defaults in the play editor."}
            </p>

            {/* Sport cards — identical design to SportPickerPage (/slate) */}
            <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {SPORTS.map((sport) => (
                <button
                  key={sport.key}
                  type="button"
                  onClick={() => handleSportClick(sport)}
                  disabled={submitting}
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
              {submitting ? (
                <>
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-BrandOrange" />
                  <span className="text-xs text-white/40">Saving...</span>
                </>
              ) : (
                <>
                  <div className="h-1.5 w-1.5 rounded-full bg-BrandOrange/60" />
                  <span className="text-xs text-white/25">
                    You can change the sport anytime in team settings
                  </span>
                </>
              )}
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
            The right field and positions make every play faster to build.
          </p>
        </div>
      </div>
    </div>
  );
}
