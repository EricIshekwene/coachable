import { Link } from "react-router-dom";

export default function Home() {
  return (
    <div className="min-h-screen bg-BrandBlack text-white flex flex-col items-center justify-center gap-6">
      <h1 className="text-4xl font-bold">Coachable</h1>
      <p className="text-lg text-gray-400">Sports play designer</p>
      <div className="flex gap-4">
        <Link to="/signup" className="px-6 py-2 bg-BrandOrange rounded text-white font-semibold">Sign Up</Link>
        <Link to="/login" className="px-6 py-2 border border-gray-600 rounded text-white font-semibold">Log In</Link>
      </div>
    </div>
  );
}
