import { DSPageHeading, DSGroup, DSChecklist } from "../dsPrimitives";

/**
 * Commerce, billing & pricing patterns. Largely planned — Coachable does not
 * yet ship a billing surface — documented here so it lands consistently.
 *
 * @returns {JSX.Element}
 */
export default function CommerceSection() {
  return (
    <div className="flex flex-col gap-10">
      <DSPageHeading
        eyebrow="Patterns & templates"
        title="Commerce, billing & pricing"
        lead="Coachable does not ship a billing surface yet, so this is mostly a forward spec. When it lands, plan cards reuse the marketing pricing treatment and billing tables reuse the admin table pattern. The current-plan card and usage meters get the accent; destructive flows (cancel) get the danger zone."
      />

      <DSGroup title="Pricing components">
        <DSChecklist
          columns={3}
          items={[
            { label: "Pricing card / plan comparison", status: "spec" },
            { label: "Monthly / yearly toggle", status: "spec" },
            { label: "Featured / current plan", status: "spec" },
            { label: "Upgrade / downgrade CTA", status: "planned" },
            { label: "Contact sales CTA", status: "spec" },
            { label: "Usage meter / seat selector", status: "planned" },
            { label: "Add-ons", status: "planned" },
            { label: "Taxes / fees display", status: "planned" },
            { label: "Discount / coupon field", status: "planned" },
          ]}
        />
      </DSGroup>

      <DSGroup title="Checkout & billing">
        <DSChecklist
          columns={3}
          items={[
            { label: "Payment form / method card", status: "planned" },
            { label: "Billing address / tax ID", status: "planned" },
            { label: "Invoice table / receipt", status: "planned" },
            { label: "Failed payment alert", status: "planned" },
            { label: "Trial banner / trial expired", status: "planned" },
            { label: "Cancellation flow + confirm", status: "planned" },
            { label: "Renewal reminder", status: "planned" },
            { label: "Refund status", status: "planned" },
            { label: "Billing support CTA", status: "planned" },
          ]}
        />
      </DSGroup>
    </div>
  );
}
