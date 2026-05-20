/**
 * Compute the next UTC send timestamp for a recurring email campaign.
 *
 * Supported frequency types:
 *   - "weekly":  picks the next occurrence of frequency_day_of_week (0=Sun..6=Sat)
 *   - "monthly": picks the next occurrence of frequency_day_of_month (1-31)
 *   - "custom":  adds frequency_interval_days to last_sent_at (falls back to fromDate)
 *
 * All computation is done in UTC. frequency_hour sets the send hour (0-23, default 9).
 *
 * @param {Object} campaign
 * @param {string} campaign.frequency_type          - "weekly" | "monthly" | "custom"
 * @param {number} [campaign.frequency_day_of_week] - 0-6 (weekly only)
 * @param {number} [campaign.frequency_day_of_month]- 1-31 (monthly only)
 * @param {number} [campaign.frequency_interval_days]- days between sends (custom only)
 * @param {number} [campaign.frequency_hour]        - UTC hour to send (default: 9)
 * @param {Date|string|null} [campaign.last_sent_at]- when this campaign last fired
 * @param {Date} [fromDate]                         - reference "now" (defaults to new Date())
 * @returns {Date|null} - next send time, or null for unknown frequency_type
 */
export function computeNextSendAt(campaign, fromDate = new Date()) {
  const {
    frequency_type,
    frequency_day_of_week,
    frequency_day_of_month,
    frequency_interval_days,
    frequency_hour,
    last_sent_at,
  } = campaign;

  const hour = Number(frequency_hour ?? 9);
  const now = new Date(fromDate);

  if (frequency_type === "weekly") {
    const targetDay = Number(frequency_day_of_week ?? 1);
    const daysUntil = (targetDay - now.getUTCDay() + 7) % 7;
    const candidate = new Date(now);
    candidate.setUTCDate(candidate.getUTCDate() + daysUntil);
    candidate.setUTCHours(hour, 0, 0, 0);
    if (candidate <= now) candidate.setUTCDate(candidate.getUTCDate() + 7);
    return candidate;
  }

  if (frequency_type === "monthly") {
    const targetDay = Number(frequency_day_of_month ?? 1);
    const candidate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), targetDay, hour, 0, 0));
    if (candidate <= now) candidate.setUTCMonth(candidate.getUTCMonth() + 1);
    return candidate;
  }

  if (frequency_type === "custom") {
    const intervalDays = Number(frequency_interval_days ?? 7);
    const base = last_sent_at ? new Date(last_sent_at) : now;
    const candidate = new Date(base);
    candidate.setUTCDate(candidate.getUTCDate() + intervalDays);
    candidate.setUTCHours(hour, 0, 0, 0);
    if (candidate <= now) {
      const fallback = new Date(now);
      fallback.setUTCDate(fallback.getUTCDate() + intervalDays);
      fallback.setUTCHours(hour, 0, 0, 0);
      return fallback;
    }
    return candidate;
  }

  return null;
}
