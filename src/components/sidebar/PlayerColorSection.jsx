import { SidebarChevronButton, WideSidebarRowButton } from "../subcomponents/Buttons";
import { Popover, PopoverGrid, Tooltip } from "../subcomponents/Popovers";

const PLAYER_COLORS = { red: "#FF0000", blue: "#0033FF" };

export default function PlayerColorSection({
    playerColor,
    isSelected,
    openPopover,
    hoveredTooltip,
    anchorRef,
    onToolSelect,
    onPlayerColorChange,
    onPopoverToggle,
    onPopoverClose,
    onHoverTooltip,
    wide = false,
}) {
    const popoverKey = "playerColor";
    const isOpen = openPopover === popoverKey;
    const ButtonComponent = wide ? WideSidebarRowButton : SidebarChevronButton;

    return (
        <div
            className="relative"
            onMouseEnter={() => onHoverTooltip?.("player")}
            onMouseLeave={() => onHoverTooltip?.(null)}
        >
            <ButtonComponent
                ref={anchorRef}
                Icon={
                    <div
                        className="h-6 w-6 rounded-full border border-BrandBlack"
                        style={{ backgroundColor: playerColor }}
                    />
                }
                label="Player Color"
                onHover={() => {}}
                isSelected={isSelected}
                chevronActive={isOpen}
                onClick={() => onToolSelect?.("player")}
                onChevronClick={() => onPopoverToggle?.(popoverKey)}
            />
            <Tooltip isOpen={hoveredTooltip === "player" && !isOpen} text="Player Color" />
            <Popover isOpen={isOpen} onClose={onPopoverClose} anchorRef={anchorRef}>
                <PopoverGrid cols={2}>
                    <div className="flex flex-col items-center gap-1">
                        <button
                            onClick={() => onPlayerColorChange?.(PLAYER_COLORS.red)}
                            className={`
                                rounded-md border border-BrandGray
                                flex items-center justify-center
                                p-2 aspect-square w-full
                                transition-all duration-100
                                ${playerColor === PLAYER_COLORS.red ? "bg-BrandOrange" : "bg-BrandBlack2 hover:bg-BrandBlack2/80"}
                            `}
                        >
                            <div
                                className="h-5 w-5 md:h-7 md:w-7 rounded-full border border-BrandBlack"
                                style={{ backgroundColor: PLAYER_COLORS.red }}
                            />
                        </button>
                        <span className="text-[10px] text-BrandOrange">Red</span>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                        <button
                            onClick={() => onPlayerColorChange?.(PLAYER_COLORS.blue)}
                            className={`
                                rounded-md border border-BrandGray
                                flex items-center justify-center
                                p-2 aspect-square w-full
                                transition-all duration-100
                                ${playerColor === PLAYER_COLORS.blue ? "bg-BrandOrange" : "bg-BrandBlack2 hover:bg-BrandBlack2/80"}
                            `}
                        >
                            <div
                                className="h-5 w-5 md:h-7 md:w-7 rounded-full border border-BrandBlack"
                                style={{ backgroundColor: PLAYER_COLORS.blue }}
                            />
                        </button>
                        <span className="text-[10px] text-BrandOrange">Blue</span>
                    </div>
                </PopoverGrid>
            </Popover>
        </div>
    );
}

export { PLAYER_COLORS };
