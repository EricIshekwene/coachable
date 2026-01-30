import { TbCopyPlusFilled } from "react-icons/tb";
import { SidebarChevronButton, WideSidebarRowButton } from "../subcomponents/Buttons";
import { Popover, Tooltip } from "../subcomponents/Popovers";
import { PrefabsPopover } from "../subcomponents/PrefabsPopover";

const iconClass = "text-BrandOrange text-xl sm:text-2xl md:text-3xl";

export default function PrefabsSection({
    prefabs,
    openPopover,
    hoveredTooltip,
    anchorRef,
    onPopoverToggle,
    onPopoverClose,
    onPrefabSelect,
    onHoverTooltip,
    wide = false,
}) {
    const popoverKey = "prefabs";
    const isOpen = openPopover === popoverKey;
    const ButtonComponent = wide ? WideSidebarRowButton : SidebarChevronButton;

    const handlePrefabSelect = (prefab) => {
        onPrefabSelect?.(prefab);
        onPopoverClose?.();
    };

    return (
        <div
            className="relative"
            onMouseEnter={() => onHoverTooltip?.("prefabs")}
            onMouseLeave={() => onHoverTooltip?.(null)}
        >
            <ButtonComponent
                ref={anchorRef}
                Icon={<TbCopyPlusFilled className={iconClass} />}
                label="Prefabs"
                onHover={() => {}}
                isSelected={false}
                chevronActive={isOpen}
                onClick={() => {}}
                onChevronClick={() => onPopoverToggle?.(popoverKey)}
            />
            <Tooltip isOpen={hoveredTooltip === "prefabs" && !isOpen} text="Prefabs" />
            <Popover isOpen={isOpen} onClose={onPopoverClose} anchorRef={anchorRef} topOffset="top-[-150px]">
                <PrefabsPopover prefabs={prefabs} onPrefabSelect={handlePrefabSelect} />
            </Popover>
        </div>
    );
}
