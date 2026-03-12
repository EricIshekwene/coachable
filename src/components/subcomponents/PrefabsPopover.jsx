import React, { useState } from "react";
import { FaTrash } from "react-icons/fa";
import { POPUP_DENSE_INPUT_CLASS } from "./popupStyles";

// Individual Prefab Item Component
const PrefabItem = ({ prefab, onSelect, onDelete }) => {
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
        <div
            role="button"
            tabIndex={0}
            onClick={onSelect}
            onKeyDown={handleRowKeyDown}
            className="
                w-full flex items-center gap-2
                rounded-md
                bg-BrandBlack2 hover:bg-BrandBlack2/80
                cursor-pointer
                transition-all duration-100
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-BrandOrange/70
                px-3 py-2
            "
        >
            {/* Label */}
            <div className="flex-1 min-w-0">
                <p className="text-BrandWhite text-xs sm:text-sm font-medium truncate font-DmSans">
                    {prefab.label}
                </p>
                {prefab.players && (
                    <p className="text-BrandGray text-[10px] sm:text-xs truncate font-DmSans">
                        {prefab.players.length} player{prefab.players.length !== 1 ? "s" : ""}{prefab.ball ? " + ball" : ""}
                    </p>
                )}
            </div>

            {/* Delete button */}
            <button
                onClick={handleDeleteClick}
                className="w-7 h-7 shrink-0 flex items-center justify-center rounded-md transition-colors hover:bg-red-900/40"
                aria-label="Delete prefab"
            >
                <FaTrash className="text-red-400/70 hover:text-red-400 text-xs" />
            </button>
        </div>
    );
};

// Main Prefabs Popover Component
export const PrefabsPopover = ({ prefabs = [], onPrefabSelect, onDeleteCustomPrefab }) => {
    const [searchQuery, setSearchQuery] = useState("");

    // Only show custom prefabs
    const customPrefabs = prefabs.filter((p) => p.isCustom);
    const filteredPrefabs = customPrefabs.filter((p) => {
        return searchQuery === "" ||
            p.label.toLowerCase().includes(searchQuery.toLowerCase());
    });

    return (
        <div className="ml-2 p-3 sm:p-4 w-[240px] flex flex-col gap-2 bg-BrandBlack rounded-lg shadow-[0_16px_30px_-20px_rgba(0,0,0,0.95)]">
            {/* Header */}
            <p className="text-BrandWhite text-xs sm:text-sm font-semibold font-DmSans px-1">
                Custom Prefabs
            </p>

            {/* Search Bar */}
            {customPrefabs.length > 3 && (
                <input
                    type="text"
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={POPUP_DENSE_INPUT_CLASS}
                />
            )}

            {/* List */}
            <div className={`flex flex-col gap-1 ${filteredPrefabs.length > 5 ? "max-h-[280px] overflow-y-auto pr-1" : ""}`}>
                {filteredPrefabs.length ? (
                    filteredPrefabs.map((prefab, idx) => {
                        const id = prefab.id ?? idx;
                        return (
                            <PrefabItem
                                key={id}
                                prefab={prefab}
                                onSelect={() => onPrefabSelect?.(prefab)}
                                onDelete={onDeleteCustomPrefab}
                            />
                        );
                    })
                ) : (
                    <div className="text-BrandGray text-xs text-center py-4 font-DmSans">
                        {searchQuery
                            ? "No prefabs found"
                            : "No custom prefabs saved yet"}
                    </div>
                )}
            </div>
        </div>
    );
};
