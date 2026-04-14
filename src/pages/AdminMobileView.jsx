import Slate from "../features/slate/Slate";
import MessagePopup from "../components/MessagePopup/MessagePopup";
import { useMessagePopup } from "../components/messaging/useMessagePopup";
import useThemeColor from "../utils/useThemeColor";

/**
 * Admin-only mobile editor sandbox at /admin/mobile-view.
 *
 * Renders the full Slate editor with mobileLayout=true, which:
 *   - Hides the left sidebar and right panel
 *   - Replaces ControlPill with MobileEditorBar (compact timeline + bottom
 *     nav tabs that slide up sheets for Tools, Players, and More)
 *   - Never forces view-only regardless of screen width
 *
 * Protected by RequireAdminSession in App.jsx — no auth token, no access.
 * Visit on a real phone or Chrome DevTools mobile simulation to test.
 */
export default function AdminMobileView() {
  const { messagePopup, showMessage, hideMessage } = useMessagePopup();
  useThemeColor("#121212");

  return (
    <div
      className="w-full bg-BrandBlack flex flex-col relative overflow-hidden"
      style={{ height: "100dvh" }}
    >
      <MessagePopup
        message={messagePopup.message}
        subtitle={messagePopup.subtitle}
        visible={messagePopup.visible}
        type={messagePopup.type}
        autoHideDuration={messagePopup.autoHideDuration}
        onClose={hideMessage}
      />
      <Slate
        onShowMessage={showMessage}
        adminMode
        mobileLayout
      />
    </div>
  );
}
