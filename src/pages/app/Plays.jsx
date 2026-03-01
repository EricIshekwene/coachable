import { Link } from "react-router-dom";

export default function Plays() {
  return (
    <div className="min-h-screen bg-BrandBlack text-white flex flex-col items-center justify-center gap-6">
      <h1 className="text-3xl font-bold">Plays</h1>
      <p className="text-gray-400">Your playbook</p>
      <div className="flex gap-4 text-sm">
        <Link to="/app/plays/new" className="text-BrandOrange underline">Create New Play</Link>
        <Link to="/app/team" className="text-gray-400 underline">Team</Link>
        <Link to="/app/profile" className="text-gray-400 underline">Profile</Link>
      </div>
    </div>
  );
}
