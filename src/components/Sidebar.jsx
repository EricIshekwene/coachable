import { LuMousePointer2 } from "react-icons/lu";
import { PiPenNib } from "react-icons/pi";
import { ButtonWithChevronAndLabel, ButtonWithChevron, Button } from "./subcomponents/Buttons";
import { PiEraserFill } from "react-icons/pi";
import { BsPersonAdd } from "react-icons/bs";
import playerIcon from "../assets/players/Ellipse 8.png";
import { TbCopyPlusFilled } from "react-icons/tb";
import { BiUndo } from "react-icons/bi";
import { BiRedo } from "react-icons/bi";
import { BiReset } from "react-icons/bi";
function Sidebar() {
    const iconClass = "text-BrandOrange text-xl sm:text-2xl md:text-3xl";
    return (
        <aside
          className="
                     h-screen shrink-0 bg-BrandBlack
                     w-14 sm:w-16 md:w-18 lg:w-20
                     px-2 py-3 sm:py-4 md:py-5 lg:py-6
                     flex flex-col
                     gap-1 sm:gap-2 md:gap-3 lg:gap-4
                   "
        >
            <ButtonWithChevron Icon={<LuMousePointer2 className={iconClass} />} onHover={() => {}} onClick={() => {}} />
            <hr className="w-4/5 self-center border-BrandGary" />
            <ButtonWithChevron Icon={<PiPenNib className={iconClass} style={{ transform: "rotate(90deg)" }} />} onHover={() => {}} onClick={() => {}} />
            <hr className="w-4/5 self-center border-BrandGary" />
            <ButtonWithChevron Icon={<PiEraserFill className={iconClass} />} onHover={() => {}} onClick={() => {}} />
            <hr className="w-4/5 self-center border-BrandGary" />
            <ButtonWithChevron Icon={<BsPersonAdd className={iconClass} />} onHover={() => {}} onClick={() => {}} />
            <hr className="w-4/5 self-center border-BrandGary" />
            <ButtonWithChevron Icon={<img src={playerIcon} alt="playerIcon" className="w-5/7 object-cover" />} onHover={() => {}} onClick={() => {}} />
            <hr className="w-4/5 self-center border-BrandGary" />
            <ButtonWithChevronAndLabel Icon={<TbCopyPlusFilled className={iconClass} />} label="Prefabs" onHover={() => {}} onClick={() => {}} />
            <hr className="w-4/5 self-center border-BrandGary" />
            <div className="w-full flex flex-col items-center gap-2 sm:gap-3 md:gap-4 lg:gap-5 p-1">
            <Button Icon={<BiUndo className={iconClass} />} onHover={() => {}} onClick={() => {}} />
                <Button Icon={<BiRedo className={iconClass} />} onHover={() => {}} onClick={() => {}} />
                <Button Icon={<BiReset className={iconClass} />} onHover={() => {}} onClick={() => {}} />
            </div>


        </aside>
    )
}
export default Sidebar;