import React from "react";
import PlayNameEditor from "./PlayNameEditor";
import FieldSettingsSection from "./FieldSettingsSection";
import PlayersSection from "./PlayersSection";
import AdvancedSettingsButton from "./AdvancedSettingsButton";
import AllPlayersSection from "./AllPlayersSection";
import ExportActions from "./ExportActions";

export default function RightPanel({
  playName,
  onPlayNameChange,

  zoomPercent,
  onZoomIn,
  onZoomOut,
  onZoomPercentChange,

  onRotateLeft,
  onRotateCenter,
  onRotateRight,
  onUndo,
  onRedo,
  onReset,

  playersById,
  representedPlayerIds,
  selectedPlayerId,
  onSelectPlayer,

  allPlayersDisplay,
  onAllPlayersDisplayChange,

  advancedSettingsOpen,
  onOpenAdvancedSettings,

  onSaveToPlaybook,
  onDownload,
}) {
  return (
    <aside
      className="
        h-screen shrink-0 bg-BrandBlack
        w-32 sm:w-36 md:w-40 lg:w-44 xl:w-48
        px-2 sm:px-2.5 md:px-3 py-2 sm:py-2.5 md:py-3
        flex flex-col
        gap-0.5 sm:gap-0.5 md:gap-1 lg:gap-1.5
        select-none
        overflow-y-visible
        justify-center
        z-50
      "
    >
      <PlayNameEditor value={playName} onChange={onPlayNameChange} maxLength={10} />

      <FieldSettingsSection
        zoomPercent={zoomPercent}
        onZoomIn={onZoomIn}
        onZoomOut={onZoomOut}
        onZoomPercentChange={onZoomPercentChange}
        onRotateLeft={onRotateLeft}
        onRotateCenter={onRotateCenter}
        onRotateRight={onRotateRight}
        onUndo={onUndo}
        onRedo={onRedo}
        onReset={onReset}
      />

      <PlayersSection
        playersById={playersById}
        representedPlayerIds={representedPlayerIds}
        selectedPlayerId={selectedPlayerId}
        onSelectPlayer={onSelectPlayer}
      />

      <AdvancedSettingsButton isOpen={advancedSettingsOpen} onOpen={onOpenAdvancedSettings} />

      <AllPlayersSection value={allPlayersDisplay} onChange={onAllPlayersDisplayChange} />

      <ExportActions onSaveToPlaybook={onSaveToPlaybook} onDownload={onDownload} />
    </aside>
  );
}

