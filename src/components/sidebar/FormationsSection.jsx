import { MdSportsSoccer } from "react-icons/md";
import { WideSidebarRowButton } from "../subcomponents/Buttons";
import { Popover, Tooltip } from "../subcomponents/Popovers";
import { FormationsPopover } from "../subcomponents/FormationsPopover";

const iconClass = "text-BrandOrange text-xl sm:text-2xl md:text-3xl";

export default function FormationsSection({
    openPopover,
    hoveredTooltip,
    anchorRef,
    onPopoverToggle,
    onPopoverClose,
    onFormationSelect,
    onHoverTooltip,
    playerColor,
}) {
    const popoverKey = "formations";
    const isOpen = openPopover === popoverKey;

    const handleFormationSelect = (formation) => {
        onFormationSelect?.(formation, playerColor);
        onPopoverClose?.();
    };

    return (
        <div
            className="relative"
            onMouseEnter={() => onHoverTooltip?.("formations")}
            onMouseLeave={() => onHoverTooltip?.(null)}
        >
            <WideSidebarRowButton
                ref={anchorRef}
                Icon={<MdSportsSoccer className={iconClass} />}
                label="Formations"
                onHover={() => { }}
                isSelected={false}
                chevronActive={isOpen}
                onClick={() => { }}
                onRowClick={() => onPopoverToggle?.(popoverKey)}
                onChevronClick={() => onPopoverToggle?.(popoverKey)}
            />
            <Tooltip isOpen={hoveredTooltip === "formations" && !isOpen} text="Formations" />
            <Popover
                isOpen={isOpen}
                onClose={onPopoverClose}
                anchorRef={anchorRef}
                topOffset="top-[-150px]"
            >
                <FormationsPopover onFormationSelect={handleFormationSelect} />
            </Popover>
        </div >
    );
}