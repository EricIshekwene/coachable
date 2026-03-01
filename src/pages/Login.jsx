import { Link } from "react-router-dom";

export default function Login() {
  return (
    <div className="min-h-screen bg-BrandBlack text-white flex flex-col items-center justify-center gap-6">
      <h1 className="text-3xl font-bold">Log In</h1>
      <p className="text-gray-400">Welcome back</p>
      <div className="flex gap-4 text-sm">
        <Link to="/onboarding" className="text-BrandOrange underline">Onboarding (no team)</Link>
        <Link to="/app/plays" className="text-BrandOrange underline">Go to Plays (onboarded)</Link>
        <Link to="/signup" className="text-gray-400 underline">Need an account? Sign up</Link>
      </div>
    </div>
  );
}
