import { useParams } from "react-router-dom";
import { useMessagePopup } from "../../components/messaging/useMessagePopup";
import MessagePopup from "../../components/MessagePopup/MessagePopup";
import Slate from "../../features/slate/Slate";

export default function PlayEdit() {
  const { playId } = useParams();
  const { messagePopup, showMessage, hideMessage } = useMessagePopup();

  return (
    <div className="w-full h-screen bg-BrandBlack flex flex-row justify-between relative overflow-hidden">
      <MessagePopup
        message={messagePopup.message}
        subtitle={messagePopup.subtitle}
        visible={messagePopup.visible}
        type={messagePopup.type}
        onClose={hideMessage}
      />
      <Slate onShowMessage={showMessage} />
    </div>
  );
}
