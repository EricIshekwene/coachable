const ALLOWED_TAGS = new Set([
  "a",
  "b",
  "blockquote",
  "br",
  "em",
  "h1",
  "h2",
  "h3",
  "hr",
  "i",
  "li",
  "ol",
  "p",
  "s",
  "strong",
  "u",
  "ul",
]);

const URL_PROTOCOLS = new Set(["http:", "https:", "mailto:", "tel:"]);
const PLAY_EMBED_PLACEHOLDER = "__COACHABLE_PLAY_EMBED__";
const PLAY_EMBED_TOKEN_PATTERN = /\{\{playembed\}\}?/gi;

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttribute(value) {
  return escapeHtml(value).replace(/`/g, "&#96;");
}

function personalizeMergeTags(value, recipientName = "", recipientTeam = "", recipientEmail = "") {
  const nameParts = String(recipientName || "").trim().split(/\s+/).filter(Boolean);
  const firstName = nameParts[0] || "";
  const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : "";

  return String(value || "")
    .replace(/\{\{firstName\}\}/g, firstName)
    .replace(/\{\{lastName\}\}/g, lastName)
    .replace(/\{\{teamName\}\}/g, recipientTeam || "")
    .replace(/\{\{email\}\}/g, recipientEmail || "");
}

function sanitizeUrl(rawUrl) {
  const trimmed = String(rawUrl || "").trim();
  if (!trimmed) return "";

  try {
    const parsed = new URL(trimmed, "https://coachable.local");
    if (!URL_PROTOCOLS.has(parsed.protocol)) return "";
    return parsed.protocol === "https:" && parsed.hostname === "coachable.local"
      ? trimmed
      : parsed.toString();
  } catch {
    return "";
  }
}

function getHrefAttribute(rawAttrs) {
  const match = String(rawAttrs || "").match(/\bhref\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/i);
  return match?.[2] || match?.[3] || match?.[4] || "";
}

function looksLikeHtml(value) {
  return /<\/?[a-z][\s\S]*>/i.test(String(value || ""));
}

function convertPlainTextToMarkup(value) {
  return String(value || "")
    .replace(/\r\n?/g, "\n")
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

function stripDangerousBlocks(value) {
  return String(value || "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<(script|style|iframe|object|embed|svg|math|meta|link)[^>]*>[\s\S]*?<\/\1>/gi, "")
    .replace(/<\/?(html|body|head)[^>]*>/gi, "");
}

function sanitizeRichMarkup(value) {
  const source = stripDangerousBlocks(value)
    .replace(/\r\n?/g, "\n")
    .replace(/<\s*(div|section|article)\b/gi, "<p")
    .replace(/<\s*\/\s*(div|section|article)\s*>/gi, "</p>")
    .replace(/<\s*h[4-6]\b/gi, "<h3")
    .replace(/<\s*\/\s*h[4-6]\s*>/gi, "</h3>");

  const tagPattern = /<(\/?)([a-z0-9]+)([^>]*)>/gi;
  let result = "";
  let cursor = 0;

  for (const match of source.matchAll(tagPattern)) {
    const fullMatch = match[0];
    const isClosing = Boolean(match[1]);
    const originalTag = String(match[2] || "").toLowerCase();
    const rawAttrs = match[3] || "";
    const tag = originalTag === "div" ? "p" : originalTag;
    const index = match.index ?? 0;

    result += escapeHtml(source.slice(cursor, index));
    cursor = index + fullMatch.length;

    if (!ALLOWED_TAGS.has(tag)) {
      continue;
    }

    if (isClosing) {
      result += tag === "br" || tag === "hr" ? "" : `</${tag}>`;
      continue;
    }

    if (tag === "br" || tag === "hr") {
      result += `<${tag}>`;
      continue;
    }

    if (tag === "a") {
      const href = sanitizeUrl(getHrefAttribute(rawAttrs));
      if (!href) continue;
      result += `<a href="${escapeAttribute(href)}">`;
      continue;
    }

    result += `<${tag}>`;
  }

  result += escapeHtml(source.slice(cursor));

  return result
    .replace(/<(p|h1|h2|h3|blockquote|li)>\s*(<br>\s*)*<\/\1>/gi, "")
    .replace(/<p>\s*<\/p>/gi, "")
    .replace(/(?:<br>\s*){3,}/gi, "<br><br>")
    .trim();
}

function decorateMarkupForEmail(value) {
  return String(value || "")
    .replace(/<p>/g, '<p style="margin:0 0 18px;font-size:16px;line-height:1.72;color:#1f2937;">')
    .replace(/<h1>/g, '<h1 style="margin:0 0 14px;font-size:28px;line-height:1.12;font-weight:700;letter-spacing:-0.04em;color:#111111;">')
    .replace(/<h2>/g, '<h2 style="margin:24px 0 12px;font-size:22px;line-height:1.2;font-weight:700;letter-spacing:-0.03em;color:#111111;">')
    .replace(/<h3>/g, '<h3 style="margin:22px 0 10px;font-size:18px;line-height:1.3;font-weight:700;letter-spacing:-0.02em;color:#111111;">')
    .replace(/<ul>/g, '<ul style="margin:0 0 18px;padding-left:22px;color:#1f2937;">')
    .replace(/<ol>/g, '<ol style="margin:0 0 18px;padding-left:22px;color:#1f2937;">')
    .replace(/<li>/g, '<li style="margin:0 0 10px;font-size:16px;line-height:1.7;">')
    .replace(/<blockquote>/g, '<blockquote style="margin:0 0 18px;padding:4px 0 4px 18px;border-left:3px solid #f97316;color:#111111;">')
    .replace(/<strong>/g, '<strong style="font-weight:700;color:#111111;">')
    .replace(/<b>/g, '<b style="font-weight:700;color:#111111;">')
    .replace(/<em>/g, '<em style="font-style:italic;">')
    .replace(/<i>/g, '<i style="font-style:italic;">')
    .replace(/<u>/g, '<u style="text-decoration:underline;">')
    .replace(/<s>/g, '<s style="text-decoration:line-through;">')
    .replace(/<hr>/g, '<hr style="border:0;border-top:1px solid #ece7df;margin:28px 0;">')
    .replace(/<a href="([^"]+)">/g, '<a href="$1" target="_blank" rel="noopener noreferrer" style="color:#f97316;font-weight:600;text-decoration:underline;">');
}

export function extractYouTubeId(value) {
  if (!value) return null;
  const trimmed = String(value).trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;

  try {
    const parsed = new URL(trimmed);
    if (parsed.hostname === "youtu.be") return parsed.pathname.slice(1).split("?")[0];
    if (parsed.searchParams.has("v")) return parsed.searchParams.get("v");
    const match = parsed.pathname.match(/\/(?:embed|shorts)\/([a-zA-Z0-9_-]+)/);
    return match?.[1] || null;
  } catch {
    return null;
  }
}

export function sanitizeBroadcastBodyMarkup(body) {
  if (!String(body || "").trim()) return "";
  return looksLikeHtml(body) ? sanitizeRichMarkup(body) : convertPlainTextToMarkup(body);
}

export function getBroadcastBodyText(body) {
  const sanitized = sanitizeBroadcastBodyMarkup(body);
  if (!sanitized) return "";

  return sanitized
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|h1|h2|h3|li|blockquote)>/gi, "\n")
    .replace(/<hr\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function renderBroadcastBodyMarkup({ body = "", recipientName = "", recipientTeam = "", recipientEmail = "", playEmbedHtml = "" }) {
  const personalizedBody = personalizeMergeTags(body, recipientName, recipientTeam, recipientEmail);
  const placeholderBody = String(personalizedBody || "").replace(
    PLAY_EMBED_TOKEN_PATTERN,
    playEmbedHtml ? PLAY_EMBED_PLACEHOLDER : ""
  );
  const sanitized = sanitizeBroadcastBodyMarkup(placeholderBody);

  if (!sanitized) {
    return '<p style="margin:0;font-size:16px;line-height:1.75;color:#94a3b8;font-style:italic;">Your formatted message will appear here.</p>';
  }

  let decorated = decorateMarkupForEmail(sanitized);
  if (playEmbedHtml) {
    const standalonePattern = new RegExp(
      `<p[^>]*>\\s*${PLAY_EMBED_PLACEHOLDER}\\s*<\\/p>`,
      "gi"
    );
    decorated = decorated
      .replace(standalonePattern, playEmbedHtml)
      .replace(new RegExp(PLAY_EMBED_PLACEHOLDER, "g"), playEmbedHtml);
  }
  return decorated;
}

export function buildBroadcastEmailHtml({
  subheader = "",
  body = "",
  youtubeUrl = "",
  gifUrl = "",
  playEmbed = null,
  recipientName = "",
  recipientTeam = "",
  recipientEmail = "",
}) {
  const personalizedSubheader = personalizeMergeTags(subheader, recipientName, recipientTeam, recipientEmail).trim();

  const safePlayGifUrl = playEmbed?.gifUrl ? sanitizeUrl(playEmbed.gifUrl) : "";
  const playCardHtml = playEmbed && safePlayGifUrl
    ? `<div style="margin:0 0 18px;">` +
      `<p style="margin:0 0 5px;font-size:13px;font-weight:700;color:#111111;letter-spacing:-0.01em;">${escapeHtml(playEmbed.title || "Play")}</p>` +
      `<div style="width:32px;height:3px;border-radius:999px;background-color:#f97316;margin-bottom:10px;"></div>` +
      `<img src="${escapeAttribute(safePlayGifUrl)}" alt="${escapeAttribute(playEmbed.title || "Play")}" width="492" style="display:block;width:100%;max-width:100%;border:0;border-radius:6px;" /></div>`
    : "";

  const bodyHtml = renderBroadcastBodyMarkup({ body, recipientName, recipientTeam, recipientEmail, playEmbedHtml: playCardHtml });
  const videoId = extractYouTubeId(youtubeUrl);
  const safeYoutubeUrl = sanitizeUrl(youtubeUrl);
  const safeGifUrl = sanitizeUrl(gifUrl);
  const subheaderHtml = personalizedSubheader
    ? `<p style="margin:0 0 18px;font-size:15px;line-height:1.65;color:#6b7280;">${escapeHtml(personalizedSubheader)}</p>`
    : "";

  const youtubeSection = videoId && safeYoutubeUrl
    ? `
      <tr>
        <td style="padding:0 24px 24px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border:1px solid #ece7df;border-radius:12px;">
            <tr>
              <td style="padding:16px 18px 10px;">
                <p style="margin:0;font-size:14px;line-height:1.4;font-weight:600;color:#111111;">Watch the clip</p>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:0 18px;">
                <a href="${escapeAttribute(safeYoutubeUrl)}" target="_blank" rel="noopener noreferrer" style="display:inline-block;text-decoration:none;">
                  <img src="https://img.youtube.com/vi/${escapeAttribute(videoId)}/hqdefault.jpg" alt="Watch video" width="492" style="display:block;width:100%;max-width:492px;border:0;border-radius:8px;" />
                </a>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:14px 18px 18px;">
                <a href="${escapeAttribute(safeYoutubeUrl)}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:11px 18px;border-radius:999px;background-color:#f97316;color:#ffffff;font-size:13px;font-weight:700;text-decoration:none;letter-spacing:-0.01em;">
                  Watch On YouTube
                </a>
              </td>
            </tr>
          </table>
        </td>
      </tr>`
    : "";

  const gifSection = safeGifUrl
    ? `
      <tr>
        <td style="padding:0 24px 24px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border:1px solid #ece7df;border-radius:12px;">
            <tr>
              <td style="padding:16px 18px 10px;">
                <p style="margin:0;font-size:14px;line-height:1.4;font-weight:600;color:#111111;">Preview</p>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:0 18px 18px;">
                <img src="${escapeAttribute(safeGifUrl)}" alt="Animated preview" width="492" style="display:block;width:100%;max-width:492px;border:0;border-radius:8px;" />
              </td>
            </tr>
          </table>
        </td>
      </tr>`
    : "";

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background-color:#ffffff;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#ffffff;padding:32px 14px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:620px;background-color:#ffffff;">
          <tr>
            <td style="padding:24px 24px 20px;background-color:#ffffff;">
              <p style="margin:0;font-size:24px;line-height:1.1;font-weight:700;letter-spacing:-0.03em;color:#111111;">Coachable</p>
              <div style="width:52px;height:3px;border-radius:999px;background-color:#f97316;margin-top:14px;"></div>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 24px 24px;">
              ${subheaderHtml}
              ${bodyHtml}
            </td>
          </tr>
          ${youtubeSection}
          ${gifSection}
          <tr>
            <td style="padding:0 24px;">
              <div style="border-top:1px solid #ece7df;"></div>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 24px 20px;text-align:center;">
              <p style="margin:0;font-size:12px;line-height:1.5;color:#f97316;">
                coachableplays.com
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
