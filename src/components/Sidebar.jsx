import { LuMousePointer2 } from "react-icons/lu";
import { PiPenNib } from "react-icons/pi";
import { SidebarChevronButton, Button } from "./subcomponents/Buttons";
import { Popover, PopoverGrid, PopoverForm } from "./subcomponents/Popovers";
import { ColorPickerPopover } from "./subcomponents/ColorPickerPopover";
import { PrefabsPopover } from "./subcomponents/PrefabsPopover";
import { PiEraserFill } from "react-icons/pi";
import { BsPersonAdd } from "react-icons/bs";
import playerIcon from "../assets/players/Ellipse 8.png";
import { TbCopyPlusFilled } from "react-icons/tb";
import { BiUndo } from "react-icons/bi";
import { BiRedo } from "react-icons/bi";
import { BiReset } from "react-icons/bi";
import { IoHandLeftOutline, IoChevronDownOutline } from "react-icons/io5";
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
    const [playerSearch, setPlayerSearch] = useState("");
    const [showPlayerDropdown, setShowPlayerDropdown] = useState(false);
    const [playerColor, setPlayerColor] = useState("#561ecb");

    const selectButtonRef = useRef(null);
    const penButtonRef = useRef(null);
    const eraserButtonRef = useRef(null);
    const addPlayerButtonRef = useRef(null);
    const playerButtonRef = useRef(null);
    const prefabsButtonRef = useRef(null);
    const playerDropdownRef = useRef(null);

    // Fake player names
    const players = [
        "Tommy Kilbane", "Tristan Arndt", "Tommy Graham", "Trenton Bui", "Ty Johnson",
        "Trey Burkhart", "Trey Lundy", "Trevor Jackson", "Trevor Simms", "Tyler Banks",
        "Tyler Davis", "Tyler Gray", "Tyler Smith", "Tyler Wilson", "Zachary Breaux",
        "Zachary Brown", "Zachary Chavez", "Zachary Davis", "Zachary Green", "Zachary Johnson",
        "Zachary Lee", "Zachary Martin", "Zachary Martinez", "Zachary Miller", "Zachary Mitchell",
        "Zachary Moore", "Zachary Nelson", "Zachary Phillips", "Zachary Robinson", "Zachary Rodriguez",
        "Zachary Scott", "Zachary Smith", "Zachary Taylor", "Zachary Thompson", "Zachary Walker",
        "Zachary Wilson", "Zachary Young"
    ];

    // Example prefabs data structure
    const prefabs = [
        {
            id: "lineout",
            label: "Lineout",
            mode: "offense",
            icon: <TbCopyPlusFilled className={iconClass} />,
            dropdowns: [
                {
                    label: "Number of Players",
                    options: ["3", "4", "5", "6", "7"],
                    value: "5",
                    onChange: (value) => {
                        console.log("Lineout players:", value);
                    },
                },
            ],
        },
        {
            id: "scrum",
            label: "Scrum",
            mode: "offense",
            icon: <TbCopyPlusFilled className={iconClass} />,
            dropdowns: [
                {
                    label: "Number of Players",
                    options: ["3", "8"],
                    value: "3",
                    onChange: (value) => {
                        console.log("Scrum players:", value);
                    },
                },
            ],
        },
        {
            id: "kickoff1",
            label: "Kickoff",
            mode: "offense",
            icon: <TbCopyPlusFilled className={iconClass} />,
            dropdowns: [
                {
                    label: "Area",
                    options: ["Goal Line", "22", "50"],
                    value: "5",
                    onChange: (value) => {
                        console.log("Lineout players:", value);
                    },
                },
            ],
        },
        {
            id: "scrum1",
            label: "Scrum",
            mode: "defense",
            icon: <TbCopyPlusFilled className={iconClass} />,
            dropdowns: [
                {
                    label: "Formation",
                    options: ["3", "8"],
                    value: "3",
                    onChange: (value) => {
                        console.log("Scrum formation:", value);
                    },
                },
            ],
        },
        {
            id: "lineout2",
            label: "Lineout",
            mode: "defense",
            icon: <TbCopyPlusFilled className={iconClass} />,
            dropdowns: [
                {
                    label: "Players",
                    options: ["5", "6", "7", "8"],
                    value: "4",
                    onChange: (value) => {
                        console.log("Lineout players:", value);
                    },
                },
            ],
        },
        {
            id: "kickoff2",
            label: "Kickoff",
            mode: "defense",
            icon: <TbCopyPlusFilled className={iconClass} />,
            dropdowns: [
                {
                    label: "Area",
                    options: ["Goal Line", "22", "50"],
                    value: "Goal Line",
                    onChange: (value) => {
                        console.log("Kickoff area:", value);
                    },
                },
            ],
        },
    ];

    const filteredPlayers = players.filter(player =>
        player.toLowerCase().includes(playerSearch.toLowerCase())
    );

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

    useEffect(() => {
        console.log("Player color:", playerColor);
    }, [playerColor]);

    // Close player dropdown when clicking outside or when popover closes
    useEffect(() => {
        if (!showPlayerDropdown) return;

        const handleClickOutside = (e) => {
            const input = e.target.closest('input[placeholder="Search player"]');
            const button = e.target.closest('button');
            const dropdown = playerDropdownRef.current;

            if (
                dropdown &&
                !dropdown.contains(e.target) &&
                !input &&
                !button
            ) {
                setShowPlayerDropdown(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [showPlayerDropdown]);

    // Close dropdown when popover closes
    useEffect(() => {
        if (openPopover !== "addPlayer") {
            setShowPlayerDropdown(false);
        }
    }, [openPopover]);

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
                            <span className="text-[10px] text-BrandOrange">Select (S)</span>
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
                            <span className="text-[10px] text-BrandOrange">Hand (H)</span>
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
                        <div className="flex flex-col items-center gap-1">
                            <button
                                onClick={() => handlePenOption("pen")}
                                className={`
                                    rounded-md border border-BrandGary
                                    flex items-center justify-center
                                    p-2 aspect-square w-full
                                    transition-all duration-100
                                    ${penToolType === "pen" ? "bg-BrandOrange" : "bg-BrandBlack2 hover:bg-BrandBlack2/80"}
                                `}
                            >
                                <PiPenNib
                                    className={penToolType === "pen" ? selectedIconClass : iconClass}
                                    style={{ transform: "rotate(90deg)" }}
                                />
                            </button>
                            <span className="text-[10px] text-BrandOrange">Pen (P)</span>
                        </div>
                        <div className="flex flex-col items-center gap-1">
                            <button
                                onClick={() => handlePenOption("arrow")}
                                className={`
                                    rounded-md border border-BrandGary
                                    flex items-center justify-center
                                    p-2 aspect-square w-full
                                    transition-all duration-100
                                    ${penToolType === "arrow" ? "bg-BrandOrange" : "bg-BrandBlack2 hover:bg-BrandBlack2/80"}
                                `}
                            >
                                <FaArrowUpLong
                                    className={penToolType === "arrow" ? selectedIconClass : iconClass}
                                    style={{ transform: "rotate(45deg)" }}
                                />
                            </button>
                            <span className="text-[10px] text-BrandOrange">Arrow (A)</span>
                        </div>
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
                        <div className="flex flex-col items-center gap-1">
                            <button
                                onClick={() => handleEraserOption("full")}
                                className={`
                                    rounded-md border border-BrandGary
                                    flex items-center justify-center
                                    p-2 aspect-square w-full
                                    transition-all duration-100
                                    ${eraserToolType === "full" ? "bg-BrandOrange" : "bg-BrandBlack2 hover:bg-BrandBlack2/80"}
                                `}
                            >
                                <FaRegCircle
                                    className={eraserToolType === "full" ? selectedIconClass : iconClass}
                                />
                            </button>
                            <span className="text-[10px] text-BrandOrange">Full (F)</span>
                        </div>
                        <div className="flex flex-col items-center gap-1">
                            <button
                                onClick={() => handleEraserOption("partial")}
                                className={`
                                    rounded-md border border-BrandGary
                                    flex items-center justify-center
                                    p-2 aspect-square w-full
                                    transition-all duration-100
                                    ${eraserToolType === "partial" ? "bg-BrandOrange" : "bg-BrandBlack2 hover:bg-BrandBlack2/80"}
                                `}
                            >
                                <TbCircleDotted
                                    className={eraserToolType === "partial" ? selectedIconClass : iconClass}
                                />
                            </button>
                            <span className="text-[10px] text-BrandOrange">Partial (O)</span>
                        </div>
                    </PopoverGrid>
                </Popover>
            </div>

            <hr className="w-4/5 self-center border-BrandGary" />

            {/* Add Player Tool */}
            <div className="relative">
                <SidebarChevronButton
                    ref={addPlayerButtonRef}
                    Icon={<BsPersonAdd className={isSelectedTool("addPlayer") ? selectedIconClass : iconClass} />}
                    label="Add Player"
                    onHover={() => { }}
                    isSelected={isSelectedTool("addPlayer")}
                    chevronActive={openPopover === "addPlayer"}
                    onClick={() => {
                        setSelectedTool("addPlayer");
                    }}
                    onChevronClick={() => togglePopover("addPlayer")}
                />
                <Popover
                    isOpen={openPopover === "addPlayer"}
                    onClose={closePopover}
                    anchorRef={addPlayerButtonRef}
                >
                    <PopoverForm>
                        <div className="flex flex-col gap-1.5 sm:gap-2">
                            <div className="flex flex-col gap-0.5 sm:gap-1">
                                <p className="text-BrandOrange text-xs sm:text-sm">Number:</p>
                                <input
                                    type="text"
                                    className="w-full h-8 sm:h-9 bg-BrandBlack border-[0.5px] border-BrandGary text-BrandWhite rounded-md px-2 text-xs sm:text-sm focus:outline-none focus:border-BrandOrange transition-colors"
                                />
                            </div>
                            <div className="flex flex-col gap-0.5 sm:gap-1">
                                <p className="text-BrandOrange text-xs sm:text-sm">Name:</p>
                                <input
                                    type="text"
                                    className="w-full h-8 sm:h-9 bg-BrandBlack border-[0.5px] border-BrandGary text-BrandWhite rounded-md px-2 text-xs sm:text-sm focus:outline-none focus:border-BrandOrange transition-colors"
                                />
                            </div>
                            <div className="flex flex-col gap-0.5 sm:gap-1 relative">
                                <p className="text-BrandOrange text-xs sm:text-sm">Assign To:</p>
                                <div className="relative">
                                    <div className="w-full h-8 sm:h-9 bg-BrandBlack border-[0.5px] border-BrandGary rounded-md flex items-center overflow-hidden">
                                        <input
                                            type="text"
                                            className="flex-1 min-w-0 h-8 sm:h-9 bg-transparent border-r-[0.5px] border-BrandGary text-BrandWhite px-2 text-xs sm:text-sm focus:outline-none focus:border-BrandOrange transition-colors rounded-l-md"
                                            placeholder="Search player"
                                            value={playerSearch}
                                            onChange={(e) => setPlayerSearch(e.target.value)}
                                            onFocus={() => setShowPlayerDropdown(true)}
                                        />
                                        <button
                                            onClick={() => setShowPlayerDropdown(!showPlayerDropdown)}
                                            className="h-8 sm:h-9 w-8 sm:w-9 flex items-center justify-center transition-colors rounded-r-md shrink-0"
                                        >
                                            <IoChevronDownOutline
                                                className={`text-BrandOrange text-base sm:text-lg transition-transform ${showPlayerDropdown ? "rotate-180" : ""}`}
                                            />
                                        </button>
                                    </div>
                                    {showPlayerDropdown && (
                                        <div
                                            ref={playerDropdownRef}
                                            className="absolute left-0 top-full w-full bg-BrandBlack border border-BrandGary rounded-md mt-1 max-h-40 overflow-y-auto z-10 shadow-lg"
                                        >
                                            {filteredPlayers.length > 0 ? (
                                                filteredPlayers.map((player, idx) => (
                                                    <div
                                                        key={idx}
                                                        onClick={() => {
                                                            setPlayerSearch(player);
                                                            setShowPlayerDropdown(false);
                                                        }}
                                                        className="px-2 py-1 text-BrandWhite hover:bg-BrandOrange hover:text-BrandBlack cursor-pointer transition-colors text-xs sm:text-sm truncate"
                                                    >
                                                        {player}
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="px-2 py-1 text-BrandGary text-xs">
                                                    No players found
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </PopoverForm>
                </Popover>
            </div>

            <hr className="w-4/5 self-center border-BrandGary" />

            {/* Player Tool */}
            <div className="relative">
                <SidebarChevronButton
                    ref={playerButtonRef}
                    Icon={
                        <div
                            className="h-6 w-6 rounded-full border border-BrandBlack"
                            style={{ backgroundColor: playerColor }}
                        />
                    }
                    label="Last Player"
                    onHover={() => { }}
                    isSelected={isSelectedTool("player")}
                    chevronActive={openPopover === "playerColor"}
                    onClick={() => {
                        setSelectedTool("player");
                    }}
                    onChevronClick={() => togglePopover("playerColor")}
                />
                <Popover
                    isOpen={openPopover === "playerColor"}
                    onClose={closePopover}
                    anchorRef={playerButtonRef}
                >
                    <ColorPickerPopover
                        color={playerColor}
                        onChange={(color) => {
                            setPlayerColor(color.hex);
                        }}
                    />
                </Popover>
            </div>

            <hr className="w-4/5 self-center border-BrandGary" />

            {/* Prefabs Tool */}
            <div className="relative">
                <SidebarChevronButton
                    ref={prefabsButtonRef}
                    Icon={<TbCopyPlusFilled className={iconClass} />}
                    label="Prefabs"
                    onHover={() => { }}
                    isSelected={false}
                    chevronActive={openPopover === "prefabs"}
                    onClick={() => { }}
                    onChevronClick={() => togglePopover("prefabs")}
                />
                <Popover
                    isOpen={openPopover === "prefabs"}
                    onClose={closePopover}
                    anchorRef={prefabsButtonRef}
                >
                    <PrefabsPopover
                        prefabs={prefabs}
                        onPrefabSelect={(prefab) => {
                            console.log("Selected prefab:", prefab);
                            setSelectedTool("prefab");
                        }}
                    />
                </Popover>
            </div>

            <hr className="w-4/5 self-center border-BrandGary" />

            {/* Undo, Redo, Reset Tool */}
            <div className="w-full flex flex-col items-center gap-1 sm:gap-2 md:gap-3 lg:gap-4 p-1 py-2  lg:px-3">
                <Button Icon={<BiUndo className={iconClass} />} onHover={() => { }} onClick={() => { }} isSelected={false} />
                <Button Icon={<BiRedo className={iconClass} />} onHover={() => { }} onClick={() => { }} isSelected={false} />
                <Button Icon={<BiReset className={iconClass} />} onHover={() => { }} onClick={() => { }} isSelected={false} />
            </div>
        </aside>
    );
}
export default Sidebar;
