import { Link } from "react-router-dom";

export default function Team() {
  return (
    <div className="min-h-screen bg-BrandBlack text-white flex flex-col items-center justify-center gap-6">
      <h1 className="text-3xl font-bold">Team</h1>
      <p className="text-gray-400">Manage your team</p>
      <div className="flex gap-4 text-sm">
        <Link to="/app/plays" className="text-gray-400 underline">Plays</Link>
        <Link to="/app/profile" className="text-gray-400 underline">Profile</Link>
      </div>
    </div>
  );
}
