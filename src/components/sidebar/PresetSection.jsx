import { TbTemplate } from "react-icons/tb";
import { SidebarChevronButton, WideSidebarRowButton } from "../subcomponents/Buttons";
import { Popover, Tooltip } from "../subcomponents/Popovers";
import { POPUP_POPOVER_SURFACE_CLASS } from "../subcomponents/popupStyles";

const iconClass = "text-BrandOrange text-xl sm:text-2xl md:text-3xl";

export default function PresetSection({
    openPopover,
    hoveredTooltip,
    anchorRef,
    onPopoverToggle,
    onPopoverClose,
    onHoverTooltip,
    wide = false,
}) {
    const popoverKey = "presets";
    const isOpen = openPopover === popoverKey;
    const ButtonComponent = wide ? WideSidebarRowButton : SidebarChevronButton;

    return (
        <div
            className="relative"
            onMouseEnter={() => onHoverTooltip?.("presets")}
            onMouseLeave={() => onHoverTooltip?.(null)}
        >
            <ButtonComponent
                ref={anchorRef}
                Icon={<TbTemplate className={iconClass} />}
                label="Preset"
                onHover={() => {}}
                isSelected={false}
                chevronActive={isOpen}
                onClick={() => onPopoverToggle?.(popoverKey)}
                onRowClick={() => onPopoverToggle?.(popoverKey)}
                onChevronClick={() => onPopoverToggle?.(popoverKey)}
            />
            <Tooltip isOpen={hoveredTooltip === "presets" && !isOpen} text="Presets" />
            <Popover isOpen={isOpen} onClose={onPopoverClose} anchorRef={anchorRef}>
                <div className={`ml-2 px-4 py-3 min-w-[140px] ${POPUP_POPOVER_SURFACE_CLASS}`}>
                    <p className="text-BrandGray2 text-xs font-DmSans text-center">
                        No presets yet
                    </p>
                </div>
            </Popover>
        </div>
    );
}
