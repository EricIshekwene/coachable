import { Button } from "../../../design-system/components";
import { DSPageHeading, DSGroup, DSTile, DSChecklist, DSRef } from "../dsPrimitives";

/**
 * Marketing website sections: hero, feature grids, pricing, FAQ, CTA, footer,
 * and the marketing page catalog. These live on the BrandBlack canvas.
 *
 * @returns {JSX.Element}
 */
export default function MarketingSection() {
  return (
    <div className="flex flex-col gap-10">
      <DSPageHeading
        eyebrow="Patterns & templates"
        title="Marketing website"
        lead="Marketing runs on the BrandBlack canvas with Manrope headlines, generous spacing, and the orange accent for CTAs. Sections stack vertically inside a centered container; the hero is full-bleed with the play canvas or sport imagery as the visual."
      />

      <DSGroup title="Hero" status="inApp" description="Headline + supporting line + primary CTA over a dark, full-bleed background.">
        <DSTile padding={false} className="overflow-hidden p-0">
          <div className="flex flex-col items-start gap-4 p-8" style={{ background: "linear-gradient(180deg, #050608 0%, #121212 100%)" }}>
            <span className="rounded-full px-3 py-1 text-[11px] font-semibold" style={{ backgroundColor: "rgba(255,122,24,0.12)", color: "#FF7A18", border: "1px solid rgba(255,122,24,0.22)" }}>New · Animated plays</span>
            <h3 className="max-w-xl font-Manrope text-2xl font-semibold" style={{ color: "#f5f7fa" }}>Design, animate, and share plays your whole team understands.</h3>
            <p className="max-w-md text-sm" style={{ color: "rgba(245,247,250,0.6)" }}>Build plays on a real field, animate the motion, and send them to every athlete in seconds.</p>
            <div className="flex gap-3">
              <button className="rounded-[10px] px-4 py-2.5 text-sm font-semibold text-white" style={{ background: "linear-gradient(135deg, #ff8d3d, #FF7A18)" }}>Start free</button>
              <button className="rounded-[10px] px-4 py-2.5 text-sm font-semibold" style={{ color: "#f5f7fa", border: "1px solid rgba(255,255,255,0.16)" }}>Watch demo</button>
            </div>
          </div>
        </DSTile>
      </DSGroup>

      <DSGroup title="Pricing toggle & plan card" status="spec">
        <DSTile>
          <div className="flex justify-center">
            <div className="inline-flex rounded-full p-1" style={{ backgroundColor: "var(--adm-surface2)", border: "1px solid var(--adm-border)" }}>
              <button className="rounded-full px-4 py-1.5 text-xs font-semibold" style={{ backgroundColor: "var(--adm-accent)", color: "#fff" }}>Monthly</button>
              <button className="rounded-full px-4 py-1.5 text-xs font-semibold" style={{ color: "var(--adm-text2)" }}>Yearly · save 20%</button>
            </div>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {[{ name: "Starter", price: "$0", featured: false }, { name: "Team", price: "$29", featured: true }, { name: "Club", price: "$99", featured: false }].map((plan) => (
              <div key={plan.name} className="rounded-[var(--adm-radius)] p-4" style={plan.featured ? { backgroundColor: "var(--adm-surface)", border: "1px solid color-mix(in srgb, var(--adm-accent) 40%, transparent)", boxShadow: "0 0 0 1px var(--adm-accent-dim)" } : { backgroundColor: "var(--adm-surface2)", border: "1px solid var(--adm-border)" }}>
                {plan.featured ? <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ backgroundColor: "var(--adm-accent-dim)", color: "var(--adm-accent)" }}>Popular</span> : null}
                <p className="mt-2 text-sm font-semibold" style={{ color: "var(--adm-text)" }}>{plan.name}</p>
                <p className="mt-1 text-2xl font-semibold" style={{ color: "var(--adm-text)" }}>{plan.price}<span className="text-xs" style={{ color: "var(--adm-text3)" }}>/mo</span></p>
                <Button variant={plan.featured ? "primary" : "secondary"} size="sm" className="mt-3 w-full">Choose {plan.name}</Button>
              </div>
            ))}
          </div>
        </DSTile>
      </DSGroup>

      <DSGroup title="Marketing component catalog">
        <DSChecklist
          columns={3}
          items={[
            { label: "Hero (image/video/CTA)", status: "inApp" },
            { label: "Announcement bar", status: "spec" },
            { label: "Logo cloud", status: "spec" },
            { label: "Feature grid / cards", status: "inApp" },
            { label: "How it works / steps", status: "inApp" },
            { label: "Testimonials", status: "spec" },
            { label: "Pricing table + toggle", status: "spec" },
            { label: "FAQ accordion", status: "spec" },
            { label: "Stats section", status: "spec" },
            { label: "CTA section", status: "inApp" },
            { label: "Newsletter signup", status: "spec" },
            { label: "Footer / legal footer", status: "inApp" },
          ]}
        />
      </DSGroup>

      <DSGroup title="Marketing pages">
        <DSChecklist
          columns={3}
          items={[
            { label: "Homepage / landing", note: "src/pages/Landing.jsx", status: "inApp" },
            { label: "Public playbooks", note: "PublicPlaybooksPage.", status: "inApp" },
            { label: "Resources", note: "src/pages/Resources.jsx", status: "inApp" },
            { label: "Enterprise", note: "src/pages/Enterprise.jsx", status: "inApp" },
            { label: "Pricing", status: "planned" },
            { label: "About / contact / blog", status: "planned" },
            { label: "Case studies / customers", status: "planned" },
            { label: "Terms / privacy / security", status: "planned" },
            { label: "Status / changelog", status: "planned" },
          ]}
        />
        <p className="text-xs" style={{ color: "var(--adm-text3)" }}>Real marketing: <DSRef>src/pages/Landing.jsx</DSRef> <DSRef>src/pages/Enterprise.jsx</DSRef> <DSRef>src/components/SportAwarePublicNav.jsx</DSRef></p>
      </DSGroup>
    </div>
  );
}
