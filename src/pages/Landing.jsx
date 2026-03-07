import { Link } from "react-router-dom";
import logo from "../assets/logos/White_Full_Coachable.png";
import { FiArrowRight, FiPlay, FiUsers, FiLayers } from "react-icons/fi";

export default function Landing() {
  return (
    <div className="min-h-screen bg-BrandBlack text-white font-DmSans">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 md:px-12 lg:px-20">
        <img src={logo} alt="Coachable" className="h-7" />
        <div className="flex items-center gap-3">
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
      </nav>

      {/* Hero */}
      <section className="mx-auto flex max-w-5xl flex-col items-center px-6 pt-24 pb-20 text-center md:pt-36 md:pb-28">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-BrandGray2 bg-BrandBlack2 px-4 py-1.5 text-xs text-BrandGray">
          <span className="h-1.5 w-1.5 rounded-full bg-BrandGreen animate-pulse" />
          Now in beta
        </div>
        <h1 className="font-Manrope text-4xl font-bold leading-tight tracking-tight md:text-6xl lg:text-7xl">
          Design plays.
          <br />
          <span className="text-BrandOrange">Win games.</span>
        </h1>
        <p className="mt-6 max-w-xl text-base text-BrandGray md:text-lg">
          The modern playbook platform for coaches and teams. Create, share, and animate plays with a beautiful drag-and-drop editor.
        </p>
        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row">
          <Link
            to="/signup"
            className="group flex items-center gap-2 rounded-xl bg-BrandOrange px-6 py-3 text-sm font-semibold text-white transition hover:brightness-110 active:scale-[0.97]"
          >
            Start for free
            <FiArrowRight className="transition group-hover:translate-x-0.5" />
          </Link>
          <Link
            to="/login"
            className="flex items-center gap-2 rounded-xl border border-BrandGray2 px-6 py-3 text-sm text-BrandGray transition hover:border-BrandGray hover:text-white"
          >
            <FiPlay className="text-xs" />
            See it in action
          </Link>
        </div>
      </section>

      {/* Feature cards */}
      <section className="mx-auto grid max-w-5xl grid-cols-1 gap-4 px-6 pb-28 md:grid-cols-3 md:px-12">
        {[
          {
            icon: <FiLayers className="text-xl text-BrandOrange" />,
            title: "Drag & Drop Editor",
            desc: "Place players, draw routes, and animate plays on a beautiful canvas.",
          },
          {
            icon: <FiUsers className="text-xl text-BrandOrange" />,
            title: "Team Collaboration",
            desc: "Share your playbook with your team. Players view, coaches create.",
          },
          {
            icon: <FiPlay className="text-xl text-BrandOrange" />,
            title: "Animate & Export",
            desc: "Bring plays to life with keyframe animation and export to share.",
          },
        ].map((f) => (
          <div
            key={f.title}
            className="group rounded-xl border border-BrandGray2/50 bg-BrandBlack2/50 p-6 transition hover:border-BrandOrange/30 hover:bg-BrandBlack2"
          >
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-BrandOrange/10">
              {f.icon}
            </div>
            <h3 className="mb-2 font-Manrope text-base font-semibold">{f.title}</h3>
            <p className="text-sm leading-relaxed text-BrandGray">{f.desc}</p>
          </div>
        ))}
      </section>

      {/* Footer */}
      <footer className="border-t border-BrandGray2/30 py-8 text-center text-xs text-BrandGray2">
        &copy; {new Date().getFullYear()} Coachable. All rights reserved.
      </footer>
    </div>
  );
}
