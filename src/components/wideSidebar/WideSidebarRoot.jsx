
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { IoFootball } from "react-icons/io5";
import { TbLayoutSidebarLeftCollapse } from "react-icons/tb";
import coachableLogo from "../../assets/logos/White_Coachable_Logo.png";
import coneIcon from "../../assets/objects/cone.png";
import SelectToolSection from "../sidebar/SelectToolSection";
import PenToolSection from "../sidebar/PenToolSection";
import AddPlayerSection from "../sidebar/AddPlayerSection";
import PlayerColorSection, { PLAYER_COLORS } from "../sidebar/PlayerColorSection";
import PrefabsSection from "../sidebar/PrefabsSection";
import HistoryActionsSection from "../sidebar/HistoryActionsSection";
import { WideSidebarRowButton } from "../subcomponents/Buttons";
import { Popover } from "../subcomponents/Popovers";

const iconClass = "text-BrandOrange text-xl sm:text-2xl md:text-3xl";
const selectedIconClass = "text-BrandBlack text-xl sm:text-2xl md:text-3xl";


// Same width as RightPanel: w-32 sm:w-36 md:w-40 lg:w-44 xl:w-48
const WIDE_SIDEBAR_WIDTH_CLASS = "w-32 sm:w-36 md:w-40 lg:w-44 xl:w-48";

