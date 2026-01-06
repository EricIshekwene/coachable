import React from "react";
import { IoChevronDownOutline } from "react-icons/io5";

export const Button = ({ Icon, onHover, onClick, isSelected }) => {
    return (
        <div className="w-full">
            <button
                className={`
             w-full aspect-square
             rounded-md border border-BrandGary
             transition-all duration-300
             flex items-center justify-center
             ${isSelected ? "bg-BrandOrange " : "bg-BrandBlack2 "}
           `}
                onMouseEnter={onHover}
                onClick={onClick}
            >
                {Icon}
            </button>
        </div>
    )
}

export const ButtonWithChevron = ({ Icon, onHover, onClick, isSelected }) => {
    return (
        <div className="w-full flex items-center gap-1">
            <button
                className={`
             w-full aspect-square
             rounded-md border border-BrandGary
             transition-all duration-100
             flex items-center justify-center
           ${isSelected ? "bg-BrandOrange " : "bg-BrandBlack2 "}
           `}
                onMouseEnter={onHover}
                onClick={onClick}
            >
                {Icon}
            </button>
            <IoChevronDownOutline className="shrink-0 text-BrandOrange text-[10px] sm:text-xs md:text-sm" />
        </div>
    )
}



export const ButtonWithChevronAndLabel = ({ Icon, label, onHover, onClick, isSelected }) => {
    return (
        <div className="w-full flex flex-col items-center gap-1">
            <div className="w-full flex items-center gap-1">
                <button
                    className={`
              w-full aspect-square
              rounded-md border border-BrandGary
              transition-all duration-300
              flex items-center justify-center
            ${isSelected ? "bg-BrandOrange " : "bg-BrandBlack2 "}
            `}
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


