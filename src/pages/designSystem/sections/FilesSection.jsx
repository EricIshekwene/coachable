import { FiUploadCloud, FiFile } from "react-icons/fi";
import { AdminProgress } from "../../../admin/components";
import { DSPageHeading, DSGroup, DSTile, DSChecklist, DSRef } from "../dsPrimitives";

/**
 * Files & uploads: drop zone, progress, file cards, and the upload catalog.
 *
 * @returns {JSX.Element}
 */
export default function FilesSection() {
  return (
    <div className="flex flex-col gap-10">
      <DSPageHeading
        eyebrow="Patterns & templates"
        title="Files & uploads"
        lead="Uploads use a dashed drop zone, a determinate progress bar, then a file card with type icon, name, size, and actions. The product uploads demo videos and team/company logos today; a general file library is spec."
      />

      <DSGroup title="Drop zone & progress" status="spec">
        <div className="grid gap-4 md:grid-cols-2">
          <DSTile title="Drag-and-drop zone">
            <div className="flex flex-col items-center justify-center gap-2 rounded-[var(--adm-radius)] py-10 text-center" style={{ border: "1px dashed var(--adm-border2)", backgroundColor: "var(--adm-surface2)" }}>
              <FiUploadCloud className="text-2xl" style={{ color: "var(--adm-accent)" }} />
              <p className="text-sm font-semibold" style={{ color: "var(--adm-text)" }}>Drop files or click to upload</p>
              <p className="text-xs" style={{ color: "var(--adm-text3)" }}>MP4 up to 200MB</p>
            </div>
          </DSTile>
          <DSTile title="Upload progress + file card">
            <div className="flex items-center gap-3 rounded-[var(--adm-radius)] p-3" style={{ backgroundColor: "var(--adm-surface2)", border: "1px solid var(--adm-border)" }}>
              <div className="flex h-10 w-10 items-center justify-center rounded-[var(--adm-radius-md)]" style={{ backgroundColor: "var(--adm-accent-dim)", color: "var(--adm-accent)" }}><FiFile /></div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold" style={{ color: "var(--adm-text)" }}>nickel-pressure.mp4</p>
                <div className="mt-1.5"><AdminProgress value={64} size="sm" /></div>
                <p className="mt-1 text-[11px]" style={{ color: "var(--adm-text3)" }}>64% · 12.4 MB of 19.3 MB</p>
              </div>
            </div>
          </DSTile>
        </div>
      </DSGroup>

      <DSGroup title="Upload catalog">
        <DSChecklist
          columns={3}
          items={[
            { label: "File input / drop zone", status: "spec" },
            { label: "Upload progress / success / error", status: "spec" },
            { label: "Retry / cancel upload", status: "spec" },
            { label: "File card / list / preview", status: "spec" },
            { label: "File type icon / size display", status: "spec" },
            { label: "Image / avatar upload", note: "Logo + demo-video upload exist.", status: "inApp" },
            { label: "Rename / delete / download", status: "spec" },
            { label: "Share / permission settings", status: "spec" },
            { label: "Empty file library", status: "planned" },
          ]}
        />
        <p className="text-xs" style={{ color: "var(--adm-text3)" }}>Real uploads: <DSRef>src/pages/AdminDemoVideos.jsx</DSRef></p>
      </DSGroup>
    </div>
  );
}
