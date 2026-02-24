import { useCallback, useState } from "react";

const INITIAL_MESSAGE_POPUP = {
  visible: false,
  message: "",
  subtitle: "",
  type: "standard",
};

export function useMessagePopup() {
  const [messagePopup, setMessagePopup] = useState(INITIAL_MESSAGE_POPUP);

  const showMessage = useCallback(
    (message, subtitle = "", type = "standard", duration = 3000) => {
      void duration;
      setMessagePopup({
        visible: true,
        message,
        subtitle,
        type,
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
