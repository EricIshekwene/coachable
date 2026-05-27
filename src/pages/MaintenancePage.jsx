import logo from "../assets/logos/White_Full_Coachable.png";

/**
 * Full-screen maintenance page shown while Coachable is temporarily offline.
 * Replaces all app routes until the outage is resolved.
 */
export default function MaintenancePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-BrandBlack px-6 py-16 text-center">
      <img src={logo} alt="Coachable" className="mb-12 block h-8 w-auto object-contain opacity-90" />

      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 px-8 py-10 shadow-xl">
        <div className="mb-4 flex items-center justify-center">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-BrandOrange/15">
            <svg
              className="h-6 w-6 text-BrandOrange"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
              />
            </svg>
          </span>
        </div>

        <h1 className="font-Manrope text-2xl font-extrabold tracking-tight text-white">
          Coachable is temporarily down
        </h1>

        <p className="mt-3 text-sm leading-relaxed text-BrandGray">
          We&apos;re performing urgent maintenance to keep your data safe. We&apos;ll
          be back up shortly — thank you for your patience.
        </p>
      </div>
    </div>
  );
}
