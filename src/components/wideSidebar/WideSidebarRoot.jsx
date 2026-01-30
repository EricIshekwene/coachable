
import { useState, useEffect, useRef } from "react";
import rugbyScrum from "../../assets/prefabIcons/Rugby Scrum.png";
import rugbyLineout from "../../assets/prefabIcons/Rugby Lineout.png";
import rugbyKickoff from "../../assets/prefabIcons/Rugby KickOff.png";

import SelectToolSection from "../sidebar/SelectToolSection";
import PenToolSection from "../sidebar/PenToolSection";
import EraserToolSection from "../sidebar/EraserToolSection";
import AddPlayerSection from "../sidebar/AddPlayerSection";
import PlayerColorSection, { PLAYER_COLORS } from "../sidebar/PlayerColorSection";
import PrefabsSection from "../sidebar/PrefabsSection";
import HistoryActionsSection from "../sidebar/HistoryActionsSection";

const iconClass = "text-BrandOrange text-xl sm:text-2xl md:text-3xl";

const DEFAULT_PLAYERS = [
    "Tommy Kilbane", "Tristan Arndt", "Tommy Graham", "Trenton Bui", "Ty Johnson",
    "Trey Burkhart", "Trey Lundy", "Trevor Jackson", "Trevor Simms", "Tyler Banks",
    "Tyler Davis", "Tyler Gray", "Tyler Smith", "Tyler Wilson", "Zachary Breaux",
    "Zachary Brown", "Zachary Chavez", "Zachary Davis", "Zachary Green", "Zachary Johnson",
    "Zachary Lee", "Zachary Martin", "Zachary Martinez", "Zachary Miller", "Zachary Mitchell",
    "Zachary Moore", "Zachary Nelson", "Zachary Phillips", "Zachary Robinson", "Zachary Rodriguez",
    "Zachary Scott", "Zachary Smith", "Zachary Taylor", "Zachary Thompson", "Zachary Walker",
    "Zachary Wilson", "Zachary Young",
];

function buildDefaultPrefabs() {
    return [
        {
            id: "lineout",
            label: "Lineout",
            mode: "offense",
            icon: <img src={rugbyLineout} alt="Lineout" className={iconClass} />,
            dropdowns: [{ label: "Number of Players", options: ["3", "4", "5", "6", "7"], value: "5", onChange: (v) => console.log("Lineout players:", v) }],
        },
        {
            id: "scrum",
            label: "Scrum",
            mode: "offense",
            icon: <img src={rugbyScrum} alt="Scrum" className={iconClass} />,
            dropdowns: [{ label: "Number of Players", options: ["3", "8"], value: "3", onChange: (v) => console.log("Scrum players:", v) }],
        },
        {
            id: "kickoff1",
            label: "Kickoff",
            mode: "offense",
            icon: <img src={rugbyKickoff} alt="Kickoff" className={iconClass} />,
            dropdowns: [{ label: "Area", options: ["Goal Line", "22", "50"], value: "5", onChange: (v) => console.log("Kickoff area:", v) }],
        },
        {
            id: "scrum1",
            label: "Scrum",
            mode: "defense",
            icon: <img src={rugbyLineout} alt="Lineout" className={iconClass} />,
            dropdowns: [{ label: "Formation", options: ["3", "8"], value: "3", onChange: (v) => console.log("Scrum formation:", v) }],
        },
        {
            id: "lineout2",
            label: "Lineout",
            mode: "defense",
            icon: <img src={rugbyLineout} alt="Lineout" className={iconClass} />,
            dropdowns: [{ label: "Players", options: ["5", "6", "7", "8"], value: "4", onChange: (v) => console.log("Lineout players:", v) }],
        },
        {
            id: "kickoff2",
            label: "Kickoff",
            mode: "defense",
            icon: <img src={rugbyKickoff} alt="Kickoff" className={iconClass} />,
            dropdowns: [{ label: "Area", options: ["Goal Line", "22", "50"], value: "Goal Line", onChange: (v) => console.log("Kickoff area:", v) }],
        },
    ];
}

