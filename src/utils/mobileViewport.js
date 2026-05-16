function getViewportMetrics() {
  const visualViewport = window.visualViewport;
  const viewportHeight = Math.round(visualViewport?.height ?? window.innerHeight);
  const keyboardInset = visualViewport
    ? Math.max(0, Math.round(window.innerHeight - visualViewport.height - visualViewport.offsetTop))
    : 0;

  return {
    viewportHeight,
    keyboardInset,
  };
}

function writeViewportVars() {
  const root = document.documentElement;
  const { viewportHeight, keyboardInset } = getViewportMetrics();

  root.style.setProperty("--app-viewport-height", `${viewportHeight}px`);
  root.style.setProperty("--app-keyboard-inset", `${keyboardInset}px`);
}

function isEditableField(node) {
  if (!(node instanceof HTMLElement)) return false;
  if (node.isContentEditable) return true;
  if (!(node instanceof HTMLInputElement || node instanceof HTMLTextAreaElement || node instanceof HTMLSelectElement)) {
    return false;
  }

  if (node instanceof HTMLInputElement) {
    const blockedTypes = new Set(["button", "checkbox", "color", "file", "hidden", "image", "radio", "range", "reset", "submit"]);
    return !blockedTypes.has(node.type);
  }

  return true;
}

function shouldAssistFocus() {
  if (typeof window.matchMedia !== "function") return true;
  return window.matchMedia("(pointer: coarse), (max-width: 1024px)").matches;
}

export function installMobileViewportFixes() {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return () => {};
  }

  writeViewportVars();

  const handleViewportChange = () => {
    writeViewportVars();
  };

  let focusTimeout = 0;
  const handleFocusIn = (event) => {
    if (!shouldAssistFocus()) return;
    if (!isEditableField(event.target)) return;

    window.clearTimeout(focusTimeout);
    focusTimeout = window.setTimeout(() => {
      writeViewportVars();
      event.target.scrollIntoView({
        block: "center",
        inline: "nearest",
        behavior: "smooth",
      });
    }, 220);
  };

  const visualViewport = window.visualViewport;

  window.addEventListener("resize", handleViewportChange);
  window.addEventListener("orientationchange", handleViewportChange);
  document.addEventListener("focusin", handleFocusIn);
  visualViewport?.addEventListener("resize", handleViewportChange);
  visualViewport?.addEventListener("scroll", handleViewportChange);

  return () => {
    window.clearTimeout(focusTimeout);
    window.removeEventListener("resize", handleViewportChange);
    window.removeEventListener("orientationchange", handleViewportChange);
    document.removeEventListener("focusin", handleFocusIn);
    visualViewport?.removeEventListener("resize", handleViewportChange);
    visualViewport?.removeEventListener("scroll", handleViewportChange);
  };
}
