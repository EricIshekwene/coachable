import { Link } from "react-router-dom";

export default function Onboarding() {
  return (
    <div className="min-h-screen bg-BrandBlack text-white flex flex-col items-center justify-center gap-6">
      <h1 className="text-3xl font-bold">Onboarding</h1>
      <p className="text-gray-400">Set up your team</p>
      <Link to="/app/plays" className="text-BrandOrange underline">Continue to Plays</Link>
    </div>
  );
}