// Same width as RightPanel: w-32 sm:w-36 md:w-40 lg:w-44 xl:w-48
const WIDE_SIDEBAR_WIDTH_CLASS = "w-32 sm:w-36 md:w-40 lg:w-44 xl:w-48";

export default function WideSidebarRoot({
    onToolChange,
    onSelectSubTool,
    onPenSubTool,
    onEraserSubTool,
    onPlayerColorChange,
    onUndo,
    onRedo,
    onReset,
    onPrefabSelect,
    onAddPlayer,
    players: playersProp,
    prefabs: prefabsProp,
}) {
    const [selectedTool, setSelectedTool] = useState("select");
    const [selectToolType, setSelectToolType] = useState("select");
    const [penToolType, setPenToolType] = useState("pen");
    const [eraserToolType, setEraserToolType] = useState("eraser");
    const [openPopover, setOpenPopover] = useState(null);
    const [playerSearch, setPlayerSearch] = useState("");
    const [showPlayerDropdown, setShowPlayerDropdown] = useState(false);
    const [playerColor, setPlayerColor] = useState(PLAYER_COLORS.red);
    const [hoveredTooltip, setHoveredTooltip] = useState(null);

    const selectButtonRef = useRef(null);
    const penButtonRef = useRef(null);
    const eraserButtonRef = useRef(null);
    const addPlayerButtonRef = useRef(null);
    const playerButtonRef = useRef(null);
    const prefabsButtonRef = useRef(null);
    const playerDropdownRef = useRef(null);

    const players = playersProp ?? DEFAULT_PLAYERS;
    const prefabs = prefabsProp ?? buildDefaultPrefabs();
    const filteredPlayers = players.filter((p) =>
        String(p).toLowerCase().includes(playerSearch.toLowerCase())
    );

    const togglePopover = (key) => {
        setOpenPopover((prev) => (prev === key ? null : key));
    };
    const closePopover = () => setOpenPopover(null);

    const handleSelectSubTool = (option) => {
        setSelectToolType(option);
        setSelectedTool(option);
        closePopover();
        onSelectSubTool?.(option);
    };
    const handlePenSubTool = (option) => {
        setPenToolType(option);
        setSelectedTool("pen");
        closePopover();
        onPenSubTool?.(option);
    };
    const handleEraserSubTool = (option) => {
        setEraserToolType(option);
        setSelectedTool("eraser");
        closePopover();
        onEraserSubTool?.(option);
    };
    const handlePlayerColorChange = (hex) => {
        setPlayerColor(hex);
        closePopover();
        onPlayerColorChange?.(hex);
    };
    const handlePrefabSelect = (prefab) => {
        setSelectedTool("prefab");
        onPrefabSelect?.(prefab);
    };
    const handlePlayerAssign = (name) => {
        setPlayerSearch(name);
        setShowPlayerDropdown(false);
    };

    useEffect(() => {
        if (onToolChange && (selectedTool === "hand" || selectedTool === "select")) {
            onToolChange(selectedTool);
        }
    }, [selectedTool, onToolChange]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            const tag = e.target.tagName;
            if (tag === "INPUT" || tag === "TEXTAREA" || e.target.isContentEditable) return;
            if (e.key === "s" || e.key === "S") {
                setSelectToolType("select");
                setSelectedTool("select");
            } else if (e.key === "h" || e.key === "H") {
                setSelectToolType("hand");
                setSelectedTool("hand");
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, []);

    useEffect(() => {
        if (!showPlayerDropdown) return;
        const handleClickOutside = (e) => {
            const input = e.target.closest('input[placeholder="Search player"]');
            const button = e.target.closest("button");
            const dropdown = playerDropdownRef.current;
            if (dropdown && !dropdown.contains(e.target) && !input && !button) {
                setShowPlayerDropdown(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [showPlayerDropdown]);

    useEffect(() => {
        if (openPopover !== "addPlayer") setShowPlayerDropdown(false);
    }, [openPopover]);

    const hr = <hr className="w-full border-0 border-t border-BrandGray2/60" />;

    return (
        <aside
            className={`
                h-screen shrink-0 bg-BrandBlack ${WIDE_SIDEBAR_WIDTH_CLASS}
                border-l border-BrandGray2/50
                px-2 sm:px-2.5 md:px-3 py-4 sm:py-5
                flex flex-col justify-center
                gap-0.5 sm:gap-1 md:gap-1.5
                select-none z-50 overflow-visible
            `}
        >
            <p className="text-BrandGray2 text-[10px] sm:text-xs font-DmSans uppercase tracking-wider px-2 mb-0.5">
                Tools
            </p>
            <SelectToolSection
                wide
                selectToolType={selectToolType}
                isSelected={selectedTool === "select" || selectedTool === "hand"}
                openPopover={openPopover}
                hoveredTooltip={hoveredTooltip}
                anchorRef={selectButtonRef}
                onToolSelect={(t) => setSelectedTool(t)}
                onSelectSubTool={handleSelectSubTool}
                onPopoverToggle={togglePopover}
                onPopoverClose={closePopover}
                onHoverTooltip={setHoveredTooltip}
            />
            {hr}

            <PenToolSection
                wide
                penToolType={penToolType}
                isSelected={selectedTool === "pen"}
                openPopover={openPopover}
                hoveredTooltip={hoveredTooltip}
                anchorRef={penButtonRef}
                onToolSelect={() => setSelectedTool("pen")}
                onPenSubTool={handlePenSubTool}
                onPopoverToggle={togglePopover}
                onPopoverClose={closePopover}
                onHoverTooltip={setHoveredTooltip}
            />
            {hr}

            <EraserToolSection
                wide
                eraserToolType={eraserToolType}
                isSelected={selectedTool === "eraser"}
                openPopover={openPopover}
                hoveredTooltip={hoveredTooltip}
                anchorRef={eraserButtonRef}
                onToolSelect={() => setSelectedTool("eraser")}
                onEraserSubTool={handleEraserSubTool}
                onPopoverToggle={togglePopover}
                onPopoverClose={closePopover}
                onHoverTooltip={setHoveredTooltip}
            />
            {hr}

            <AddPlayerSection
                wide
                isSelected={selectedTool === "addPlayer"}
                openPopover={openPopover}
                hoveredTooltip={hoveredTooltip}
                playerSearch={playerSearch}
                showPlayerDropdown={showPlayerDropdown}
                filteredPlayers={filteredPlayers}
                anchorRef={addPlayerButtonRef}
                dropdownRef={playerDropdownRef}
                onToolSelect={() => setSelectedTool("addPlayer")}
                onPopoverToggle={togglePopover}
                onPopoverClose={closePopover}
                onPlayerSearchChange={setPlayerSearch}
                onPlayerAssign={handlePlayerAssign}
                onShowPlayerDropdownChange={setShowPlayerDropdown}
                onHoverTooltip={setHoveredTooltip}
            />
            {hr}

            <PlayerColorSection
                wide
                playerColor={playerColor}
                isSelected={selectedTool === "player"}
                openPopover={openPopover}
                hoveredTooltip={hoveredTooltip}
                anchorRef={playerButtonRef}
                onToolSelect={() => setSelectedTool("player")}
                onPlayerColorChange={handlePlayerColorChange}
                onPopoverToggle={togglePopover}
                onPopoverClose={closePopover}
                onHoverTooltip={setHoveredTooltip}
            />
            {hr}

            <PrefabsSection
                wide
                prefabs={prefabs}
                openPopover={openPopover}
                hoveredTooltip={hoveredTooltip}
                anchorRef={prefabsButtonRef}
                onPopoverToggle={togglePopover}
                onPopoverClose={closePopover}
                onPrefabSelect={handlePrefabSelect}
                onHoverTooltip={setHoveredTooltip}
            />
            {hr}

            <p className="text-BrandGray2 text-[10px] sm:text-xs font-DmSans uppercase tracking-wider px-2 mt-1 mb-0.5">
                History
            </p>
            <HistoryActionsSection
                wide
                onUndo={onUndo}
                onRedo={onRedo}
                onReset={onReset}
                hoveredTooltip={hoveredTooltip}
                onHoverTooltip={setHoveredTooltip}
            />
        </aside>
    );
}
