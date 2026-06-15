import { FiPlay } from "react-icons/fi";
import Card from "./Card";

/**
 * Media card with aspect-ratio thumbnail, hover play overlay, and metadata footer.
 * @param {string} [thumbnailUrl]
 * @param {string} title
 * @param {string} [duration] - e.g. "4:32"
 * @param {import("react").ReactNode} [badge] - overlay badge on thumbnail
 * @param {boolean} [isReady=true]
 * @param {() => void} [onClick]
 * @param {string} [className]
 */
export default function VideoCard({
  thumbnailUrl,
  title,
  duration,
  badge,
  isReady = true,
  onClick,
  className = "",
}) {
  return (
    <div data-component="VideoCard" className={className}>
      <Card
        as={onClick && isReady ? "button" : "div"}
        padding="none"
        interactive={isReady && !!onClick}
        className="group w-full overflow-hidden"
        onClick={isReady ? onClick : undefined}
      >
        <div
          className="relative aspect-video w-full overflow-hidden"
          style={{ backgroundColor: "var(--ui-surface-2)" }}
        >
          {thumbnailUrl && isReady && (
            <img
              src={thumbnailUrl}
              alt={title}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          )}
          {isReady && onClick && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 transition-opacity group-hover:opacity-100">
              <div
                className="flex h-12 w-12 items-center justify-center rounded-full"
                style={{ backgroundColor: "var(--ui-accent)" }}
              >
                <FiPlay className="ml-0.5 text-xl text-white" />
              </div>
            </div>
          )}
          {badge && <div className="absolute right-2 top-2">{badge}</div>}
        </div>
        <div className="px-3 py-2.5">
          <p className="truncate text-sm font-medium" style={{ color: "var(--ui-text)" }}>{title}</p>
          {duration && (
            <p className="mt-0.5 text-xs" style={{ color: "var(--ui-text-muted)" }}>{duration}</p>
          )}
        </div>
      </Card>
    </div>
  );
}
