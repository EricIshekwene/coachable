import { createElement, useEffect, useState, useMemo } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { FiArrowLeft, FiArrowRight, FiSun, FiMoon, FiCommand } from "react-icons/fi";
import { useAdmin } from "../../admin/AdminContext";
import { adminPath } from "../../admin/adminNav";
import { AdminShell, AdminHeader, AdminPage } from "../../admin/components";
import { DESIGN_SYSTEM_NAV, ALL_SECTIONS, DEFAULT_SECTION_ID, getAdjacentSections } from "./designSystemNav";
import { getSectionComponent } from "./designSystemSections";
import { searchDesignSystem } from "./designSystemSearch";
import { SidebarSearch, CommandPalette, useCommandPalette } from "./SearchPalette";

/** Base route for the design system (kept as the historical /design-rules path). */
const BASE = "/design-rules";

/**
 * Light/dark switch shown in the header, mirroring the admin theme toggle.
 *
 * @param {{ theme: "dark"|"light", onChange: (t: "dark"|"light") => void }} props
 * @returns {JSX.Element}
 */
function ThemeSwitch({ theme, onChange }) {
  return (
    <div className="inline-flex items-center gap-1 rounded-[var(--adm-radius-md)] p-1" style={{ backgroundColor: "var(--adm-surface2)", border: "1px solid var(--adm-border)" }}>
      {[{ key: "light", label: "Light", icon: FiSun }, { key: "dark", label: "Dark", icon: FiMoon }].map((mode) => {
        const active = theme === mode.key;
        return (
          <button key={mode.key} type="button" onClick={() => onChange(mode.key)} aria-pressed={active}
            className="inline-flex items-center gap-2 rounded-[var(--adm-radius-md)] px-3 py-1.5 text-xs font-semibold transition"
            style={active ? { backgroundColor: "var(--adm-surface-elevated)", color: "var(--adm-text)", boxShadow: "var(--adm-shadow-sm)" } : { color: "var(--adm-text3)" }}>
            <mode.icon className="text-sm" />{mode.label}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Sticky sub-navigation rail listing every design-system section, grouped.
 *
 * @param {{ basePath: string, activeId: string, onNavigate?: () => void }} props
 * @returns {JSX.Element}
 */
function SectionNav({ basePath, activeId, onNavigate }) {
  return (
    <nav className="flex flex-col gap-5">
      {DESIGN_SYSTEM_NAV.map((group) => (
        <div key={group.group}>
          <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--adm-text3)" }}>{group.group}</p>
          <div className="flex flex-col gap-0.5">
            {group.sections.map((section) => {
              const active = section.id === activeId;
              return (
                <Link
                  key={section.id}
                  to={adminPath(basePath, `${BASE}/${section.id}`)}
                  onClick={onNavigate}
                  className="rounded-[var(--adm-radius-md)] px-3 py-2 text-sm font-semibold transition-colors"
                  style={active
                    ? { backgroundColor: "color-mix(in srgb, var(--adm-accent-dim) 85%, var(--adm-surface2))", color: "var(--adm-accent)", boxShadow: "inset 0 0 0 1px color-mix(in srgb, var(--adm-accent) 22%, transparent)" }
                    : { color: "var(--adm-text2)" }}
                >
                  {section.label}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

/**
 * The Coachable Design System: a multi-page, sub-navigated reference for brand
 * foundations, tokens, components, patterns, page templates, and cross-cutting
 * rules. The active section is driven by the `:section` route param; it falls
 * back to the overview and lives at /admin/design-rules.
 *
 * @returns {JSX.Element}
 */
export default function DesignSystemPage() {
  const { basePath, theme, setTheme } = useAdmin();
  const { section: sectionParam } = useParams();
  const navigate = useNavigate();

  const known = ALL_SECTIONS.some((s) => s.id === sectionParam);
  const activeId = known ? sectionParam : DEFAULT_SECTION_ID;
  const { prev, next } = getAdjacentSections(activeId);

  // Search state for the sticky sub-nav filter.
  const [query, setQuery] = useState("");
  const results = useMemo(() => searchDesignSystem(query, { limit: 12 }), [query]);

  // ⌘K / Ctrl-K command palette.
  const { open: paletteOpen, setOpen: setPaletteOpen } = useCommandPalette();

  /** Navigate to a section by id and clear any active sidebar query. */
  const goToSection = (id) => {
    navigate(adminPath(basePath, `${BASE}/${id}`));
    setQuery("");
  };

  // Normalize unknown / bare URLs to the default section so deep links stay valid.
  useEffect(() => {
    if (sectionParam && !known) {
      navigate(adminPath(basePath, `${BASE}/${DEFAULT_SECTION_ID}`), { replace: true });
    }
  }, [sectionParam, known, navigate, basePath]);

  // Scroll to top when switching sections.
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [activeId]);

  return (
    <AdminShell>
      <AdminHeader
        title="Design System"
        backLabel="Dashboard"
        backTo={adminPath(basePath, "")}
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              className="hidden items-center gap-2 rounded-[var(--adm-radius-md)] px-3 py-1.5 text-xs font-semibold transition sm:inline-flex"
              style={{ backgroundColor: "var(--adm-surface2)", border: "1px solid var(--adm-border)", color: "var(--adm-text3)" }}
            >
              <FiCommand className="text-sm" /> Search
              <span className="rounded px-1.5 py-0.5 text-[10px]" style={{ backgroundColor: "var(--adm-surface)", color: "var(--adm-text3)" }}>⌘K</span>
            </button>
            <ThemeSwitch theme={theme} onChange={setTheme} />
          </div>
        }
      />

      <AdminPage wide className="min-w-0 overflow-x-hidden pb-12">
        {/* Mobile section picker */}
        <div className="mb-6 lg:hidden">
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--adm-text3)" }}>Section</label>
          <select
            value={activeId}
            onChange={(e) => navigate(adminPath(basePath, `${BASE}/${e.target.value}`))}
            className="w-full rounded-[var(--adm-radius-md)] px-3 py-2.5 text-sm outline-none"
            style={{ backgroundColor: "var(--adm-surface)", border: "1px solid var(--adm-border2)", color: "var(--adm-text)" }}
          >
            {DESIGN_SYSTEM_NAV.map((group) => (
              <optgroup key={group.group} label={group.group}>
                {group.sections.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
              </optgroup>
            ))}
          </select>
        </div>

        <div className="grid gap-8 lg:grid-cols-[220px_minmax(0,1fr)]">
          {/* Desktop sticky sub-nav */}
          <aside className="hidden lg:block">
            <div className="sticky top-6 flex max-h-[calc(100vh-3rem)] flex-col gap-4 overflow-y-auto pr-1">
              <SidebarSearch
                query={query}
                onQueryChange={setQuery}
                results={results}
                activeId={activeId}
                onPick={goToSection}
              />
              {query ? null : <SectionNav basePath={basePath} activeId={activeId} />}
            </div>
          </aside>

          {/* Active section */}
          <div className="min-w-0">
            {createElement(getSectionComponent(activeId))}

            {/* Prev / next footer */}
            <div className="mt-12 grid gap-3 border-t pt-6 sm:grid-cols-2" style={{ borderColor: "var(--adm-border)" }}>
              {prev ? (
                <Link to={adminPath(basePath, `${BASE}/${prev.id}`)} className="flex flex-col rounded-[var(--adm-radius)] p-4 transition hover:-translate-y-0.5" style={{ backgroundColor: "var(--adm-surface2)", border: "1px solid var(--adm-border)" }}>
                  <span className="flex items-center gap-1.5 text-xs" style={{ color: "var(--adm-text3)" }}><FiArrowLeft /> Previous</span>
                  <span className="mt-1 text-sm font-semibold" style={{ color: "var(--adm-text)" }}>{prev.label}</span>
                </Link>
              ) : <span />}
              {next ? (
                <Link to={adminPath(basePath, `${BASE}/${next.id}`)} className="flex flex-col items-end rounded-[var(--adm-radius)] p-4 text-right transition hover:-translate-y-0.5 sm:col-start-2" style={{ backgroundColor: "var(--adm-surface2)", border: "1px solid var(--adm-border)" }}>
                  <span className="flex items-center gap-1.5 text-xs" style={{ color: "var(--adm-text3)" }}>Next <FiArrowRight /></span>
                  <span className="mt-1 text-sm font-semibold" style={{ color: "var(--adm-text)" }}>{next.label}</span>
                </Link>
              ) : null}
            </div>
          </div>
        </div>
      </AdminPage>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} onPick={goToSection} />
    </AdminShell>
  );
}
