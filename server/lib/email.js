import { Resend } from "resend";
import { buildBroadcastEmailHtml as buildSharedBroadcastEmailHtml } from "./broadcastEmailTemplate.js";

const FROM_EMAIL = process.env.FROM_EMAIL || "Coachable <noreply@tcutss.com>";

let resendOverride = null;
let lazyResend = null;

/**
 * Return the Resend client used by the helpers below. In production it is
 * lazily constructed from `RESEND_API_KEY`; in tests it is replaced via
 * `__setResendClientForTests`.
 */
function getResend() {
  if (resendOverride) return resendOverride;
  if (!lazyResend) lazyResend = new Resend(process.env.RESEND_API_KEY);
  return lazyResend;
}

/**
 * Replace the Resend client used by this module. Tests inject a fake here
 * so they don't hit the real Resend API. Pass `null` to restore the default
 * client (constructed lazily from `process.env.RESEND_API_KEY`).
 *
 * @param {{ emails: { send: Function } } | null} client
 */
export function __setResendClientForTests(client) {
  resendOverride = client;
}

/**
 * Generate a 6-digit verification code.
 */
export function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

/**
 * Send a styled verification code email via Resend.
 */
export async function sendVerificationEmail(toEmail, code, userName) {
  const firstName = (userName || "").split(" ")[0] || "there";

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0; padding:0; background-color:#f5f5f5; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f5; padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px; background-color:#ffffff; border-radius:16px; overflow:hidden; box-shadow:0 4px 24px rgba(0,0,0,0.06);">

          <!-- Header -->
          <tr>
            <td style="background-color:#121212; padding:32px 40px; text-align:center;">
              <span style="font-size:24px; font-weight:700; color:#FF7A18; letter-spacing:-0.5px;">coachable</span>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px 40px 16px;">
              <h1 style="margin:0 0 8px; font-size:22px; font-weight:700; color:#121212; letter-spacing:-0.3px;">
                Verify your email
              </h1>
              <p style="margin:0 0 28px; font-size:15px; color:#4b5157; line-height:1.6;">
                Hey ${firstName}, enter this code to finish creating your Coachable account.
              </p>

              <!-- Code Box -->
              <div style="background-color:#f8f9fa; border:2px solid #e9ecef; border-radius:12px; padding:24px; text-align:center; margin-bottom:28px;">
                <span style="font-size:36px; font-weight:700; letter-spacing:8px; color:#121212; font-family:'Courier New',monospace;">
                  ${code}
                </span>
              </div>

              <p style="margin:0 0 4px; font-size:13px; color:#9AA0A6; line-height:1.5;">
                This code expires in <strong style="color:#4b5157;">10 minutes</strong>.
              </p>
              <p style="margin:0; font-size:13px; color:#9AA0A6; line-height:1.5;">
                If you didn't sign up for Coachable, you can safely ignore this email.
              </p>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding:0 40px;">
              <div style="border-top:1px solid #e9ecef; margin:20px 0;"></div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:0 40px 32px; text-align:center;">
              <p style="margin:0; font-size:12px; color:#9AA0A6; line-height:1.5;">
                Coachable — The modern playbook platform for coaches and teams.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const { error } = await getResend().emails.send({
    from: FROM_EMAIL,
    to: toEmail,
    subject: `${code} is your Coachable verification code`,
    html,
  });

  if (error) throw new Error(error.message || "Failed to send verification email");
}

/**
 * Send a styled email-change verification code via Resend.
 */
