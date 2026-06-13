import Slate from "../features/slate/Slate";
import MessagePopup from "../components/MessagePopup/MessagePopup";
import { useMessagePopup } from "../components/messaging/useMessagePopup";
import { useAdmin } from "../admin/AdminContext";
import useThemeColor from "../utils/useThemeColor";
import MobileViewOnlyGate from "../components/MobileViewOnlyGate";

/**
 * Admin-only desktop sandbox at /admin/test.
 *
 * Renders the full desktop Slate editor with testVariant=true, which:
 *   - Keeps the standard desktop layout (sidebar, right panel, control pill)
 *   - Applies the restyled "test" timeline variant to ControlPill:
 *     plain gray track, orange progress fill, white streak playhead,
 *     CSS diamond keyframe markers, and proximity-based auto-selection
 *
 * Protected by RequireAdminSession in App.jsx — no admin session, no access.
 */
export default function AdminTestSlate() {
  const { theme } = useAdmin();
  const { messagePopup, showMessage, hideMessage } = useMessagePopup();
  useThemeColor(theme === "light" ? "#ffffff" : "#121212");

  return (
    <div
      className="fixed inset-0 bg-[#121212] flex flex-row justify-between overflow-hidden"
      style={{
        "--color-BrandBlack":  "#121212",
        "--color-BrandBlack2": "#2a2e34",
        "--color-BrandGray":   "#9AA0A6",
        "--color-BrandGray2":  "#4b5157",
        "--color-BrandText":   "#f5f7fa",
      }}
    >
      <MessagePopup
        message={messagePopup.message}
        subtitle={messagePopup.subtitle}
        visible={messagePopup.visible}
        type={messagePopup.type}
        autoHideDuration={messagePopup.autoHideDuration}
        onClose={hideMessage}
      />
      <MobileViewOnlyGate>
        <Slate
          onShowMessage={showMessage}
          adminMode
          testVariant
        />
      </MobileViewOnlyGate>
    </div>
  );
}
