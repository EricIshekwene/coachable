/**
 * Tiny RFC 4180 CSV serialization for the outreach export. Kept pure and
 * separate from the route so it can be unit-tested without the DB.
 *
 * @module outreachScraper/csv
 */

/**
 * Escape one CSV field: wrap in double quotes if it contains a comma, quote,
 * or newline, and double any embedded quotes.
 * @param {any} value
 * @returns {string}
 */
export function csvField(value) {
  const s = value == null ? "" : String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/**
 * Serialize rows to a CSV string with a header row. Fields are joined with
 * commas and rows with CRLF (RFC 4180).
 * @param {string[]} headers
 * @param {Array<Array<any>>} rows
 * @returns {string}
 */
export function toCsv(headers, rows) {
  const lines = [headers.map(csvField).join(",")];
  for (const row of rows) lines.push(row.map(csvField).join(","));
  return lines.join("\r\n");
}
