import { Link } from "react-router-dom";
import logo from "../assets/logos/full_coachable_Logo.png";

export default function Login() {
  const inputClass =
    "w-full rounded-md border border-BrandGray bg-white p-2 font-DmSans text-sm outline-none transition hover:border-BrandBlack focus:border-BrandOrange focus:shadow-[0_0_0_2px_rgba(255,122,24,0.2)]";

  return (
    <div className="h-screen overflow-hidden bg-BrandBlack">
      <div className="h-full w-full max-w-full overflow-auto bg-BrandWhite px-6 py-10 text-BrandBlack sm:px-12 sm:py-16 md:max-w-1/2 md:px-24 md:py-24 lg:px-50">
        <div className="flex h-full w-full max-w-2xl flex-col gap-5">
          <img src={logo} alt="logo" className="w-1/2 sm:w-1/3 md:w-1/4" />
          <div className="flex flex-col gap-1">
            <p className="font-DmSans text-2xl font-bold">Login</p>
            <p className="font-DmSans text-sm text-BrandGray2">Welcome back! Please enter your details.</p>
          </div>

          <div className="mt-1 flex flex-col gap-3">
            <div className="flex flex-col gap-2">
              <p className="font-DmSans text-sm font-semibold">Email</p>
              <input type="email" placeholder="Email" className={inputClass} />
            </div>
            <div className="flex flex-col gap-2">
              <p className="font-DmSans text-sm font-semibold">Password</p>
              <input type="password" placeholder="Password" className={inputClass} />
            </div>
          </div>
          <p className="font-DmSans text-right text-sm text-BrandOrange transition hover:opacity-80">
            Forgot password?
          </p>

          <button className="w-full rounded-md bg-BrandBlack p-2 font-DmSans text-sm text-BrandWhite transition hover:bg-BrandBlack2 active:scale-[0.99]">
            Login
          </button>
          <p className="font-DmSans text-sm text-center text-BrandGray2">
            Don't have an account?{" "}
            <Link to="/signup" className="text-BrandOrange underline transition hover:opacity-80">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
