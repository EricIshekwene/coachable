import { PiPenNib } from "react-icons/pi";
import { FaArrowUpLong } from "react-icons/fa6";
import { SidebarChevronButton, WideSidebarRowButton } from "../subcomponents/Buttons";
import { Popover, PopoverGrid, Tooltip } from "../subcomponents/Popovers";

const iconClass = "text-BrandOrange text-xl sm:text-2xl md:text-3xl";
const selectedIconClass = "text-BrandBlack text-xl sm:text-2xl md:text-3xl";

export default function PenToolSection({
    penToolType,
    isSelected,
    openPopover,
    hoveredTooltip,
    anchorRef,
    onToolSelect,
    onPenSubTool,
    onPopoverToggle,
    onPopoverClose,
    onHoverTooltip,
    wide = false,
}) {
    const popoverKey = "penOptions";
    const isOpen = openPopover === popoverKey;
    const label = penToolType === "arrow" ? "Arrow" : "Pen";
    const IconNode = penToolType === "arrow" ? (
        <FaArrowUpLong
            className={isSelected ? selectedIconClass : iconClass}
            style={{ transform: "rotate(45deg)" }}
        />
    ) : (
        <PiPenNib
            className={isSelected ? selectedIconClass : iconClass}
            style={{ transform: "rotate(90deg)" }}
        />
    );
    const ButtonComponent = wide ? WideSidebarRowButton : SidebarChevronButton;

    return (
        <div
            className="relative"
            onMouseEnter={() => onHoverTooltip?.("pen")}
            onMouseLeave={() => onHoverTooltip?.(null)}
        >
            <ButtonComponent
                ref={anchorRef}
                Icon={IconNode}
                {...(wide && { label })}
                onHover={() => {}}
                isSelected={isSelected}
                chevronActive={isOpen}
                onClick={() => onToolSelect?.("pen")}
                onChevronClick={() => onPopoverToggle?.(popoverKey)}
            />
            <Tooltip
                isOpen={hoveredTooltip === "pen" && !isOpen}
                text={penToolType === "arrow" ? "Arrow Tool (A)" : "Pen Tool (P)"}
            />
            <Popover isOpen={isOpen} onClose={onPopoverClose} anchorRef={anchorRef}>
                <PopoverGrid cols={2}>
                    <div className="flex flex-col items-center gap-1">
                        <button
                            onClick={() => onPenSubTool?.("pen")}
                            className={`
                                rounded-md border border-BrandGray
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
                            onClick={() => onPenSubTool?.("arrow")}
                            className={`
                                rounded-md border border-BrandGray
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
    );
}
