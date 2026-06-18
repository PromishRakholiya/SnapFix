const nodemailer = require("nodemailer");
const https = require("https");
const logger = require("../config/logger");

class EmailProvider {
  constructor() {
    this.provider = (process.env.EMAIL_PROVIDER || "smtp").toLowerCase();
    this.transporter = null;
    this.isConfigured = false;
    this.initialize();
  }

  initialize() {
    if (this.provider === "resend") {
      const apiKey = process.env.RESEND_API_KEY || process.env.EMAIL_PASS;
      if (!apiKey || apiKey === "demo_password" || apiKey === "your_gmail_app_password" || apiKey === "mbql lywc vnup ojdp") {
        logger.warn("Resend API key not configured - running in simulation/demo mode");
        this.isConfigured = false;
      } else {
        this.isConfigured = true;
        logger.info("Email service initialized with Resend provider");
      }
    } else if (this.provider === "sendgrid") {
      const apiKey = process.env.SENDGRID_API_KEY || process.env.EMAIL_PASS;
      if (!apiKey || apiKey === "demo_password" || apiKey === "your_gmail_app_password" || apiKey === "mbql lywc vnup ojdp") {
        logger.warn("SendGrid API key not configured - running in simulation/demo mode");
        this.isConfigured = false;
      } else {
        this.isConfigured = true;
        logger.info("Email service initialized with SendGrid provider");
      }
    } else {
      // Default: SMTP / Gmail
      const user = process.env.EMAIL_USER;
      const pass = process.env.EMAIL_PASS;
      
      if (!user || !pass || user === "demo@gmail.com" || pass === "demo_password") {
        logger.warn("SMTP email service not configured with valid credentials - running in simulation/demo mode");
        this.isConfigured = false;
        return;
      }

      try {
        const smtpConfig = {
          service: process.env.EMAIL_SERVICE || "gmail",
          host: process.env.EMAIL_HOST || "smtp.gmail.com",
          port: parseInt(process.env.EMAIL_PORT) || 587,
          secure: process.env.EMAIL_SECURE === "true",
          connectionTimeout: 5000,
          greetingTimeout: 5000,
          socketTimeout: 5000,
          auth: {
            user,
            pass,
          },
        };

        // If not using Gmail, TLS options can help with certificate validation issues
        if (smtpConfig.host !== "smtp.gmail.com") {
          smtpConfig.tls = {
            rejectUnauthorized: false
          };
        }

        this.transporter = nodemailer.createTransport(smtpConfig);
        this.isConfigured = true;
        logger.info(`Email service initialized with SMTP provider (${smtpConfig.host}:${smtpConfig.port})`);
      } catch (error) {
        logger.error("Failed to create SMTP transporter:", error.message);
        this.isConfigured = false;
      }
    }
  }

  async testConnection() {
    if (!this.isConfigured) {
      return true; // Don't block app start in demo mode
    }

    if (this.provider === "smtp" && this.transporter) {
      try {
        await this.transporter.verify();
        logger.info("SMTP connection verified successfully");
        return true;
      } catch (error) {
        logger.error("SMTP connection verification failed:", error.message);
        return false;
      }
    }

    // HTTP API providers (Resend, SendGrid) are verified on demand, but we return true here
    return true;
  }

  // Matching signature to nodemailer transporter's verify function
  verify(callback) {
    if (typeof callback === "function") {
      this.testConnection().then(
        (success) => {
          if (success) callback(null, true);
          else callback(new Error("Verification failed"), null);
        },
        (err) => callback(err, null)
      );
      return;
    }

    return this.testConnection().then((success) => {
      if (!success) {
        throw new Error("Verification failed");
      }
      return true;
    });
  }

  async sendMail(mailOptions) {
    if (!this.isConfigured) {
      logger.warn("Email service is in simulation mode. Simulating send.", {
        to: mailOptions.to,
        subject: mailOptions.subject
      });
      return { messageId: `simulated_${Date.now()}` };
    }

    const fromAddress = process.env.EMAIL_FROM || process.env.EMAIL_USER || "snapfix005@gmail.com";
    const fromName = process.env.EMAIL_FROM_NAME || "SnapFix Support";

    // Standardize from address
    let fromString = `"${fromName}" <${fromAddress}>`;
    if (mailOptions.from) {
      if (typeof mailOptions.from === "string") {
        fromString = mailOptions.from;
      } else if (typeof mailOptions.from === "object") {
        const name = mailOptions.from.name || fromName;
        const addr = mailOptions.from.address || fromAddress;
        fromString = `"${name}" <${addr}>`;
      }
    }

    const to = Array.isArray(mailOptions.to) ? mailOptions.to.join(", ") : mailOptions.to;
    const subject = mailOptions.subject;
    const html = mailOptions.html;
    const text = mailOptions.text || "";

    if (this.provider === "resend") {
      return this.sendViaResend({ to, subject, html, text, fromString });
    } else if (this.provider === "sendgrid") {
      return this.sendViaSendGrid({ to, subject, html, text, fromName, fromAddress });
    } else {
      // SMTP send
      if (!this.transporter) {
        throw new Error("SMTP transporter is not initialized");
      }
      // Override from if not set to ensure valid sender
      const smtpMailOptions = {
        ...mailOptions,
        from: fromString
      };
      return await this.transporter.sendMail(smtpMailOptions);
    }
  }

  sendViaResend({ to, subject, html, text, fromString }) {
    const apiKey = process.env.RESEND_API_KEY || process.env.EMAIL_PASS;
    return new Promise((resolve, reject) => {
      const body = JSON.stringify({
        from: fromString,
        to: to.split(",").map(email => email.trim()),
        subject,
        html,
        text
      });

      const req = https.request(
        "https://api.resend.com/emails",
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json"
          }
        },
        (res) => {
          let responseData = "";
          res.on("data", (chunk) => {
            responseData += chunk;
          });
          res.on("end", () => {
            if (res.statusCode >= 200 && res.statusCode < 300) {
              try {
                const parsed = JSON.parse(responseData);
                resolve({ messageId: parsed.id || `resend_${Date.now()}` });
              } catch (e) {
                resolve({ messageId: `resend_${Date.now()}` });
              }
            } else {
              reject(new Error(`Resend API failed with status ${res.statusCode}: ${responseData}`));
            }
          });
        }
      );

      req.on("error", (err) => reject(err));
      req.write(body);
      req.end();
    });
  }

  sendViaSendGrid({ to, subject, html, text, fromName, fromAddress }) {
    const apiKey = process.env.SENDGRID_API_KEY || process.env.EMAIL_PASS;
    return new Promise((resolve, reject) => {
      const body = JSON.stringify({
        personalizations: [
          {
            to: to.split(",").map(email => ({ email: email.trim() }))
          }
        ],
        from: {
          email: fromAddress,
          name: fromName
        },
        subject,
        content: [
          {
            type: "text/html",
            value: html
          },
          ...(text ? [{ type: "text/plain", value: text }] : [])
        ]
      });

      const req = https.request(
        "https://api.sendgrid.com/v3/mail/send",
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json"
          }
        },
        (res) => {
          let responseData = "";
          res.on("data", (chunk) => {
            responseData += chunk;
          });
          res.on("end", () => {
            if (res.statusCode >= 200 && res.statusCode < 300) {
              resolve({ messageId: res.headers["x-message-id"] || `sendgrid_${Date.now()}` });
            } else {
              reject(new Error(`SendGrid API failed with status ${res.statusCode}: ${responseData}`));
            }
          });
        }
      );

      req.on("error", (err) => reject(err));
      req.write(body);
      req.end();
    });
  }
}

module.exports = new EmailProvider();
