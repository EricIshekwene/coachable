import { useMemo, useRef } from "react";
import { FiGrid, FiLayers } from "react-icons/fi";
import AnimationDrawingTools from "../../../components/AnimationDrawingTools";
import ControlPill from "../../../components/controlPill/ControlPill";
import MobileEditorBar from "../../../components/MobileEditorBar";
import DrawToolsPill from "../../../components/DrawToolsPill";
import AddPlayerSection from "../../../components/sidebar/AddPlayerSection";
import HistoryActionsSection from "../../../components/sidebar/HistoryActionsSection";
import PenToolSection from "../../../components/sidebar/PenToolSection";
import PlayerColorSection, { PLAYER_COLORS } from "../../../components/sidebar/PlayerColorSection";
import PrefabsSection from "../../../components/sidebar/PrefabsSection";
import PresetSection from "../../../components/sidebar/PresetSection";
import SelectToolSection from "../../../components/sidebar/SelectToolSection";
import { DSPageHeading } from "../dsPrimitives";

const noop = () => {};
const NOOP_SEEK = () => {};

/**
 * Dark reference card for the Slate editor zone — the editor uses a different
 * visual language (near-black surfaces) from the admin shell, so its examples
 * are staged on their own canvas.
 *
 * @param {{ title: string, description: string, children: React.ReactNode, className?: string }} props
 * @returns {JSX.Element}
 */
function SlateCard({ title, description, children, className = "" }) {
  return (
    <div className={`min-w-0 overflow-hidden rounded-[24px] border border-white/10 bg-[rgba(255,255,255,0.03)] p-5 ${className}`}>
      <div className="mb-4">
        <p className="text-sm font-semibold text-white">{title}</p>
        <p className="mt-1 text-xs leading-5 text-white/55">{description}</p>
      </div>
      {children}
    </div>
  );
}

/**
 * Real Slate sidebar section components rendered in their wide-row variant so
 * the full control set can be compared side by side.
 *
 * @returns {JSX.Element}
 */
function SidebarRows() {
  const selectRef = useRef(null);
  const penRef = useRef(null);
  const addRef = useRef(null);
  const colorRef = useRef(null);
  const prefabsRef = useRef(null);
  const presetRef = useRef(null);

  const samplePrefabs = [
    { id: "lineout", label: "Lineout", mode: "offense", icon: <FiGrid className="text-BrandOrange text-xl" /> },
    { id: "kickoff", label: "Kickoff", mode: "defense", icon: <FiLayers className="text-BrandOrange text-xl" /> },
  ];

  return (
    <div className="rounded-[24px] border border-white/8 bg-[#121212] p-4 sm:p-5">
      <div className="flex flex-wrap gap-3">
        <div className="w-full min-w-0 sm:w-[236px]">
          <SelectToolSection wide selectToolType="select" isSelected openPopover={null} hoveredTooltip={null} anchorRef={selectRef} onToolSelect={noop} onSelectSubTool={noop} onPopoverToggle={noop} onPopoverClose={noop} onHoverTooltip={noop} />
        </div>
        <div className="w-full min-w-0 sm:w-[236px]">
          <PenToolSection wide isSelected={false} hoveredTooltip={null} anchorRef={penRef} onToolSelect={noop} onHoverTooltip={noop} />
        </div>
        <div className="w-full min-w-0 sm:w-[236px]">
          <AddPlayerSection wide isSelected={false} openPopover={null} hoveredTooltip={null} numberValue="" nameValue="" anchorRef={addRef} onToolSelect={noop} onPopoverToggle={noop} onPopoverClose={noop} onNumberChange={noop} onNameChange={noop} onHoverTooltip={noop} onAddPlayer={noop} onQuickAdd={noop} />
        </div>
        <div className="w-full min-w-0 sm:w-[236px]">
          <PlayerColorSection wide playerColor={PLAYER_COLORS.red} isSelected={false} openPopover={null} hoveredTooltip={null} anchorRef={colorRef} onToolSelect={noop} onPlayerColorChange={noop} onPopoverToggle={noop} onPopoverClose={noop} onHoverTooltip={noop} onQuickAdd={noop} />
        </div>
        <div className="w-full min-w-0 sm:w-[236px]">
          <PrefabsSection wide prefabs={samplePrefabs} openPopover={null} hoveredTooltip={null} anchorRef={prefabsRef} onPopoverToggle={noop} onPopoverClose={noop} onPrefabSelect={noop} onDeleteCustomPrefab={noop} onHoverTooltip={noop} />
        </div>
        <div className="w-full min-w-0 sm:w-[236px]">
          <PresetSection wide openPopover={null} hoveredTooltip={null} anchorRef={presetRef} onPopoverToggle={noop} onPopoverClose={noop} onHoverTooltip={noop} />
        </div>
        <div className="w-full min-w-0 sm:w-[236px]">
          <HistoryActionsSection wide onUndo={noop} onRedo={noop} onReset={noop} hoveredTooltip={null} onHoverTooltip={noop} />
        </div>
      </div>
    </div>
  );
}

/**
 * Slate UI reference: the editor-specific control language (sidebar tool rows,
 * floating tool pills, control pill, mobile editor bar), staged on the dark
 * editor canvas to keep it visually separate from the admin design system.
 *
 * @returns {JSX.Element}
 */
