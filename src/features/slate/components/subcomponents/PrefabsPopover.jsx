import React, { useState, useMemo } from "react";
import { FaTrash } from "react-icons/fa";
import { POPUP_DENSE_INPUT_CLASS } from "./popupStyles";

/**
 * A single row in the prefab popover. Renders a delete button only when
 * `onDelete` is provided — published presets pass no onDelete so users
 * can't remove admin-curated prefabs.
 */
const PrefabItem = ({ prefab, onSelect, onDelete, badge = null }) => {
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
                <div className="flex items-center gap-1.5">
                    <p className="text-BrandWhite text-xs sm:text-sm font-medium truncate font-DmSans">
                        {prefab.label}
                    </p>
                    {badge && (
                        <span className="shrink-0 rounded px-1 py-px text-[9px] font-semibold uppercase tracking-wider bg-BrandOrange/20 text-BrandOrange font-DmSans">
                            {badge}
                        </span>
                    )}
                </div>
                {prefab.players && (
                    <p className="text-BrandGray text-[10px] sm:text-xs truncate font-DmSans">
                        {prefab.players.length} player{prefab.players.length !== 1 ? "s" : ""}{prefab.ball ? " + ball" : ""}
                    </p>
                )}
            </div>

            {/* Delete button — only when onDelete is wired */}
            {onDelete && (
                <button
                    onClick={handleDeleteClick}
                    className="w-7 h-7 shrink-0 flex items-center justify-center rounded-md transition-colors hover:bg-red-900/40"
                    aria-label="Delete prefab"
                >
                    <FaTrash className="text-red-400/70 hover:text-red-400 text-xs" />
                </button>
            )}
        </div>
    );
};

/**
 * Prefabs popover, split into "Published Presets" (admin-curated, read-only)
 * and "Your Prefabs" (user-saved, deletable) sections. Both sections share a
 * single search box. Section headers only render when the section is non-empty.
 *
 * @param {Object} props
 * @param {Object[]} props.prefabs - Mixed list; sectioned by `isPublished`/`isCustom`
 * @param {Function} props.onPrefabSelect - Called when any prefab is selected
 * @param {Function} props.onDeleteCustomPrefab - Called only for personal-prefab deletes
 */
export const PrefabsPopover = ({ prefabs = [], onPrefabSelect, onDeleteCustomPrefab }) => {
    const [searchQuery, setSearchQuery] = useState("");

    const { publishedFiltered, customFiltered, totalCount } = useMemo(() => {
        const published = [];
        const custom = [];
        for (const p of prefabs) {
            if (p.isPublished) published.push(p);
            else if (p.isCustom) custom.push(p);
        }
        const matches = (p) =>
            searchQuery === "" ||
            String(p.label ?? "").toLowerCase().includes(searchQuery.toLowerCase());
        return {
            publishedFiltered: published.filter(matches),
            customFiltered: custom.filter(matches),
            totalCount: published.length + custom.length,
        };
    }, [prefabs, searchQuery]);

    const hasAny = publishedFiltered.length + customFiltered.length > 0;

    return (
        <div className="ml-2 p-3 sm:p-4 w-[240px] flex flex-col gap-2 bg-BrandBlack rounded-lg shadow-[0_16px_30px_-20px_rgba(0,0,0,0.95)]">
            {/* Header */}
            <p className="text-BrandWhite text-xs sm:text-sm font-semibold font-DmSans px-1">
                Prefabs
            </p>

            {/* Search Bar — shown when there's enough content to be worth searching */}
            {totalCount > 3 && (
                <input
                    type="text"
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={POPUP_DENSE_INPUT_CLASS}
                />
            )}

            <div className={`flex flex-col gap-2 ${totalCount > 5 ? "max-h-[320px] overflow-y-auto pr-1" : ""}`}>
                {publishedFiltered.length > 0 && (
                    <div className="flex flex-col gap-1">
                        <p className="text-BrandGray2 text-[10px] uppercase tracking-wider font-DmSans px-1">
                            Published Presets
                        </p>
                        {publishedFiltered.map((prefab) => (
                            <PrefabItem
                                key={prefab.id}
                                prefab={prefab}
                                onSelect={() => onPrefabSelect?.(prefab)}
                                badge="Shared"
                            />
                        ))}
                    </div>
                )}

                {customFiltered.length > 0 && (
                    <div className="flex flex-col gap-1">
                        <p className="text-BrandGray2 text-[10px] uppercase tracking-wider font-DmSans px-1">
                            Your Prefabs
                        </p>
                        {customFiltered.map((prefab, idx) => {
                            const id = prefab.id ?? idx;
                            return (
                                <PrefabItem
                                    key={id}
                                    prefab={prefab}
                                    onSelect={() => onPrefabSelect?.(prefab)}
                                    onDelete={onDeleteCustomPrefab}
                                />
                            );
                        })}
                    </div>
                )}

                {!hasAny && (
                    <div className="text-BrandGray text-xs text-center py-4 font-DmSans">
                        {searchQuery
                            ? "No prefabs found"
                            : "No prefabs saved yet"}
                    </div>
                )}
            </div>
        </div>
    );
};
