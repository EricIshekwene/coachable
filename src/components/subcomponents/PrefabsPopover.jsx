import React, { useState, useRef, useEffect } from "react";
import { IoChevronDownOutline } from "react-icons/io5";
import { FaTrash } from "react-icons/fa";
import { POPUP_DENSE_INPUT_CLASS, POPUP_POPOVER_SURFACE_CLASS } from "./popupStyles";

// Dropdown Item Component (matches Add Player dropdown styling)
const DropdownItem = ({ dropdown }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedValue, setSelectedValue] = useState(dropdown.value ?? dropdown.options[0]);
    const dropdownItemRef = useRef(null);

    useEffect(() => {
        if (!isOpen) return;
        const handleClickOutside = (e) => {
            if (dropdownItemRef.current && !dropdownItemRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [isOpen]);

    return (
        <div className="flex flex-col gap-0.5 sm:gap-1 relative" ref={dropdownItemRef}>
            <p className="text-BrandOrange text-xs sm:text-sm">{dropdown.label}:</p>
            <div className="relative">
                <div className="w-full h-8 sm:h-9 bg-BrandBlack2 border border-BrandGray rounded-md flex items-center overflow-hidden">
                    <div className="flex-1 min-w-0 h-8 sm:h-9 bg-transparent border-r border-BrandGray text-BrandWhite px-2 text-xs sm:text-sm flex items-center rounded-l-md">
                        {selectedValue}
                    </div>
                    <button
                        onClick={() => setIsOpen(!isOpen)}
                        className="h-8 sm:h-9 w-8 sm:w-9 flex items-center justify-center border-l border-BrandGray transition-colors rounded-r-md shrink-0 hover:bg-BrandBlack"
                    >
                        <IoChevronDownOutline
                            className={`text-BrandOrange text-base sm:text-lg transition-transform ${isOpen ? "rotate-180" : ""}`}
                        />
                    </button>
                </div>
                {isOpen && (
                    <div className="absolute left-0 top-full w-full bg-BrandBlack border border-BrandGray2/80 rounded-md mt-1 max-h-40 overflow-y-auto z-10 shadow-[0_12px_24px_-18px_rgba(0,0,0,0.95)]">
                        {dropdown.options.length > 0 ? (
                            dropdown.options.map((option, optIdx) => (
                                <div
                                    key={optIdx}
                                    onClick={() => {
                                        setSelectedValue(option);
                                        setIsOpen(false);
                                        if (dropdown.onChange) {
                                            dropdown.onChange(option);
                                        }
                                    }}
                                    className="px-2 py-1 text-BrandWhite hover:bg-BrandOrange hover:text-BrandBlack cursor-pointer transition-colors text-xs sm:text-sm truncate"
                                >
                                    {option}
                                </div>
                            ))
                        ) : (
                            <div className="px-2 py-1 text-BrandGray text-xs">
                                No options available
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

// Individual Prefab Item Component
const PrefabItem = ({ prefab, onSelect, isOpen, onToggle, onClose, onDelete }) => {
    const prefabRef = useRef(null);
    const dropdownRef = useRef(null);

    const hasDropdowns = prefab.dropdowns && prefab.dropdowns.length > 0;
    const isCustom = !!prefab.isCustom;

    useEffect(() => {
        if (!isOpen) return;

        const handleClickOutside = (e) => {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(e.target) &&
                prefabRef.current &&
                !prefabRef.current.contains(e.target)
            ) {
                onClose();
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [isOpen, onClose]);

    const handleChevronClick = (e) => {
        e.stopPropagation();
        if (!hasDropdowns) return;
        onToggle();
    };

    const handleDeleteClick = (e) => {
        e.stopPropagation();
        onDelete?.(prefab.id);
    };

    const handleRowKeyDown = (e) => {
        if (e.target !== e.currentTarget) return;
        if (e.key !== "Enter" && e.key !== " ") return;
        e.preventDefault();
        onSelect?.();
    };

    return (
        <div className="relative" ref={prefabRef}>
            {/* Row */}
            <div
                role="button"
                tabIndex={0}
                onClick={onSelect}
                onKeyDown={handleRowKeyDown}
                className="
          w-full flex items-center gap-2
          rounded-md border border-BrandGray
          bg-BrandBlack2 hover:bg-BrandBlack2/80
          cursor-pointer
          transition-all duration-100
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-BrandOrange/70
          px-2 py-2
        "
            >
                {/* Icon Button (standard size) */}
                <div
                    className="
            w-10 h-10 shrink-0
            rounded-md border border-BrandGray
            bg-BrandOrange
            flex items-center justify-center
            hover:bg-BrandOrange/80
            transition-colors
          "
                    title={prefab.label}
                >
                    {/* Force icon size smaller no matter what prefab.icon is */}
                    <span className="text-BrandOrange text-xl leading-none flex items-center justify-center">
                        {prefab.icon}
                    </span>
                </div>

                {/* Label */}
                <div className="flex-1 min-w-0">
                    <p className="text-BrandWhite text-xs sm:text-sm font-medium truncate font-DmSans">
                        {prefab.label}
                    </p>
                    {prefab.subLabel && (
                        <p className="text-BrandGray text-[10px] sm:text-xs truncate font-DmSans">
                            {prefab.subLabel}
                        </p>
                    )}
                    {isCustom && prefab.players && (
                        <p className="text-BrandGray text-[10px] sm:text-xs truncate font-DmSans">
                            {prefab.players.length} player{prefab.players.length !== 1 ? "s" : ""}{prefab.ball ? " + ball" : ""}
                        </p>
                    )}
                </div>

                {/* Delete button for custom prefabs, Chevron for built-in */}
                {isCustom ? (
                    <button
                        onClick={handleDeleteClick}
                        className="w-8 h-8 shrink-0 flex items-center justify-center rounded-md border border-BrandGray bg-BrandBlack transition-colors hover:bg-red-900/40 hover:border-red-500/40"
                        aria-label="Delete prefab"
                    >
                        <FaTrash className="text-red-400 text-xs" />
                    </button>
                ) : (
                    <button
                        onClick={handleChevronClick}
                        className={`
                                  w-8 h-8 shrink-0
                                  flex items-center justify-center rounded-md
                                  border border-BrandGray
                                  bg-BrandBlack
                                  transition-colors
                                  ${hasDropdowns ? "hover:bg-BrandBlack/80" : "opacity-40 cursor-not-allowed"}
                                `}
                        aria-label="Prefab options"
                    >
                        <IoChevronDownOutline
                            className={`
              text-base transition-transform
              ${isOpen ? "rotate-180 text-BrandOrange" : "text-BrandOrange/80"}
            `}
                        />
                    </button>
                )}
            </div>

            {/* Dropdown popover */}
            {isOpen && hasDropdowns && (
                <div
                    ref={dropdownRef}
                    className={`absolute left-full ml-5 top-0 z-50 p-3 min-w-[200px] ${POPUP_POPOVER_SURFACE_CLASS}`}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="flex flex-col gap-2">
                        {prefab.dropdowns.map((dropdown, idx) => (
                            <DropdownItem key={idx} dropdown={dropdown} />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

const MODE_TABS = [
    { key: "offense", label: "Offense" },
    { key: "defense", label: "Defense" },
    { key: "custom", label: "Custom" },
];

// Main Prefabs Popover Component
export const PrefabsPopover = ({ prefabs = [], onPrefabSelect, onDeleteCustomPrefab }) => {
    const [mode, setMode] = useState("offense");
    const [openPrefabId, setOpenPrefabId] = useState(null);
    const [searchQuery, setSearchQuery] = useState("");

    const filteredPrefabs = prefabs.filter((p) => {
        const matchesMode = p.mode === mode || (!p.mode && mode !== "custom");
        const matchesSearch = searchQuery === "" ||
            p.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (p.subLabel && p.subLabel.toLowerCase().includes(searchQuery.toLowerCase()));
        return matchesMode && matchesSearch;
    });

    const handlePrefabToggle = (id) => setOpenPrefabId(openPrefabId === id ? null : id);
    const handlePrefabClose = () => setOpenPrefabId(null);

    return (
        <div
            className={`ml-2 p-3 sm:p-4 w-[260px] flex flex-col gap-3 ${POPUP_POPOVER_SURFACE_CLASS}`}
        >
            {/* Toggle pill */}
            <div className="flex items-center justify-center">
                <div className="flex bg-BrandBlack2 rounded-full p-1 border border-BrandGray font-DmSans">
                    {MODE_TABS.map((tab) => (
                        <button
                            key={tab.key}
                            onClick={() => { setMode(tab.key); setOpenPrefabId(null); }}
                            className={`
                px-3 py-1 rounded-full text-xs sm:text-sm font-medium transition-all font-DmSans
                ${mode === tab.key ? "bg-BrandOrange text-BrandBlack" : "text-BrandGray hover:text-BrandWhite"}
              `}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Search Bar */}
            <div className="flex flex-col gap-0.5 sm:gap-1">
                <input
                    type="text"
                    placeholder="Search prefabs..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={POPUP_DENSE_INPUT_CLASS}
                />
            </div>

            {/* List */}
            <div className={`flex flex-col gap-2 ${filteredPrefabs.length > 4 ? "max-h-[320px] overflow-y-auto pr-1" : ""}`}>
                {filteredPrefabs.length ? (
                    filteredPrefabs.map((prefab, idx) => {
                        const id = prefab.id ?? idx;
                        return (
                            <PrefabItem
                                key={id}
                                prefab={prefab}
                                onSelect={() => onPrefabSelect?.(prefab)}
                                isOpen={openPrefabId === id}
                                onToggle={() => handlePrefabToggle(id)}
                                onClose={handlePrefabClose}
                                onDelete={onDeleteCustomPrefab}
                            />
                        );
                    })
                ) : (
                    <div className="text-BrandGray text-xs text-center py-4">
                        {searchQuery
                            ? "No prefabs found"
                            : mode === "custom"
                                ? "No custom prefabs saved yet"
                                : "No prefabs available"}
                    </div>
                )}
            </div>
        </div>
    );
};
