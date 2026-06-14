import { Button, ConfirmDialog, Divider } from "../../design-system/components";
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
      <div className="flex items-center justify-between border-b border-[color:var(--ui-border)] px-4 py-2.5">
        <div className="flex items-center gap-3">
          <Button variant="ghost"
            onClick={handleExit}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-[color:var(--ui-text-muted)] transition hover:bg-[color:var(--ui-surface)] hover:text-[color:var(--ui-text)]"
          >
            <FiArrowLeft />
            Exit
          </Button>
          <Divider orientation="vertical" className="h-4" />
          <span className="font-DmSans text-xs" style={{ color: "var(--ui-text-subtle)" }}>Editing play</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline"
            onClick={() => showMessage("Play saved", "success")}
            className="flex items-center gap-1.5 rounded-lg border border-[color:var(--ui-border)] px-3 py-1.5 text-xs text-[color:var(--ui-text-muted)] transition hover:border-[color:var(--ui-border-strong)] hover:text-[color:var(--ui-text)]"
          >
            <FiSave className="text-[10px]" />
            Save
          </Button>
          <Button variant="primary"
            onClick={handleSaveAndExit}
            className="flex items-center gap-1.5 rounded-lg bg-BrandOrange px-3 py-1.5 text-xs font-semibold text-white transition hover:brightness-110"
          >
            Save & Exit
          </Button>
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
      <ConfirmDialog
        open={showExitConfirm}
        title="Exit without saving?"
        description="Any unsaved changes will be lost."
        tone="danger"
        confirmLabel="Exit"
        onConfirm={confirmExit}
        onCancel={() => setShowExitConfirm(false)}
      />
    </div>
  );
}
