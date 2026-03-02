import { Link } from "react-router-dom";
import logo from "../assets/logos/full_coachable_Logo.png";
export default function Login() {
  return (
    <div className="h-screen overflow-hidden bg-BrandBlack gap-6">
      <div className="w-full max-w-full md:max-w-1/2 h-full bg-BrandWhite text-BrandBlack px-6 sm:px-12 md:px-24 lg:px-50 py-12 sm:py-20 md:py-40 overflow-auto">

        <div className="flex flex-col gap-4 w-full h-full">
          <img src={logo} alt="logo" className="w-1/2 sm:w-1/3 md:w-1/4" />
          <p className="text-2xl font-bold font-DmSans">Login</p>
          <p className="text-sm font-DmSans">Welcome back! Please enter your details.</p>
          <div className="flex flex-col gap-4 mt-3">
            <p className="text-sm font-DmSans">Email </p>
            <input type="email" placeholder="Email" className="w-full p-2 rounded-md border-1 border-BrandGray" />
            <p className="text-sm font-DmSans">Password</p>
            <input type="password" placeholder="Password" className="w-full p-2 rounded-md border-1 border-BrandGray" />
            
          </div>
          <p className="text-sm font-DmSans text-right text-BrandOrange">Forgot password?</p>
          <button className="w-full p-2 rounded-md bg-BrandBlack text-BrandWhite">Login</button>
          <p className="text-sm font-DmSans text-center">Don't have an account? <span className="text-BrandOrange underline">Sign up</span></p>
          
        </div>
      </div>
    </div>
  );
}
