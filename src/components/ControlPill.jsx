import React from 'react'
import { IoTimeOutline, IoPlayOutline } from "react-icons/io5";
import { IoPlaySkipForwardOutline, IoPlaySkipBackOutline } from "react-icons/io5";
import { IoIosAddCircleOutline, IoIosRemoveCircleOutline } from "react-icons/io";
import keyframeIcon from "../assets/keyframes/keyframe.png";
import TimeSlider from './TimeSlider';
import { FiMinusCircle, FiPlusCircle } from "react-icons/fi";
export default function ControlPill({ keyframePositions }) {
  return (
    <>
      {/*Slate Time controller and keyframes*/}
      <div className="aspect-[641/124] h-10 sm:h-[48px] md:h-16 lg:h-20
                        flex flex-col items-center justify-between gap-0.5 sm:gap-1 
                        bg-BrandBlack
                         py-0.5 sm:py-1 px-2 sm:px-2.5 md:px-3
                        rounded-[16px] sm:rounded-[18px] md:rounded-[20px] 
                        border-[0.5px] border-BrandGray 
                        absolute top-1/2 left-3/4 transform -translate-x-1/2 -translate-y-1/2">
        {/* time pill */}
        <div className="h-29/124 mt-0.5 sm:mt-1 md:mt-1 lg:mt-1 w-full flex items-center px-1 bg-BrandBlack2 border-[0.25px] border-BrandGray rounded-full relative">
          {/* The horizontal rule (line) inside the pill */}
          <hr className="absolute left-0 top-1/2 w-full  text-BrandOrange2 -translate-y-1/2" />
          {/* Keyframe icons scattered along the pill */}
          {keyframePositions.map((left, idx) => (
            <img
              key={idx}
              src={keyframeIcon}
              alt="keyframe"
              className="absolute z-20"
              style={{
                left: left,
                top: "50%",
                transform: "translate(-50%, -50%)",
                width: "10px",
                height: "10px",
                objectFit: "contain",
                pointerEvents: "none",
              }}
            />
          ))}
          {/* The circle positioned on top of the line */}
          <div
            className="absolute z-10 top-1/2 left-[25%] transform -translate-x-1/2 -translate-y-1/2 h-2 w-2 sm:h-2.5 sm:w-2.5 bg-BrandOrange rounded-full"
          // Style left as needed to move the circle horizontally
          ></div>
        </div>

        {/* time slide with time display, play buttons and add keyframe button*/}
        <div className="flex flex-1 w-full items-center justify-between gap-0.5 sm:gap-1">
          {/* time slide with time display */}
          <div className="h-3 sm:h-4 md:h-4 lg:h-5 w-200/641 bg-BrandBlack2 flex flex-row rounded-lg items-center justify-center px-1 sm:px-1.5 gap-1 sm:gap-1.5">
            <IoTimeOutline className="text-BrandOrange text-[10px] sm:text-xs flex-shrink-0" />
            <TimeSlider
              min={0}
              max={100}
              step={1}
              value={50}
              onChange={() => { }}
              pinSize="8px"
              trackWidth="3px"
              pinColor="#FF7A18"
              trackColor="#9AA0A6"
              inactiveTrackColor="#75492a"
              className="flex-1"
            />
            <div className=" sm:py-1 font-DmSans  rounded-md text-[7px] sm:text-[8px] md:text-[9px] text-BrandGray flex items-center justify-center ">
              30s
            </div>
          </div>
          {/* play, go back and forward button */}
          <div className="flex flex-row items-center gap-0.5 sm:gap-1 justify-between">
            <div className="h-3 sm:h-4 md:h-4 lg:h-6 w-3 sm:w-4 md:w-4 lg:w-6 bg-BrandBlack2 flex items-center justify-center rounded-sm">
              < IoPlaySkipBackOutline className="text-BrandOrange text-xs sm:text-sm md:text-base" />
            </div>
            <div className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 bg-BrandOrange flex items-center justify-center rounded-sm">
              <IoPlayOutline className="text-BrandBlack text-sm sm:text-base md:text-lg" />
            </div>
            <div className="h-3 sm:h-4 md:h-4 lg:h-6 w-3 sm:w-4 md:w-4 lg:w-6 bg-BrandBlack2 flex items-center justify-center rounded-sm">
              <IoPlaySkipForwardOutline className="text-BrandOrange text-xs sm:text-sm md:text-base" />
            </div>
          </div>

          {/* add keyframe button */}
          <div className="w-200/641 h-3 sm:h-4 md:h-4 lg:h-6 bg-BrandOrange flex flex-row items-center justify-evenly rounded-md px-1 sm:px-1.5">
            <FiPlusCircle className="text-BrandBlack text-xs " />
            <p className="text-BrandBlack text-[8px] sm:text-[9px] md:text-[10px] font-DmSans">Add Keyframe</p>
            <FiMinusCircle className="text-BrandBlack text-xs " />
          </div>
        </div>
      </div>
    </>
  )
}