import { LuMousePointer2 } from "react-icons/lu";
import { PiPenNib } from "react-icons/pi";
import { SidebarChevronButton, Button } from "./subcomponents/Buttons";
import { Popover, PopoverGrid } from "./subcomponents/Popovers";
import { PiEraserFill } from "react-icons/pi";
import { BsPersonAdd } from "react-icons/bs";
import playerIcon from "../assets/players/Ellipse 8.png";
import { TbCopyPlusFilled } from "react-icons/tb";
import { BiUndo } from "react-icons/bi";
import { BiRedo } from "react-icons/bi";
import { BiReset } from "react-icons/bi";
import { IoHandLeftOutline } from "react-icons/io5";
import { useState, useEffect, useRef } from "react";
import { FaArrowUpLong } from "react-icons/fa6";
import { TbCircleDotted } from "react-icons/tb";
import { FaRegCircle } from "react-icons/fa";

function Sidebar() {
    const iconClass = "text-BrandOrange text-xl sm:text-2xl md:text-3xl";
    const selectedIconClass = "text-BrandBlack text-xl sm:text-2xl md:text-3xl";
    const [selectedTool, setSelectedTool] = useState("select");
    const [selectToolType, setSelectToolType] = useState("select");
    const [penToolType, setPenToolType] = useState("pen");
    const [eraserToolType, setEraserToolType] = useState("eraser");
    const [openPopover, setOpenPopover] = useState(null);

    const selectButtonRef = useRef(null);
    const penButtonRef = useRef(null);
    const eraserButtonRef = useRef(null);

    const isSelectedTool = (tool) => selectedTool === tool;

    const togglePopover = (key) => {
        setOpenPopover(openPopover === key ? null : key);
    };

    const closePopover = () => {
        setOpenPopover(null);
    };

    const handleSelectOption = (option) => {
        setSelectToolType(option);
        setSelectedTool(option);
        closePopover();
    };

    const handlePenOption = (option) => {
        setPenToolType(option);
        setSelectedTool("pen");
        closePopover();
    };

    const handleEraserOption = (option) => {
        setEraserToolType(option);
        setSelectedTool("eraser");
        closePopover();
    };

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
            <div className="relative">
                <SidebarChevronButton
                    ref={selectButtonRef}
                    Icon={
                        selectToolType === "hand" ? (
                            <IoHandLeftOutline
                                className={isSelectedTool("select") || isSelectedTool("hand") ? selectedIconClass : iconClass}
                            />
                        ) : (
                            <LuMousePointer2
                                className={isSelectedTool("select") || isSelectedTool("hand") ? selectedIconClass : iconClass}
                            />
                        )
                    }
                    onHover={() => { }}
                    isSelected={isSelectedTool("select") || isSelectedTool("hand")}
                    chevronActive={openPopover === "selectOptions"}
                    onClick={() => {
                        setSelectedTool(selectToolType);
                    }}
                    onChevronClick={() => togglePopover("selectOptions")}
                />
                <Popover
                    isOpen={openPopover === "selectOptions"}
                    onClose={closePopover}
                    anchorRef={selectButtonRef}
                >
                    <PopoverGrid cols={2}>
                        <div className="flex flex-col items-center gap-1">
                            <button
                                onClick={() => handleSelectOption("select")}
                                className={`
                                    rounded-md border border-BrandGary
                                    flex items-center justify-center
                                    p-2 aspect-square w-full
                                    transition-all duration-100
                                    ${selectToolType === "select" ? "bg-BrandOrange" : "bg-BrandBlack2 hover:bg-BrandBlack2/80"}
                                `}
                            >
                                <LuMousePointer2
                                    className={selectToolType === "select" ? selectedIconClass : iconClass}
                                />
                            </button>
                            <span className="text-[10px] text-BrandGary">Select (S)</span>
                        </div>
                        <div className="flex flex-col items-center gap-1">
                            <button
                                onClick={() => handleSelectOption("hand")}
                                className={`
                                    rounded-md border border-BrandGary
                                    flex items-center justify-center
                                    p-2 aspect-square w-full
                                    transition-all duration-100
                                    ${selectToolType === "hand" ? "bg-BrandOrange" : "bg-BrandBlack2 hover:bg-BrandBlack2/80"}
                                `}
                            >
                                <IoHandLeftOutline
                                    className={selectToolType === "hand" ? selectedIconClass : iconClass}
                                />
                            </button>
                            <span className="text-[10px] text-BrandGary">Hand (H)</span>
                        </div>
                    </PopoverGrid>
                </Popover>
            </div>

            <hr className="w-4/5 self-center border-BrandGary" />

            {/* Pen Tool */}
            <div className="relative">
                <SidebarChevronButton
                    ref={penButtonRef}
                    Icon={
                        penToolType === "arrow" ? (
                            <FaArrowUpLong
                                className={isSelectedTool("pen") ? selectedIconClass : iconClass}
                                style={{ transform: "rotate(45deg)" }}
                            />
                        ) : (
                            <PiPenNib
                                className={isSelectedTool("pen") ? selectedIconClass : iconClass}
                                style={{ transform: "rotate(90deg)" }}
                            />
                        )
                    }
                    onHover={() => { }}
                    isSelected={isSelectedTool("pen")}
                    chevronActive={openPopover === "penOptions"}
                    onClick={() => {
                        setSelectedTool("pen");
                    }}
                    onChevronClick={() => togglePopover("penOptions")}
                />
                <Popover
                    isOpen={openPopover === "penOptions"}
                    onClose={closePopover}
                    anchorRef={penButtonRef}
                >
                    <PopoverGrid cols={2}>
                        <button
                            onClick={() => handlePenOption("pen")}
                            className={`
                                aspect-square rounded-md border border-BrandGary
                                flex items-center justify-center
                                transition-all duration-100
                                ${penToolType === "pen" ? "bg-BrandOrange" : "bg-BrandBlack2 hover:bg-BrandBlack2/80"}
                            `}
                        >
                            <PiPenNib
                                className={penToolType === "pen" ? selectedIconClass : iconClass}
                                style={{ transform: "rotate(90deg)" }}
                            />
                        </button>
                        <button
                            onClick={() => handlePenOption("arrow")}
                            className={`
                                aspect-square rounded-md border border-BrandGary
                                flex items-center justify-center
                                transition-all duration-100
                                ${penToolType === "arrow" ? "bg-BrandOrange" : "bg-BrandBlack2 hover:bg-BrandBlack2/80"}
                            `}
                        >
                            <FaArrowUpLong
                                className={penToolType === "arrow" ? selectedIconClass : iconClass}
                                style={{ transform: "rotate(45deg)" }}
                            />
                        </button>
                    </PopoverGrid>
                </Popover>
            </div>

            <hr className="w-4/5 self-center border-BrandGary" />

            {/* Eraser Tool */}
            <div className="relative">
                <SidebarChevronButton
                    ref={eraserButtonRef}
                    Icon={
                        <PiEraserFill className={isSelectedTool("eraser") ? selectedIconClass : iconClass} />
                    }
                    onHover={() => { }}
                    isSelected={isSelectedTool("eraser")}
                    chevronActive={openPopover === "eraserOptions"}
                    onClick={() => {
                        setSelectedTool("eraser");
                    }}
                    onChevronClick={() => togglePopover("eraserOptions")}
                />
                <Popover
                    isOpen={openPopover === "eraserOptions"}
                    onClose={closePopover}
                    anchorRef={eraserButtonRef}
                >
                    <PopoverGrid cols={2}>
                        <button
                            onClick={() => handleEraserOption("full")}
                            className={`
                                aspect-square rounded-md border border-BrandGary
                                flex items-center justify-center
                                transition-all duration-100
                                ${eraserToolType === "full" ? "bg-BrandOrange" : "bg-BrandBlack2 hover:bg-BrandBlack2/80"}
                            `}
                        >
                            <FaRegCircle
                                className={eraserToolType === "full" ? selectedIconClass : iconClass}
                            />
                        </button>
                        <button
                            onClick={() => handleEraserOption("partial")}
                            className={`
                                aspect-square rounded-md border border-BrandGary
                                flex items-center justify-center
                                transition-all duration-100
                                ${eraserToolType === "partial" ? "bg-BrandOrange" : "bg-BrandBlack2 hover:bg-BrandBlack2/80"}
                            `}
                        >
                            <TbCircleDotted
                                className={eraserToolType === "partial" ? selectedIconClass : iconClass}
                            />
                        </button>
                    </PopoverGrid>
                </Popover>
            </div>

            <hr className="w-4/5 self-center border-BrandGary" />

            {/* Add Player Tool */}
            <SidebarChevronButton
                Icon={<BsPersonAdd className={isSelectedTool("addPlayer") ? selectedIconClass : iconClass} />}
                label="Add Player"
                onHover={() => { }}
                isSelected={isSelectedTool("addPlayer")}
                onClick={() => {
                    setSelectedTool("addPlayer");
                }}
                onChevronClick={() => { }}
            />

            <hr className="w-4/5 self-center border-BrandGary" />

            {/* Player Tool */}
            <SidebarChevronButton
                Icon={
                    <img
                        src={playerIcon}
                        alt="playerIcon"
                        className={isSelectedTool("player") ? selectedIconClass : iconClass}
                    />
                }
                label="Last Player"
                onHover={() => { }}
                isSelected={isSelectedTool("player")}
                onClick={() => {
                    setSelectedTool("player");
                }}
                onChevronClick={() => { }}
            />

            <hr className="w-4/5 self-center border-BrandGary" />

            {/* Prefabs Tool */}
            <SidebarChevronButton
                Icon={<TbCopyPlusFilled className={iconClass} />}
                label="Prefabs"
                onHover={() => { }}
                isSelected={false}
                onClick={() => { }}
                onChevronClick={() => { }}
            />

            <hr className="w-4/5 self-center border-BrandGary" />

            {/* Undo, Redo, Reset Tool */}
            <div className="w-full flex flex-col items-center gap-1 sm:gap-2 md:gap-3 lg:gap-4 p-1 py-2 lg:py-4 lg:px-3">
                <Button Icon={<BiUndo className={iconClass} />} onHover={() => { }} onClick={() => { }} isSelected={false} />
                <Button Icon={<BiRedo className={iconClass} />} onHover={() => { }} onClick={() => { }} isSelected={false} />
                <Button Icon={<BiReset className={iconClass} />} onHover={() => { }} onClick={() => { }} isSelected={false} />
            </div>
        </aside>
    );
}
export default Sidebar;
