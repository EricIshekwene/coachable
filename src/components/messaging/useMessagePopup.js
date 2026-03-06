import { useCallback, useState } from "react";

const INITIAL_MESSAGE_POPUP = {
  visible: false,
  message: "",
  subtitle: "",
  type: "standard",
  autoHideDuration: 3000,
};

export function useMessagePopup() {
  const [messagePopup, setMessagePopup] = useState(INITIAL_MESSAGE_POPUP);

  const showMessage = useCallback(
    (message, subtitle = "", type = "standard", duration = 3000) => {
      setMessagePopup({
        visible: true,
        message,
        subtitle,
        type,
        autoHideDuration: Number.isFinite(duration) ? duration : 3000,
      });
    },
    []
  );

  const hideMessage = useCallback(() => {
    setMessagePopup((prev) => ({ ...prev, visible: false }));
  }, []);

  return { messagePopup, showMessage, hideMessage };
}

export default useMessagePopup;