export default function WideSidebarRoot({
    activeTool,
    onToolChange,
    onSelectSubTool,
    onPlayerColorChange,
    onUndo,
    onRedo,
    onReset,
    onDeleteSelected,
    onPrefabSelect,
    onDeleteCustomPrefab,
    onAddPlayer,
    customPrefabs,
    playName,
    onCollapse,
    onNavigateHome,
}) {
    const [selectedTool, setSelectedTool] = useState("select");
    const [selectToolType, setSelectToolType] = useState("select");
    const [openPopover, setOpenPopover] = useState(null);
    const [playerNumber, setPlayerNumber] = useState("");
    const [playerName, setPlayerName] = useState("");
    const [playerColor, setPlayerColor] = useState(PLAYER_COLORS.red);
    const [hoveredTooltip, setHoveredTooltip] = useState(null);
    const selectedToolForUi = activeTool ?? selectedTool;
    const selectToolTypeForUi =
        activeTool === "select" || activeTool === "hand" ? activeTool : selectToolType;

    const selectButtonRef = useRef(null);
    const penButtonRef = useRef(null);
    const addPlayerButtonRef = useRef(null);
    const objectsButtonRef = useRef(null);
    const playerButtonRef = useRef(null);
    const prefabsButtonRef = useRef(null);
    const prefabs = useMemo(() => {
        return (customPrefabs || []).map((cp) => ({
            ...cp,
            isCustom: true,
        }));
    }, [customPrefabs]);

    const togglePopover = (key) => {
        setOpenPopover((prev) => (prev === key ? null : key));
    };
    const closePopover = () => setOpenPopover(null);
    const setTool = useCallback((tool) => {
        setSelectedTool(tool);
        onToolChange?.(tool);
    }, [onToolChange]);

    const handleSelectSubTool = (option) => {
        setSelectToolType(option);
        setTool(option);
        closePopover();
        onSelectSubTool?.(option);
    };
    const handlePlayerColorChange = (hex) => {
        setPlayerColor(hex);
        closePopover();
        onPlayerColorChange?.(hex);
    };
    const handlePrefabSelect = (prefab) => {
        setTool("prefab");
        onPrefabSelect?.(prefab);
    };
    const handleAddPlayer = (data) => {
        const next = {
            number: data?.number ?? playerNumber,
            name: data?.name ?? playerName,
            color: playerColor,
        };
        const hasValue =
            String(next.number ?? "").trim() !== "" ||
            String(next.name ?? "").trim() !== "";
        if (!hasValue) return;
        onAddPlayer?.(next);
        setPlayerNumber("");
        setPlayerName("");
    };
    const handleQuickAddPlayer = () => {
        onAddPlayer?.({ color: playerColor });
    };
    const handleObjectToolSelect = (tool) => {
        setTool(tool);
        closePopover();
    };

    useEffect(() => {
        const handleKeyDown = (e) => {
            const tag = e.target.tagName;
            if (tag === "INPUT" || tag === "TEXTAREA" || e.target.isContentEditable) return;
            if (e.ctrlKey || e.metaKey) {
                const key = e.key.toLowerCase();
                if (key === "z") {
                    e.preventDefault();
                    onUndo?.();
                    return;
                }
                if (key === "y") {
                    e.preventDefault();
                    onRedo?.();
                    return;
                }
                if (key === "d") {
                    e.preventDefault();
                    onDeleteSelected?.();
                    return;
                }
            }
            const key = e.key.toLowerCase();
            if (key === "s") {
                setSelectToolType("select");
                setTool("select");
                closePopover();
            } else if (key === "h") {
                setSelectToolType("hand");
                setTool("hand");
                closePopover();
            } else if (key === "p") {
                setTool("pen");
                closePopover();
            } else if (key === "a") {
                setTool("addPlayer");
                closePopover();
            } else if (key === "c") {
                const nextColor = playerColor === PLAYER_COLORS.red ? PLAYER_COLORS.blue : PLAYER_COLORS.red;
                handlePlayerColorChange(nextColor);
                setTool("color");
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [closePopover, handlePlayerColorChange, onDeleteSelected, onRedo, onUndo, playerColor, setTool]);

    const isObjectToolSelected = selectedToolForUi === "addBall" || selectedToolForUi === "addCone";

    const objectsRowIcon = selectedToolForUi === "addCone"
        ? <img src={coneIcon} alt="Cone" className="h-5 w-5 object-contain" />
        : <IoFootball className={isObjectToolSelected ? selectedIconClass : iconClass} />;

    const hr = <hr className="w-full border-0 border-t border-BrandGray2/60" />;

    return (
        <aside
            className={`
                h-full shrink-0 bg-BrandBlack ${WIDE_SIDEBAR_WIDTH_CLASS}
                border-l border-BrandGray2/50
                px-2 sm:px-2.5 md:px-3 py-2 sm:py-2.5
                flex flex-col
                select-none z-50 overflow-hidden
            `}
        >
            {/* Logo + collapse button */}
            <div className="flex items-center justify-between px-1 mb-1">
                {onNavigateHome ? (
                    <button type="button" onClick={onNavigateHome} className="inline-flex">
                        <img src={coachableLogo} alt="Coachable" className="h-5 sm:h-6 w-auto" />
                    </button>
                ) : (
                    <Link to="/app" className="inline-flex">
                        <img src={coachableLogo} alt="Coachable" className="h-5 sm:h-6 w-auto" />
                    </Link>
                )}
                <button
                    type="button"
                    onClick={onCollapse}
                    className="text-BrandGray2 hover:text-BrandWhite transition-colors p-0.5"
                    title="Collapse sidebar"
                >
                    <TbLayoutSidebarLeftCollapse className="text-lg" />
                </button>
            </div>
            {/* Play name */}
            {playName && (
                <p className="text-BrandGray2 text-[10px] sm:text-xs font-DmSans px-1 mb-1.5 truncate">
                    {playName}
                </p>
            )}
            {hr}

            {/* Scrollable tools area */}
            <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden pr-0.5 hide-scroll flex flex-col gap-0.5 sm:gap-1 md:gap-1.5 py-1">
            <p className="text-BrandGray2 text-[10px] sm:text-xs font-DmSans uppercase tracking-wider px-2 mb-0.5">
                Tools
            </p>
            <SelectToolSection
                wide
                selectToolType={selectToolTypeForUi}
                isSelected={selectedToolForUi === "select" || selectedToolForUi === "hand"}
                openPopover={openPopover}
                hoveredTooltip={hoveredTooltip}
                anchorRef={selectButtonRef}
                onToolSelect={(t) => setTool(t)}
                onSelectSubTool={handleSelectSubTool}
                onPopoverToggle={togglePopover}
                onPopoverClose={closePopover}
                onHoverTooltip={setHoveredTooltip}
            />
            {hr}

            <PenToolSection
                wide
                isSelected={selectedToolForUi === "pen"}
                hoveredTooltip={hoveredTooltip}
                anchorRef={penButtonRef}
                onToolSelect={() => setTool("pen")}
                onHoverTooltip={setHoveredTooltip}
            />
            {hr}

            <AddPlayerSection
                wide
                isSelected={selectedToolForUi === "addPlayer"}
                openPopover={openPopover}
                hoveredTooltip={hoveredTooltip}
                numberValue={playerNumber}
                nameValue={playerName}
                anchorRef={addPlayerButtonRef}
                onToolSelect={() => setTool("addPlayer")}
                onPopoverToggle={togglePopover}
                onPopoverClose={closePopover}
                onNumberChange={setPlayerNumber}
                onNameChange={setPlayerName}
                onHoverTooltip={setHoveredTooltip}
                onAddPlayer={handleAddPlayer}
                onQuickAdd={handleQuickAddPlayer}
            />
            {hr}

            <WideSidebarRowButton
                ref={objectsButtonRef}
                Icon={objectsRowIcon}
                label="Add Objects"
                onHover={() => {}}
                isSelected={isObjectToolSelected}
                onRowClick={() => handleObjectToolSelect("addBall")}
                onChevronClick={() => togglePopover("addObjects")}
                chevronActive={openPopover === "addObjects"}
            />
            <Popover
                isOpen={openPopover === "addObjects"}
                onClose={closePopover}
                anchorRef={objectsButtonRef}
                topOffset={0}
            >
                <div className="ml-2 w-[160px] rounded-lg bg-BrandBlack p-1.5 shadow-[0_16px_30px_-20px_rgba(0,0,0,0.95)]">
                    <button
                        type="button"
                        onClick={() => handleObjectToolSelect("addBall")}
                        className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs font-DmSans transition-colors ${selectedToolForUi === "addBall" ? "bg-BrandOrange text-BrandBlack" : "text-BrandWhite hover:bg-BrandBlack2"}`}
                    >
                        <IoFootball className="text-sm" />
                        <span>Ball</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => handleObjectToolSelect("addCone")}
                        className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs font-DmSans transition-colors ${selectedToolForUi === "addCone" ? "bg-BrandOrange text-BrandBlack" : "text-BrandWhite hover:bg-BrandBlack2"}`}
                    >
                        <img src={coneIcon} alt="Cone" className="h-3.5 w-3.5 object-contain" />
                        <span>Cone</span>
                    </button>
                </div>
            </Popover>
            {hr}

            <PlayerColorSection
                wide
                playerColor={playerColor}
                isSelected={selectedToolForUi === "color"}
                openPopover={openPopover}
                hoveredTooltip={hoveredTooltip}
                anchorRef={playerButtonRef}
                onToolSelect={() => setTool("color")}
                onPlayerColorChange={handlePlayerColorChange}
                onPopoverToggle={togglePopover}
                onPopoverClose={closePopover}
                onHoverTooltip={setHoveredTooltip}
                onQuickAdd={handleQuickAddPlayer}
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
                onDeleteCustomPrefab={onDeleteCustomPrefab}
                onHoverTooltip={setHoveredTooltip}
            />
            </div>

            {/* Fixed bottom area */}
            <div className="shrink-0 pt-1.5 sm:pt-2 border-t border-BrandGray2/60">
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
            </div>
        </aside>
    );
}
