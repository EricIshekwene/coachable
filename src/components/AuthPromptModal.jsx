import React from "react";
import { FaTimes } from "react-icons/fa";
import {
  POPUP_MODAL_OVERLAY_CLASS,
  POPUP_SURFACE_CLASS,
  POPUP_CLOSE_BUTTON_CLASS,
  POPUP_TITLE_CLASS,
  POPUP_PRIMARY_BUTTON_CLASS,
  POPUP_SECONDARY_BUTTON_CLASS,
} from "./subcomponents/popupStyles";

/**
 * Modal prompting unauthenticated users to log in or sign up.
 * @param {{ open: boolean, onClose: () => void, onLogin: () => void, onSignup: () => void }} props
 */
export default function AuthPromptModal({ open, onClose, onLogin, onSignup }) {
  if (!open) return null;

  return (
    <div className={POPUP_MODAL_OVERLAY_CLASS} onClick={onClose}>
      <div
        className={`relative w-[90vw] max-w-sm p-6 flex flex-col gap-5 ${POPUP_SURFACE_CLASS}`}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className={POPUP_CLOSE_BUTTON_CLASS}
          aria-label="Close"
        >
          <FaTimes className="text-sm" />
        </button>

        <div className="pr-8">
          <h2 className={POPUP_TITLE_CLASS}>Sign in to save</h2>
          <p className="text-BrandGray text-xs font-DmSans mt-2">
            Create an account or log in to save plays to your playbook.
          </p>
        </div>

        <div className="flex flex-col gap-2.5">
          <button type="button" onClick={onSignup} className={POPUP_PRIMARY_BUTTON_CLASS}>
            Sign Up
          </button>
          <button type="button" onClick={onLogin} className={POPUP_SECONDARY_BUTTON_CLASS}>
            Log In
          </button>
        </div>
      </div>
    </div>
  );
}
