import React from "react";
import { IoChevronDownOutline } from "react-icons/io5";

export const Button = ({ Icon, onHover, onClick }) => {
    return (
        <div className="w-full">
            <button
                className="
             w-full aspect-square
             rounded-md border border-BrandGary
             bg-BrandBlack2 hover:bg-BrandBlack2/80
             transition-all duration-300
             flex items-center justify-center
           "
                onMouseEnter={onHover}
                onClick={onClick}
            >
                {Icon}
            </button>
        </div>
    )
}

export const ButtonWithChevron = ({ Icon, onHover, onClick }) => {
    return (
        <div className="w-full flex items-center gap-1">
            <button
                className="
             w-full aspect-square
             rounded-md border border-BrandGary
             bg-BrandBlack2 hover:bg-BrandBlack2/80
             transition-all duration-300
             flex items-center justify-center
           "
                onMouseEnter={onHover}
                onClick={onClick}
            >
                {Icon}
            </button>

            {/* Chevron: no bg, no border, small */}
            <IoChevronDownOutline className="shrink-0 text-BrandOrange text-[10px] sm:text-xs md:text-sm" />
        </div>
    )
}



export const ButtonWithChevronAndLabel = ({ Icon, label, onHover, onClick }) => {
    return (
        <div className="w-full flex flex-col items-center gap-1">
            <div className="w-full flex items-center gap-1">
                <button
                    className="
              w-full aspect-square
              rounded-md border border-BrandGary
              bg-BrandBlack2 hover:bg-BrandBlack2/80
              transition-all duration-300
              flex items-center justify-center
            "
                    onMouseEnter={onHover}
                    onClick={onClick}
                >
                    {Icon}
                </button>

                <IoChevronDownOutline className="shrink-0 text-BrandOrange text-[10px] sm:text-xs md:text-sm" />
            </div>

            <span className="text-[10px] sm:text-xs text-BrandGary text-center leading-none">
                {label}
            </span>
        </div>
    )
}


