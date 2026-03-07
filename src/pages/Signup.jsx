import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import logo from "../assets/logos/full_Coachable_logo.png";
import whiteLogo from "../assets/logos/White_Full_Coachable.png";

export default function Signup() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const { signup } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name || !email || !password || !confirm) {
      setError("Please fill in all fields.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    signup(name, email);
    navigate("/onboarding");
  };

  const inputClass =
    "w-full rounded-lg border border-BrandGray/40 bg-white px-3.5 py-2.5 font-DmSans text-sm outline-none transition placeholder:text-BrandGray hover:border-BrandGray focus:border-BrandOrange focus:shadow-[0_0_0_3px_rgba(255,122,24,0.1)]";

  return (
    <div className="flex h-screen font-DmSans">
      {/* Left - Form */}
      <div className="flex w-full flex-col justify-center overflow-auto bg-white px-8 sm:px-16 md:w-1/2 lg:px-24 xl:px-32">
        <div className="mx-auto w-full max-w-md">
          <img src={logo} alt="Coachable" className="mb-10 h-7" />

          <h1 className="font-Manrope text-2xl font-bold tracking-tight text-BrandBlack">
            Create your account
          </h1>
          <p className="mt-1.5 text-sm text-BrandGray2">
            Get started with Coachable in seconds.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
            {error && (
              <div className="rounded-lg bg-red-50 px-3.5 py-2.5 text-xs text-red-600">
                {error}
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-BrandBlack">Full name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jane Smith"
                className={inputClass}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-BrandBlack">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className={inputClass}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-BrandBlack">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                className={inputClass}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-BrandBlack">Confirm password</label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Re-enter your password"
                className={inputClass}
              />
            </div>

            <button
              type="submit"
              className="mt-2 w-full rounded-lg bg-BrandBlack py-2.5 text-sm font-semibold text-white transition hover:bg-BrandBlack2 active:scale-[0.98]"
            >
              Create account
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-BrandGray2">
            Already have an account?{" "}
            <Link to="/login" className="font-semibold text-BrandOrange transition hover:opacity-80">
              Sign in
            </Link>
          </p>
        </div>
      </div>

      {/* Right - Brand panel */}
      <div className="hidden flex-col items-center justify-center bg-BrandBlack md:flex md:w-1/2">
        <img src={whiteLogo} alt="Coachable" className="mb-6 h-10 opacity-60" />
        <p className="max-w-xs text-center text-sm leading-relaxed text-BrandGray2">
          The modern playbook platform for coaches and teams.
        </p>
      </div>
    </div>
  );
}
