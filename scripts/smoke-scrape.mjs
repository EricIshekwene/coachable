// End-to-end smoke test of the scraper orchestrator against live sites.
// Exercises scrapeSchool (fetch → parse → normalize) for one legacy + one
// nextgen + one "unknown" school. Run: node scripts/smoke-scrape.mjs
import { scrapeSchool } from "../server/lib/outreachScraper/index.js";

const SCHOOLS = [
  { canonical_name: "University of Dayton", athletic_domain: "daytonflyers.com", platform: "sidearm_legacy" },
  { canonical_name: "University of Akron", athletic_domain: "gozips.com", platform: "sidearm_nextgen" },
  { canonical_name: "Central State University", athletic_domain: "centralstatesports.com", platform: "unknown" },
];

for (const school of SCHOOLS) {
  try {
    const staff = await scrapeSchool(school);
    const withEmail = staff.filter((s) => s.email).length;
    const coaches = staff.filter((s) => s.roleTags.includes("head_coach")).length;
    console.log(
      `${school.canonical_name} (${school.platform}): ${staff.length} staff, ${withEmail} emails, ${coaches} head coaches`
    );
    const sample = staff.find((s) => s.roleTags.includes("head_coach") && s.sport);
    if (sample) console.log("   e.g.", JSON.stringify(sample));
  } catch (err) {
    console.log(`${school.canonical_name} (${school.platform}): ERROR ${err.message}`);
  }
}
