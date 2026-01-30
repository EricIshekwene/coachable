import { PiEraserFill } from "react-icons/pi";
import { FaRegCircle } from "react-icons/fa";
import { TbCircleDotted } from "react-icons/tb";
import { SidebarChevronButton, WideSidebarRowButton } from "../subcomponents/Buttons";
import { Popover, PopoverGrid, Tooltip } from "../subcomponents/Popovers";

const iconClass = "text-BrandOrange text-xl sm:text-2xl md:text-3xl";
const selectedIconClass = "text-BrandBlack text-xl sm:text-2xl md:text-3xl";

export default function EraserToolSection({
    eraserToolType,
    isSelected,
    openPopover,
    hoveredTooltip,
    anchorRef,
    onToolSelect,
    onEraserSubTool,
    onPopoverToggle,
    onPopoverClose,
    onHoverTooltip,
    wide = false,
}) {
    const popoverKey = "eraserOptions";
    const isOpen = openPopover === popoverKey;
    const ButtonComponent = wide ? WideSidebarRowButton : SidebarChevronButton;

    return (
        <div
            className="relative"
            onMouseEnter={() => onHoverTooltip?.("eraser")}
            onMouseLeave={() => onHoverTooltip?.(null)}
        >
            <ButtonComponent
                ref={anchorRef}
                Icon={<PiEraserFill className={isSelected ? selectedIconClass : iconClass} />}
                {...(wide && { label: "Eraser" })}
                onHover={() => {}}
                isSelected={isSelected}
                chevronActive={isOpen}
                onClick={() => onToolSelect?.("eraser")}
                onChevronClick={() => onPopoverToggle?.(popoverKey)}
            />
            <Tooltip isOpen={hoveredTooltip === "eraser" && !isOpen} text="Eraser Tool" />
            <Popover isOpen={isOpen} onClose={onPopoverClose} anchorRef={anchorRef}>
                <PopoverGrid cols={2}>
                    <div className="flex flex-col items-center gap-1">
                        <button
                            onClick={() => onEraserSubTool?.("full")}
                            className={`
                                rounded-md border border-BrandGray
                                flex items-center justify-center
                                p-2 aspect-square w-full
                                transition-all duration-100
                                ${eraserToolType === "full" ? "bg-BrandOrange" : "bg-BrandBlack2 hover:bg-BrandBlack2/80"}
                            `}
                        >
                            <FaRegCircle className={eraserToolType === "full" ? selectedIconClass : iconClass} />
                        </button>
                        <span className="text-[10px] text-BrandOrange">Full (F)</span>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                        <button
                            onClick={() => onEraserSubTool?.("partial")}
                            className={`
                                rounded-md border border-BrandGray
                                flex items-center justify-center
                                p-2 aspect-square w-full
                                transition-all duration-100
                                ${eraserToolType === "partial" ? "bg-BrandOrange" : "bg-BrandBlack2 hover:bg-BrandBlack2/80"}
                            `}
                        >
                            <TbCircleDotted className={eraserToolType === "partial" ? selectedIconClass : iconClass} />
                        </button>
                        <span className="text-[10px] text-BrandOrange">Partial (O)</span>
                    </div>
                </PopoverGrid>
            </Popover>
        </div>
    );
}
