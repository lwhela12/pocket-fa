import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = 'Pocket Financial Advisor <onboarding@resend.dev>'; // Change this to your verified domain
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

/**
 * Send email verification email to user
 * @param email - User's email address
 * @param verificationToken - Unique verification token
 * @param userName - User's name or email for personalization
 */
export async function sendVerificationEmail(
  email: string,
  verificationToken: string,
  userName?: string
): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.warn('RESEND_API_KEY not configured - skipping email send in development');
    console.log(`Verification link: ${APP_URL}/api/auth/verify-email?token=${verificationToken}`);
    return;
  }

  const verificationUrl = `${APP_URL}/api/auth/verify-email?token=${verificationToken}`;

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: 'Verify your email - Pocket Financial Advisor',
      html: getVerificationEmailHtml(verificationUrl, userName || email),
    });
  } catch (error: any) {
    console.error('Failed to send verification email:', error);
    throw new Error(`Failed to send verification email: ${error.message}`);
  }
}

/**
 * Send welcome email after verification
 * @param email - User's email address
 * @param userName - User's name
 */
export async function sendWelcomeEmail(
  email: string,
  userName?: string
): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.warn('RESEND_API_KEY not configured - skipping welcome email');
    return;
  }

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: 'Welcome to Pocket Financial Advisor!',
      html: getWelcomeEmailHtml(userName || email),
    });
  } catch (error: any) {
    console.error('Failed to send welcome email:', error);
    // Don't throw error - welcome email is not critical
  }
}

/**
 * HTML template for verification email
 */
function getVerificationEmailHtml(verificationUrl: string, userName: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify Your Email</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background-color: #2196F3; padding: 40px 20px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px;">Pocket Financial Advisor</h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="color: #333333; margin: 0 0 20px 0;">Verify Your Email Address</h2>
              <p style="color: #666666; font-size: 16px; line-height: 1.5; margin: 0 0 20px 0;">
                Hi ${userName},
              </p>
              <p style="color: #666666; font-size: 16px; line-height: 1.5; margin: 0 0 20px 0;">
                Thank you for signing up for Pocket Financial Advisor! To complete your registration and access your account, please verify your email address.
              </p>
              <p style="color: #666666; font-size: 16px; line-height: 1.5; margin: 0 0 30px 0;">
                Click the button below to verify your email:
              </p>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 20px 0;">
                    <a href="${verificationUrl}" style="background-color: #2196F3; color: #ffffff; text-decoration: none; padding: 14px 40px; border-radius: 4px; font-size: 16px; font-weight: bold; display: inline-block;">
                      Verify Email Address
                    </a>
                  </td>
                </tr>
              </table>

              <p style="color: #999999; font-size: 14px; line-height: 1.5; margin: 30px 0 0 0;">
                If the button doesn't work, copy and paste this link into your browser:
              </p>
              <p style="color: #2196F3; font-size: 14px; word-break: break-all; margin: 10px 0 0 0;">
                ${verificationUrl}
              </p>

              <p style="color: #999999; font-size: 14px; line-height: 1.5; margin: 30px 0 0 0;">
                This verification link will expire in 24 hours.
              </p>

              <p style="color: #999999; font-size: 14px; line-height: 1.5; margin: 10px 0 0 0;">
                If you didn't create an account, you can safely ignore this email.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8f8f8; padding: 20px 30px; text-align: center; border-top: 1px solid #e0e0e0;">
              <p style="color: #999999; font-size: 12px; margin: 0;">
                Pocket Financial Advisor - Your Personal Finance Companion
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

/**
 * HTML template for welcome email
 */
function getWelcomeEmailHtml(userName: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Pocket Financial Advisor</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background-color: #00CC00; padding: 40px 20px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px;">Welcome! 🎉</h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="color: #333333; margin: 0 0 20px 0;">You're all set!</h2>
              <p style="color: #666666; font-size: 16px; line-height: 1.5; margin: 0 0 20px 0;">
                Hi ${userName},
              </p>
              <p style="color: #666666; font-size: 16px; line-height: 1.5; margin: 0 0 20px 0;">
                Your email has been verified and your account is ready to use. Welcome to Pocket Financial Advisor!
              </p>
              <p style="color: #666666; font-size: 16px; line-height: 1.5; margin: 0 0 30px 0;">
                Get started by:
              </p>

              <ul style="color: #666666; font-size: 16px; line-height: 1.8; margin: 0 0 30px 0;">
                <li>Setting up your financial profile</li>
                <li>Uploading your investment statements</li>
                <li>Exploring AI-powered insights</li>
                <li>Tracking your expenses and goals</li>
              </ul>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 20px 0;">
                    <a href="${APP_URL}/dashboard" style="background-color: #00CC00; color: #ffffff; text-decoration: none; padding: 14px 40px; border-radius: 4px; font-size: 16px; font-weight: bold; display: inline-block;">
                      Go to Dashboard
                    </a>
                  </td>
                </tr>
              </table>

              <p style="color: #666666; font-size: 16px; line-height: 1.5; margin: 30px 0 0 0;">
                We're here to help you optimize your savings, investments, and retirement planning.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8f8f8; padding: 20px 30px; text-align: center; border-top: 1px solid #e0e0e0;">
              <p style="color: #999999; font-size: 12px; margin: 0;">
                Pocket Financial Advisor - Your Personal Finance Companion
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}
