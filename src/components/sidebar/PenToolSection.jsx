import { PiPenNib } from "react-icons/pi";
import { SidebarChevronButton, WideSidebarRowButton } from "../subcomponents/Buttons";
import { Tooltip } from "../subcomponents/Popovers";

const iconClass = "text-BrandOrange text-xl sm:text-2xl md:text-3xl";
const selectedIconClass = "text-BrandBlack text-xl sm:text-2xl md:text-3xl";

export default function PenToolSection({
    isSelected,
    hoveredTooltip,
    anchorRef,
    onToolSelect,
    onHoverTooltip,
    wide = false,
}) {
    const IconNode = (
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
                {...(wide && { label: "Draw" })}
                onHover={() => {}}
                isSelected={isSelected}
                onClick={() => onToolSelect?.("pen")}
                onRowClick={() => onToolSelect?.("pen")}
            />
            <Tooltip
                isOpen={hoveredTooltip === "pen"}
                text="Draw Tool (P)"
            />
        </div>
    );
}
