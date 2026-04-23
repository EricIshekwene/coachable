import { Link } from "react-router-dom";
import logo from "../assets/logos/White_Full_Coachable.png";
import ericPhoto from "../assets/pictures/faces/IMG_7356 (5).jpg";
import ericRugbyPhoto from "../assets/pictures/faces/Eric_rugby.JPG";
import rugbyHeroLong from "../assets/pictures/Rugby_staring_at_ipad_long.png";
import rugbyCoachLong from "../assets/pictures/Rugby_coach_holding_ipad_long.png";
import {
  FiArrowRight,
  FiZap,
  FiLayers,
  FiShare2,
} from "react-icons/fi";

const PROBLEMS = [
  {
    icon: <FiZap size={20} />,
    title: "No real animation",
    desc: "Static diagrams can't show movement. Coaches can't demonstrate how plays develop in real time — leaving players interpreting instead of executing.",
  },
  {
    icon: <FiLayers size={20} />,
    title: "Disconnected tools",
    desc: "Plays are scattered across notebooks, apps, and group chats. There's no single source of truth for your team's playbook.",
  },
  {
    icon: <FiShare2 size={20} />,
    title: "Hard to share",
    desc: "Getting plays to players before game day requires screenshots, PDFs, and DMs. It's friction no team should have to deal with.",
  },
];

const FEATURES = [
  {
    label: "D",
    title: "A drag-and-drop play designer",
    desc: "Place players, draw routes, add the ball — on any sport's field. Clean, fast, and intuitive for any coach.",
  },
  {
    label: "A",
    title: "Bring plays to life with animation",
    desc: "Set keyframes and watch your plays animate in real time. Show your team exactly how each movement unfolds.",
  },
  {
    label: "S",
    title: "One link. Full access.",
    desc: "Share your playbook with anyone via a shareable link — no app download, no account required for viewers.",
  },
  {
    label: "M",
    title: "Keep your whole team in sync",
    desc: "Invite coaches and players, organize plays into folders, and build a living playbook your team actually uses.",
  },
];

const TAGS = [
  "OSU Rugby — Scrum Half / Full Back",
  "CS & Engineering",
  "Entrepreneurship Scholar",
  "Full-Stack Developer",
];

/**
 * Enterprise page — founder story, problem statement, and Coachable mission.
 * Linked from the main nav at /enterprise.
 */
