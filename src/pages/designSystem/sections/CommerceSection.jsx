import { useState } from "react";
import { FiCheck } from "react-icons/fi";
import { Button, Badge } from "../../../design-system/components";
import { DSPageHeading, DSGroup, DSTile, DSChecklist, DSMeta } from "../dsPrimitives";

/** Plan definitions for the live pricing demo. */
const PLANS = [
  { name: "Starter", monthly: 0, yearly: 0, blurb: "For a single coach getting started.", features: ["1 team", "25 plays", "Basic export"], cta: "Current plan", featured: false },
  { name: "Club", monthly: 19, yearly: 16, blurb: "For a club running multiple squads.", features: ["Unlimited teams", "Unlimited plays", "HD video export", "Staff seats"], cta: "Upgrade", featured: true },
  { name: "Enterprise", monthly: null, yearly: null, blurb: "For federations & academies.", features: ["SSO & audit log", "Priority support", "Custom onboarding"], cta: "Contact sales", featured: false },
];

/**
 * Commerce, billing & pricing patterns. Coachable does not ship billing yet, so
 * this is a forward spec — but the pricing card is a live, designed-from-
 * existing-patterns reference (admin card + accent + Button) so it lands
 * consistently when billing arrives.
 *
 * @returns {JSX.Element}
 */
export default function CommerceSection() {
  const [yearly, setYearly] = useState(true);

  return (
    <div className="flex flex-col gap-10">
      <DSPageHeading
        eyebrow="Patterns & templates"
        title="Commerce, billing & pricing"
        lead="No billing surface ships yet, so most of this is a forward spec. The pricing card below is a live reference built only from existing primitives (admin card, accent ring, Button, Badge) — the featured plan gets the accent border + badge, and destructive flows (cancel) get the danger zone."
      />

      <DSGroup title="Pricing cards" status="spec" description="Designed from existing patterns. Toggle billing period to see the price swap.">
        <DSTile>
          <div className="mb-5 flex items-center justify-center gap-3">
            <span className="text-sm" style={{ color: yearly ? "var(--adm-text3)" : "var(--adm-text)" }}>Monthly</span>
            <button
              type="button"
              role="switch"
              aria-checked={yearly}
              onClick={() => setYearly((y) => !y)}
              className="relative h-6 w-11 rounded-full transition-colors"
              style={{ backgroundColor: yearly ? "var(--adm-accent)" : "var(--adm-surface3)" }}
            >
              <span className="absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all" style={{ left: yearly ? "1.375rem" : "0.125rem" }} />
            </button>
            <span className="text-sm" style={{ color: yearly ? "var(--adm-text)" : "var(--adm-text3)" }}>
              Yearly <Badge status="resolved">Save 16%</Badge>
            </span>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {PLANS.map((plan) => {
              const price = yearly ? plan.yearly : plan.monthly;
              return (
                <div
                  key={plan.name}
                  className="flex flex-col rounded-[var(--adm-radius-lg)] p-5"
                  style={{
                    backgroundColor: "var(--adm-surface)",
                    border: plan.featured ? "1px solid var(--adm-accent)" : "1px solid var(--adm-border)",
                    boxShadow: plan.featured ? "0 0 0 3px var(--adm-accent-dim)" : "var(--adm-shadow-sm)",
                  }}
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold" style={{ color: "var(--adm-text)" }}>{plan.name}</h3>
                    {plan.featured ? <Badge status="info">Popular</Badge> : null}
                  </div>
                  <p className="mt-1 text-xs leading-5" style={{ color: "var(--adm-text3)" }}>{plan.blurb}</p>
                  <div className="mt-4 flex items-end gap-1">
                    {price === null ? (
                      <span className="text-2xl font-semibold" style={{ color: "var(--adm-text)" }}>Custom</span>
                    ) : (
                      <>
                        <span className="text-3xl font-semibold" style={{ color: "var(--adm-text)" }}>${price}</span>
                        <span className="pb-1 text-xs" style={{ color: "var(--adm-text3)" }}>/ mo{yearly ? ", billed yearly" : ""}</span>
                      </>
                    )}
                  </div>
                  <ul className="mt-4 flex flex-1 flex-col gap-2">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-center gap-2 text-xs" style={{ color: "var(--adm-text2)" }}>
                        <FiCheck className="shrink-0" style={{ color: "var(--adm-accent)" }} /> {f}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-5">
                    <Button variant={plan.featured ? "primary" : "outline"} className="w-full" disabled={plan.cta === "Current plan"}>
                      {plan.cta}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </DSTile>
      </DSGroup>

      <DSGroup title="Usage">
        <DSMeta rows={[
          { label: "Featured plan", value: "Exactly one plan carries the accent border + ring + “Popular” badge. Never feature two." },
          { label: "Current plan", value: "The active plan’s CTA is disabled and labelled “Current plan”; other CTAs stay actionable." },
          { label: "Period toggle", value: "Yearly is the default selection and shows the savings badge; price text states the billing cadence." },
          { label: "Destructive flows", value: "Cancel / downgrade live in a danger zone with a confirmation modal — see the Settings section." },
        ]} />
      </DSGroup>

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
