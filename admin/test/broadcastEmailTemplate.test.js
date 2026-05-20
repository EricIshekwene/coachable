import { describe, expect, it } from "vitest";
import {
  buildBroadcastEmailHtml,
  getBroadcastBodyText,
  sanitizeBroadcastBodyMarkup,
} from "../../shared/broadcastEmailTemplate.js";

describe("broadcastEmailTemplate", () => {
  it("converts legacy plain text into paragraphs", () => {
    const html = buildBroadcastEmailHtml({
      body: "Hi {{firstName}},\n\nThis is the update.",
      recipientName: "Jamie Rivers",
    });

    expect(html).toContain("Hi Jamie,");
    expect(html).toContain(">This is the update.<");
    expect(html).not.toContain("Your formatted message will appear here.");
    expect(html).toBeTypeOf("string");
  });

  it("preserves supported formatting and merge tags", () => {
    const html = buildBroadcastEmailHtml({
      subheader: "Notes for {{teamName}}",
      body: "<h2>Film Room</h2><p><strong>{{firstName}}</strong>, review the <em>first series</em>.</p><ul><li>Tempo</li><li>Spacing</li></ul>",
      recipientName: "Jordan Lee",
      recipientTeam: "Varsity",
    });

    expect(html).toContain("Film Room");
    expect(html).toContain("Jordan");
    expect(html).toContain("Notes for Varsity");
    expect(html).toContain("font-weight:700");
    expect(html).toContain("<ul style=");
  });

  it("strips unsafe tags and links", () => {
    const markup = sanitizeBroadcastBodyMarkup(
      '<p>Hello</p><script>alert("x")</script><p><a href="javascript:alert(1)">bad</a><a href="https://example.com">good</a></p>'
    );

    expect(markup).not.toContain("<script");
    expect(markup).not.toContain("javascript:");
    expect(markup).toContain('<a href="https://example.com/">good</a>');
  });

  it("extracts readable text from rich markup", () => {
    const text = getBroadcastBodyText("<p><strong>Hello</strong> team</p><ul><li>Item one</li></ul>");
    expect(text).toContain("Hello team");
    expect(text).toContain("Item one");
  });
});
