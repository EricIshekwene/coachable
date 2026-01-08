import "./index.css";
import Sidebar from "./components/Sidebar";
import { Button, ButtonWithChevron, ButtonWithChevronAndLabel, ButtonWithLabel } from "./components/subcomponents/Buttons";
import { LuMousePointer2 } from "react-icons/lu";
import { IoHandLeftOutline } from "react-icons/io5";

function App() {

  return (
    <>
      <div className="w-full h-screen bg-BrandGreen flex flex-row">
        <Sidebar />
        
      </div>
    </>
  );
}
export default App;
