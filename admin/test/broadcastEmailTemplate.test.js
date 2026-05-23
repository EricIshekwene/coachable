import { describe, expect, it } from "vitest";
import {
  buildBroadcastEmailHtml,
  getBroadcastBodyText,
  renderBroadcastBodyMarkup,
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

  it("renders an inline play embed when the body contains the sentinel", () => {
    const html = buildBroadcastEmailHtml({
      body: "<p>Install this play below:</p><p>{{playEmbed}}</p><p>Run it twice.</p>",
      playEmbed: {
        title: "10 Loop Inside Tip Shadow",
        gifUrl: "https://cdn.example.com/play.gif",
      },
    });

    expect(html).toContain("10 Loop Inside Tip Shadow");
    expect(html).toContain('src="https://cdn.example.com/play.gif"');
    expect(html).toContain("background-color:#f97316");
    expect(html).not.toContain("{{playEmbed}}");
  });

  it("removes the play sentinel when no embed metadata is present", () => {
    const html = buildBroadcastEmailHtml({
      body: "<p>Hello</p><p>{{playEmbed}}</p><p>World</p>",
    });

    expect(html).toContain("Hello");
    expect(html).toContain("World");
    expect(html).not.toContain("{{playEmbed}}");
    expect(html).not.toContain("Animated preview");
  });

  it("renders a play embed even when the token casing is lowercase", () => {
    const html = buildBroadcastEmailHtml({
      body: "<p>{{playembed}}</p>",
      playEmbed: {
        title: "Switch 10 Inside",
        gifUrl: "https://cdn.example.com/switch.gif",
      },
    });

    expect(html).toContain("Switch 10 Inside");
    expect(html).toContain('src="https://cdn.example.com/switch.gif"');
    expect(html).not.toContain("{{playembed}}");
  });

  it("renders inline link token with bare domain as a styled anchor", () => {
    const html = renderBroadcastBodyMarkup({
      body: "<p>Check out {{coachableplays.com: our site}} for details.</p>",
    });
    expect(html).toContain('href="https://coachableplays.com/"');
    expect(html).toContain(">our site<");
    expect(html).not.toContain("{{coachableplays.com:");
  });

  it("renders inline link token with full https URL", () => {
    const html = renderBroadcastBodyMarkup({
      body: "<p>{{https://example.com/path: Click here}}</p>",
    });
    expect(html).toContain('href="https://example.com/path"');
    expect(html).toContain(">Click here<");
  });

  it("strips invalid link tokens gracefully (no URL)", () => {
    const html = renderBroadcastBodyMarkup({
      body: "<p>{{: No URL here}}</p>",
    });
    expect(html).toContain("No URL here");
    expect(html).not.toContain("<a");
  });

  it("renders a play embed when the stored token is missing the final brace", () => {
    const html = buildBroadcastEmailHtml({
      body: "<p>{{playembed}</p>",
      playEmbed: {
        title: "Switch 10 Inside",
        gifUrl: "https://cdn.example.com/switch.gif",
      },
    });

    expect(html).toContain("Switch 10 Inside");
    expect(html).toContain('src="https://cdn.example.com/switch.gif"');
    expect(html).not.toContain("{{playembed}");
  });
});
