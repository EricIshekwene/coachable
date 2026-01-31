import { BsPersonAdd } from "react-icons/bs";
import { IoChevronDownOutline } from "react-icons/io5";
import { SidebarChevronButton, WideSidebarRowButton } from "../subcomponents/Buttons";
import { Popover, PopoverForm, Tooltip } from "../subcomponents/Popovers";

const iconClass = "text-BrandOrange text-xl sm:text-2xl md:text-3xl";
const selectedIconClass = "text-BrandBlack text-xl sm:text-2xl md:text-3xl";

export default function AddPlayerSection({
    isSelected,
    openPopover,
    hoveredTooltip,
    numberValue,
    nameValue,
    playerSearch,
    showPlayerDropdown,
    filteredPlayers,
    anchorRef,
    dropdownRef,
    onToolSelect,
    onPopoverToggle,
    onPopoverClose,
    onNumberChange,
    onNameChange,
    onPlayerSearchChange,
    onPlayerAssign,
    onShowPlayerDropdownChange,
    onHoverTooltip,
    onAddPlayer,
    onQuickAdd,
    wide = false,
}) {
    const popoverKey = "addPlayer";
    const isOpen = openPopover === popoverKey;
    const ButtonComponent = wide ? WideSidebarRowButton : SidebarChevronButton;
    const handleSubmit = () => {
        onAddPlayer?.({
            number: numberValue,
            name: nameValue,
            assignment: playerSearch,
        });
    };
    const handleKeyDown = (e) => {
        if (e.key !== "Enter") return;
        e.preventDefault();
        handleSubmit();
    };

    return (
        <div
            className="relative"
            onMouseEnter={() => onHoverTooltip?.("addPlayer")}
            onMouseLeave={() => onHoverTooltip?.(null)}
        >
            <ButtonComponent
                ref={anchorRef}
                Icon={<BsPersonAdd className={isSelected ? selectedIconClass : iconClass} />}
                label="Add Player"
                onHover={() => {}}
                isSelected={isSelected}
                chevronActive={isOpen}
                onClick={() => onQuickAdd?.()}
                onRowClick={() => onToolSelect?.("addPlayer")}
                onChevronClick={() => onPopoverToggle?.(popoverKey)}
            />
            <Tooltip isOpen={hoveredTooltip === "addPlayer" && !isOpen} text="Add Player (A)" />
            <Popover isOpen={isOpen} onClose={onPopoverClose} anchorRef={anchorRef}>
                <PopoverForm>
                    <div className="flex flex-col gap-1.5 sm:gap-2">
                        <div className="flex flex-col gap-0.5 sm:gap-1">
                            <p className="text-BrandOrange text-xs sm:text-sm">Number:</p>
                            <input
                                type="text"
                                className="w-full h-8 sm:h-9 bg-BrandBlack border-[0.5px] border-BrandGray text-BrandWhite rounded-md px-2 text-xs sm:text-sm focus:outline-none focus:border-BrandOrange transition-colors"
                                value={numberValue ?? ""}
                                onChange={(e) => onNumberChange?.(e.target.value)}
                                onKeyDown={handleKeyDown}
                            />
                        </div>
                        <div className="flex flex-col gap-0.5 sm:gap-1">
                            <p className="text-BrandOrange text-xs sm:text-sm">Name:</p>
                            <input
                                type="text"
                                className="w-full h-8 sm:h-9 bg-BrandBlack border-[0.5px] border-BrandGray text-BrandWhite rounded-md px-2 text-xs sm:text-sm focus:outline-none focus:border-BrandOrange transition-colors"
                                value={nameValue ?? ""}
                                onChange={(e) => onNameChange?.(e.target.value)}
                                onKeyDown={handleKeyDown}
                            />
                        </div>
                        <div className="flex flex-col gap-0.5 sm:gap-1 relative">
                            <p className="text-BrandOrange text-xs sm:text-sm">Assign To:</p>
                            <div className="relative">
                                <div className="w-full h-8 sm:h-9 bg-BrandBlack border-[0.5px] border-BrandGray rounded-md flex items-center overflow-hidden">
                                    <input
                                        type="text"
                                        className="flex-1 min-w-0 h-8 sm:h-9 bg-transparent border-r-[0.5px] border-BrandGray text-BrandWhite px-2 text-xs sm:text-sm focus:outline-none focus:border-BrandOrange transition-colors rounded-l-md"
                                        placeholder="Search player"
                                        value={playerSearch}
                                        onChange={(e) => onPlayerSearchChange?.(e.target.value)}
                                        onFocus={() => onShowPlayerDropdownChange?.(true)}
                                        onKeyDown={handleKeyDown}
                                    />
                                    <button
                                        onClick={() => onShowPlayerDropdownChange?.(!showPlayerDropdown)}
                                        className="h-8 sm:h-9 w-8 sm:w-9 flex items-center justify-center transition-colors rounded-r-md shrink-0"
                                    >
                                        <IoChevronDownOutline
                                            className={`text-BrandOrange text-base sm:text-lg transition-transform ${showPlayerDropdown ? "rotate-180" : ""}`}
                                        />
                                    </button>
                                </div>
                                {showPlayerDropdown && (
                                    <div
                                        ref={dropdownRef}
                                        className="absolute left-0 top-full w-full bg-BrandBlack border border-BrandGray rounded-md mt-1 max-h-40 overflow-y-auto z-10 shadow-lg"
                                    >
                                        {filteredPlayers?.length > 0 ? (
                                            filteredPlayers.map((player, idx) => (
                                                <div
                                                    key={idx}
                                                    onClick={() => {
                                                        onPlayerAssign?.(player);
                                                        onShowPlayerDropdownChange?.(false);
                                                    }}
                                                    className="px-2 py-1 text-BrandWhite hover:bg-BrandOrange hover:text-BrandBlack cursor-pointer transition-colors text-xs sm:text-sm truncate"
                                                >
                                                    {player}
                                                </div>
                                            ))
                                        ) : (
                                            <div className="px-2 py-1 text-BrandGray text-xs">No players found</div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={handleSubmit}
                            className="w-full h-8 sm:h-9 bg-BrandOrange text-BrandBlack rounded-md text-xs sm:text-sm font-DmSans font-semibold hover:bg-BrandOrange/90 transition-colors mt-1"
                        >
                            Add Player
                        </button>
                    </div>
                </PopoverForm>
            </Popover>
        </div>
    );
}
