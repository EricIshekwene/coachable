import "./index.css";
import Sidebar from "./components/Sidebar";
import { useState, useEffect } from "react";
import { IoTimeOutline, IoPlayOutline } from "react-icons/io5";
function App() {
  const [color, setColor] = useState("#561ecb");


  return (
    <>
      <div className="w-full h-screen bg-BrandGreen flex flex-row">
        <Sidebar />
        {/*Slate Time controller and keyframes*/}
        <div className="aspect-[641/124] hidden h-20 
                        flex flex-col gap-1 
                        bg-BrandBlack
                        py-2 px-2
                        rounded-[20px] 
                        border-[0.5px] border-BrandGray 
                        absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
          {/* time pill */}
          <div className="h-4 w-full flex items-center px-1 bg-BrandBlack2 border-[0.25px] border-BrandGray rounded-full">
            <div className=" h-2.5 w-2.5  bg-BrandOrange rounded-full"></div>
          </div>
          {/* time, push to right edge */}
          <div className="flex w-full">
            <div className="h-4 w-7 bg-BrandBlack2 py-0.5 px-1 rounded-md text-[8px] text-BrandGray flex items-center justify-center ml-auto">
              30s
            </div>
          </div>
          {/* time slide, play button and add keyframe button*/}
          <div className="flex w-full items-center justify-between">
            {/* time slide */}
            <div className="h-5 w-20 bg-BrandBlack2 flex flex-row rounded-lg items-center justify-center">
              <IoTimeOutline className="text-BrandOrange text-xs mr-1" />
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={50}
                className="time-slider accent-BrandOrange w-7"
                onChange={() => { }}
              />

            </div>
            {/* play button */}
            <div className="h-5 w-5 bg-BrandBlack2 flex items-center justify-center rounded-lg">
              <IoPlayOutline className="text-BrandGray text-xs" />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
export default App;
