import "./index.css";
import Sidebar from "./components/Sidebar";
import { Button, ButtonWithChevron, ButtonWithChevronAndLabel, ButtonWithLabel } from "./components/subcomponents/Buttons";
import { LuMousePointer2 } from "react-icons/lu";
import { IoHandLeftOutline } from "react-icons/io5";
import { IoChevronDownOutline } from "react-icons/io5";

function App() {
const playerers = [ "Tommy Kilbane", "Tristan Arndt", "Tommy Graham", "Trenton Bui", "Ty Johnson", "Trey Burkhart", "Trey Lundy", "Trevor Jackson", "Trevor Simms", "Tyler Banks", "Tyler Davis", "Tyler Gray", "Tyler Smith", "Tyler Wilson", "Zachary Breaux", "Zachary Brown", "Zachary Chavez", "Zachary Davis", "Zachary Green", "Zachary Johnson", "Zachary Lee", "Zachary Martin", "Zachary Martinez", "Zachary Miller", "Zachary Mitchell", "Zachary Moore", "Zachary Nelson", "Zachary Phillips", "Zachary Robinson", "Zachary Rodriguez", "Zachary Scott", "Zachary Smith", "Zachary Taylor", "Zachary Thompson", "Zachary Walker", "Zachary Wilson", "Zachary Young" ];
  
return (
    <>
      <div className="w-full h-screen bg-BrandGreen flex flex-row">
        <Sidebar />
        
      </div>
    </>
  );
}
export default App;
