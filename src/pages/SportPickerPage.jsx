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
 * Full-screen sport picker page shown at /slate.
 * Each card navigates to /slate/:sport to open the slate with that sport's defaults.
 */
export default function SportPickerPage() {
  const navigate = useNavigate();

  return (
    <div className="flex h-screen font-DmSans">
      {/* Left - Sport picker */}
      <div className="flex w-full flex-col overflow-y-auto hide-scroll bg-BrandBlack px-6 py-8 sm:px-12 md:w-1/2 lg:px-20 xl:px-24">
        <div className="mx-auto w-full max-w-lg flex flex-col flex-1">
          {/* Back to home */}
          <Link to="/" className="mb-4 inline-flex items-center gap-1.5 text-xs text-white/40 transition hover:text-white/80">
            <FiArrowLeft className="text-sm" /> Back to home
          </Link>

          {/* Logo */}
          <img src={whiteLogo} alt="Coachable" className="mb-8 h-6 self-start opacity-70" />

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
                onClick={() => navigate(`/slate/${sport.key}`)}
                className="group relative flex flex-col items-center justify-end aspect-square rounded-xl border border-white/6 overflow-hidden transition-all duration-200 hover:border-BrandOrange/50 hover:shadow-[0_0_24px_-6px_rgba(255,122,24,0.25)] cursor-pointer focus:outline-none focus:ring-2 focus:ring-BrandOrange/40"
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
                  /* Blank canvas: subtle grid pattern */
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
      </div>

      {/* Right - Brand panel */}
      <div className="relative hidden overflow-hidden md:flex md:w-1/2">
        <img
          src={brandImage}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black/80" />
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
