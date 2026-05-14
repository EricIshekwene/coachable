import Slate from "./Slate";

/**
 * Drawing mode slate — admin-only sandbox for iterating on arrow-drawing
 * animation UX. Starts as a full copy of Slate; diverge freely from here.
 *
 * @param {{ onShowMessage: Function, adminMode?: boolean }} props
 */
export default function SlateDrawing({ onShowMessage, adminMode = true }) {
  return (
    <Slate
      onShowMessage={onShowMessage}
      adminMode={adminMode}
      testVariant
      drawingMode
    />
  );
}
