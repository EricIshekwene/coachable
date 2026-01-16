import "./index.css";
import Sidebar from "./components/Sidebar";
import { useState, useEffect } from "react";
import { FiEdit } from "react-icons/fi";
import { BiArrowToRight } from "react-icons/bi";
import { PanelButton } from "./components/subcomponents/Buttons.jsx";

function App() {
  const [color, setColor] = useState("#561ecb");
  const iconClass = "text-BrandOrange text-xl sm:text-2xl md:text-3xl";

  return (
    <>
      <div className="w-full h-screen bg-BrandGreen flex flex-row">
        <Sidebar />
        <aside
          className="
                     h-screen shrink-0 bg-BrandBlack
                     w-28 sm:w-32 md:w-36 lg:w-40
                     px-2 py-3 sm:py-4 md:py-5 lg:py-6
                     flex flex-col
                     gap-1 sm:gap-1 md:gap-2 lg:gap-2
                     ml-20
                   "
        >
          {/* name */}
          <div className="flex flex-row items-center justify-center gap-2 font-DmSans font-bold">
            <div className="text-BrandWhite text-2xl">
              Twister
            </div>
            <FiEdit className="text-BrandWhite text-sm" />
          </div>
          <hr className="border-BrandGray2 w-7/8 mx-auto" />
          {/* Field Setting */}
          <div className="flex flex-col items-start justify-center gap-1">
            <div className="text-BrandOrange text-md font-DmSans">
              Field Settings
            </div>
            <div className="grid grid-cols-3 gap-2 mt-2">
              <PanelButton Icon={<BiArrowToRight className={iconClass} />} onHover={() => { }} onClick={() => { }} isSelected={false} />

            </div>

          </div>

        </aside>
      </div>
    </>
  );
}
export default App;
