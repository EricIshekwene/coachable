import "./index.css";
import Sidebar from "./components/Sidebar";
import { useState, useEffect } from "react";
import { FiEdit } from "react-icons/fi";
import { BiUndo, BiRedo } from "react-icons/bi";
import { PanelButton, PlayerButton } from "./components/subcomponents/Buttons.jsx";
import { MdOutlineResetTv } from "react-icons/md";
import { MdOutlineZoomIn, MdOutlineZoomOut } from "react-icons/md";
import { FiRotateCcw, FiRotateCw } from "react-icons/fi";
import { TbRotateDot } from "react-icons/tb";
import { IoSettingsOutline } from "react-icons/io5";
import { CiBookmarkPlus } from "react-icons/ci";
import { IoMdDownload } from "react-icons/io";
function App() {
  const [color, setColor] = useState("#561ecb");
  const iconClass = "text-BrandOrange text-lg sm:text-lg md:text-xl";

  return (
    <>
      <div className="w-full h-screen bg-BrandGreen flex flex-row justify-between">
        <Sidebar />
        <aside
          className="
                     h-screen shrink-0 bg-BrandBlack
                     w-32 sm:w-36 md:w-40 lg:w-44
                     px-3 py-3 sm:py-3 md:py-3 lg:py-3
                     flex flex-col
                     gap-1 sm:gap-1 md:gap-2 lg:gap-2
                     
                   "
        >
          {/* name */}
          <div className="flex flex-row border-b border-BrandGray2 pb-2 items-center justify-center gap-2 font-DmSans font-bold">
            <div className="text-BrandWhite text-2xl">
              Twister
            </div>
            <FiEdit className="text-BrandWhite text-sm" />
          </div>



          {/* Field Setting */}

          <div className="flex flex-col border-b border-BrandGray2 pb-4 items-start justify-center gap-1">
            <div className="text-BrandOrange text-md font-DmSans">
              Field Settings
            </div>
            <div className="grid grid-cols-3 gap-3 mt-2">

              <PanelButton Icon={<FiRotateCcw className={iconClass} />} onHover={() => { }} onClick={() => { }} isSelected={false} />
              <PanelButton Icon={<TbRotateDot className={iconClass} />} onHover={() => { }} onClick={() => { }} isSelected={false} />
              <PanelButton Icon={<FiRotateCw className={iconClass} />} onHover={() => { }} onClick={() => { }} isSelected={false} />

              <PanelButton Icon={<MdOutlineZoomOut className={iconClass} />} onHover={() => { }} onClick={() => { }} isSelected={false} />
              <p className="text-BrandWhite text-md m-auto font-DmSans">100%</p>
              <PanelButton Icon={<MdOutlineZoomIn className={iconClass} />} onHover={() => { }} onClick={() => { }} isSelected={false} />

              <PanelButton Icon={<BiUndo className={iconClass} />} onHover={() => { }} onClick={() => { }} isSelected={false} />
              <PanelButton Icon={<MdOutlineResetTv className={iconClass} />} onHover={() => { }} onClick={() => { }} isSelected={false} />
              <PanelButton Icon={<BiRedo className={iconClass} />} onHover={() => { }} onClick={() => { }} isSelected={false} />

            </div>

          </div>


          {/*Players*/}
          <div className="flex flex-col border-b border-BrandGray2 pb-4 items-start justify-center gap-1">
            <div className="text-BrandOrange text-md font-DmSans">
              Players (0)
            </div>
            <div className="flex flex-col w-full items-start justify-start gap-1 mt-2">

              <PlayerButton onClick={() => { }} isSelected={false} />
              <PlayerButton onClick={() => { }} isSelected={false} />
              <PlayerButton onClick={() => { }} isSelected={false} />
              <PlayerButton onClick={() => { }} isSelected={false} />
              
            </div>



          </div>
          {/* Advanced Settings */}
          <div className="w-full py-2 border-b border-BrandGray2 pb-4">
            <div className="w-full flex flex-row border-[0.5px] border-BrandGray2 justify-evenly bg-BrandBlack2 py-2 px-3 rounded-md items-center gap-1">
              <IoSettingsOutline className="text-BrandWhite text-lg" />
              <p className="text-BrandWhite text-xs font-bold font-DmSans">
                Advanced Settings
              </p>
            </div>
          </div>

          {/* ALl players */}
          <div className="flex flex-col border-b border-BrandGray2 pb-2 items-start justify-center gap-1">
            <div className="text-BrandOrange text-md font-DmSans">
              All Players (0)
            </div>
            {/* size */}
            <div className="flex flex-row w-full items-center justify-between">
              <p className="text-BrandOrange text-sm font-DmSans"> Size: 100%</p>
              <div className="flex flex-row items-center justify-between bg-BrandBlack2 border-[0.5px] border-BrandGray2 aspect-[2/1] w-2/7 rounded-md">
                <button className="text-BrandOrange  font-bold m-auto text-md">
                  +
                </button>
                <button className="text-BrandOrange font-bold m-auto text-md">
                  -
                </button>
              </div>
            </div>
            {/* color */}
            <div className="flex flex-col w-full items-start justify-between">
              <p className="text-BrandOrange text-sm font-DmSans">Color:</p>
              <div className="w-full flex flex-row bg-BrandBlack2 border-[0.5px] border-BrandGray2 rounded-md items-center justify-between">
                <div className="w-4 h-4 aspect-square rounded-full bg-BrandRed"></div>
                <div className="w-full flex flex-row items-center justify-between">
                  <p className="text-BrandOrange text-sm font-DmSans"> #000000</p>
                  <button className="text-BrandOrange font-bold m-auto text-md">
                    <FiEdit className="text-BrandOrange text-sm" />
                  </button>
                </div>
              </div>
            </div>

             {/* show number */}
             <div className="flex flex-row w-full items-center justify-between">
              <p className="text-BrandOrange text-sm font-DmSans"> Show Number:</p>
              <input type="checkbox" className="text-BrandOrange text-sm font-DmSans" />
             </div>
             
             {/* show name */}
             <div className="flex flex-row w-full items-center justify-between">
              <p className="text-BrandOrange text-sm font-DmSans"> Show Name:</p>
              <input type="checkbox" className="text-BrandOrange text-sm font-DmSans" />
             </div>
          </div>
          {/* Save to Playbook */}
          <div className="w-full flex flex-col justify-center items-center ">
              <div className="w-full flex flex-row justify-evenly  items-center bg-BrandOrange text-BrandBlack font-bold text-sm font-DmSans rounded-md py-1">
                <CiBookmarkPlus className="text-BrandBlack text-lg" />
                <p className="text-BrandBlack text-sm font-DmSans">Save to Playbook</p>
              </div>
             </div>
              {/* Download */}
          <div className="w-full flex flex-col justify-center items-center ">
              <div className="w-full flex flex-row justify-evenly items-center bg-BrandOrange text-BrandBlack font-bold text-sm font-DmSans rounded-md  py-1">
                <IoMdDownload className="text-BrandBlack text-lg" />
                <p className="text-BrandBlack text-sm font-DmSans">Download</p>
              </div>
             </div>
        </aside>
      </div>
    </>
  );
}
export default App;
