import { Button } from "../subcomponents/Buttons";
import { Tooltip } from "../subcomponents/Popovers";
import { BiUndo, BiRedo, BiReset } from "react-icons/bi";

const iconClass = "text-BrandOrange text-xl sm:text-2xl md:text-3xl";

export default function HistoryActionsSection({ onUndo, onRedo, onReset, hoveredTooltip, onHoverTooltip }) {
    return (
        <div className="w-full flex flex-col items-center gap-1 sm:gap-2 md:gap-3 lg:gap-4 p-1 py-2 lg:px-3">
            <div
                className="relative w-full"
                onMouseEnter={() => onHoverTooltip?.("undo")}
                onMouseLeave={() => onHoverTooltip?.(null)}
            >
                <Button
                    Icon={<BiUndo className={iconClass} />}
                    onHover={() => {}}
                    onClick={() => onUndo?.()}
                    isSelected={false}
                />
                <Tooltip isOpen={hoveredTooltip === "undo"} text="Undo" />
            </div>
            <div
                className="relative w-full"
                onMouseEnter={() => onHoverTooltip?.("redo")}
                onMouseLeave={() => onHoverTooltip?.(null)}
            >
                <Button
                    Icon={<BiRedo className={iconClass} />}
                    onHover={() => {}}
                    onClick={() => onRedo?.()}
                    isSelected={false}
                />
                <Tooltip isOpen={hoveredTooltip === "redo"} text="Redo" />
            </div>
            <div
                className="relative w-full"
                onMouseEnter={() => onHoverTooltip?.("reset")}
                onMouseLeave={() => onHoverTooltip?.(null)}
            >
                <Button
                    Icon={<BiReset className={iconClass} />}
                    onHover={() => {}}
                    onClick={() => onReset?.()}
                    isSelected={false}
                />
                <Tooltip isOpen={hoveredTooltip === "reset"} text="Reset" />
            </div>
        </div>
    );
}
