import "./index.css";

import { IoChevronDownOutline } from "react-icons/io5";
import { LuMousePointer2 } from "react-icons/lu";
function App() {

  return (
    <>
      <div className="w-full h-screen bg-BrandGreen">
        {/* Sidebar */}
        <aside
          className="
    h-screen shrink-0 bg-BrandBlack
    w-14 sm:w-16 md:w-18 lg:w-20
    px-1 py-2
    flex flex-col
    gap-2
  "
        >
          {/* 1) Square button only */}
          <div className="w-full">
            <button
              className="
        w-full aspect-square
        rounded-md border border-BrandGary
        bg-BrandBlack2 hover:bg-BrandBlack2/80
        transition-all duration-300
        flex items-center justify-center
      "
            >
              <LuMousePointer2 className="text-BrandOrange text-xl sm:text-2xl md:text-3xl" />
            </button>
          </div>

          {/* 2) Square button + chevron on right */}
          <div className="w-full flex items-center gap-1">
            <button
              className="
        w-full aspect-square
        rounded-md border border-BrandGary
        bg-BrandBlack2 hover:bg-BrandBlack2/80
        transition-all duration-300
        flex items-center justify-center
      "
            >
              <LuMousePointer2 className="text-BrandOrange text-xl sm:text-2xl md:text-3xl" />
            </button>

            {/* Chevron: no bg, no border, small */}
            <IoChevronDownOutline className="shrink-0 text-BrandOrange text-[10px] sm:text-xs md:text-sm" />
          </div>

          {/* 3) Square button + chevron on right + label under */}
          <div className="w-full flex flex-col items-center gap-1">
            <div className="w-full flex items-center gap-1">
              <button
                className="
          w-full aspect-square
          rounded-md border border-BrandGary
          bg-BrandBlack2 hover:bg-BrandBlack2/80
          transition-all duration-300
          flex items-center justify-center
        "
              >
                <LuMousePointer2 className="text-BrandOrange text-xl sm:text-2xl md:text-3xl" />
              </button>

              <IoChevronDownOutline className="shrink-0 text-BrandOrange text-[10px] sm:text-xs md:text-sm" />
            </div>

            <span className="text-[10px] sm:text-xs text-BrandGary text-center leading-none">
              Label
            </span>
          </div>
        </aside>

      </div>
    </>
  );
}
export default App;
