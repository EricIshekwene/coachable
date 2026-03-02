import { useState } from "react";
import logo from "../assets/logos/full_coachable_Logo.png";
import { MdOutlineCreateNewFolder } from "react-icons/md";
import { FaRegHandshake } from "react-icons/fa6";

export default function Onboarding() {
  const [teamAction, setTeamAction] = useState("create");

  const cardBaseClass =
    "group flex h-full w-full cursor-pointer flex-col items-start justify-center rounded-lg border p-4 text-left transition duration-200";
  const selectedCardClass = "border-BrandOrange bg-white shadow-[0_0_0_2px_rgba(255,122,24,0.2)]";
  const unselectedCardClass =
    "border-BrandBlack hover:-translate-y-0.5 hover:border-BrandOrange hover:bg-BrandGray1/50 hover:shadow-md";
  const inputClass =
    "w-full rounded-md border border-BrandGray bg-white p-2 font-DmSans text-sm outline-none transition hover:border-BrandBlack focus:border-BrandOrange focus:shadow-[0_0_0_2px_rgba(255,122,24,0.2)]";

  return (
    <div className="h-screen overflow-hidden bg-BrandBlack">
      <div className="h-full w-full max-w-full overflow-auto bg-BrandWhite px-6 py-10 text-BrandBlack sm:px-12 sm:py-16 md:max-w-1/2 md:px-24 md:py-24 lg:px-50">
        <div className="flex h-full w-full max-w-2xl flex-col gap-5">
          <img src={logo} alt="logo" className="w-1/2 sm:w-1/3 md:w-1/4" />
          <div className="flex flex-col gap-1">
            <p className="font-DmSans text-2xl font-bold">Get Started</p>
            <p className="font-DmSans text-sm text-BrandGray2">
              Create or join a team, then pick your role
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <p className="font-DmSans text-sm font-semibold">Team</p>
            <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setTeamAction("create")}
                className={`${cardBaseClass} ${teamAction === "create" ? selectedCardClass : unselectedCardClass}`}
              >
                <div
                  className={`mb-3 flex h-12 w-12 items-center justify-center rounded-full transition ${
                    teamAction === "create" ? "bg-BrandOrange/20" : "bg-BrandGray1"
                  }`}
                >
                  <MdOutlineCreateNewFolder className="text-2xl text-BrandBlack" />
                </div>
                <p className="mb-1 font-DmSans text-base font-semibold sm:text-lg">Create a New Team</p>
                <p className="font-DmSans text-xs text-BrandGray2">Start fresh</p>
              </button>

              <button
                type="button"
                onClick={() => setTeamAction("join")}
                className={`${cardBaseClass} ${teamAction === "join" ? selectedCardClass : unselectedCardClass}`}
              >
                <div
                  className={`mb-3 flex h-12 w-12 items-center justify-center rounded-full transition ${
                    teamAction === "join" ? "bg-BrandOrange/20" : "bg-BrandGray1"
                  }`}
                >
                  <FaRegHandshake className="text-2xl text-BrandBlack" />
                </div>
                <p className="mb-1 font-DmSans text-base font-semibold sm:text-lg">Join a Team</p>
                <p className="font-DmSans text-xs text-BrandGray2">Join an existing team</p>
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-2">
              <p className="font-DmSans text-sm font-semibold">
                {teamAction === "create" ? "Team Name" : "Team Code"}
              </p>
              <input
                type="text"
                placeholder={teamAction === "create" ? "Enter your team name" : "Enter invite code"}
                className={inputClass}
              />
            </div>
            <div className="flex flex-col gap-2">
              <p className="font-DmSans text-sm font-semibold">Sport</p>
              <select className={inputClass}>
                <option value="">Select a sport</option>
                <option value="soccer">Soccer</option>
                <option value="basketball">Basketball</option>
                <option value="baseball">Baseball</option>
                <option value="football">Football</option>
                <option value="volleyball">Volleyball</option>
                <option value="hockey">Hockey</option>
                <option value="rugby">Rugby</option>
                <option value="cricket">Cricket</option>
                <option value="lacrosse">Lacrosse</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <button className="w-full rounded-md bg-BrandBlack p-2 font-DmSans text-sm text-BrandWhite transition hover:bg-BrandBlack2 active:scale-[0.99]">
            Finish Setup
          </button>
        </div>
      </div>
    </div>
  );
}
