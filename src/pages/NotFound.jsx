import { Link } from "react-router-dom";
import logo from "../assets/logos/White_Full_Coachable.png";

/**
 * 404 Not Found page — shown when no route matches the current URL.
 */
export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center overflow-y-auto bg-BrandBlack px-6 py-16 text-center">
      <Link to="/" className="mb-12">
        <img src={logo} alt="Coachable" className="h-8 opacity-90" />
      </Link>

      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.25em] text-BrandOrange">
        404 — Page not found
      </p>

      <h1 className="font-Manrope text-6xl font-extrabold tracking-tight text-white sm:text-7xl">
        Out of bounds.
      </h1>

      <p className="mt-5 max-w-sm text-base text-BrandGray">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>

      <Link
        to="/"
        className="mt-10 inline-flex items-center gap-2 rounded-lg bg-BrandOrange px-6 py-3 text-sm font-semibold text-white transition hover:opacity-90 active:scale-[0.98]"
      >
        Back to home
      </Link>
    </div>
  );
}
