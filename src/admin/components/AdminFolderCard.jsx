import { useState, useRef } from "react";
import { FiFolder, FiEdit3, FiTrash2 } from "react-icons/fi";

/**
 * A single folder row in the admin plays sidebar with inline rename and delete
 * actions. Sport folders render a non-editable "sport" badge; user folders show
 * hover rename/delete controls when the corresponding callbacks are provided.
 *
 * Extracted verbatim (behavior-preserving) from AdminPlaysPage.jsx's local
 * `FolderItem`.
 *
 * @param {Object} props
 * @param {Object} props.folder - Folder data object (`id`, `name`, `isSportFolder`)
 * @param {boolean} props.isActive - Whether this folder is currently selected
 * @param {Function} props.onClick - Called when the folder row is clicked
 * @param {Function} [props.onRename] - Called with (id, newName) to rename; omit to hide rename
 * @param {Function} [props.onDelete] - Called with (folder) to delete; omit to hide delete
 * @returns {JSX.Element}
 */
export default function AdminFolderCard({ folder, isActive, onClick, onRename, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(folder.name);
  const inputRef = useRef(null);

  const isSport = folder.isSportFolder;

  const startEdit = (e) => {
    e.stopPropagation();
    setEditValue(folder.name);
    setEditing(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const commitEdit = () => {
    if (editValue.trim() && editValue.trim() !== folder.name) {
      onRename(folder.id, editValue.trim());
    }
    setEditing(false);
  };

  return (
    <div
      data-component="AdminFolderCard"
      onClick={editing ? undefined : onClick}
      className="group flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 transition hover:opacity-85"
      style={isActive
        ? { backgroundColor: "var(--adm-accent-dim)", color: "var(--adm-accent)" }
        : isSport
          ? { color: "var(--adm-accent)" }
          : { color: "var(--adm-text2)" }}
    >
      <FiFolder className="shrink-0 text-xs" />
      {editing ? (
        <input
          ref={inputRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commitEdit();
            if (e.key === "Escape") setEditing(false);
          }}
          onClick={(e) => e.stopPropagation()}
          className="flex-1 rounded px-1 py-0 text-xs outline-none"
          style={{ border: "1px solid var(--adm-accent)", backgroundColor: "var(--adm-surface)", color: "var(--adm-text)" }}
        />
      ) : (
        <span className="flex-1 truncate text-xs">{folder.name}</span>
      )}
      {isSport && !editing && (
        <span className="shrink-0 text-[9px] font-semibold uppercase tracking-wide" style={{ color: "var(--adm-accent)" }}>sport</span>
      )}
      {!isSport && !editing && (
        <div className="hidden items-center gap-1 group-hover:flex">
          {onRename && (
            <button
              onClick={startEdit}
              title="Rename"
              className="rounded p-0.5 transition hover:opacity-80"
              style={{ color: "var(--adm-text2)" }}
            >
              <FiEdit3 className="text-[10px]" />
            </button>
          )}
          {onDelete && (
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(folder); }}
              title="Delete folder"
              className="rounded p-0.5 transition hover:opacity-80"
              style={{ color: "var(--adm-danger)" }}
            >
              <FiTrash2 className="text-[10px]" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
