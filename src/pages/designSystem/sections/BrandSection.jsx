import { DSPageHeading, DSGroup, DSTile, DSChecklist, DSDoDont } from "../dsPrimitives";
import fullDark from "../../../assets/logos/full_Coachable_logo.png";
import fullWhite from "../../../assets/logos/White_Full_Coachable.png";
import iconDark from "../../../assets/logos/coachable_Logo.png";
import iconWhite from "../../../assets/logos/White_Coachable_Logo.png";

const VOICE = [
  { label: "Confident, not loud", note: "We coach. We're direct and encouraging, never hypey or salesy." },
  { label: "Plain over clever", note: "Short, concrete sentences. Sport language is fine; jargon and filler are not." },
  { label: "Action-led", note: "Lead with the verb: \"Create play\", \"Invite staff\", \"Share with team\"." },
  { label: "Respect the coach's time", note: "Say the most useful thing first. Dense screens scan fast because copy is tight." },
];

const TONE_BY_CONTEXT = [
  { label: "Product UI", note: "Calm, neutral, instructional. Sentence case, no exclamation marks." },
  { label: "Error messages", note: "Explain what happened and the next step. Never blame the user." },
  { label: "Empty states", note: "Encouraging and concrete: name the first useful action." },
  { label: "Success messages", note: "Short and factual: confirm what happened, then get out of the way." },
  { label: "Marketing", note: "Warmer and more energetic, still grounded — outcomes over adjectives." },
  { label: "Help / support", note: "Patient and specific; link to the exact next step." },
];

const PERSONALITY = [
  { label: "Premium ↔ playful", note: "Lean premium-but-approachable. Polished, not corporate-cold." },
  { label: "Minimal ↔ expressive", note: "Minimal chrome, expressive only through the orange accent and sport imagery." },
  { label: "Enterprise ↔ consumer", note: "Prosumer: built for serious coaches, easy enough for a volunteer assistant." },
  { label: "Energy level", note: "Medium-high in marketing, low and steady in the product." },
  { label: "Motion personality", note: "Quick, springy micro-interactions; nothing decorative or slow." },
  { label: "Photography / illustration", note: "Real sport photography and the play-canvas itself as hero imagery; illustration is sparing and geometric.", status: "planned" },
];

/**
 * Brand foundations: logo system, clear space, misuse, favicon/app icon, plus
 * brand personality, voice, and tone.
 *
 * @returns {JSX.Element}
 */
export default function BrandSection() {
  return (
    <div className="flex flex-col gap-10">
      <DSPageHeading
        eyebrow="Brand foundations"
        title="Brand identity, voice, and personality"
        lead="The logo system and the way Coachable speaks. These are the most stable parts of the system — components change, the brand voice should not."
      />

      <DSGroup title="Logo system" description="Two primary lockups (full wordmark + icon-only), each with a light- and dark-surface variant. Always use the supplied assets — never recolor or rebuild the mark.">
        <div className="grid gap-4 md:grid-cols-2">
          <DSTile title="Full lockup — dark surface" status="live">
            <div className="flex h-28 items-center justify-center rounded-[var(--adm-radius)]" style={{ backgroundColor: "#121212" }}>
              <img src={fullWhite} alt="Coachable full logo, white" className="h-9 w-auto" />
            </div>
          </DSTile>
          <DSTile title="Full lockup — light surface" status="live">
            <div className="flex h-28 items-center justify-center rounded-[var(--adm-radius)]" style={{ backgroundColor: "#ffffff", border: "1px solid var(--adm-border)" }}>
              <img src={fullDark} alt="Coachable full logo, dark" className="h-9 w-auto" />
            </div>
          </DSTile>
          <DSTile title="Icon — dark surface" status="live">
            <div className="flex h-28 items-center justify-center rounded-[var(--adm-radius)]" style={{ backgroundColor: "#121212" }}>
              <img src={iconWhite} alt="Coachable icon, white" className="h-12 w-auto" />
            </div>
          </DSTile>
          <DSTile title="Icon — light surface" status="live">
            <div className="flex h-28 items-center justify-center rounded-[var(--adm-radius)]" style={{ backgroundColor: "#ffffff", border: "1px solid var(--adm-border)" }}>
              <img src={iconDark} alt="Coachable icon, dark" className="h-12 w-auto" />
            </div>
          </DSTile>
        </div>
      </DSGroup>

      <DSGroup title="Usage rules" description="Clear space, minimum size, and where each variant belongs.">
        <DSChecklist
          columns={2}
          items={[
            { label: "Clear space", note: "Keep padding ≥ the height of the icon mark on all sides; never crowd the logo.", status: "spec" },
            { label: "Minimum size", note: "Full lockup ≥ 96px wide; icon ≥ 20px. Below that, use the icon only.", status: "spec" },
            { label: "Favicon", note: "Icon-only mark on transparent background — see public/og-image.png for the social card.", status: "inApp" },
            { label: "App icon / loading mark", note: "Icon-only, centered, on BrandBlack. Used as the loading splash.", status: "spec" },
            { label: "Dark-mode logo", note: "Sidebar swaps to White_Full_Coachable in dark theme automatically.", status: "live" },
            { label: "Watermark", note: "Low-opacity icon on exported plays / share cards.", status: "planned" },
          ]}
        />
      </DSGroup>

      <DSGroup title="Incorrect logo usage">
        <DSDoDont
          dos={[
            "Use the supplied PNG/SVG assets at their native proportions",
            "Pick the variant that contrasts with the background",
            "Give the mark generous clear space",
          ]}
          donts={[
            "Recolor, add effects, or rebuild the wordmark",
            "Stretch, rotate, or crop the mark",
            "Place the dark logo on a dark/busy background",
          ]}
        />
      </DSGroup>

      <DSGroup title="Brand voice" description="How Coachable sounds in every surface.">
        <DSChecklist items={VOICE} columns={2} />
      </DSGroup>

      <DSGroup title="Tone by context" description="Voice is constant; tone shifts with the moment.">
        <DSChecklist items={TONE_BY_CONTEXT} columns={2} />
      </DSGroup>

      <DSGroup title="Brand personality, translated visually">
        <DSChecklist items={PERSONALITY} columns={2} />
      </DSGroup>
    </div>
  );
}
