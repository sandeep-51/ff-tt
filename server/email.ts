
import nodemailer from "nodemailer";
import type { Registration } from "@shared/schema";

const EMAIL_USER = process.env.EMAIL_USER || "";
const EMAIL_PASS = process.env.EMAIL_PASS || "";
const EMAIL_FROM = process.env.EMAIL_FROM || "noreply@event.com";
const SITE_URL = process.env.SITE_URL || "http://localhost:5000";

// Create reusable transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  host: "smtp.gmail.com",
  port: 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASS,
  },
  tls: {
    rejectUnauthorized: false
  }
});

// Log configuration on startup
console.log("📧 Email Service Configuration:");
console.log("- Service: Gmail");
console.log("- User:", EMAIL_USER || "NOT CONFIGURED");
console.log("- Password:", EMAIL_PASS ? "✅ SET (" + EMAIL_PASS.length + " chars)" : "❌ NOT SET");
console.log("- From:", EMAIL_FROM);

export async function sendQRCodeEmail(
  registration: Registration,
  qrCodeDataUrl: string,
  verificationUrl: string
): Promise<boolean> {
  if (!EMAIL_USER || !EMAIL_PASS) {
    console.error("❌ Email credentials not configured. Skipping email send.");
    console.error("EMAIL_USER:", EMAIL_USER);
    console.error("EMAIL_PASS:", EMAIL_PASS ? "SET" : "NOT SET");
    return false;
  }

  console.log("📧 Attempting to send email to:", registration.email);
  console.log("Using email config:", {
    user: EMAIL_USER,
    from: EMAIL_FROM,
    service: "gmail"
  });

  try {
    // Convert data URL to buffer for attachment
    const base64Data = qrCodeDataUrl.replace(/^data:image\/png;base64,/, "");
    const imageBuffer = Buffer.from(base64Data, 'base64');

    const mailOptions = {
      from: EMAIL_FROM,
      to: registration.email,
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
                • Your QR code can be scanned once for entry<br>
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
          content: imageBuffer,
          cid: 'qrcode', // Referenced in HTML as <img src="cid:qrcode">
          contentType: 'image/png'
        }
      ]
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ QR code email sent successfully to ${registration.email}`);
    console.log("Message ID:", info.messageId);
    console.log("Response:", info.response);
    return true;
  } catch (error: any) {
    console.error("❌ Error sending QR code email:");
    console.error("Error message:", error.message);
    console.error("Error code:", error.code);
    console.error("Full error:", error);
    return false;
  }
}

// Test email configuration
export async function testEmailConnection(): Promise<boolean> {
  if (!EMAIL_USER || !EMAIL_PASS) {
    console.error("❌ Email credentials not configured");
    return false;
  }

  try {
    await transporter.verify();
    console.log("✅ Email server connection verified successfully");
    return true;
  } catch (error: any) {
    console.error("❌ Email server connection failed:");
    console.error("Error:", error.message);
    return false;
  }
}

// Verify email configuration
export function isEmailConfigured(): boolean {
  return !!(EMAIL_USER && EMAIL_PASS);
}
