import "./index.css";
import Sidebar from "./components/Sidebar";
import { useState, useEffect } from "react";

function App() {
  const [color, setColor] = useState("#561ecb");

 
  return (
    <>
      <div className="w-full h-screen bg-BrandGreen flex flex-row">
        <Sidebar />       
      </div>
    </>
  );
}
export default App;
