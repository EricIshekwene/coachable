import { BsPersonAdd } from "react-icons/bs";
import { SidebarChevronButton, WideSidebarRowButton } from "../subcomponents/Buttons";
import { Popover, Tooltip } from "../subcomponents/Popovers";

const iconClass = "text-BrandOrange text-xl sm:text-2xl md:text-3xl";
const selectedIconClass = "text-BrandBlack text-xl sm:text-2xl md:text-3xl";

export default function AddPlayerSection({
    isSelected,
    openPopover,
    hoveredTooltip,
    numberValue,
    nameValue,
    anchorRef,
    onToolSelect,
    onPopoverToggle,
    onPopoverClose,
    onNumberChange,
    onNameChange,
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
                <div className="ml-2 p-3 sm:p-4 w-[200px] flex flex-col gap-2.5 bg-BrandBlack rounded-lg shadow-[0_16px_30px_-20px_rgba(0,0,0,0.95)] font-DmSans">
                    <p className="text-BrandWhite text-xs sm:text-sm font-semibold">Add Player</p>
                    <div className="flex flex-col gap-0.5">
                        <p className="text-BrandGray text-[10px] sm:text-xs">Number</p>
                        <input
                            type="text"
                            className="w-full h-8 bg-BrandBlack2 rounded-md px-2 text-BrandWhite text-xs sm:text-sm font-DmSans focus:outline-none focus:ring-1 focus:ring-BrandOrange/60 transition-colors"
                            value={numberValue ?? ""}
                            onChange={(e) => onNumberChange?.(e.target.value)}
                            onKeyDown={handleKeyDown}
                        />
                    </div>
                    <div className="flex flex-col gap-0.5">
                        <p className="text-BrandGray text-[10px] sm:text-xs">Name</p>
                        <input
                            type="text"
                            className="w-full h-8 bg-BrandBlack2 rounded-md px-2 text-BrandWhite text-xs sm:text-sm font-DmSans focus:outline-none focus:ring-1 focus:ring-BrandOrange/60 transition-colors"
                            value={nameValue ?? ""}
                            onChange={(e) => onNameChange?.(e.target.value)}
                            onKeyDown={handleKeyDown}
                        />
                    </div>
                    <button
                        type="button"
                        onClick={handleSubmit}
                        className="w-full h-8 bg-BrandOrange text-BrandBlack rounded-md text-xs sm:text-sm font-DmSans font-semibold hover:bg-BrandOrange/90 transition-colors mt-0.5"
                    >
                        Add Player
                    </button>
                </div>
            </Popover>
        </div>
    );
}
