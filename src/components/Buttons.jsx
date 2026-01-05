import React from "react";

export const Button = ({ children, onClick }) => {
    return (
        <button className="bg-BrandBlack2 aspect-square w-full rounded-md flex items-center border border-BrandGary justify-center" onClick={onClick}>
            {children}
        </button>
    )
}

