/**
 * designSystemSections.js
 *
 * Maps each design-system section id to its body component. The ordering,
 * labels, and grouping live in the pure designSystemNav.js metadata so the nav
 * can be unit-tested without importing this heavy component tree. Keys here must
 * stay in sync with the ids in designSystemNav.js (the design system test
 * asserts this once both are imported together at build time).
 */

import OverviewSection from "./sections/OverviewSection";
import BrandSection from "./sections/BrandSection";
import ColorSection from "./sections/ColorSection";
import TypographySection from "./sections/TypographySection";
import SpacingSection from "./sections/SpacingSection";
import IconographySection from "./sections/IconographySection";
import LayoutSection from "./sections/LayoutSection";
import ButtonsSection from "./sections/ButtonsSection";
import FormsSection from "./sections/FormsSection";
import CardsSection from "./sections/CardsSection";
import NavigationSection from "./sections/NavigationSection";
import OverlaysSection from "./sections/OverlaysSection";
import TablesSection from "./sections/TablesSection";
import FeedbackSection from "./sections/FeedbackSection";
import DataVizSection from "./sections/DataVizSection";
import ListsSection from "./sections/ListsSection";
import MenusSection from "./sections/MenusSection";
import DashboardSection from "./sections/DashboardSection";
import SettingsSection from "./sections/SettingsSection";
import AuthSection from "./sections/AuthSection";
import MarketingSection from "./sections/MarketingSection";
import NotificationsSection from "./sections/NotificationsSection";
import OnboardingSection from "./sections/OnboardingSection";
import CommerceSection from "./sections/CommerceSection";
import FilesSection from "./sections/FilesSection";
import SearchSection from "./sections/SearchSection";
import SelectionSection from "./sections/SelectionSection";
import ValuesSection from "./sections/ValuesSection";
import TemplatesSection from "./sections/TemplatesSection";
import InteractionStatesSection from "./sections/InteractionStatesSection";
import MotionSection from "./sections/MotionSection";
import DarkModeSection from "./sections/DarkModeSection";
import AccessibilitySection from "./sections/AccessibilitySection";
import ResponsiveSection from "./sections/ResponsiveSection";
import CopySection from "./sections/CopySection";
import EdgeCasesSection from "./sections/EdgeCasesSection";
import SlateSection from "./sections/SlateSection";
import DocumentationSection from "./sections/DocumentationSection";

/** Section id → body component. Keys mirror designSystemNav.js. */
export const SECTION_COMPONENTS = {
  overview: OverviewSection,
  brand: BrandSection,
  color: ColorSection,
  typography: TypographySection,
  spacing: SpacingSection,
  iconography: IconographySection,
  layout: LayoutSection,
  buttons: ButtonsSection,
  forms: FormsSection,
  cards: CardsSection,
  navigation: NavigationSection,
  overlays: OverlaysSection,
  tables: TablesSection,
  feedback: FeedbackSection,
  "data-viz": DataVizSection,
  lists: ListsSection,
  menus: MenusSection,
  dashboard: DashboardSection,
  settings: SettingsSection,
  auth: AuthSection,
  marketing: MarketingSection,
  notifications: NotificationsSection,
  onboarding: OnboardingSection,
  commerce: CommerceSection,
  files: FilesSection,
  search: SearchSection,
  selection: SelectionSection,
  values: ValuesSection,
  templates: TemplatesSection,
  "interaction-states": InteractionStatesSection,
  motion: MotionSection,
  "dark-mode": DarkModeSection,
  accessibility: AccessibilitySection,
  responsive: ResponsiveSection,
  copy: CopySection,
  "edge-cases": EdgeCasesSection,
  slate: SlateSection,
  documentation: DocumentationSection,
};

/**
 * Resolve a section's body component by id, falling back to the overview.
 * @param {string | undefined} id
 * @returns {React.ComponentType}
 */
export function getSectionComponent(id) {
  return SECTION_COMPONENTS[id] ?? OverviewSection;
}