export async function sendEmailChangeVerification(toEmail, code, userName) {
  const firstName = (userName || "").split(" ")[0] || "there";

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0; padding:0; background-color:#f5f5f5; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f5; padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px; background-color:#ffffff; border-radius:16px; overflow:hidden; box-shadow:0 4px 24px rgba(0,0,0,0.06);">
          <tr>
            <td style="background-color:#121212; padding:32px 40px; text-align:center;">
              <span style="font-size:24px; font-weight:700; color:#FF7A18; letter-spacing:-0.5px;">coachable</span>
            </td>
          </tr>
          <tr>
            <td style="padding:40px 40px 16px;">
              <h1 style="margin:0 0 8px; font-size:22px; font-weight:700; color:#121212; letter-spacing:-0.3px;">
                Confirm your new email
              </h1>
              <p style="margin:0 0 28px; font-size:15px; color:#4b5157; line-height:1.6;">
                Hey ${firstName}, enter this code to confirm your new email address on Coachable.
              </p>
              <div style="background-color:#f8f9fa; border:2px solid #e9ecef; border-radius:12px; padding:24px; text-align:center; margin-bottom:28px;">
                <span style="font-size:36px; font-weight:700; letter-spacing:8px; color:#121212; font-family:'Courier New',monospace;">
                  ${code}
                </span>
              </div>
              <p style="margin:0 0 4px; font-size:13px; color:#9AA0A6; line-height:1.5;">
                This code expires in <strong style="color:#4b5157;">10 minutes</strong>.
              </p>
              <p style="margin:0; font-size:13px; color:#9AA0A6; line-height:1.5;">
                If you didn't request this change, you can safely ignore this email.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 40px;">
              <div style="border-top:1px solid #e9ecef; margin:20px 0;"></div>
            </td>
          </tr>
          <tr>
            <td style="padding:0 40px 32px; text-align:center;">
              <p style="margin:0; font-size:12px; color:#9AA0A6; line-height:1.5;">
                Coachable — The modern playbook platform for coaches and teams.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const { error } = await getResend().emails.send({
    from: FROM_EMAIL,
    to: toEmail,
    subject: `${code} is your Coachable email change code`,
    html,
  });

  if (error) throw new Error(error.message || "Failed to send email change verification");
}

/**
 * Send a styled team invite email via Resend.
 */
