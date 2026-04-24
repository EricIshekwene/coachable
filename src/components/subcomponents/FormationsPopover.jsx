import { FORMATIONS } from "../../utils/formations";

const FormationItem = ({ formation, onSelect }) => {
    const outfieldCount = formation.players.filter(p => p.name !== "GK").length;
    const lines = formation.label.split("-").map(Number);

    return (
        <div
            role="button"
            tabIndex={0}
            onClick={onSelect}
            onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelect?.();
                }
            }}
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
            <div className="shrink-0 w-8 h-10 relative flex flex-col-reverse items-center justify-between py-0.5">
                {lines.map((count, rowIndex) => (
                    <div key={rowIndex} className="flex items-center justify-center gap-0.5">
                        {Array.from({ length: count }).map((_, i) => (
                            <div key={i} className="w-1.5 h-1.5 rounded-full bg-BrandOrange" />
                        ))}
                    </div>
                ))}
                <div className="flex items-center justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
                </div>
            </div>

            <div className="flex-1 min-w-0">
                <p className="text-BrandWhite text-xs sm:text-sm font-medium font-DmSans">
                    {formation.label}
                </p>
                <p className="text-BrandGray text-[10px] sm:text-xs font-DmSans">
                    {outfieldCount} outfield + GK
                </p>
            </div>
        </div>
    );
};

export const FormationsPopover = ({ onFormationSelect }) => {
    return (
        <div className="ml-2 pl-3 sm:p-4 w-[240px] flex flex-col gap-2 bg-BrandBlack rounded-lg shadow-[0_16px_30px_-20px_rgba(0,0,0,0.95)]">
            <p className="text-BrandWhite text-xs sm:text-sm font-semibold font-DmSans px-1">
                Formations
            </p>
            <p className="text-BrandGray2 text-[10px] font-DmSans px-1 -mt-1">
                Click a formation, then click the field to place it.
            </p>

            <div className="flex flex-col gap-1">
                {Object.values(FORMATIONS).map((formation) => (
                    <FormationItem
                        key={formation.id}
                        formation={formation}
                        onSelect={() => onFormationSelect?.(formation)}
                    />
                ))}
            </div>
        </div>
    );
}