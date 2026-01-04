import "./index.css";

import { FaPlus } from "react-icons/fa";
import { LuMousePointer2 } from "react-icons/lu";
function App() {

  return (
    <>
      <div className="w-full h-screen bg-BrandGreen">
        <div className="w-100/1440 h-full bg-BrandBlack p-10">
          <div className="flex items-center aspect-square w-full bg-BrandBlack2 border border-BrandGary rounded-md justify-center hover:bg-BrandBlack2/80 transition-all duration-300">
            <LuMousePointer2 className="text-BrandOrange text-7xl" />
          </div>
        </div>
      </div>
    </>
  )
}

export default App