export async function sendTeamInviteEmail({ toEmail, inviteCode, role, teamName, inviterName }) {
  const roleLabel = role === "coach" ? "Coach" : "Player";
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
  const signupLink = `${frontendUrl}/signup?invite=${encodeURIComponent(inviteCode)}&email=${encodeURIComponent(toEmail)}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0; padding:0; background-color:#f5f5f5; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f5; padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px; background-color:#ffffff; border-radius:16px; overflow:hidden; box-shadow:0 4px 24px rgba(0,0,0,0.06);">

          <!-- Header -->
          <tr>
            <td style="background-color:#121212; padding:32px 40px; text-align:center;">
              <span style="font-size:24px; font-weight:700; color:#FF7A18; letter-spacing:-0.5px;">coachable</span>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px 40px 16px;">
              <h1 style="margin:0 0 8px; font-size:22px; font-weight:700; color:#121212; letter-spacing:-0.3px;">
                You're invited to join ${teamName || "a team"}
              </h1>
              <p style="margin:0 0 24px; font-size:15px; color:#4b5157; line-height:1.6;">
                ${inviterName || "Your coach"} invited you to join <strong>${teamName || "their team"}</strong> on Coachable as a <strong>${roleLabel}</strong>.
              </p>

              <!-- Invite Code -->
              <div style="background-color:#f8f9fa; border:2px solid #e9ecef; border-radius:12px; padding:20px; text-align:center; margin-bottom:24px;">
                <p style="margin:0 0 6px; font-size:11px; font-weight:600; color:#9AA0A6; text-transform:uppercase; letter-spacing:1px;">Your invite code</p>
                <span style="font-size:32px; font-weight:700; letter-spacing:6px; color:#121212; font-family:'Courier New',monospace;">
                  ${inviteCode}
                </span>
              </div>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                <tr>
                  <td align="center">
                    <a href="${signupLink}" style="display:inline-block; background-color:#FF7A18; color:#ffffff; font-size:15px; font-weight:700; text-decoration:none; padding:14px 40px; border-radius:10px; letter-spacing:-0.2px;">
                      Join ${teamName || "Team"}
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 4px; font-size:13px; color:#9AA0A6; line-height:1.5;">
                Already have an account? Just log in and enter the code above on the team page.
              </p>
              <p style="margin:0; font-size:13px; color:#9AA0A6; line-height:1.5;">
                If you weren't expecting this invite, you can safely ignore this email.
              </p>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding:0 40px;">
              <div style="border-top:1px solid #e9ecef; margin:20px 0;"></div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:0 40px 32px; text-align:center;">
              <p style="margin:0; font-size:12px; color:#9AA0A6; line-height:1.5;">
                Coachable — The modern playbook platform for coaches and teams.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const { error } = await getResend().emails.send({
    from: FROM_EMAIL,
    to: toEmail,
    subject: `${inviterName || "Your coach"} invited you to ${teamName || "a team"} on Coachable`,
    html,
  });

  if (error) throw new Error(error.message || "Failed to send invite email");
}

/**
 * Send a styled password reset code email via Resend.
 * @param {string} toEmail - Recipient email address.
 * @param {string} code - 6-digit reset code.
 * @param {string} userName - User's display name.
 */
export async function sendPasswordResetEmail(toEmail, code, userName) {
  const firstName = (userName || "").split(" ")[0] || "there";

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0; padding:0; background-color:#f5f5f5; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f5; padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px; background-color:#ffffff; border-radius:16px; overflow:hidden; box-shadow:0 4px 24px rgba(0,0,0,0.06);">

          <!-- Header -->
          <tr>
            <td style="background-color:#121212; padding:32px 40px; text-align:center;">
              <span style="font-size:24px; font-weight:700; color:#FF7A18; letter-spacing:-0.5px;">coachable</span>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px 40px 16px;">
              <h1 style="margin:0 0 8px; font-size:22px; font-weight:700; color:#121212; letter-spacing:-0.3px;">
                Reset your password
              </h1>
              <p style="margin:0 0 28px; font-size:15px; color:#4b5157; line-height:1.6;">
                Hey ${firstName}, enter this code to reset your Coachable password.
              </p>

              <!-- Code Box -->
              <div style="background-color:#f8f9fa; border:2px solid #e9ecef; border-radius:12px; padding:24px; text-align:center; margin-bottom:28px;">
                <span style="font-size:36px; font-weight:700; letter-spacing:8px; color:#121212; font-family:'Courier New',monospace;">
                  ${code}
                </span>
              </div>

              <p style="margin:0 0 4px; font-size:13px; color:#9AA0A6; line-height:1.5;">
                This code expires in <strong style="color:#4b5157;">10 minutes</strong>.
              </p>
              <p style="margin:0; font-size:13px; color:#9AA0A6; line-height:1.5;">
                If you didn't request a password reset, you can safely ignore this email. Your password will not change.
              </p>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding:0 40px;">
              <div style="border-top:1px solid #e9ecef; margin:20px 0;"></div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:0 40px 32px; text-align:center;">
              <p style="margin:0; font-size:12px; color:#9AA0A6; line-height:1.5;">
                Coachable — The modern playbook platform for coaches and teams.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const { error } = await getResend().emails.send({
    from: FROM_EMAIL,
    to: toEmail,
    subject: `${code} is your Coachable password reset code`,
    html,
  });

  if (error) throw new Error(error.message || "Failed to send password reset email");
}

/**
 * Send a Danger Mode verification code email to the admin's security email.
 * @param {string} toEmail - The admin's configured security email address.
 * @param {string} code - 6-digit OTP code.
 */
export async function sendDangerModeEmail(toEmail, code) {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0; padding:0; background-color:#f5f5f5; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f5; padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px; background-color:#ffffff; border-radius:16px; overflow:hidden; box-shadow:0 4px 24px rgba(0,0,0,0.06);">
          <tr>
            <td style="background-color:#121212; padding:32px 40px; text-align:center;">
              <span style="font-size:24px; font-weight:700; color:#FF7A18; letter-spacing:-0.5px;">coachable</span>
            </td>
          </tr>
          <tr>
            <td style="padding:40px 40px 16px;">
              <h1 style="margin:0 0 8px; font-size:22px; font-weight:700; color:#121212; letter-spacing:-0.3px;">
                Danger Mode verification
              </h1>
              <p style="margin:0 0 28px; font-size:15px; color:#4b5157; line-height:1.6;">
                Someone is attempting to activate Danger Mode on the Coachable admin dashboard. Enter this code to confirm.
              </p>
              <div style="background-color:#fff3ee; border:2px solid #FF7A18; border-radius:12px; padding:24px; text-align:center; margin-bottom:28px;">
                <span style="font-size:36px; font-weight:700; letter-spacing:8px; color:#121212; font-family:'Courier New',monospace;">
                  ${code}
                </span>
              </div>
              <p style="margin:0 0 4px; font-size:13px; color:#9AA0A6; line-height:1.5;">
                This code expires in <strong style="color:#4b5157;">10 minutes</strong>.
              </p>
              <p style="margin:0; font-size:13px; color:#9AA0A6; line-height:1.5;">
                If you did not trigger this, someone may have your admin password. Change it immediately.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 40px;">
              <div style="border-top:1px solid #e9ecef; margin:20px 0;"></div>
            </td>
          </tr>
          <tr>
            <td style="padding:0 40px 32px; text-align:center;">
              <p style="margin:0; font-size:12px; color:#9AA0A6; line-height:1.5;">
                Coachable — The modern playbook platform for coaches and teams.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const { error } = await getResend().emails.send({
    from: FROM_EMAIL,
    to: toEmail,
    subject: `${code} — Coachable Danger Mode verification`,
    html,
  });

  if (error) throw new Error(error.message || "Failed to send Danger Mode verification email");
}

/**
 * Send a notification email when a user's account is removed (either by
 * the stale-account auto-cleanup or by an admin Danger Mode delete). The
 * email tells them their account is gone and points them at signup so they
 * are not silently stranded on the login screen.
 *
 * @param {Object} args
 * @param {string} args.toEmail - Recipient email address.
 * @param {string} args.userName - Display name from the deleted user row.
 * @param {"stale"|"admin"} args.reason - Why the account was removed.
 */
export async function sendAccountDeletedEmail({ toEmail, userName, reason }) {
  const firstName = (userName || "").split(" ")[0] || "there";
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
  const signupLink = `${frontendUrl}/signup`;

  const reasonCopy =
    reason === "stale"
      ? "Your Coachable signup was never finished, so our automatic cleanup removed the unfinished account. No data was retained."
      : "A Coachable admin has removed your account. If you believe this is a mistake, reply to this email and we'll get back to you.";

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0; padding:0; background-color:#f5f5f5; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f5; padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px; background-color:#ffffff; border-radius:16px; overflow:hidden; box-shadow:0 4px 24px rgba(0,0,0,0.06);">

          <tr>
            <td style="background-color:#121212; padding:32px 40px; text-align:center;">
              <span style="font-size:24px; font-weight:700; color:#FF7A18; letter-spacing:-0.5px;">coachable</span>
            </td>
          </tr>

          <tr>
            <td style="padding:40px 40px 16px;">
              <h1 style="margin:0 0 8px; font-size:22px; font-weight:700; color:#121212; letter-spacing:-0.3px;">
                Your account was removed
              </h1>
              <p style="margin:0 0 24px; font-size:15px; color:#4b5157; line-height:1.6;">
                Hey ${firstName}, ${reasonCopy}
              </p>

              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                <tr>
                  <td align="center">
                    <a href="${signupLink}" style="display:inline-block; background-color:#FF7A18; color:#ffffff; font-size:15px; font-weight:700; text-decoration:none; padding:14px 40px; border-radius:10px; letter-spacing:-0.2px;">
                      Sign up again
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0; font-size:13px; color:#9AA0A6; line-height:1.5;">
                If you didn't expect this, you can safely ignore the email.
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:0 40px;">
              <div style="border-top:1px solid #e9ecef; margin:20px 0;"></div>
            </td>
          </tr>

          <tr>
            <td style="padding:0 40px 32px; text-align:center;">
              <p style="margin:0; font-size:12px; color:#9AA0A6; line-height:1.5;">
                Coachable — The modern playbook platform for coaches and teams.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const subject =
    reason === "stale"
      ? "Your unfinished Coachable signup was removed"
      : "Your Coachable account was removed";

  const { error } = await getResend().emails.send({
    from: FROM_EMAIL,
    to: toEmail,
    subject,
    html,
  });

  if (error) throw new Error(error.message || "Failed to send account-deleted email");
}

/**
 * Send a notification email when a member is removed from a team.
 */
/**
 * Send a staff-admin invite email. The recipient clicks the CTA, which routes
 * them to `/staff/accept-invite?token=…` to either log into an existing
 * Coachable account or sign up.
 *
 * @param {{ toEmail: string, inviteUrl: string, ownerName?: string, permissionsSummary?: string[] }} args
 */
export async function sendStaffAdminInviteEmail({ toEmail, inviteUrl, ownerName, permissionsSummary }) {
  const summaryHtml = (permissionsSummary && permissionsSummary.length)
    ? `<ul style="margin:0 0 20px; padding-left:18px; color:#4b5157; font-size:14px; line-height:1.7;">${permissionsSummary
        .map((line) => `<li>${line}</li>`)
        .join("")}</ul>`
    : "";

  const inviter = ownerName || "The Coachable owner";

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0; padding:0; background-color:#f5f5f5; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f5; padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px; background-color:#ffffff; border-radius:16px; overflow:hidden; box-shadow:0 4px 24px rgba(0,0,0,0.06);">
          <tr>
            <td style="background-color:#121212; padding:32px 40px; text-align:center;">
              <span style="font-size:24px; font-weight:700; color:#FF7A18; letter-spacing:-0.5px;">coachable</span>
            </td>
          </tr>
          <tr>
            <td style="padding:40px 40px 16px;">
              <h1 style="margin:0 0 8px; font-size:22px; font-weight:700; color:#121212; letter-spacing:-0.3px;">
                You've been invited as a staff admin
              </h1>
              <p style="margin:0 0 24px; font-size:15px; color:#4b5157; line-height:1.6;">
                ${inviter} has invited you to help manage the Coachable platform. You'll have a scoped admin role with the following access:
              </p>
              ${summaryHtml}
              <div style="text-align:center; margin:28px 0;">
                <a href="${inviteUrl}" style="display:inline-block; background-color:#FF7A18; color:#ffffff; text-decoration:none; font-weight:600; padding:14px 28px; border-radius:10px; font-size:15px;">
                  Accept invitation
                </a>
              </div>
              <p style="margin:0; font-size:13px; color:#9AA0A6; line-height:1.5;">
                If you didn't expect this email, you can safely ignore it. The invite link expires in 7 days.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 40px 32px; text-align:center;">
              <p style="margin:0; font-size:12px; color:#9AA0A6; line-height:1.5;">
                Coachable — The modern playbook platform for coaches and teams.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const { error } = await getResend().emails.send({
    from: FROM_EMAIL,
    to: toEmail,
    subject: "You've been invited as a Coachable staff admin",
    html,
  });

  if (error) throw new Error(error.message || "Failed to send staff invite email");
}

// ── Broadcast email helpers ───────────────────────────────────────────────

/**
 * Extract a YouTube video ID from a URL or bare 11-char ID string.
 * Supports watch?v=, youtu.be/, embed/, and shorts/ URL formats.
 * @param {string} input
 * @returns {string|null}
 */
function extractYouTubeIdFromUrl(input) {
  if (!input) return null;
  const trimmed = input.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;
  try {
    const u = new URL(trimmed);
    if (u.hostname === "youtu.be") return u.pathname.slice(1).split("?")[0];
    if (u.searchParams.has("v")) return u.searchParams.get("v");
    const m = u.pathname.match(/\/(?:embed|shorts)\/([a-zA-Z0-9_-]+)/);
    if (m) return m[1];
  } catch { /* not a parseable URL */ }
  return null;
}

/**
 * Build the HTML body for a broadcast email.
 * Body text supports `{{firstName}}` for per-recipient personalisation and
 * double-newlines as paragraph breaks. Optionally appends a YouTube thumbnail
 * section and/or an inline GIF image.
 *
 * @param {Object} opts
 * @param {string} opts.body           - Plain-text body (double-newline = paragraph break)
 * @param {string} [opts.youtubeUrl]   - YouTube link; renders a thumbnail + watch link
 * @param {string} [opts.gifUrl]       - Publicly hosted GIF URL; renders inline
 * @param {string} [opts.recipientName] - Recipient display name for `{{firstName}}` substitution
 * @returns {string} Full HTML email string
 */
export function buildBroadcastEmailHtml({ body = "", youtubeUrl = "", gifUrl = "", recipientName = "", recipientTeam = "" }) {
  const nameParts = (recipientName || "").trim().split(/\s+/);
  const firstName = nameParts[0] || "";
  const lastName  = nameParts.length > 1 ? nameParts[nameParts.length - 1] : "";
  const personalizedBody = body
    .replace(/\{\{firstName\}\}/g, firstName)
    .replace(/\{\{lastName\}\}/g, lastName)
    .replace(/\{\{teamName\}\}/g, recipientTeam || "");

  const paragraphsHtml = personalizedBody
    .split(/\n\n+/)
    .filter(Boolean)
    .map(
      (p) =>
        `<p style="margin:0 0 16px;font-size:15px;color:#4b5157;line-height:1.7;">${p
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/\n/g, "<br>")}</p>`
    )
    .join("");

  let youtubeHtml = "";
  const videoId = extractYouTubeIdFromUrl(youtubeUrl);
  if (videoId) {
    youtubeHtml = `
      <table width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;">
        <tr>
          <td align="center">
            <a href="${youtubeUrl}" style="display:inline-block;">
              <img src="https://img.youtube.com/vi/${videoId}/hqdefault.jpg" alt="Watch video" width="480" style="max-width:100%;border-radius:8px;display:block;" />
            </a>
          </td>
        </tr>
        <tr>
          <td align="center" style="padding-top:8px;">
            <a href="${youtubeUrl}" style="color:#FF7A18;font-size:14px;font-weight:600;text-decoration:none;">&#9654; Watch on YouTube</a>
          </td>
        </tr>
      </table>`;
  }

  let gifHtml = "";
  if (gifUrl) {
    gifHtml = `
      <table width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;">
        <tr>
          <td align="center">
            <img src="${gifUrl}" alt="Play animation" width="480" style="max-width:100%;border-radius:8px;display:block;" />
          </td>
        </tr>
      </table>`;
  }

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background-color:#f5f5f5;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f5;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
          <tr>
            <td style="background-color:#121212;padding:32px 40px;text-align:center;">
              <span style="font-size:24px;font-weight:700;color:#FF7A18;letter-spacing:-0.5px;">coachable</span>
            </td>
          </tr>
          <tr>
            <td style="padding:40px 40px 24px;">
              ${paragraphsHtml}
              ${youtubeHtml}
              ${gifHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:0 40px;">
              <div style="border-top:1px solid #e9ecef;margin:4px 0 20px;"></div>
            </td>
          </tr>
          <tr>
            <td style="padding:0 40px 32px;text-align:center;">
              <p style="margin:0;font-size:12px;color:#9AA0A6;line-height:1.5;">
                Coachable — The modern playbook platform for coaches and teams.
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

/**
 * Send a broadcast email to a list of recipients using Resend's batch API.
 * Recipients are processed in chunks of 100 (Resend batch limit) with a
 * small delay between chunks to stay within rate limits.
 *
 * @param {Object} opts
 * @param {{ email: string, name: string }[]} opts.recipients - Target recipients
 * @param {string} opts.subject  - Email subject line
 * @param {string} [opts.subheader] - Optional short line above the body (supports merge tags)
 * @param {string} opts.body     - Rich-text or plain-text body content (supports merge tags)
 * @param {string} [opts.youtubeUrl] - Optional YouTube URL for thumbnail section
 * @param {string} [opts.gifUrl]     - Optional GIF URL for inline image section
 * @returns {Promise<{ sent: number, batches: number, errors: Array }>}
 */
export async function sendBroadcastEmails({ recipients, subject, subheader = "", body, youtubeUrl = "", gifUrl = "", playEmbed = null }) {
  if (!recipients || recipients.length === 0) return { sent: 0, batches: 0, errors: [] };

  const resend = getResend();
  const BATCH_SIZE = 100;
  let sent = 0;
  let batches = 0;
  const errors = [];

  for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
    const chunk = recipients.slice(i, i + BATCH_SIZE);
    const messages = chunk.map((r) => ({
      from: FROM_EMAIL,
      to: r.email,
      subject,
      html: buildSharedBroadcastEmailHtml({
        subheader,
        body,
        youtubeUrl,
        gifUrl,
        playEmbed,
        recipientName: r.name,
        recipientTeam: r.team_name || "",
        recipientEmail: r.email || "",
      }),
    }));

    try {
      const { error } = await resend.batch.send(messages);
      if (error) {
        errors.push({ batchIndex: batches, error: error.message || String(error) });
      } else {
        sent += chunk.length;
      }
    } catch (err) {
      errors.push({ batchIndex: batches, error: err instanceof Error ? err.message : String(err) });
    }

    batches += 1;
    if (i + BATCH_SIZE < recipients.length) {
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }

  return { sent, batches, errors };
}

export async function sendMemberRemovedEmail({ toEmail, memberName, teamName, removedByName }) {
  const firstName = (memberName || "").split(" ")[0] || "there";

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0; padding:0; background-color:#f5f5f5; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f5; padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px; background-color:#ffffff; border-radius:16px; overflow:hidden; box-shadow:0 4px 24px rgba(0,0,0,0.06);">

          <!-- Header -->
          <tr>
            <td style="background-color:#121212; padding:32px 40px; text-align:center;">
              <span style="font-size:24px; font-weight:700; color:#FF7A18; letter-spacing:-0.5px;">coachable</span>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px 40px 16px;">
              <h1 style="margin:0 0 8px; font-size:22px; font-weight:700; color:#121212; letter-spacing:-0.3px;">
                You've been removed from ${teamName || "a team"}
              </h1>
              <p style="margin:0 0 24px; font-size:15px; color:#4b5157; line-height:1.6;">
                Hey ${firstName}, ${removedByName || "a team admin"} has removed you from <strong>${teamName || "the team"}</strong> on Coachable.
              </p>
              <p style="margin:0 0 4px; font-size:13px; color:#9AA0A6; line-height:1.5;">
                If you believe this was a mistake, please reach out to your coach or team admin.
              </p>
              <p style="margin:0; font-size:13px; color:#9AA0A6; line-height:1.5;">
                You can still sign in and join another team at any time.
              </p>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding:0 40px;">
              <div style="border-top:1px solid #e9ecef; margin:20px 0;"></div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:0 40px 32px; text-align:center;">
              <p style="margin:0; font-size:12px; color:#9AA0A6; line-height:1.5;">
                Coachable — The modern playbook platform for coaches and teams.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const { error } = await getResend().emails.send({
    from: FROM_EMAIL,
    to: toEmail,
    subject: `You've been removed from ${teamName || "a team"} on Coachable`,
    html,
  });

  if (error) throw new Error(error.message || "Failed to send removal notification email");
}
