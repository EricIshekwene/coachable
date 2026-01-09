import React, { useState, useRef, useEffect } from "react";
import { IoChevronDownOutline } from "react-icons/io5";

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
                <div className="w-full h-8 sm:h-9 bg-BrandBlack2 border-[0.5px] border-BrandGary rounded-md flex items-center overflow-hidden">
                    <div className="flex-1 min-w-0 h-8 sm:h-9 bg-transparent border-r-[0.5px] border-BrandGary text-BrandWhite px-2 text-xs sm:text-sm flex items-center rounded-l-md">
                        {selectedValue}
                    </div>
                    <button
                        onClick={() => setIsOpen(!isOpen)}
                        className="h-8 sm:h-9 w-8 sm:w-9 flex items-center justify-center border-l-[0.5px] border-BrandGary transition-colors rounded-r-md shrink-0 hover:bg-BrandBlack2"
                    >
                        <IoChevronDownOutline
                            className={`text-BrandOrange text-base sm:text-lg transition-transform ${isOpen ? "rotate-180" : ""}`}
                        />
                    </button>
                </div>
                {isOpen && (
                    <div className="absolute left-0 top-full w-full bg-BrandBlack border border-BrandGary rounded-md mt-1 max-h-40 overflow-y-auto z-10 shadow-lg">
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
                            <div className="px-2 py-1 text-BrandGary text-xs">
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
const PrefabItem = ({ prefab, onSelect, isOpen, onToggle, onClose }) => {
    const prefabRef = useRef(null);
    const dropdownRef = useRef(null);

    const hasDropdowns = prefab.dropdowns && prefab.dropdowns.length > 0;

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

    return (
        <div className="relative" ref={prefabRef}>
            {/* Row */}
            <div
                className="
          w-full flex items-center gap-2
          rounded-md border-[0.5px] border-BrandGary
          bg-BrandBlack2 hover:bg-BrandBlack2/80
          transition-all duration-100
          px-2 py-2
        "
            >
                {/* Icon Button (standard size) */}
                <button
                    onClick={onSelect}
                    className="
            w-10 h-10 shrink-0
            rounded-md border-[0.5px] border-BrandGary
            bg-BrandBlack
            flex items-center justify-center
            hover:bg-BrandBlack/80
            transition-colors
          "
                    title={prefab.label}
                >
                    {/* Force icon size smaller no matter what prefab.icon is */}
                    <span className="text-BrandOrange text-xl leading-none flex items-center justify-center">
                        {prefab.icon}
                    </span>
                </button>

                {/* Label */}
                <div className="flex-1 min-w-0">
                    <p className="text-BrandWhite text-xs sm:text-sm font-medium truncate">
                        {prefab.label}
                    </p>
                    {prefab.subLabel && (
                        <p className="text-BrandGary text-[10px] sm:text-xs truncate">
                            {prefab.subLabel}
                        </p>
                    )}
                </div>

                {/* Chevron (always shown) */}
                <button
                    onClick={handleChevronClick}
                    className={`
                                  w-8 h-8 shrink-0
                                  flex items-center justify-center rounded-md
                                  border-[0.5px] border-BrandGary
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
            </div>

            {/* Dropdown popover */}
            {isOpen && hasDropdowns && (
                <div
                    ref={dropdownRef}
                    className="
            absolute left-full ml-5 top-0 z-50
            bg-BrandBlack 
            rounded-md p-3 shadow-lg
            min-w-[200px]
          "
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

// Main Prefabs Popover Component
export const PrefabsPopover = ({ prefabs = [], onPrefabSelect }) => {
    const [mode, setMode] = useState("offense");
    const [openPrefabId, setOpenPrefabId] = useState(null);
    const [searchQuery, setSearchQuery] = useState("");

    const filteredPrefabs = prefabs.filter((p) => {
        const matchesMode = p.mode === mode || !p.mode;
        const matchesSearch = searchQuery === "" ||
            p.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (p.subLabel && p.subLabel.toLowerCase().includes(searchQuery.toLowerCase()));
        return matchesMode && matchesSearch;
    });

    const handlePrefabToggle = (id) => setOpenPrefabId(openPrefabId === id ? null : id);
    const handlePrefabClose = () => setOpenPrefabId(null);

    return (
        <div
            className="
        ml-2 rounded-md
        bg-BrandBlack 
        p-3 sm:p-4
        w-[260px]
        shadow-lg
        flex flex-col gap-3
      "
        >
            {/* Toggle pill */}
            <div className="flex items-center justify-center">
                <div className="flex bg-BrandBlack2 rounded-full p-1 border-[0.5px] border-BrandGary">
                    <button
                        onClick={() => { setMode("offense"); setOpenPrefabId(null); }}
                        className={`
              px-3 py-1 rounded-full text-xs sm:text-sm font-medium transition-all
              ${mode === "offense" ? "bg-BrandOrange text-BrandBlack" : "text-BrandGary hover:text-BrandWhite"}
            `}
                    >
                        Offense
                    </button>
                    <button
                        onClick={() => { setMode("defense"); setOpenPrefabId(null); }}
                        className={`
              px-3 py-1 rounded-full text-xs sm:text-sm font-medium transition-all
              ${mode === "defense" ? "bg-BrandOrange text-BrandBlack" : "text-BrandGary hover:text-BrandWhite"}
            `}
                    >
                        Defense
                    </button>
                </div>
            </div>

            {/* Search Bar */}
            <div className="flex flex-col gap-0.5 sm:gap-1">
                <input
                    type="text"
                    placeholder="Search prefabs..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full h-8 sm:h-9 bg-BrandBlack border-[0.5px] border-BrandGary text-BrandWhite rounded-md px-2 text-xs sm:text-sm focus:outline-none focus:border-BrandOrange transition-colors"
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
                            />
                        );
                    })
                ) : (
                    <div className="text-BrandGary text-xs text-center py-4">
                        {searchQuery ? "No prefabs found" : "No prefabs available"}
                    </div>
                )}
            </div>
        </div>
    );
};
