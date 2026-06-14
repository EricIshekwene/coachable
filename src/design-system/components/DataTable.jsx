import Th from "./Th";
import Td from "./Td";
import TableSearchHeader from "./TableSearchHeader";
import Spinner from "./Spinner";
import EmptyState from "./EmptyState";

/**
 * `DataTable` — high-level data table.
 *
 * Covers 90 % of admin table usage. Accepts a column definition array and a data
 * array. Renders the canonical table chrome (sticky header, 1 px row dividers,
 * hover highlight, loading/empty states) so page files write zero structural table
 * HTML. For rare custom tables use `Th` / `Td` directly.
 *
 * @param {Object} props
 * @param {Array<{
 *   key: string,
 *   label: string,
 *   width?: string,
 *   align?: "left"|"right"|"center",
 *   render?: (row: Record<string, any>, index: number) => React.ReactNode
 * }>} props.columns - Column definitions
 * @param {Array<Record<string, any>>} props.data - Rows to display
 * @param {string} props.keyField - Field name used as the React row key
 * @param {{ value: string, onChange: Function, onClear?: Function, placeholder?: string, countLabel?: string }} [props.search]
 *   - When provided, renders a `TableSearchHeader` above the table
 * @param {boolean} [props.loading=false] - Shows a centered spinner when true
 * @param {React.ReactNode} [props.empty] - Custom empty state; defaults to EmptyState
 * @param {(row: Record<string, any>) => void} [props.onRowClick] - Makes rows hover + clickable
 * @param {boolean} [props.stickyHeader=false] - Sticks the header row on scroll
 * @param {string} [props.minWidth="600px"] - Minimum table width (enables horizontal scroll)
 * @param {"md"|"sm"|"xs"} [props.size="md"] - Cell padding size passed to Th and Td
 * @param {React.ReactNode} [props.actions] - Action buttons passed to TableSearchHeader right slot
 * @param {string} [props.className=""] - Extra className on the root wrapper
 * @returns {JSX.Element}
 */
export default function DataTable({
  columns,
  data,
  keyField,
  search,
  loading = false,
  empty,
  onRowClick,
  stickyHeader = false,
  minWidth = "600px",
  size = "md",
  actions,
  className = "",
}) {
  const isEmpty = !loading && data.length === 0;

  return (
    <div data-component="DataTable" className={className}>
      {/* Optional search + count header */}
      {search && (
        <TableSearchHeader
          value={search.value}
          onChange={search.onChange}
          onClear={search.onClear}
          placeholder={search.placeholder}
          count={data.length}
          countLabel={search.countLabel}
          actions={actions}
        />
      )}

      {/* Table scroll wrapper */}
      <div className="overflow-x-auto" style={{ backgroundColor: "var(--ui-bg)" }}>
        <table
          className="w-full border-separate border-spacing-0 text-left text-sm"
          style={{ minWidth }}
        >
          <thead>
            <tr>
              {columns.map((col) => (
                <Th
                  key={col.key}
                  align={col.align}
                  width={col.width}
                  sticky={stickyHeader}
                  size={size}
                >
                  {col.label}
                </Th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && data.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="px-5 py-10 text-center">
                  <Spinner size="lg" label="Loading…" className="mx-auto" />
                </td>
              </tr>
            )}
            {isEmpty && (
              <tr>
                <td colSpan={columns.length} className="px-5 py-10">
                  {empty ?? <EmptyState title="No results found" />}
                </td>
              </tr>
            )}
            {!isEmpty && data.map((row, i) => (
              <tr
                key={row[keyField]}
                className={onRowClick ? "cursor-pointer" : ""}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                onMouseEnter={onRowClick ? (e) => {
                  Array.from(e.currentTarget.cells).forEach(
                    (cell) => { cell.style.backgroundColor = "var(--ui-surface-2)"; }
                  );
                } : undefined}
                onMouseLeave={onRowClick ? (e) => {
                  Array.from(e.currentTarget.cells).forEach(
                    (cell) => { cell.style.backgroundColor = ""; }
                  );
                } : undefined}
              >
                {columns.map((col) => (
                  <Td key={col.key} align={col.align} size={size} className={col.className}>
                    {col.render ? col.render(row, i) : row[col.key]}
                  </Td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
