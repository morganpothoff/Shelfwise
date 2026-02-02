import { Resend } from 'resend';

// Get the app URL from environment or default to localhost
const APP_URL = process.env.APP_URL || 'http://localhost:3000';
const FROM_EMAIL = process.env.FROM_EMAIL || 'Shelfwise <onboarding@resend.dev>';

// Initialize Resend lazily - only when actually sending emails
let resend = null;

function getResendClient() {
  if (!resend) {
    if (!process.env.RESEND_API_KEY) {
      return null;
    }
    resend = new Resend(process.env.RESEND_API_KEY);
  }
  return resend;
}

/**
 * Send a password reset email
 * @param {string} toEmail - Recipient email address
 * @param {string} resetToken - The password reset token
 * @param {string} userName - Optional user name for personalization
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function sendPasswordResetEmail(toEmail, resetToken, userName = null) {
  const resetUrl = `${APP_URL}/reset-password?token=${resetToken}`;
  const greeting = userName ? `Hi ${userName},` : 'Hi,';

  const client = getResendClient();

  if (!client) {
    console.warn('RESEND_API_KEY not set. Password reset email not sent.');
    console.log('Reset URL (for development):', resetUrl);
    return { success: true, warning: 'Email not configured - check server logs for reset URL' };
  }

  try {
    const { data, error } = await client.emails.send({
      from: FROM_EMAIL,
      to: toEmail,
      subject: 'Reset your Shelfwise password',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Reset Your Password</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Shelfwise</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 5px 0 0 0; font-size: 14px;">Your Personal Library Manager</p>
          </div>

          <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
            <h2 style="color: #1f2937; margin-top: 0;">Reset Your Password</h2>

            <p style="color: #4b5563;">${greeting}</p>

            <p style="color: #4b5563;">We received a request to reset your password. Click the button below to create a new password:</p>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" style="background: #7c3aed; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">Reset Password</a>
            </div>

            <p style="color: #6b7280; font-size: 14px;">This link will expire in <strong>1 hour</strong> for security reasons.</p>

            <p style="color: #6b7280; font-size: 14px;">If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.</p>

            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 25px 0;">

            <p style="color: #9ca3af; font-size: 12px; margin-bottom: 0;">
              If the button doesn't work, copy and paste this link into your browser:<br>
              <a href="${resetUrl}" style="color: #7c3aed; word-break: break-all;">${resetUrl}</a>
            </p>
          </div>

          <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
            <p style="margin: 0;">&copy; ${new Date().getFullYear()} Shelfwise. All rights reserved.</p>
          </div>
        </body>
        </html>
      `,
      text: `
${greeting}

We received a request to reset your Shelfwise password.

Click here to reset your password: ${resetUrl}

This link will expire in 1 hour for security reasons.

If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.

- The Shelfwise Team
      `.trim()
    });

    if (error) {
      console.error('Resend error:', error);
      return { success: false, error: error.message };
    }

    console.log('Password reset email sent:', data?.id);
    return { success: true };
  } catch (err) {
    console.error('Email send error:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Send an email verification email
 * @param {string} toEmail - Recipient email address
 * @param {string} verificationToken - The email verification token
 * @param {string} userName - Optional user name for personalization
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function sendEmailVerificationEmail(toEmail, verificationToken, userName = null) {
  const verifyUrl = `${APP_URL}/verify-email?token=${verificationToken}`;
  const greeting = userName ? `Hi ${userName},` : 'Hi,';

  const client = getResendClient();

  if (!client) {
    console.warn('RESEND_API_KEY not set. Verification email not sent.');
    console.log('Verification URL (for development):', verifyUrl);
    return { success: true, warning: 'Email not configured - check server logs for verification URL' };
  }

  try {
    const { data, error } = await client.emails.send({
      from: FROM_EMAIL,
      to: toEmail,
      subject: 'Verify your Shelfwise email',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Verify Your Email</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Shelfwise</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 5px 0 0 0; font-size: 14px;">Your Personal Library Manager</p>
          </div>

          <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
            <h2 style="color: #1f2937; margin-top: 0;">Verify Your Email</h2>

            <p style="color: #4b5563;">${greeting}</p>

            <p style="color: #4b5563;">Thank you for creating a Shelfwise account! Please click the button below to verify your email address:</p>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${verifyUrl}" style="background: #7c3aed; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">Verify Email</a>
            </div>

            <p style="color: #6b7280; font-size: 14px;">This link will expire in <strong>24 hours</strong> for security reasons.</p>

            <p style="color: #6b7280; font-size: 14px;">If you didn't create a Shelfwise account, you can safely ignore this email.</p>

            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 25px 0;">

            <p style="color: #9ca3af; font-size: 12px; margin-bottom: 0;">
              If the button doesn't work, copy and paste this link into your browser:<br>
              <a href="${verifyUrl}" style="color: #7c3aed; word-break: break-all;">${verifyUrl}</a>
            </p>
          </div>

          <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
            <p style="margin: 0;">&copy; ${new Date().getFullYear()} Shelfwise. All rights reserved.</p>
          </div>
        </body>
        </html>
      `,
      text: `
${greeting}

Thank you for creating a Shelfwise account! Please verify your email address by clicking the link below:

${verifyUrl}

This link will expire in 24 hours for security reasons.

If you didn't create a Shelfwise account, you can safely ignore this email.

- The Shelfwise Team
      `.trim()
    });

    if (error) {
      console.error('Resend error:', error);
      return { success: false, error: error.message };
    }

    console.log('Verification email sent:', data?.id);
    return { success: true };
  } catch (err) {
    console.error('Email send error:', err);
    return { success: false, error: err.message };
  }
}

export default {
  sendPasswordResetEmail,
  sendEmailVerificationEmail
};
