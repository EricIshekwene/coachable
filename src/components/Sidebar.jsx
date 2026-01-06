import { LuMousePointer2 } from "react-icons/lu";
import { PiPenNib } from "react-icons/pi";
import { ButtonWithChevronAndLabel, ButtonWithChevron, Button } from "./subcomponents/Buttons";
import { PiEraserFill } from "react-icons/pi";
import { BsPersonAdd } from "react-icons/bs";
import playerIcon from "../assets/players/Ellipse 8.png";
import { TbCopyPlusFilled } from "react-icons/tb";
import { BiUndo } from "react-icons/bi";
import { BiRedo } from "react-icons/bi";
import { BiReset } from "react-icons/bi";
import { useState, useEffect } from "react";
function Sidebar() {
    const iconClass = "text-BrandOrange text-xl sm:text-2xl md:text-3xl";
    const selectedIconClass =  "text-BrandBlack text-xl sm:text-2xl md:text-3xl";
    const [selectedTool, setSelectedTool] = useState("select");
    
    const isSelectedTool = (tool) => selectedTool === tool;
    useEffect(() => {
        console.log("Selected tool:", selectedTool);
      }, [selectedTool]);
    return (
        <aside
            className="
                     h-screen shrink-0 bg-BrandBlack
                     w-14 sm:w-16 md:w-18 lg:w-20
                     px-2 py-3 sm:py-4 md:py-5 lg:py-6
                     flex flex-col
                     gap-1 sm:gap-2 md:gap-3 lg:gap-4
                   "
        >
            {/* Select Tool */}
            <ButtonWithChevron 
                Icon={<LuMousePointer2 className={isSelectedTool("select") ? selectedIconClass : iconClass} />} 
                onHover={() => { }} 
                isSelected={isSelectedTool("select")} 
                onClick={() => { setSelectedTool("select"); }}
            />

            <hr className="w-4/5 self-center border-BrandGary" />

            {/* Pen Tool */}
            <ButtonWithChevron 
                Icon={<PiPenNib className={isSelectedTool("pen") ? selectedIconClass : iconClass} style={{ transform: "rotate(90deg)" }} />} 
                onHover={() => { }} 
                isSelected={isSelectedTool("pen")} 
                onClick={() => { setSelectedTool("pen"); }}
            />

            <hr className="w-4/5 self-center border-BrandGary" />

            {/* Eraser Tool */}
            <ButtonWithChevron 
                Icon={<PiEraserFill className={isSelectedTool("eraser") ? selectedIconClass : iconClass} />} 
                onHover={() => { }} 
                isSelected={isSelectedTool("eraser")} 
                onClick={() => { setSelectedTool("eraser"); }}
            />

            <hr className="w-4/5 self-center border-BrandGary" />

            {/* Add Player Tool */}
            <ButtonWithChevron 
                Icon={<BsPersonAdd className={isSelectedTool("addPlayer") ? selectedIconClass : iconClass} />} 
                onHover={() => { }} 
                isSelected={isSelectedTool("addPlayer")} 
                onClick={() => { setSelectedTool("addPlayer"); }}
            />

            <hr className="w-4/5 self-center border-BrandGary" />

            {/* Player Tool */}
            <ButtonWithChevron Icon={<img src={playerIcon} alt="playerIcon" className={isSelectedTool("player") ? selectedIconClass : iconClass} />} 
                onHover={() => { }} 
                isSelected={isSelectedTool("player")} 
                onClick={() => { setSelectedTool("player"); }} />
            
            <hr className="w-4/5 self-center border-BrandGary" />

            {/* Prefabs Tool */}
            <ButtonWithChevronAndLabel Icon={<TbCopyPlusFilled className={iconClass} />} label="Prefabs" onHover={() => { }} isSelected={false} onClick={() => { }} />
            
            <hr className="w-4/5 self-center border-BrandGary" />

            {/* Undo, Redo, Reset Tool */}
            <div className="w-full flex flex-col items-center gap-2 sm:gap-3 md:gap-4 lg:gap-5 p-1 py-2 lg:py-4 lg:px-2">
                <Button Icon={<BiUndo className={iconClass} />} onHover={() => { }} onClick={() => { }} isSelected={false} />
                <Button Icon={<BiRedo className={iconClass} />} onHover={() => { }} onClick={() => { }} isSelected={false} />
                <Button Icon={<BiReset className={iconClass} />} onHover={() => { }} onClick={() => { }} isSelected={false} />
            </div>


        </aside>
    )
}
export default Sidebar;