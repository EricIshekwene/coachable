import { Link } from "react-router-dom";

export default function Profile() {
  return (
    <div className="min-h-screen bg-BrandBlack text-white flex flex-col items-center justify-center gap-6">
      <h1 className="text-3xl font-bold">Profile</h1>
      <p className="text-gray-400">Your account settings</p>
      <div className="flex gap-4 text-sm">
        <Link to="/" className="text-red-400 underline">Log Out</Link>
        <Link to="/app/plays" className="text-gray-400 underline">Plays</Link>
      </div>
    </div>
  );
}
