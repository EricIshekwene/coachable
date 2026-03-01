import { Link } from "react-router-dom";

export default function Signup() {
  return (
    <div className="min-h-screen bg-BrandBlack text-white flex flex-col items-center justify-center gap-6">
      <h1 className="text-3xl font-bold">Sign Up</h1>
      <p className="text-gray-400">Create your account</p>
      <div className="flex gap-4 text-sm">
        <Link to="/onboarding" className="text-BrandOrange underline">Continue to Onboarding</Link>
        <Link to="/login" className="text-gray-400 underline">Already have an account? Log in</Link>
      </div>
    </div>
  );
}
