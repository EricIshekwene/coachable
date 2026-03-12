import React, { useEffect, useRef, useState } from "react";

export default function LoggerSettingsSection({
  onCopyDebug,
  onCopyDrawDebug,
  onCopyKeyToolDebug,
  onCopyPlaceBallDebug,
  onCopyVideoExportDebug,
  onCopyRecordingDebug,
  onCopyKfMoveDebug,
  onCopyFixAllDebug,
  onDebugRotate,
}) {
  const [copyAnimationState, setCopyAnimationState] = useState("idle");
  const [copyDrawState, setCopyDrawState] = useState("idle");
  const [copyKeyToolState, setCopyKeyToolState] = useState("idle");
  const [copyPlaceBallState, setCopyPlaceBallState] = useState("idle");
  const [copyVideoExportState, setCopyVideoExportState] = useState("idle");
  const [copyRecordingState, setCopyRecordingState] = useState("idle");
  const [copyKfMoveState, setCopyKfMoveState] = useState("idle");
  const [copyFixAllState, setCopyFixAllState] = useState("idle");
  const copyAnimationResetRef = useRef(null);
  const copyDrawResetRef = useRef(null);
  const copyKeyToolResetRef = useRef(null);
  const copyPlaceBallResetRef = useRef(null);
  const copyVideoExportResetRef = useRef(null);
  const copyRecordingResetRef = useRef(null);
  const copyKfMoveResetRef = useRef(null);
  const copyFixAllResetRef = useRef(null);

  useEffect(
    () => () => {
      if (copyAnimationResetRef.current) {
        clearTimeout(copyAnimationResetRef.current);
        copyAnimationResetRef.current = null;
      }
      if (copyDrawResetRef.current) {
        clearTimeout(copyDrawResetRef.current);
        copyDrawResetRef.current = null;
      }
      if (copyKeyToolResetRef.current) {
        clearTimeout(copyKeyToolResetRef.current);
        copyKeyToolResetRef.current = null;
      }
      if (copyPlaceBallResetRef.current) {
        clearTimeout(copyPlaceBallResetRef.current);
        copyPlaceBallResetRef.current = null;
      }
      if (copyVideoExportResetRef.current) {
        clearTimeout(copyVideoExportResetRef.current);
        copyVideoExportResetRef.current = null;
      }
      if (copyRecordingResetRef.current) {
        clearTimeout(copyRecordingResetRef.current);
        copyRecordingResetRef.current = null;
      }
      if (copyKfMoveResetRef.current) {
        clearTimeout(copyKfMoveResetRef.current);
        copyKfMoveResetRef.current = null;
      }
      if (copyFixAllResetRef.current) {
        clearTimeout(copyFixAllResetRef.current);
        copyFixAllResetRef.current = null;
      }
    },
    []
  );

  const handleCopyAnimationDebug = async (event) => {
    event.stopPropagation();
    if (!onCopyDebug) return;
    try {
      const ok = await onCopyDebug();
      setCopyAnimationState(ok ? "copied" : "error");
    } catch {
      setCopyAnimationState("error");
    }
    if (copyAnimationResetRef.current) {
      clearTimeout(copyAnimationResetRef.current);
    }
    copyAnimationResetRef.current = setTimeout(() => {
      setCopyAnimationState("idle");
      copyAnimationResetRef.current = null;
    }, 1500);
  };

  const handleCopyDrawDebug = async (event) => {
    event.stopPropagation();
    if (!onCopyDrawDebug) return;
    try {
      const ok = await onCopyDrawDebug();
      setCopyDrawState(ok ? "copied" : "error");
    } catch {
      setCopyDrawState("error");
    }
    if (copyDrawResetRef.current) {
      clearTimeout(copyDrawResetRef.current);
    }
    copyDrawResetRef.current = setTimeout(() => {
      setCopyDrawState("idle");
      copyDrawResetRef.current = null;
    }, 1500);
  };

  const handleCopyKeyToolDebug = async (event) => {
    event.stopPropagation();
    if (!onCopyKeyToolDebug) return;
    try {
      const ok = await onCopyKeyToolDebug();
      setCopyKeyToolState(ok ? "copied" : "error");
    } catch {
      setCopyKeyToolState("error");
    }
    if (copyKeyToolResetRef.current) {
      clearTimeout(copyKeyToolResetRef.current);
    }
    copyKeyToolResetRef.current = setTimeout(() => {
      setCopyKeyToolState("idle");
      copyKeyToolResetRef.current = null;
    }, 1500);
  };

  const handleCopyVideoExportDebug = async (event) => {
    event.stopPropagation();
    if (!onCopyVideoExportDebug) return;
    try {
      const ok = await onCopyVideoExportDebug();
      setCopyVideoExportState(ok ? "copied" : "error");
    } catch {
      setCopyVideoExportState("error");
    }
    if (copyVideoExportResetRef.current) {
      clearTimeout(copyVideoExportResetRef.current);
    }
    copyVideoExportResetRef.current = setTimeout(() => {
      setCopyVideoExportState("idle");
      copyVideoExportResetRef.current = null;
    }, 1500);
  };

  const handleCopyPlaceBallDebug = async (event) => {
    event.stopPropagation();
    if (!onCopyPlaceBallDebug) return;
    try {
      const ok = await onCopyPlaceBallDebug();
      setCopyPlaceBallState(ok ? "copied" : "error");
    } catch {
      setCopyPlaceBallState("error");
    }
    if (copyPlaceBallResetRef.current) {
      clearTimeout(copyPlaceBallResetRef.current);
    }
    copyPlaceBallResetRef.current = setTimeout(() => {
      setCopyPlaceBallState("idle");
      copyPlaceBallResetRef.current = null;
    }, 1500);
  };

  const handleCopyRecordingDebug = async (event) => {
    event.stopPropagation();
    if (!onCopyRecordingDebug) return;
    try {
      const ok = await onCopyRecordingDebug();
      setCopyRecordingState(ok ? "copied" : "error");
    } catch {
      setCopyRecordingState("error");
    }
    if (copyRecordingResetRef.current) {
      clearTimeout(copyRecordingResetRef.current);
    }
    copyRecordingResetRef.current = setTimeout(() => {
      setCopyRecordingState("idle");
      copyRecordingResetRef.current = null;
    }, 1500);
  };

  const handleCopyKfMoveDebug = async (event) => {
    event.stopPropagation();
    if (!onCopyKfMoveDebug) return;
    try {
      const ok = await onCopyKfMoveDebug();
      setCopyKfMoveState(ok ? "copied" : "error");
    } catch {
      setCopyKfMoveState("error");
    }
    if (copyKfMoveResetRef.current) {
      clearTimeout(copyKfMoveResetRef.current);
    }
    copyKfMoveResetRef.current = setTimeout(() => {
      setCopyKfMoveState("idle");
      copyKfMoveResetRef.current = null;
    }, 1500);
  };

  const handleCopyFixAllDebug = async (event) => {
    event.stopPropagation();
    if (!onCopyFixAllDebug) return;
    try {
      const ok = await onCopyFixAllDebug();
      setCopyFixAllState(ok ? "copied" : "error");
    } catch {
      setCopyFixAllState("error");
    }
    if (copyFixAllResetRef.current) {
      clearTimeout(copyFixAllResetRef.current);
    }
    copyFixAllResetRef.current = setTimeout(() => {
      setCopyFixAllState("idle");
      copyFixAllResetRef.current = null;
    }, 1500);
  };

  return (
    <div className="flex flex-col border-b border-BrandGray2 pb-2 sm:pb-3 md:pb-4 items-start justify-center gap-1 sm:gap-2">
      <div className="text-BrandWhite text-xs sm:text-sm md:text-base font-DmSans">Debug Logs</div>
      <button
        type="button"
        onClick={handleCopyFixAllDebug}
        className="mt-1 h-7 sm:h-8 w-full bg-BrandOrange/20 border border-BrandOrange text-BrandOrange rounded-md px-2 text-[10px] sm:text-[11px] md:text-[12px] font-DmSans font-semibold cursor-pointer"
      >
        {copyFixAllState === "copied"
          ? "Copied!"
          : copyFixAllState === "error"
            ? "Copy Failed"
            : "Copy Player + Keyframe Debug"}
      </button>
      <button
        type="button"
        onClick={handleCopyAnimationDebug}
        className="mt-1 h-6 sm:h-7 w-full bg-BrandBlack2 border border-BrandGray text-BrandOrange rounded-md px-2 text-[10px] sm:text-[11px] md:text-[12px] font-DmSans cursor-pointer"
      >
        {copyAnimationState === "copied"
          ? "Copied"
          : copyAnimationState === "error"
            ? "Copy Failed"
            : "Copy Animation Debug"}
      </button>
      <button
        type="button"
        onClick={handleCopyDrawDebug}
        className="h-6 sm:h-7 w-full bg-BrandBlack2 border border-BrandGray text-BrandOrange rounded-md px-2 text-[10px] sm:text-[11px] md:text-[12px] font-DmSans cursor-pointer"
      >
        {copyDrawState === "copied"
          ? "Copied"
          : copyDrawState === "error"
            ? "Copy Failed"
            : "Copy Draw Debug"}
      </button>
      <button
        type="button"
        onClick={handleCopyKeyToolDebug}
        className="h-6 sm:h-7 w-full bg-BrandBlack2 border border-BrandGray text-BrandOrange rounded-md px-2 text-[10px] sm:text-[11px] md:text-[12px] font-DmSans cursor-pointer"
      >
        {copyKeyToolState === "copied"
          ? "Copied"
          : copyKeyToolState === "error"
            ? "Copy Failed"
            : "Copy Keyboard/Tool Debug"}
      </button>
      <button
        type="button"
        onClick={handleCopyVideoExportDebug}
        className="h-6 sm:h-7 w-full bg-BrandBlack2 border border-BrandGray text-BrandOrange rounded-md px-2 text-[10px] sm:text-[11px] md:text-[12px] font-DmSans cursor-pointer"
      >
        {copyVideoExportState === "copied"
          ? "Copied"
          : copyVideoExportState === "error"
            ? "Copy Failed"
            : "Copy Video Export Debug"}
      </button>
      <button
        type="button"
        onClick={handleCopyRecordingDebug}
        className="h-6 sm:h-7 w-full bg-BrandBlack2 border border-BrandGray text-BrandOrange rounded-md px-2 text-[10px] sm:text-[11px] md:text-[12px] font-DmSans cursor-pointer"
      >
        {copyRecordingState === "copied"
          ? "Copied"
          : copyRecordingState === "error"
            ? "Copy Failed"
            : "Copy Recording Debug"}
      </button>
      <button
        type="button"
        onClick={handleCopyKfMoveDebug}
        className="h-6 sm:h-7 w-full bg-BrandBlack2 border border-BrandGray text-BrandOrange rounded-md px-2 text-[10px] sm:text-[11px] md:text-[12px] font-DmSans cursor-pointer"
      >
        {copyKfMoveState === "copied"
          ? "Copied"
          : copyKfMoveState === "error"
            ? "Copy Failed"
            : "Copy Keyframe Move Debug"}
      </button>
      <button
        type="button"
        onClick={handleCopyPlaceBallDebug}
        className="h-6 sm:h-7 w-full bg-BrandBlack2 border border-BrandGray text-BrandOrange rounded-md px-2 text-[10px] sm:text-[11px] md:text-[12px] font-DmSans cursor-pointer"
      >
        {copyPlaceBallState === "copied"
          ? "Copied"
          : copyPlaceBallState === "error"
            ? "Copy Failed"
            : "Copy Place Ball Debug"}
      </button>
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onDebugRotate?.();
        }}
        className="h-6 sm:h-7 w-full bg-BrandBlack2 border border-BrandGray text-BrandOrange rounded-md px-2 text-[10px] sm:text-[11px] md:text-[12px] font-DmSans cursor-pointer"
      >
        Debug Rotate
      </button>
    </div>
  );
}
