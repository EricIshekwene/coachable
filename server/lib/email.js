import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = process.env.FROM_EMAIL || "Coachable <noreply@tcutss.com>";

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

  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: toEmail,
    subject: `${code} is your Coachable verification code`,
    html,
  });

  if (error) throw new Error(error.message || "Failed to send verification email");
}
