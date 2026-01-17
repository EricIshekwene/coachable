import React from 'react'
import { IoTimeOutline, IoPlayOutline } from "react-icons/io5";
import { IoPlaySkipForwardOutline, IoPlaySkipBackOutline } from "react-icons/io5";
import { IoIosAddCircleOutline, IoIosRemoveCircleOutline } from "react-icons/io";
import keyframeIcon from "../assets/keyframes/keyframe.png";
export default function ControlPill({ keyframePositions }) {
  return (
    <>
    {/*Slate Time controller and keyframes*/}
    <div className="aspect-[641/124]  h-20 
                        flex flex-col items-center justify-evenly gap-1 
                        bg-BrandBlack
                         py-1 px-3
                        rounded-[20px] 
                        border-[0.5px] border-BrandGray 
                        absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
          {/* time pill */}
          <div className="h-29/124 w-full flex items-center px-1 bg-BrandBlack2 border-[0.25px] border-BrandGray rounded-full relative">
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
                  width: "12px",
                  height: "12px",
                  objectFit: "contain",
                  pointerEvents: "none",
                }}
              />
            ))}
            {/* The circle positioned on top of the line */}
            <div
              className="absolute z-10 top-1/2 left-[25%] transform -translate-x-1/2 -translate-y-1/2 h-2.5 w-2.5 bg-BrandOrange rounded-full"
            // Style left as needed to move the circle horizontally
            ></div>
          </div>
          {/* time, push to right edge */}

          <div className=" h-18/124  bg-BrandBlack2 py-1 font-DmSans px-2 rounded-md text-[8px] text-BrandGray flex items-center justify-center ml-auto">
            30s
          </div>

          {/* time slide, play button and add keyframe button*/}
          <div className="flex h-33/124 w-full items-center justify-between">
            {/* time slide */}
            <div className="h-5 w-163/641 bg-BrandBlack2 flex flex-row rounded-lg items-center justify-center">
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
            {/* play, go back and forward button */}
            <div className="flex flex-row items-center gap-1  justify-between">
              <div className="h-4 w-4 bg-BrandBlack2 flex items-center justify-center rounded-sm">
                < IoPlaySkipBackOutline className="text-BrandOrange text-xs" />
              </div>
              <div className="h-5 w-5 bg-BrandOrange flex items-center justify-center rounded-sm">
                <IoPlayOutline className="text-BrandBlack text-md" />
              </div>
              <div className="h-4 w-4 bg-BrandBlack2 flex items-center justify-center rounded-sm">
                <IoPlaySkipForwardOutline className="text-BrandOrange text-xs" />
              </div>
            </div>

            {/* add keyframe button */}
            <div className="w-163/641 h-5 bg-BrandOrange flex flex-rowitems-center items-center justify-evenly rounded-md">
              <IoIosAddCircleOutline className="text-BrandBlack text-xs" />
              <p className="text-BrandBlack text-[8px] font-DmSans">Add Keyframe</p>
              <IoIosRemoveCircleOutline className="text-BrandBlack text-xs" />
            </div>
          </div>
        </div>
    </>
  )
}