/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext } from "react";

const AppMessageContext = createContext(null);

export function AppMessageProvider({ children, value }) {
  return <AppMessageContext.Provider value={value}>{children}</AppMessageContext.Provider>;
}

export function useAppMessage() {
  const context = useContext(AppMessageContext);
  if (!context) {
    throw new Error("useAppMessage must be used within AppMessageProvider");
  }
  return context;
}

export default AppMessageContext;
