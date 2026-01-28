import { LuMousePointer2 } from "react-icons/lu";
import { IoHandLeftOutline } from "react-icons/io5";
import { SidebarChevronButton } from "../subcomponents/Buttons";
import { Popover, PopoverGrid, Tooltip } from "../subcomponents/Popovers";

const iconClass = "text-BrandOrange text-xl sm:text-2xl md:text-3xl";
const selectedIconClass = "text-BrandBlack text-xl sm:text-2xl md:text-3xl";

export default function SelectToolSection({
    selectToolType,
    isSelected,
    openPopover,
    hoveredTooltip,
    anchorRef,
    onToolSelect,
    onSelectSubTool,
    onPopoverToggle,
    onPopoverClose,
    onHoverTooltip,
}) {
    const popoverKey = "selectOptions";
    const isOpen = openPopover === popoverKey;

    return (
        <div
            className="relative"
            onMouseEnter={() => onHoverTooltip?.("select")}
            onMouseLeave={() => onHoverTooltip?.(null)}
        >
            <SidebarChevronButton
                ref={anchorRef}
                Icon={
                    selectToolType === "hand" ? (
                        <IoHandLeftOutline className={isSelected ? selectedIconClass : iconClass} />
                    ) : (
                        <LuMousePointer2 className={isSelected ? selectedIconClass : iconClass} />
                    )
                }
                onHover={() => {}}
                isSelected={isSelected}
                chevronActive={isOpen}
                onClick={() => onToolSelect?.(selectToolType)}
                onChevronClick={() => onPopoverToggle?.(popoverKey)}
            />
            <Tooltip
                isOpen={hoveredTooltip === "select" && !isOpen}
                text={selectToolType === "hand" ? "Hand Tool (H)" : "Select Tool (S)"}
            />
            <Popover isOpen={isOpen} onClose={onPopoverClose} anchorRef={anchorRef}>
                <PopoverGrid cols={2}>
                    <div className="flex flex-col items-center gap-1">
                        <button
                            onClick={() => onSelectSubTool?.("select")}
                            className={`
                                rounded-md border border-BrandGray
                                flex items-center justify-center
                                p-2 aspect-square w-full
                                transition-all duration-100
                                ${selectToolType === "select" ? "bg-BrandOrange" : "bg-BrandBlack2 hover:bg-BrandBlack2/80"}
                            `}
                        >
                            <LuMousePointer2 className={selectToolType === "select" ? selectedIconClass : iconClass} />
                        </button>
                        <span className="text-[10px] text-BrandOrange">Select (S)</span>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                        <button
                            onClick={() => onSelectSubTool?.("hand")}
                            className={`
                                rounded-md border border-BrandGray
                                flex items-center justify-center
                                p-2 aspect-square w-full
                                transition-all duration-100
                                ${selectToolType === "hand" ? "bg-BrandOrange" : "bg-BrandBlack2 hover:bg-BrandBlack2/80"}
                            `}
                        >
                            <IoHandLeftOutline className={selectToolType === "hand" ? selectedIconClass : iconClass} />
                        </button>
                        <span className="text-[10px] text-BrandOrange">Hand (H)</span>
                    </div>
                </PopoverGrid>
            </Popover>
        </div>
    );
}