export default function Enterprise() {

  return (
    <div
      className="bg-BrandBlack text-white font-DmSans hide-scroll"
      style={{ height: "100dvh", overflowY: "auto" }}
    >
      {/* ── Nav ── */}
      <nav className="fixed top-0 w-full z-50 bg-BrandBlack/70 backdrop-blur-xl border-b border-BrandGray2/10">
        <div className="flex items-center px-6 h-16 md:px-12 lg:px-20 max-w-7xl mx-auto">
          <div className="flex flex-1 items-center">
            <Link to="/home">
              <img src={logo} alt="Coachable" className="h-7 md:h-8" />
            </Link>
          </div>

          <div className="hidden flex-1 items-center justify-center gap-8 md:flex">
            <Link to="/enterprise" className="text-sm text-white transition">
              Enterprise
            </Link>
            <Link to="/slate" className="text-sm text-BrandGray transition hover:text-white">
              Product
            </Link>
            <Link to="/resources" className="text-sm text-BrandGray transition hover:text-white">
              Resources
            </Link>
          </div>

          <div className="flex flex-1 items-center justify-end gap-3">
            <Link
              to="/login"
              className="rounded-lg px-4 py-2 text-sm text-BrandGray transition hover:text-white"
            >
              Log in
            </Link>
            <Link
              to="/signup"
              className="rounded-lg bg-BrandOrange px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110 active:scale-[0.97]"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative min-h-screen flex items-center pt-16 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img
            src={rugbyHeroLong}
            alt=""
            aria-hidden="true"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-linear-to-r from-BrandBlack via-BrandBlack/85 to-BrandBlack/30" />
          <div className="absolute inset-0 bg-linear-to-t from-BrandBlack via-transparent to-transparent" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-12 lg:px-20 w-full py-32">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            {/* Left — text */}
            <div>
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-BrandOrange/30 bg-BrandOrange/10 px-4 py-1.5 text-xs text-BrandOrange font-semibold tracking-wide uppercase">
                Founder Story
              </div>
              <h1 className="font-Manrope text-5xl md:text-6xl font-bold leading-tight tracking-tight mb-6 drop-shadow-2xl">
                Coaching deserves
                <br />
                <span className="text-BrandOrange">better tools.</span>
              </h1>
              <p className="text-lg text-white/80 leading-relaxed mb-4 max-w-xl">
                Coachable was born on a rugby pitch at Ohio State — where I experienced
                firsthand how outdated tools were holding great coaches back.
              </p>
              <p className="text-base text-BrandGray leading-relaxed mb-10 max-w-xl">
                I'm Eric Ishekwene — CS student, entrepreneur, and rugby player. I built
                Coachable to give every coach the digital edge their team deserves.
              </p>
              <Link
                to="/signup"
                className="group inline-flex items-center gap-2 rounded-xl bg-BrandOrange px-8 py-4 text-sm font-semibold text-white shadow-lg shadow-BrandOrange/20 transition hover:brightness-110 active:scale-[0.97]"
              >
                Get Started
                <FiArrowRight className="transition group-hover:translate-x-0.5" />
              </Link>
            </div>

            {/* Right — photo */}
            <div className="flex justify-center lg:justify-end">
              <div className="relative">
                <div className="absolute -inset-2 rounded-3xl bg-BrandOrange/20 blur-2xl opacity-50 pointer-events-none" />
                <div className="relative rounded-2xl overflow-hidden border border-BrandOrange/20 shadow-2xl w-72 md:w-80">
                  <img
                    src={ericPhoto}
                    alt="Eric Ishekwene"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-0 left-0 right-0 p-5 bg-linear-to-t from-BrandBlack via-BrandBlack/70 to-transparent">
                    <p className="font-Manrope font-bold text-white text-lg leading-tight">
                      Eric Ishekwene
                    </p>
                    <p className="text-BrandOrange text-sm mt-0.5">
                      Founder & Developer, Coachable
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── The Problem ── */}
      <section className="py-24 bg-BrandBlack border-t border-BrandGray2/10">
        <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-20">
          <div className="text-center mb-16">
            <p className="text-sm uppercase tracking-widest font-semibold text-BrandOrange mb-4">
              The Problem
            </p>
            <h2 className="font-Manrope text-4xl md:text-5xl font-bold mb-6">
              The whiteboard era is{" "}
              <span className="text-BrandOrange">over.</span>
            </h2>
            <p className="text-BrandGray text-lg max-w-2xl mx-auto leading-relaxed">
              Coaches at every level — from youth leagues to university programs — are still
              relying on dry-erase boards and scattered group chats to communicate strategy.
              It doesn't have to be this way.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {PROBLEMS.map((card) => (
              <div
                key={card.title}
                className="rounded-2xl border border-BrandGray2/20 bg-BrandBlack2/50 p-8 hover:border-BrandOrange/30 transition group"
              >
                <div className="w-10 h-10 rounded-xl bg-BrandOrange/10 border border-BrandOrange/20 flex items-center justify-center text-BrandOrange mb-5 group-hover:bg-BrandOrange/20 transition">
                  {card.icon}
                </div>
                <h3 className="font-Manrope font-bold text-white text-xl mb-3">
                  {card.title}
                </h3>
                <p className="text-BrandGray text-sm leading-relaxed">{card.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── About Eric ── */}
      <section className="py-24 border-t border-BrandGray2/10" style={{ background: "rgba(42,46,52,0.25)" }}>
        <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            {/* Photo */}
            <div className="flex justify-center">
              <div className="relative w-72 md:w-80">
                <div className="absolute -inset-6 rounded-3xl bg-BrandOrange/5 blur-3xl pointer-events-none" />
                <div className="overflow-hidden rounded-2xl border border-BrandGray2/20 shadow-2xl">
                  <img
                    src={ericRugbyPhoto}
                    alt="Eric Ishekwene"
                    className="relative w-full object-cover"
                  />
                </div>
              </div>
            </div>

            {/* Bio */}
            <div>
              <p className="text-sm uppercase tracking-widest font-semibold text-BrandOrange mb-4">
                About the Founder
              </p>
              <h2 className="font-Manrope text-4xl font-bold mb-6 leading-tight">
                Built by a player,
                <br />for coaches.
              </h2>
              <p className="text-white/80 leading-relaxed mb-4">
                I'm Eric Ishekwene — a Computer Science & Engineering student at The Ohio
                State University, enrolled in the Entrepreneurship & Innovation Scholars
                program. On the pitch, I play scrum half and full back for the OSU rugby team.
              </p>
              <p className="text-BrandGray leading-relaxed mb-8">
                As a player I've lived both sides of coaching — the brilliance of a
                well-drawn play and the frustration of tools that can't do the idea justice.
                That frustration became Coachable: a modern platform that gives coaches the
                power to design, animate, and share plays with their teams instantly.
              </p>
              <div className="flex flex-wrap gap-2">
                {TAGS.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-BrandGray2/30 bg-BrandBlack px-4 py-1.5 text-xs text-BrandGray"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Mission ── */}
      <section className="py-28 bg-BrandBlack border-t border-BrandGray2/10 relative overflow-hidden">
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-BrandOrange/5 blur-3xl rounded-full pointer-events-none" />
        <div className="relative z-10 max-w-4xl mx-auto px-6 md:px-12 text-center">
          <p className="text-sm uppercase tracking-widest font-semibold text-BrandOrange mb-6">
            Our Mission
          </p>
          <h2 className="font-Manrope text-4xl md:text-6xl font-bold leading-tight mb-8">
            "Every coach deserves tools as{" "}
            <span className="text-BrandOrange">powerful</span> as their vision."
          </h2>
          <p className="text-BrandGray text-lg leading-relaxed max-w-2xl mx-auto">
            Coachable bridges the gap between a coach's vision and their team's understanding —
            with beautiful, animated playbooks that go far beyond the whiteboard.
          </p>
        </div>
      </section>

      {/* ── What We're Building ── */}
      <section className="py-24 border-t border-BrandGray2/10" style={{ background: "rgba(42,46,52,0.15)" }}>
        <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-20">
          <div className="text-center mb-16">
            <p className="text-sm uppercase tracking-widest font-semibold text-BrandOrange mb-4">
              What We're Building
            </p>
            <h2 className="font-Manrope text-4xl font-bold">
              Coachable, in a nutshell.
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {FEATURES.map((item) => (
              <div
                key={item.title}
                className="flex gap-5 p-8 rounded-2xl border border-BrandGray2/20 bg-BrandBlack2/40 hover:border-BrandOrange/30 transition group"
              >
                <div className="shrink-0 w-10 h-10 rounded-xl bg-BrandOrange/10 border border-BrandOrange/20 flex items-center justify-center text-BrandOrange text-sm font-Manrope font-bold group-hover:bg-BrandOrange/20 transition">
                  {item.label}
                </div>
                <div>
                  <h3 className="font-Manrope font-bold text-white text-lg mb-2">
                    {item.title}
                  </h3>
                  <p className="text-BrandGray text-sm leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-28 bg-BrandBlack border-t border-BrandGray2/10 relative overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img
            src={rugbyCoachLong}
            alt=""
            aria-hidden="true"
            className="w-full h-full object-cover opacity-15"
          />
          <div className="absolute inset-0 bg-linear-to-t from-BrandBlack via-BrandBlack/90 to-BrandBlack" />
        </div>
        <div className="relative z-10 max-w-3xl mx-auto px-6 md:px-12 text-center">
          <h2 className="font-Manrope text-4xl md:text-5xl font-bold mb-6 leading-tight">
            Ready to leave the
            <br />
            <span className="text-BrandOrange">whiteboard behind?</span>
          </h2>
          <p className="text-BrandGray text-lg mb-10 leading-relaxed">
            Join coaches and teams already using Coachable to design smarter, share faster,
            and win more.
          </p>
          <Link
            to="/signup"
            className="group inline-flex items-center gap-2 rounded-xl bg-BrandOrange px-10 py-4 text-sm font-semibold text-white shadow-lg shadow-BrandOrange/20 transition hover:brightness-110 active:scale-[0.97]"
          >
            Get Started — It's Free
            <FiArrowRight className="transition group-hover:translate-x-0.5" />
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-BrandGray2/10 bg-BrandBlack py-12">
        <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-20">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <img src={logo} alt="Coachable" className="h-7" />
            <p className="text-sm text-BrandGray">© 2026 Coachable. All rights reserved.</p>
            <div className="flex gap-6 text-sm text-BrandGray">
              <Link to="/home" className="hover:text-white transition">Home</Link>
              <Link to="/signup" className="hover:text-white transition">Sign Up</Link>
              <Link to="/login" className="hover:text-white transition">Log In</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
