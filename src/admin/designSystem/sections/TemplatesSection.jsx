import { DSPageHeading, DSGroup, DSChecklist } from "../dsPrimitives";

/**
 * Page templates index: the full set of page templates the system should
 * provide, each mapped to its real implementation or marked planned.
 *
 * @returns {JSX.Element}
 */
export default function TemplatesSection() {
  return (
    <div className="flex flex-col gap-10">
      <DSPageHeading
        eyebrow="Patterns & templates"
        title="Page templates"
        lead="The set of page skeletons every product should provide so new screens start consistent. Each template is assembled from the components and patterns documented elsewhere in this system."
      />

      <DSGroup title="Marketing & auth templates">
        <DSChecklist
          columns={3}
          items={[
            { label: "Homepage / landing", status: "inApp" },
            { label: "Product / feature page", status: "spec" },
            { label: "Pricing page", status: "planned" },
            { label: "About / contact", status: "planned" },
            { label: "Blog index / post", status: "planned" },
            { label: "Case study", status: "planned" },
            { label: "Login / signup", status: "inApp" },
            { label: "Forgot password", status: "inApp" },
            { label: "Onboarding", status: "inApp" },
          ]}
        />
      </DSGroup>

      <DSGroup title="App & admin templates">
        <DSChecklist
          columns={3}
          items={[
            { label: "Dashboard overview", status: "inApp" },
            { label: "Analytics page", status: "inApp" },
            { label: "Data table page", status: "inApp" },
            { label: "Detail page", status: "inApp" },
            { label: "Create / edit form page", status: "inApp" },
            { label: "Settings overview", status: "inApp" },
            { label: "Account / team settings", status: "inApp" },
            { label: "Billing / security settings", status: "planned" },
            { label: "Integrations settings", status: "planned" },
          ]}
        />
      </DSGroup>

      <DSGroup title="Utility templates">
        <DSChecklist
          columns={3}
          items={[
            { label: "404 page", status: "inApp" },
            { label: "Maintenance page", status: "inApp" },
            { label: "500 page", status: "spec" },
            { label: "Empty-state page", status: "live" },
            { label: "Permission-denied page", status: "spec" },
            { label: "Help center", status: "planned" },
          ]}
        />
      </DSGroup>
    </div>
  );
}
