import { LuMousePointer2 } from "react-icons/lu";
import { ButtonWithChevronAndLabel, ButtonWithChevron } from "./subcomponents/Buttons";

function Sidebar() {
    const iconClass = "text-BrandOrange text-xl sm:text-2xl md:text-3xl";
    return (
        <aside
          className="
                     h-screen shrink-0 bg-BrandBlack
                     w-14 sm:w-16 md:w-18 lg:w-20
                     px-1 py-2
                     flex flex-col
                     gap-2
                   "
        >
            <ButtonWithChevron Icon={<LuMousePointer2 className={iconClass} />} onHover={() => {}} onClick={() => {}} />
        </aside>
    )
}
export default Sidebar;