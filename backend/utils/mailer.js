/**
 * Sends a password reset verification code via Brevo REST API.
 * Falls back gracefully if credentials are not configured.
 */
const sendResetPasswordEmail = async (email, code) => {
  const apiKey = process.env.SMTP_PASS;
  const fromEmail = process.env.SMTP_FROM || 'b63801001@smtp-brevo.com';

  if (!apiKey) {
    console.warn('[MAILER WARNING] SMTP_PASS (Brevo API Key) is not configured. Email not sent.');
    return false;
  }

  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'content-type': 'application/json',
        'api-key': apiKey
      },
      body: JSON.stringify({
        sender: { name: 'AgroAssist Support', email: fromEmail },
        to: [{ email: email }],
        subject: 'AgroAssist: Password Reset Request',
        htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
            <h2 style="color: #4CAF50; text-align: center;">AgroAssist Password Reset</h2>
            <p>Hello,</p>
            <p>You requested a password reset for your AgroAssist account. Please use the following 4-digit verification code to complete your reset:</p>
            <div style="text-align: center; margin: 30px 0;">
              <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #333; background-color: #f5f5f5; padding: 10px 20px; border-radius: 4px; border: 1px dashed #ccc;">${code}</span>
            </div>
            <p>This code is valid for <strong>10 minutes</strong>. If you did not request this, please ignore this email.</p>
            <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
            <p style="font-size: 12px; color: #777; text-align: center;">This is an automated email from AgroAssist. Please do not reply directly to this message.</p>
          </div>
        `
      })
    });

    if (response.status === 201 || response.status === 200) {
      const data = await response.json();
      console.log(`[MAILER] Reset email sent to ${email} via Brevo REST API. Message ID: ${data.messageId}`);
      return true;
    } else {
      const errorMsg = await response.text();
      console.error(`[MAILER ERROR] Brevo API responded with status ${response.status}:`, errorMsg);
      return false;
    }
  } catch (error) {
    console.error(`[MAILER ERROR] Failed to send email to ${email}:`, error);
    throw error;
  }
};

/**
 * Sends a login verification OTP code via email.
 */
const sendLoginOTPEmail = async (email, code) => {
  const apiKey = process.env.SMTP_PASS;
  const fromEmail = process.env.SMTP_FROM || 'ganeshgidda4@gmail.com';

  if (!apiKey) {
    console.warn('[MAILER WARNING] SMTP_PASS (Brevo API Key) is not configured. Email not sent.');
    return false;
  }

  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'content-type': 'application/json',
        'api-key': apiKey
      },
      body: JSON.stringify({
        sender: { name: 'AgroAssist Support', email: fromEmail },
        to: [{ email: email }],
        subject: 'AgroAssist: Your Login Verification Code',
        htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
            <h2 style="color: #4CAF50; text-align: center;">AgroAssist Authentication</h2>
            <p>Hello,</p>
            <p>Use the following 4-digit verification code (OTP) to log in or complete your registration on AgroAssist:</p>
            <div style="text-align: center; margin: 30px 0;">
              <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #333; background-color: #f5f5f5; padding: 10px 20px; border-radius: 4px; border: 1px dashed #ccc;">${code}</span>
            </div>
            <p>This code is valid for <strong>5 minutes</strong>. If you did not request this, you can ignore this email.</p>
            <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
            <p style="font-size: 12px; color: #777; text-align: center;">This is an automated email from AgroAssist. Please do not reply directly to this message.</p>
          </div>
        `
      })
    });

    if (response.status === 201 || response.status === 200) {
      const data = await response.json();
      console.log(`[MAILER] Login OTP email sent to ${email} via Brevo REST API. Message ID: ${data.messageId}`);
      return true;
    } else {
      const errorMsg = await response.text();
      console.error(`[MAILER ERROR] Brevo API responded with status ${response.status}:`, errorMsg);
      return false;
    }
  } catch (error) {
    console.error(`[MAILER ERROR] Failed to send login OTP email to ${email}:`, error);
    throw error;
  }
};

module.exports = {
  sendResetPasswordEmail,
  sendLoginOTPEmail
};
