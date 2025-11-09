import nodemailer from "nodemailer";
import type { Registration } from "@shared/schema";

// SMTP Configuration for Render or any platform
// Defaults configured for SendGrid (recommended for production)
const SMTP_HOST = process.env.SMTP_HOST || "smtp.sendgrid.net";
const SMTP_PORT = parseInt(process.env.SMTP_PORT || "587");
const SMTP_SECURE = process.env.SMTP_SECURE === "true"; // true for 465, false for other ports
const SMTP_USER = process.env.SMTP_USER || "";
const SMTP_PASS = process.env.SMTP_PASS || "";
const EMAIL_FROM = process.env.EMAIL_FROM || "noreply@event.com";
const EMAIL_FROM_NAME = process.env.EMAIL_FROM_NAME || "Event Registration";
const SITE_URL = process.env.SITE_URL || "http://localhost:5000";

// Create reusable transporter
const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_SECURE,
  auth: SMTP_USER && SMTP_PASS ? {
    user: SMTP_USER,
    pass: SMTP_PASS,
  } : undefined,
  // For development without auth
  ...((!SMTP_USER || !SMTP_PASS) && {
    tls: {
      rejectUnauthorized: false
    }
  })
});

// Log configuration on startup
console.log("📧 Email Service Configuration:");
console.log("- Service: SMTP (Nodemailer)");
console.log("- Host:", SMTP_HOST);
console.log("- Port:", SMTP_PORT);
console.log("- Secure:", SMTP_SECURE);
console.log("- Auth:", SMTP_USER ? `✅ SET (${SMTP_USER})` : "❌ NOT SET");
console.log("- From:", `${EMAIL_FROM_NAME} <${EMAIL_FROM}>`);

export async function sendQRCodeEmail(
  registration: Registration,
  qrCodeDataUrl: string,
  verificationUrl: string
): Promise<boolean> {
  if (!SMTP_USER || !SMTP_PASS) {
    console.warn("⚠️  SMTP credentials not configured. Email will be attempted but may fail.");
    console.warn("Set SMTP_USER and SMTP_PASS environment variables for production use.");
  }

  console.log("📧 Attempting to send email to:", registration.email);
  console.log("Using email config:", {
    from: `${EMAIL_FROM_NAME} <${EMAIL_FROM}>`,
    host: SMTP_HOST,
    port: SMTP_PORT
  });

  try {
    // Convert data URL to buffer for attachment
    const base64Data = qrCodeDataUrl.replace(/^data:image\/png;base64,/, "");
    const qrCodeBuffer = Buffer.from(base64Data, "base64");

    const mailOptions = {
      from: `${EMAIL_FROM_NAME} <${EMAIL_FROM}>`,
      to: `${registration.name} <${registration.email}>`,
      subject: `Your Event QR Code - ${registration.id}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 30px;
              text-align: center;
              border-radius: 10px 10px 0 0;
            }
            .content {
              background: #f9f9f9;
              padding: 30px;
              border-radius: 0 0 10px 10px;
            }
            .qr-code {
              text-align: center;
              margin: 30px 0;
              padding: 20px;
              background: white;
              border-radius: 10px;
            }
            .qr-code img {
              max-width: 300px;
              height: auto;
            }
            .info-box {
              background: white;
              padding: 20px;
              margin: 20px 0;
              border-left: 4px solid #667eea;
              border-radius: 5px;
            }
            .button {
              display: inline-block;
              padding: 12px 30px;
              background: #667eea;
              color: white;
              text-decoration: none;
              border-radius: 5px;
              margin: 10px 0;
            }
            .footer {
              text-align: center;
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #ddd;
              color: #666;
              font-size: 12px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Your Event Registration</h1>
              <p>Registration ID: ${registration.id}</p>
            </div>
            
            <div class="content">
              <h2>Hello ${registration.name}!</h2>
              
              <p>Thank you for registering for our event. Your QR code is ready!</p>
              
              <div class="info-box">
                <strong>Registration Details:</strong><br>
                Name: ${registration.name}<br>
                Email: ${registration.email}<br>
                Organization: ${registration.organization}<br>
                Group Size: ${registration.groupSize}<br>
                Registration ID: ${registration.id}
              </div>
              
              <div class="qr-code">
                <h3>Your QR Code</h3>
                <img src="cid:qrcode" alt="QR Code" />
                <p style="color: #666; font-size: 14px;">
                  📥 Download the attached QR code image or show it on your phone at the event
                </p>
              </div>
              
              <div style="text-align: center;">
                <a href="${verificationUrl}" class="button">View Your Registration</a>
              </div>
              
              <div class="info-box">
                <strong>Important:</strong><br>
                • Please save this email or take a screenshot of the QR code<br>
                • Show this QR code at the event entrance<br>
                • Your QR code can be scanned up to ${registration.maxScans} time(s) for entry<br>
                • Keep your registration ID (${registration.id}) handy
              </div>
            </div>
            
            <div class="footer">
              <p>This is an automated email. Please do not reply to this message.</p>
              <p>If you have any questions, please contact the event organizers.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      attachments: [
        {
          filename: `QR-Code-${registration.id}.png`,
          content: qrCodeBuffer,
          cid: "qrcode" // Content ID for embedding in HTML
        }
      ]
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ QR code email sent successfully to ${registration.email}`);
    console.log("Message ID:", info.messageId);
    return true;
  } catch (error: any) {
    console.error("❌ Error sending QR code email:");
    console.error("Error message:", error.message);
    console.error("Full error:", error);
    return false;
  }
}

// Test email configuration
export async function testEmailConnection(): Promise<boolean> {
  if (!SMTP_USER || !SMTP_PASS) {
    console.warn("⚠️  SMTP credentials not configured");
    return false;
  }

  try {
    await transporter.verify();
    console.log("✅ SMTP connection verified successfully");
    console.log(`Connected to ${SMTP_HOST}:${SMTP_PORT}`);
    return true;
  } catch (error: any) {
    console.error("❌ SMTP connection failed:");
    console.error("Error:", error.message);
    return false;
  }
}

// Verify email configuration
export function isEmailConfigured(): boolean {
  return !!(SMTP_USER && SMTP_PASS);
}
