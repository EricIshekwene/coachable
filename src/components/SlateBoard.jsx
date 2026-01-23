import React, { useMemo } from "react";
import SlateCanvas from "./SlateCanvas";
import { interpolateSnapshots, useSlate } from "./SlateContext";
import pitchMarkings from "../pitch-markings.svg";

const getRenderSnapshot = (state, playback) => {
  const fallback = {
    objects: state.objects,
    field: state.field,
    display: state.display,
  };
  if (!playback.isPlaying || state.keyframes.length < 2) {
    return fallback;
  }
  const progress = playback.timePercent / 100;
  const segmentCount = state.keyframes.length - 1;
  const position = progress * segmentCount;
  const segmentIndex = Math.min(segmentCount - 1, Math.floor(position));
  const t = position - segmentIndex;
  const startSnapshot = state.keyframes[segmentIndex].snapshot;
  const endSnapshot = state.keyframes[(segmentIndex + 1) % state.keyframes.length].snapshot;
  return interpolateSnapshots(startSnapshot, endSnapshot, t);
};

export default function SlateBoard() {
  const { state, dispatch, playback } = useSlate();

  const renderSnapshot = useMemo(
    () => getRenderSnapshot(state, playback),
    [state, playback]
  );

  return (
    <main className="flex-1 flex items-stretch justify-center relative px-4 py-4">
      <div className="w-full h-full rounded-[32px] bg-BrandGreen/80 border border-BrandBlack/20 shadow-inner relative overflow-hidden">
        <SlateCanvas
          objects={renderSnapshot.objects}
          selectedId={state.selectedId}
          onSelect={(id) => dispatch({ type: "SET_SELECTED", value: id })}
          onMove={(id, x, y) => dispatch({ type: "UPDATE_OBJECT", id, value: { x, y }, record: false })}
          onMoveEnd={(id, x, y) => dispatch({ type: "UPDATE_OBJECT", id, value: { x, y }, record: true })}
          field={renderSnapshot.field}
          display={renderSnapshot.display}
          isPlaying={playback.isPlaying}
          pitchMarkings={pitchMarkings}
        />
      </div>
    </main>
  );
}

