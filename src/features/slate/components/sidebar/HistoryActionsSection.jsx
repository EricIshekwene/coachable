import { Button, WideSidebarRowButton } from "../subcomponents/Buttons";
import { Tooltip } from "../subcomponents/Popovers";
import { BiUndo, BiRedo, BiReset } from "react-icons/bi";

const iconClass = "text-BrandOrange text-xl sm:text-2xl md:text-3xl";

export default function HistoryActionsSection({ onUndo, onRedo, onReset, hoveredTooltip, onHoverTooltip, wide = false }) {
    const actions = [
        { key: "undo", Icon: <BiUndo className={iconClass} />, label: "Undo", onClick: onUndo },
        { key: "redo", Icon: <BiRedo className={iconClass} />, label: "Redo", onClick: onRedo },
        { key: "reset", Icon: <BiReset className={iconClass} />, label: "Reset", onClick: onReset },
    ];

    if (wide) {
        return (
            <div className="w-full flex flex-col gap-1 sm:gap-1.5">
                {actions.map(({ key, Icon, label, onClick }) => (
                    <div
                        key={key}
                        className="relative w-full"
                        onMouseEnter={() => onHoverTooltip?.(key)}
                        onMouseLeave={() => onHoverTooltip?.(null)}
                    >
                        <WideSidebarRowButton
                            Icon={Icon}
                            label={label}
                            onHover={() => {}}
                            onClick={() => onClick?.()}
                            onRowClick={() => onClick?.()}
                            isSelected={false}
                        />
                        <Tooltip isOpen={hoveredTooltip === key} text={label} />
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="w-full flex flex-col items-center gap-1 sm:gap-2 md:gap-3 lg:gap-4 p-1 py-2 lg:px-3">
            {actions.map(({ key, Icon, label, onClick }) => (
                <div
                    key={key}
                    className="relative w-full"
                    onMouseEnter={() => onHoverTooltip?.(key)}
                    onMouseLeave={() => onHoverTooltip?.(null)}
                >
                    <Button
                        Icon={Icon}
                        onHover={() => {}}
                        onClick={() => onClick?.()}
                        isSelected={false}
                    />
                    <Tooltip isOpen={hoveredTooltip === key} text={label} />
                </div>
            ))}
        </div>
    );
}