export default function SlateSection() {
  const controlTimeRef = useRef(18500);
  const mobileTimeRef = useRef(32000);

  const playersById = useMemo(() => ({
    p1: { id: "p1", number: "10", name: "Maya Jordan", color: "#ef4444", hidden: false },
    p2: { id: "p2", number: "22", name: "Nick Porter", color: "#3b82f6", hidden: false },
    p3: { id: "p3", number: "7", name: "Lena Cho", color: "#f59e0b", hidden: false },
  }), []);

  const advancedSettings = useMemo(() => ({
    pitch: { fieldType: "rugby", pitchColor: "#4FA85D" },
    players: { baseSizePx: 30 },
    ball: { sizePercent: 100, coneSizePercent: 70 },
    animation: {},
  }), []);

  return (
    <div className="flex flex-col gap-10">
      <DSPageHeading
        eyebrow="Editor"
        title="Slate editor UI"
        lead="The play editor (Slate) uses a deliberately different visual language from the admin shell and marketing site: near-black floating surfaces, rounded pills, and tool rails optimized for a canvas-first workflow. These are the real editor components, rendered live on the editor's own dark canvas."
      />

      <div className="min-w-0 overflow-hidden rounded-[32px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8"
        style={{ background: "linear-gradient(180deg, #050608 0%, #0b0f14 42%, #121212 100%)", border: "1px solid rgba(255,255,255,0.06)", boxShadow: "0 32px 70px rgba(0,0,0,0.28)" }}>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/40">Slate-only controls</p>
            <p className="mt-2 text-lg font-semibold text-white">Native editor buttons, pills, tool rails, and mobile controls</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-semibold text-white/55">Black surface</span>
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-semibold text-white/55">Separate from admin tokens</span>
          </div>
        </div>

        <div className="grid gap-5">
          <SlateCard title="SidebarRoot" description="The real Slate sidebar section components in their wide-row variant, so the full control set can be compared side by side without the tall editor rail.">
            <SidebarRows />
          </SlateCard>

          <SlateCard title="Slate tool pills" description="The real floating annotation and motion drawing pills, rendered at their actual control sizes with enough stage width to match the editor.">
            <div className="grid gap-4">
              <div className="relative isolate min-h-[164px] overflow-hidden rounded-[24px] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0.01))]">
                <DrawToolsPill activeSubTool="draw" onSubToolChange={noop} onClose={noop} />
              </div>
              <div className="relative isolate min-h-[164px] overflow-hidden rounded-[24px] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0.01))]">
                <AnimationDrawingTools activeSubTool="arrow" onSubToolChange={noop} hideDrawings={false} onToggleHideDrawings={noop} />
              </div>
            </div>
          </SlateCard>

          <SlateCard title="ControlPill" description="The current live ControlPill styling with a full-width stage so the real pill, slider, and rail fit without overlapping other previews.">
            <div className="relative isolate min-h-[210px] overflow-hidden rounded-[24px] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0.01))]">
              <ControlPill
                durationMs={45000}
                currentTimeMs={18500}
                isPlaying={false}
                speedMultiplier={1.5}
                keyframesMs={[0, 8500, 18500, 31000, 42000]}
                selectedKeyframeMs={18500}
                onSeek={NOOP_SEEK}
                onPause={noop}
                onPlayToggle={noop}
                onSpeedChange={noop}
                onAddKeyframe={noop}
                onDeleteKeyframe={noop}
                onSelectKeyframe={noop}
                onMoveKeyframe={noop}
                getAuthoritativeTimeMs={() => controlTimeRef.current}
                onDragStateChange={noop}
              />
            </div>
          </SlateCard>

          <SlateCard title="MobileEditorBar" description="The real mobile editor bar in local preview mode so the top tabs, sheet, and bottom timeline keep their true sizes.">
            <div className="relative min-h-[640px] overflow-hidden rounded-[24px] border border-white/8 bg-[#111]">
              <MobileEditorBar
                previewMode
                initialActiveSheet="tools"
                durationMs={60000}
                currentTimeMs={32000}
                currentTimeMsRef={mobileTimeRef}
                isPlaying={false}
                keyframesMs={[0, 12000, 28000, 44000, 56000]}
                selectedKeyframeMs={28000}
                onSeek={NOOP_SEEK}
                onPause={noop}
                onPlayToggle={noop}
                onAddKeyframe={noop}
                onSelectKeyframe={noop}
                onDeleteKeyframe={noop}
                onMoveKeyframe={noop}
                activeTool="select"
                onToolChange={noop}
                onUndo={noop}
                onRedo={noop}
                onReset={noop}
                zoomPercent={100}
                onZoomIn={noop}
                onZoomOut={noop}
                selectedItemIds={[1, 2]}
                onSavePrefab={noop}
                playersById={playersById}
                representedPlayerIds={["p1", "p2"]}
                selectedPlayerIds={["p1"]}
                playerEditor={{ open: false, id: null, draft: {} }}
                fieldType="rugby"
                onSelectPlayer={noop}
                onDeletePlayer={noop}
                onEditPlayer={noop}
                onEditDraftChange={noop}
                onCloseEditPlayer={noop}
                onTogglePlayerHidden={noop}
                customPrefabs={[]}
                publishedPrefabs={[]}
                onPrefabSelect={noop}
                onDeleteCustomPrefab={noop}
                allPlayersDisplay={{ sizePercent: 100 }}
                onAllPlayersDisplayChange={noop}
                advancedSettings={advancedSettings}
                onAdvancedSettingsChange={noop}
                onAdvancedSettingsReset={noop}
                onFieldTypeChange={noop}
                autoplayEnabled={false}
                onAutoplayChange={noop}
                onDeleteAllKeyframes={noop}
                onDownload={noop}
                onImport={noop}
                adminMode
              />
            </div>
          </SlateCard>
        </div>
      </div>
    </div>
  );
}
