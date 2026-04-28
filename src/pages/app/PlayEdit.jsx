import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useMessagePopup } from "../../components/messaging/useMessagePopup";
import MessagePopup from "../../components/MessagePopup/MessagePopup";
import Slate from "../../features/slate/Slate";
import { FiSave, FiArrowLeft, FiX } from "react-icons/fi";

export default function PlayEdit() {
  const { playId } = useParams();
  const navigate = useNavigate();
  const { messagePopup, showMessage, hideMessage } = useMessagePopup();
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  const handleSaveAndExit = () => {
    showMessage("Play saved", "success");
    setTimeout(() => navigate(`/app/plays/${playId}`), 600);
  };

  const handleExit = () => {
    setShowExitConfirm(true);
  };

  const confirmExit = () => {
    navigate(`/app/plays/${playId}`);
  };

  return (
    <div className="relative flex h-screen flex-col bg-BrandBlack">
      {/* Editor toolbar */}
      <div className="flex items-center justify-between border-b border-BrandGray2/20 px-4 py-2.5">
        <div className="flex items-center gap-3">
          <button
            onClick={handleExit}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-BrandGray transition hover:bg-BrandBlack2 hover:text-BrandText"
          >
            <FiArrowLeft />
            Exit
          </button>
          <div className="h-4 w-px bg-BrandGray2/30" />
          <span className="font-DmSans text-xs text-BrandGray2">Editing play</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => showMessage("Play saved", "success")}
            className="flex items-center gap-1.5 rounded-lg border border-BrandGray2/30 px-3 py-1.5 text-xs text-BrandGray transition hover:border-BrandGray hover:text-BrandText"
          >
            <FiSave className="text-[10px]" />
            Save
          </button>
          <button
            onClick={handleSaveAndExit}
            className="flex items-center gap-1.5 rounded-lg bg-BrandOrange px-3 py-1.5 text-xs font-semibold text-white transition hover:brightness-110"
          >
            Save & Exit
          </button>
        </div>
      </div>

      {/* Slate editor */}
      <div className="relative flex-1 overflow-hidden">
        <MessagePopup
          message={messagePopup.message}
          subtitle={messagePopup.subtitle}
          visible={messagePopup.visible}
          type={messagePopup.type}
          onClose={hideMessage}
        />
        <Slate onShowMessage={showMessage} testVariant />
      </div>

      {/* Exit confirmation modal */}
      {showExitConfirm && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 font-DmSans">
          <div className="w-full max-w-sm rounded-xl border border-BrandGray2/20 bg-BrandBlack p-6">
            <h2 className="font-Manrope text-base font-bold">Exit without saving?</h2>
            <p className="mt-2 text-sm text-BrandGray2">
              Any unsaved changes will be lost.
            </p>
            <div className="mt-6 flex items-center gap-3">
              <button
                onClick={() => setShowExitConfirm(false)}
                className="flex-1 rounded-lg border border-BrandGray2/30 py-2 text-sm text-BrandGray transition hover:border-BrandGray hover:text-BrandText"
              >
                Cancel
              </button>
              <button
                onClick={confirmExit}
                className="flex-1 rounded-lg bg-red-500/90 py-2 text-sm font-semibold text-white transition hover:bg-red-500"
              >
                Exit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
