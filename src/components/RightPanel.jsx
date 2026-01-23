import React, { useState, useRef, useEffect, useMemo } from "react";
import { FiEdit } from "react-icons/fi";
import { BiUndo, BiRedo } from "react-icons/bi";
import { PanelButton, PlayerButton } from "./subcomponents/Buttons.jsx";
import { MdOutlineResetTv, MdOutlineZoomIn, MdOutlineZoomOut } from "react-icons/md";
import { FiRotateCcw, FiRotateCw } from "react-icons/fi";
import { TbRotateDot } from "react-icons/tb";
import { IoSettingsOutline } from "react-icons/io5";
import { IoMdDownload } from "react-icons/io";
import { ImCheckboxUnchecked, ImCheckboxChecked } from "react-icons/im";
import { BsBookmarkPlus } from "react-icons/bs";
import { Popover } from "./subcomponents/Popovers";
import { ColorPickerPopover } from "./subcomponents/ColorPickerPopover";
import { exportPlayJson, useSlate } from "./SlateContext";

export default function RightPanel({ onOpenAdvancedSettings }) {
  const iconClass = "text-BrandOrange text-sm sm:text-base md:text-lg lg:text-xl";
  const { state, dispatch } = useSlate();
  const [isEditing, setIsEditing] = useState(false);
  const inputRef = useRef(null);
  const [hoveredTooltip, setHoveredTooltip] = useState(null);
  const [zoomPercentage, setZoomPercentage] = useState(Math.round(state.field.zoom * 100));
  const [isEditingZoom, setIsEditingZoom] = useState(false);
  const zoomInputRef = useRef(null);
  const [colorPopoverOpen, setColorPopoverOpen] = useState(false);
  const [isEditingHex, setIsEditingHex] = useState(false);
  const [hexValue, setHexValue] = useState(state.defaultPlayerColor);
  const colorEditButtonRef = useRef(null);
  const hexInputRef = useRef(null);

  const selectedObject = useMemo(
    () => state.objects.find((obj) => obj.id === state.selectedId) ?? null,
    [state.objects, state.selectedId]
  );
  const selectedPlayer = selectedObject?.type === "player" ? selectedObject : null;
  const playerColor = selectedPlayer?.color ?? state.defaultPlayerColor;
  const playerSize = selectedPlayer?.size ?? state.defaultPlayerSize;

  const players = state.objects.filter((obj) => obj.type === "player");
  const listItems = [...players, ...state.objects.filter((obj) => obj.type === "ball")];

  useEffect(() => {
    setZoomPercentage(Math.round(state.field.zoom * 100));
  }, [state.field.zoom]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleEnableEdit = () => {
    if (state.playName.length <= 10) {
      setIsEditing(true);
    }
  };

  const handleSaveName = () => {
    setIsEditing(false);
  };

  const handleNameChange = (e) => {
    const value = e.target.value;
    if (value.length <= 10) {
      dispatch({ type: "SET_PLAY_NAME", value });
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      handleSaveName();
    } else if (e.key === "Escape") {
      setIsEditing(false);
    }
  };

  useEffect(() => {
    if (isEditingZoom && zoomInputRef.current) {
      zoomInputRef.current.focus();
      zoomInputRef.current.select();
    }
  }, [isEditingZoom]);

  const handleZoomChange = (e) => {
    const value = e.target.value;
    if (value === "" || /^\d+$/.test(value)) {
      if (value === "") {
        setZoomPercentage(0);
      } else {
        const numValue = parseInt(value, 10);
        setZoomPercentage(numValue);
      }
    }
  };

  const handleSaveZoom = () => {
    let nextZoom = zoomPercentage;
    if (zoomPercentage === 0 || zoomPercentage < 30) {
      nextZoom = 30;
    } else if (zoomPercentage > 100) {
      nextZoom = 100;
    }
    setZoomPercentage(nextZoom);
    dispatch({ type: "SET_ZOOM", value: nextZoom / 100 });
    setIsEditingZoom(false);
  };

  const handleZoomKeyDown = (e) => {
    if (e.key === "Enter") {
      handleSaveZoom();
    } else if (e.key === "Escape") {
      setIsEditingZoom(false);
      setZoomPercentage(Math.round(state.field.zoom * 100));
    }
  };

  const handleZoomIn = () => {
    const newZoom = Math.min(zoomPercentage + 5, 100);
    setZoomPercentage(newZoom);
    dispatch({ type: "SET_ZOOM", value: newZoom / 100 });
  };

  const handleZoomOut = () => {
    const newZoom = Math.max(zoomPercentage - 5, 30);
    setZoomPercentage(newZoom);
    dispatch({ type: "SET_ZOOM", value: newZoom / 100 });
  };

  useEffect(() => {
    setHexValue(playerColor);
  }, [playerColor]);

  const handleHexChange = (e) => {
    setHexValue(e.target.value);
  };

  const handleColorCommit = (color) => {
    if (selectedPlayer) {
      dispatch({ type: "UPDATE_OBJECT", id: selectedPlayer.id, value: { color }, record: true });
    } else {
      dispatch({ type: "SET_DEFAULT_PLAYER", value: { defaultPlayerColor: color } });
    }
  };

  const handleHexSave = () => {
    const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    if (hexRegex.test(hexValue)) {
      handleColorCommit(hexValue);
    } else {
      setHexValue(playerColor);
    }
    setIsEditingHex(false);
  };

  const handleHexKeyDown = (e) => {
    if (e.key === "Enter") {
      handleHexSave();
    } else if (e.key === "Escape") {
      setHexValue(playerColor);
      setIsEditingHex(false);
    }
  };

  useEffect(() => {
    if (isEditingHex && hexInputRef.current) {
      hexInputRef.current.focus();
      hexInputRef.current.select();
    }
  }, [isEditingHex]);

  const updatePlayerSize = (nextSize) => {
    if (selectedPlayer) {
      dispatch({ type: "UPDATE_OBJECT", id: selectedPlayer.id, value: { size: nextSize }, record: true });
    } else {
      dispatch({ type: "SET_DEFAULT_PLAYER", value: { defaultPlayerSize: nextSize } });
    }
  };

  const handleExport = () => {
    const data = exportPlayJson(state);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${state.playName || "play"}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleSaveToPlaybook = () => {
    const data = exportPlayJson(state);
    const saved = JSON.parse(localStorage.getItem("coachable:playbook") || "[]");
    const next = [...saved, data];
    localStorage.setItem("coachable:playbook", JSON.stringify(next));
  };

  return (
    <aside
      className="
                     h-screen shrink-0  bg-BrandBlack
                     w-32 sm:w-36 md:w-40 lg:w-44 xl:w-48
                     px-2 sm:px-2.5 md:px-3 py-2 sm:py-2.5 md:py-3
                     flex flex-col
                     gap-0.5 sm:gap-0.5 md:gap-1 lg:gap-1.5
                     select-none
                     overflow-visible
                     flex flex-col justify-center

                   "
    >
      <div className="flex flex-col gap-0.5 sm:gap-0.5 md:gap-1 lg:gap-1.5 overflow-y-auto hide-scroll">
        {/* name */}
        <div className="flex flex-row border-b border-BrandGray2 pb-1.5 sm:pb-2 items-center justify-center gap-1.5 sm:gap-2 font-DmSans font-bold">
          {isEditing ? (
            <input
              ref={inputRef}
              type="text"
              value={state.playName}
              onChange={handleNameChange}
              onBlur={handleSaveName}
              onKeyDown={handleKeyDown}
              className="text-BrandWhite text-lg sm:text-xl md:text-2xl bg-transparent border-none outline-none focus:outline-none text-center font-DmSans font-bold w-full max-w-[100px] sm:max-w-[110px] md:max-w-[120px]"
              maxLength={10}
            />
          ) : (
            <div
              className="text-BrandWhite text-lg sm:text-xl md:text-2xl cursor-pointer"
              onClick={handleEnableEdit}
            >
              {state.playName}
            </div>
          )}
          <FiEdit
            className={`text-xs sm:text-sm cursor-pointer transition-colors ${state.playName.length > 10 ? "text-BrandGray cursor-not-allowed" : "text-BrandWhite hover:text-BrandOrange"}`}
            onClick={handleEnableEdit}
          />
        </div>

        {/* Field Setting */}
        <div className="flex flex-col border-b border-BrandGray2 pb-2 sm:pb-3 md:pb-4 items-start justify-center ">
          <div className="text-BrandOrange text-xs sm:text-sm md:text-base font-DmSans">
            Field Settings
          </div>
          <div className="w-full  grid grid-cols-3 gap-1.5 sm:gap-2 md:gap-3 mt-1 sm:mt-1.5 md:mt-2">
            {/* Rotate Counter-Clockwise */}
            <div
              className="relative"
              onMouseEnter={() => setHoveredTooltip("rotateCCW")}
              onMouseLeave={() => setHoveredTooltip(null)}
            >
              <PanelButton
                Icon={<FiRotateCcw className={iconClass} />}
                onHover={() => { }}
                onClick={() => dispatch({ type: "SET_FIELD_ROTATION", value: state.field.rotation - 5 })}
                isSelected={false}
              />
              {hoveredTooltip === "rotateCCW" && (
                <div className="absolute right-full mr-2 top-1/2 -translate-y-1/2 z-50 bg-BrandBlack2 rounded-md px-2 py-1.5 text-BrandWhite text-xs font-DmSans whitespace-nowrap shadow-lg border border-BrandGray/30 pointer-events-none">
                  Rotate Left
                </div>
              )}
            </div>

            {/* Rotate (Center) */}
            <div
              className="relative"
              onMouseEnter={() => setHoveredTooltip("rotate")}
              onMouseLeave={() => setHoveredTooltip(null)}
            >
              <PanelButton
                Icon={<TbRotateDot className={iconClass} />}
                onHover={() => { }}
                onClick={() => dispatch({ type: "SET_FIELD_ROTATION", value: 0 })}
                isSelected={false}
              />
              {hoveredTooltip === "rotate" && (
                <div className="absolute right-full mr-2 top-1/2 -translate-y-1/2 z-50 bg-BrandBlack2 rounded-md px-2 py-1.5 text-BrandWhite text-xs font-DmSans whitespace-nowrap shadow-lg border border-BrandGray/30 pointer-events-none">
                  Rotate
                </div>
              )}
            </div>

            {/* Rotate Clockwise */}
            <div
              className="relative"
              onMouseEnter={() => setHoveredTooltip("rotateCW")}
              onMouseLeave={() => setHoveredTooltip(null)}
            >
              <PanelButton
                Icon={<FiRotateCw className={iconClass} />}
                onHover={() => { }}
                onClick={() => dispatch({ type: "SET_FIELD_ROTATION", value: state.field.rotation + 5 })}
                isSelected={false}
              />
              {hoveredTooltip === "rotateCW" && (
                <div className="absolute right-full mr-2 top-1/2 -translate-y-1/2 z-50 bg-BrandBlack2 rounded-md px-2 py-1.5 text-BrandWhite text-xs font-DmSans whitespace-nowrap shadow-lg border border-BrandGray/30 pointer-events-none">
                  Rotate Right
                </div>
              )}
            </div>

            {/* Zoom Out */}
            <div
              className="relative"
              onMouseEnter={() => setHoveredTooltip("zoomOut")}
              onMouseLeave={() => setHoveredTooltip(null)}
            >
              <PanelButton Icon={<MdOutlineZoomOut className={iconClass} />} onHover={() => { }} onClick={handleZoomOut} isSelected={false} />
              {hoveredTooltip === "zoomOut" && (
                <div className="absolute right-full mr-2 top-1/2 -translate-y-1/2 z-50 bg-BrandBlack2 rounded-md px-2 py-1.5 text-BrandWhite text-xs font-DmSans whitespace-nowrap shadow-lg border border-BrandGray/30 pointer-events-none">
                  Zoom Out
                </div>
              )}
            </div>

            {/* Zoom Percentage (Editable) */}
            <div className="flex items-center justify-center m-auto">
              {isEditingZoom ? (
                <input
                  ref={zoomInputRef}
                  type="text"
                  value={zoomPercentage || ""}
                  onChange={handleZoomChange}
                  onBlur={handleSaveZoom}
                  onKeyDown={handleZoomKeyDown}
                  className="text-BrandWhite text-xs sm:text-sm md:text-base bg-transparent border-none outline-none focus:outline-none text-center font-DmSans w-10 sm:w-12"
                  maxLength={3}
                />
              ) : (
                <p
                  className="text-BrandWhite text-xs sm:text-sm md:text-base font-DmSans cursor-pointer"
                  onClick={() => setIsEditingZoom(true)}
                >
                  {zoomPercentage}%
                </p>
              )}
            </div>

            {/* Zoom In */}
            <div
              className="relative"
              onMouseEnter={() => setHoveredTooltip("zoomIn")}
              onMouseLeave={() => setHoveredTooltip(null)}
            >
              <PanelButton Icon={<MdOutlineZoomIn className={iconClass} />} onHover={() => { }} onClick={handleZoomIn} isSelected={false} />
              {hoveredTooltip === "zoomIn" && (
                <div className="absolute right-full mr-2 top-1/2 -translate-y-1/2 z-50 bg-BrandBlack2 rounded-md px-2 py-1.5 text-BrandWhite text-xs font-DmSans whitespace-nowrap shadow-lg border border-BrandGray/30 pointer-events-none">
                  Zoom In
                </div>
              )}
            </div>

            {/* Undo */}
            <div
              className="relative"
              onMouseEnter={() => setHoveredTooltip("undo")}
              onMouseLeave={() => setHoveredTooltip(null)}
            >
              <PanelButton Icon={<BiUndo className={iconClass} />} onHover={() => { }} onClick={() => dispatch({ type: "UNDO" })} isSelected={false} />
              {hoveredTooltip === "undo" && (
                <div className="absolute right-full mr-2 top-1/2 -translate-y-1/2 z-50 bg-BrandBlack2 rounded-md px-2 py-1.5 text-BrandWhite text-xs font-DmSans whitespace-nowrap shadow-lg border border-BrandGray/30 pointer-events-none">
                  Undo
                </div>
              )}
            </div>

            {/* Reset */}
            <div
              className="relative"
              onMouseEnter={() => setHoveredTooltip("reset")}
              onMouseLeave={() => setHoveredTooltip(null)}
            >
              <PanelButton Icon={<MdOutlineResetTv className={iconClass} />} onHover={() => { }} onClick={() => dispatch({ type: "RESET" })} isSelected={false} />
              {hoveredTooltip === "reset" && (
                <div className="absolute right-full mr-2 top-1/2 -translate-y-1/2 z-50 bg-BrandBlack2 rounded-md px-2 py-1.5 text-BrandWhite text-xs font-DmSans whitespace-nowrap shadow-lg border border-BrandGray/30 pointer-events-none">
                  Reset
                </div>
              )}
            </div>

            {/* Redo */}
            <div
              className="relative"
              onMouseEnter={() => setHoveredTooltip("redo")}
              onMouseLeave={() => setHoveredTooltip(null)}
            >
              <PanelButton Icon={<BiRedo className={iconClass} />} onHover={() => { }} onClick={() => dispatch({ type: "REDO" })} isSelected={false} />
              {hoveredTooltip === "redo" && (
                <div className="absolute right-full mr-2 top-1/2 -translate-y-1/2 z-50 bg-BrandBlack2 rounded-md px-2 py-1.5 text-BrandWhite text-xs font-DmSans whitespace-nowrap shadow-lg border border-BrandGray/30 pointer-events-none">
                  Redo
                </div>
              )}
            </div>
          </div>
        </div>

        {/*Players*/}
        <div className="flex flex-col border-b border-BrandGray2 pb-2 sm:pb-3 md:pb-4 items-start justify-center ">
          <div className="text-BrandOrange text-xs sm:text-sm md:text-base font-DmSans">
            Players ({players.length})
          </div>
          <div className="flex flex-col w-full items-start justify-start gap-0.5 sm:gap-1 mt-1 sm:mt-1.5 md:mt-2 max-h-[140px] overflow-y-auto">
            {listItems.map((player) => (
              <PlayerButton
                key={player.id}
                name={player.type === "ball" ? "Ball" : player.label}
                color={player.type === "ball" ? "#F8FAFC" : player.color}
                isSelected={state.selectedId === player.id}
                onClick={() => dispatch({ type: "SET_SELECTED", value: player.id })}
                onEdit={() => dispatch({ type: "SET_SELECTED", value: player.id })}
                onDelete={
                  player.type === "player"
                    ? () => dispatch({ type: "DELETE_PLAYER", id: player.id })
                    : undefined
                }
              />
            ))}
          </div>
        </div>

        {/* Advanced Settings */}
        <div className="w-full py-1 sm:py-1.5 md:py-2 border-b border-BrandGray2 pb-2 sm:pb-3 md:pb-4">
          <button
            onClick={() => onOpenAdvancedSettings?.()}
            className="w-full flex flex-row border-[0.5px] border-BrandGray2 justify-evenly bg-BrandBlack2 py-1.5 sm:py-2 px-2 sm:px-2.5 md:px-3 rounded-md items-center gap-0.5 sm:gap-1 cursor-pointer hover:bg-BrandBlack transition-colors duration-200"
          >
            <IoSettingsOutline className="text-BrandWhite text-sm sm:text-base md:text-lg" />
            <p className="text-BrandWhite text-[10px] sm:text-xs font-bold font-DmSans">
              Advanced Settings
            </p>
          </button>
        </div>

        {/* ALl players */}
        <div className="flex flex-col border-b border-BrandGray2 pb-1.5 sm:pb-2 items-start justify-center gap-0.5 ">
          <div className="text-BrandOrange text-xs sm:text-sm md:text-base font-DmSans">
            All Players ({players.length})
          </div>
          {/* size */}
          <div className="flex flex-row w-full items-center justify-between">
            <p className="text-BrandOrange text-[10px] sm:text-xs md:text-sm font-DmSans"> Size: {playerSize}%</p>
            <div className="flex flex-row items-center justify-between bg-BrandBlack2 border-[0.5px] border-BrandGray2 aspect-[2/1] w-2/7 rounded-md">
              <button
                onClick={() => updatePlayerSize(playerSize + 5)}
                className="text-BrandOrange font-bold m-auto text-xs sm:text-sm md:text-base hover:text-BrandOrange/80 transition-colors"
              >
                +
              </button>
              <button
                onClick={() => updatePlayerSize(Math.max(5, playerSize - 5))}
                className="text-BrandOrange font-bold m-auto text-xs sm:text-sm md:text-base hover:text-BrandOrange/80 transition-colors"
              >
                -
              </button>
            </div>
          </div>
          {/* color */}
          <div className="flex flex-col w-full items-start justify-between gap-0.5 sm:gap-1 relative">
            <p className="text-BrandOrange text-[10px] sm:text-xs md:text-sm font-DmSans">Color:</p>
            <div className="w-full flex flex-row bg-BrandBlack2 border-[0.5px] border-BrandGray2 rounded-md items-center justify-between py-0.5 sm:py-1 px-1.5 sm:px-2 gap-1.5 sm:gap-2">
              {/* Color circle */}
              <div
                className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 aspect-square rounded-full border-[0.5px] border-BrandGray shrink-0"
                style={{ backgroundColor: playerColor }}
              ></div>
              {/* Hex color text - editable */}
              {isEditingHex ? (
                <input
                  ref={hexInputRef}
                  type="text"
                  value={hexValue}
                  onChange={handleHexChange}
                  onBlur={handleHexSave}
                  onKeyDown={handleHexKeyDown}
                  className="text-BrandOrange text-[10px] sm:text-xs md:text-sm font-DmSans flex-1 bg-transparent border-none outline-none focus:outline-none"
                  maxLength={7}
                />
              ) : (
                <p
                  onClick={() => setIsEditingHex(true)}
                  className="text-BrandOrange text-[10px] sm:text-xs md:text-sm font-DmSans flex-1 cursor-pointer"
                >
                  {playerColor.toUpperCase()}
                </p>
              )}
              {/* Edit button */}
              <button
                ref={colorEditButtonRef}
                onClick={() => setColorPopoverOpen(!colorPopoverOpen)}
                className="text-BrandOrange hover:text-BrandOrange/80 transition-colors shrink-0"
              >
                <FiEdit className="text-BrandOrange text-xs sm:text-sm" />
              </button>
            </div>
            {/* Color Picker Popover */}
            <Popover
              isOpen={colorPopoverOpen}
              onClose={() => setColorPopoverOpen(false)}
              anchorRef={colorEditButtonRef}
              position="left"
              topOffset="top-40 -translate-y-full -mt-2"
              marginRight={6}
            >
              <ColorPickerPopover
                color={playerColor}
                onChange={(color) => {
                  handleColorCommit(color.hex);
                }}
              />
            </Popover>
          </div>

          {/* show number */}
          <div className="flex flex-row w-full items-center justify-between">
            <p className="text-BrandOrange text-[10px] sm:text-xs md:text-sm font-DmSans"> Show Number:</p>
            <button
              onClick={() => dispatch({ type: "SET_DISPLAY_SETTINGS", value: { showNumber: !state.display.showNumber } })}
              className="focus:outline-none cursor-pointer"
            >
              {state.display.showNumber ? (
                <ImCheckboxChecked className="text-BrandOrange w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4" />
              ) : (
                <ImCheckboxUnchecked className="text-BrandGray2 w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4" />
              )}
            </button>
          </div>

          {/* show name */}
          <div className="flex flex-row w-full items-center justify-between">
            <p className="text-BrandOrange text-[10px] sm:text-xs md:text-sm font-DmSans"> Show Name:</p>
            <button
              onClick={() => dispatch({ type: "SET_DISPLAY_SETTINGS", value: { showName: !state.display.showName } })}
              className="focus:outline-none cursor-pointer"
            >
              {state.display.showName ? (
                <ImCheckboxChecked className="text-BrandOrange w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4" />
              ) : (
                <ImCheckboxUnchecked className="text-BrandGray2 w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4" />
              )}
            </button>
          </div>
        </div>
        {/* Save to Playbook */}
        <div className="w-full flex flex-col justify-center items-center ">
          <button
            onClick={handleSaveToPlaybook}
            className="w-full flex flex-row justify-evenly items-center bg-BrandOrange text-BrandBlack font-bold text-[10px] sm:text-xs md:text-sm font-DmSans rounded-md py-0.5 sm:py-1"
          >
            <BsBookmarkPlus className="text-BrandBlack text-sm sm:text-base md:text-lg" />
            <p className="text-BrandBlack text-[10px] sm:text-xs md:text-sm font-DmSans">Save to Playbook</p>
          </button>
        </div>
        {/* Download */}
        <div className="w-full flex flex-col justify-center items-center ">
          <button
            onClick={handleExport}
            className="w-full flex flex-row justify-evenly items-center bg-BrandOrange text-BrandBlack font-bold text-[10px] sm:text-xs md:text-sm font-DmSans rounded-md py-0.5 sm:py-1"
          >
            <IoMdDownload className="text-BrandBlack text-sm sm:text-base md:text-lg" />
            <p className="text-BrandBlack text-[10px] sm:text-xs md:text-sm font-DmSans">Download</p>
          </button>
        </div>
      </div>
    </aside>
  );
}
