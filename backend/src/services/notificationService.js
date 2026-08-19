const nodemailer = require("nodemailer");
const logger = require("../config/logger");

// Notification service for email, SMS, and push notifications
class NotificationService {
  constructor() {
    this.emailTransporter = null;
    this.initializeEmailTransporter();

    // Notification templates
    this.templates = {
      email: {
        welcome: {
          subject: "Welcome to SnapFix",
          template: "welcome.html",
        },
        otp: {
          subject: "Your SnapFix OTP",
          template: "otp.html",
        },
        requestCreated: {
          subject: "Service Request Created",
          template: "request-created.html",
        },
        requestAssigned: {
          subject: "Mechanic Assigned to Your Request",
          template: "request-assigned.html",
        },
        requestCompleted: {
          subject: "Service Request Completed",
          template: "request-completed.html",
        },
        paymentSuccess: {
          subject: "Payment Successful",
          template: "payment-success.html",
        },
        passwordReset: {
          subject: "Reset Your Password",
          template: "password-reset.html",
        },
      },
      sms: {
        otp: "Your SnapFix OTP is: {{code}}. Valid for 10 minutes.",
        requestCreated:
          "Your service request has been created. Request ID: {{requestId}}",
        mechanicAssigned:
          "Mechanic {{mechanicName}} has been assigned to your request {{requestId}}",
        mechanicEnroute: "Your mechanic is on the way! ETA: {{eta}} minutes",
        serviceCompleted:
          "Service completed for request {{requestId}}. Please rate your experience.",
        paymentSuccess:
          "Payment of ₹{{amount}} completed successfully for request {{requestId}}",
      },
      push: {
        newRequest: {
          title: "New Service Request",
          body: "A new {{issueType}} request is available nearby",
        },
        requestAssigned: {
          title: "Request Assigned",
          body: "Your request has been assigned to {{mechanicName}}",
        },
        statusUpdate: {
          title: "Status Update",
          body: "Your service request status: {{status}}",
        },
      },
    };

    // Notification queues for different priorities
    this.queues = {
      high: [], // OTP, emergency requests
      medium: [], // Status updates, assignments
      low: [], // Marketing, tips
    };

    // Rate limiting
    this.rateLimits = new Map();

    // Start processing queues
    this.startQueueProcessing();
  }

  // Initialize email transporter
  initializeEmailTransporter() {
    try {
      const emailUser = process.env.EMAIL_USER;
      const emailPass = process.env.EMAIL_PASS;

      // Skip real SMTP initialization if credentials are default/missing or BYPASS_OTP is enabled
      if (!emailUser || !emailPass || emailUser === "demo@gmail.com" || process.env.BYPASS_OTP === "true") {
        logger.info("Notification email service running in bypass/demo mode");
        this.emailTransporter = null;
        return;
      }

      const host = process.env.EMAIL_HOST || "smtp.gmail.com";
      const port = parseInt(process.env.EMAIL_PORT) || 587;
      const secure = process.env.EMAIL_SECURE !== undefined 
        ? process.env.EMAIL_SECURE === "true" 
        : port === 465;

      this.emailTransporter = nodemailer.createTransport({
        host,
        port,
        secure,
        connectionTimeout: 5000,
        greetingTimeout: 5000,
        socketTimeout: 5000,
        auth: {
          user: emailUser,
          pass: emailPass.replace(/\s+/g, ""),
        },
        tls: {
          rejectUnauthorized: false,
        },
      });

      // Verify connection non-blockingly
      this.emailTransporter.verify((error, success) => {
        if (error) {
          logger.warn("Email transporter verification timed out or failed (will fallback to simulation): " + error.message);
        } else {
          logger.info("Email transporter ready for messages");
        }
      });
    } catch (error) {
      logger.error("Failed to initialize email transporter:", error.message);
      this.emailTransporter = null;
    }
  }

  // Send email notification
  async sendEmail({ to, subject, template, data = {}, priority = "medium" }) {
    try {
      if (!this.emailTransporter) {
        throw new Error("Email transporter not initialized");
      }

      // Check rate limiting
      if (this.isRateLimited("email", to)) {
        logger.warn(`Email rate limited for ${to}`);
        return { success: false, message: "Rate limited" };
      }

      // Generate HTML content
      const htmlContent = this.generateEmailHTML(template, data);

      const mailOptions = {
        from: `"SnapFix" <${process.env.EMAIL_USER}>`,
        to,
        subject,
        html: htmlContent,
        text: this.stripHTML(htmlContent),
      };

      // Add to queue or send immediately based on priority
      if (priority === "high") {
        const result = await this.emailTransporter.sendMail(mailOptions);
        this.updateRateLimit("email", to);

        logger.info("High priority email sent:", {
          to,
          subject,
          messageId: result.messageId,
        });

        return { success: true, messageId: result.messageId };
      } else {
        this.addToQueue(priority, "email", mailOptions);
        return { success: true, queued: true };
      }
    } catch (error) {
      logger.error("Email sending failed:", {
        to,
        subject,
        error: error.message,
      });
      if (
        process.env.NODE_ENV === "development" ||
        process.env.FALLBACK_TO_SIMULATION === "true" ||
        error.message.includes("auth") ||
        error.message.includes("login") ||
        error.message.includes("timeout") ||
        error.message.includes("connect")
      ) {
        logger.warn(
          `Email sending failed. Simulating success. Recipient: ${to}, Template: ${template}, Data:`,
          data,
        );
        return {
          success: true,
          messageId: `demo_fallback_${Date.now()}`,
          simulated: true,
        };
      }
      return { success: false, error: error.message };
    }
  }

  // Send SMS notification (simulated for hackathon)
  async sendSMS({ to, message, priority = "medium" }) {
    try {
      // Check rate limiting
      if (this.isRateLimited("sms", to)) {
        logger.warn(`SMS rate limited for ${to}`);
        return { success: false, message: "Rate limited" };
      }

      // In production, integrate with Twilio, AWS SNS, or other SMS service
      // For hackathon, we'll simulate SMS sending

      const smsData = {
        to,
        message,
        timestamp: new Date(),
        provider: "simulated",
      };

      if (priority === "high") {
        // Simulate immediate SMS sending
        await new Promise((resolve) => setTimeout(resolve, 100));
        this.updateRateLimit("sms", to);

        logger.info("High priority SMS sent (simulated):", smsData);

        // In production, this would be the actual SMS API response
        return {
          success: true,
          messageId: `sms_${Date.now()}`,
          provider: "simulated",
        };
      } else {
        this.addToQueue(priority, "sms", smsData);
        return { success: true, queued: true };
      }
    } catch (error) {
      logger.error("SMS sending failed:", {
        to,
        message,
        error: error.message,
      });
      return { success: false, error: error.message };
    }
  }

  // Send push notification
  async sendPushNotification({
    userId,
    title,
    body,
    data = {},
    priority = "medium",
  }) {
    try {
      // Check rate limiting
      if (this.isRateLimited("push", userId)) {
        logger.warn(`Push notification rate limited for ${userId}`);
        return { success: false, message: "Rate limited" };
      }

      const pushData = {
        userId,
        title,
        body,
        data,
        timestamp: new Date(),
      };

      // In production, integrate with FCM, APNs, or other push service
      // For hackathon, we'll log the notification

      if (priority === "high") {
        this.updateRateLimit("push", userId);

        logger.info(
          "High priority push notification sent (simulated):",
          pushData,
        );

        return {
          success: true,
          notificationId: `push_${Date.now()}`,
        };
      } else {
        this.addToQueue(priority, "push", pushData);
        return { success: true, queued: true };
      }
    } catch (error) {
      logger.error("Push notification failed:", {
        userId,
        title,
        error: error.message,
      });
      return { success: false, error: error.message };
    }
  }

  // Send OTP notification
  async sendOTP(identifier, code, type = "phone") {
    try {
      const data = { code, expiresIn: "10 minutes" };

      if (type === "phone") {
        const message = this.templates.sms.otp.replace("{{code}}", code);
        return await this.sendSMS({
          to: identifier,
          message,
          priority: "high",
        });
      } else if (type === "email") {
        return await this.sendEmail({
          to: identifier,
          subject: this.templates.email.otp.subject,
          template: "otp",
          data,
          priority: "high",
        });
      }

      throw new Error("Invalid OTP type");
    } catch (error) {
      logger.error("OTP sending failed:", error);
      return { success: false, error: error.message };
    }
  }

  // Service request notifications
  async notifyRequestCreated(customer, serviceRequest) {
    const notifications = [];

    // Email to customer
    if (customer.email) {
      notifications.push(
        this.sendEmail({
          to: customer.email,
          subject: this.templates.email.requestCreated.subject,
          template: "request-created",
          data: {
            customerName: customer.name,
            requestId: serviceRequest._id,
            issueType: serviceRequest.issueType,
            location: serviceRequest.location.address || "Location shared",
            estimatedCost: serviceRequest.quotation || "TBD",
          },
        }),
      );
    }

    // SMS to customer
    if (customer.phone) {
      const message = this.templates.sms.requestCreated.replace(
        "{{requestId}}",
        serviceRequest._id.toString().slice(-6),
      );

      notifications.push(
        this.sendSMS({
          to: customer.phone,
          message,
        }),
      );
    }

    return await Promise.allSettled(notifications);
  }

  async notifyMechanicAssigned(customer, mechanic, serviceRequest) {
    const notifications = [];

    // Notify customer
    if (customer.email) {
      notifications.push(
        this.sendEmail({
          to: customer.email,
          subject: this.templates.email.requestAssigned.subject,
          template: "request-assigned",
          data: {
            customerName: customer.name,
            mechanicName: mechanic.name,
            mechanicPhone: mechanic.phone,
            requestId: serviceRequest._id,
            issueType: serviceRequest.issueType,
            estimatedArrival: "20-30 minutes",
          },
        }),
      );
    }

    if (customer.phone) {
      const message = this.templates.sms.mechanicAssigned
        .replace("{{mechanicName}}", mechanic.name)
        .replace("{{requestId}}", serviceRequest._id.toString().slice(-6));

      notifications.push(
        this.sendSMS({
          to: customer.phone,
          message,
        }),
      );
    }

    return await Promise.allSettled(notifications);
  }

  async notifyStatusUpdate(customer, serviceRequest, status) {
    const notifications = [];
    let message = "";

    switch (status) {
      case "enroute":
        message = this.templates.sms.mechanicEnroute.replace(
          "{{eta}}",
          "20-30",
        );
        break;
      case "completed":
        message = this.templates.sms.serviceCompleted.replace(
          "{{requestId}}",
          serviceRequest._id.toString().slice(-6),
        );
        break;
      case "offered":
        message = `Mechanic has offered a quotation of ₹${serviceRequest.mechanicOfferPrice || serviceRequest.quotation} for your request. Please check the app to confirm.`;
        break;
      default:
        message = `Your service request status has been updated to: ${status}`;
    }

    if (customer.phone && message) {
      notifications.push(
        this.sendSMS({
          to: customer.phone,
          message,
        }),
      );
    }

    // Push notification
    notifications.push(
      this.sendPushNotification({
        userId: customer._id,
        title: this.templates.push.statusUpdate.title,
        body: this.templates.push.statusUpdate.body.replace(
          "{{status}}",
          status,
        ),
        data: {
          requestId: serviceRequest._id,
          status,
          type: "status_update",
        },
      }),
    );

    return await Promise.allSettled(notifications);
  }

  // Direct booking notification to specific mechanic
  async notifyDirectBooking(mechanic, serviceRequest) {
    const notifications = [];

    // Push notification for real-time alert
    notifications.push(
      this.sendPushNotification({
        userId: mechanic._id,
        title: "New Direct Booking Request",
        body: `You have a new direct booking request for ${serviceRequest.issueType}`,
        data: {
          requestId: serviceRequest._id,
          issueType: serviceRequest.issueType,
          location: serviceRequest.location,
          priority: serviceRequest.priority,
          estimatedCost: serviceRequest.quotation,
          type: "direct_booking",
        },
        priority: serviceRequest.priority === "emergency" ? "high" : "medium",
      }),
    );

    // SMS for critical/emergency requests
    if (serviceRequest.priority === "emergency" && mechanic.phone) {
      notifications.push(
        this.sendSMS({
          to: mechanic.phone,
          message: `URGENT: Direct booking request for ${serviceRequest.issueType}. Check your app immediately!`,
          priority: "high",
        }),
      );
    }

    return await Promise.allSettled(notifications);
  }

  // Broadcast notification to mechanics
  async broadcastToMechanics(serviceRequest, nearbyMechanics) {
    const notifications = [];

    for (const mechanic of nearbyMechanics) {
      // Push notification for real-time alert
      notifications.push(
        this.sendPushNotification({
          userId: mechanic._id,
          title: this.templates.push.newRequest.title,
          body: this.templates.push.newRequest.body.replace(
            "{{issueType}}",
            serviceRequest.issueType,
          ),
          data: {
            requestId: serviceRequest._id,
            issueType: serviceRequest.issueType,
            location: serviceRequest.location,
            priority: serviceRequest.priority,
            estimatedCost: serviceRequest.quotation,
            type: "new_request",
          },
          priority: serviceRequest.priority === "emergency" ? "high" : "medium",
        }),
      );

      // SMS for critical/emergency requests
      if (serviceRequest.priority === "emergency" && mechanic.phone) {
        notifications.push(
          this.sendSMS({
            to: mechanic.phone,
            message: `URGENT: Emergency ${serviceRequest.issueType} request nearby. Check your app immediately!`,
            priority: "high",
          }),
        );
      }
    }

    return await Promise.allSettled(notifications);
  }

  // Request rejection notification
  async notifyRequestRejected(customer, mechanic, serviceRequest, reason) {
    const notifications = [];

    // Push notification
    notifications.push(
      this.sendPushNotification({
        userId: customer._id,
        title: "Service Request Rejected",
        body: `Your service request has been rejected by ${mechanic.name}`,
        data: {
          requestId: serviceRequest._id,
          mechanicId: mechanic._id,
          reason,
          type: "request_rejected",
        },
        priority: "medium",
      }),
    );

    // Email notification
    if (customer.email) {
      notifications.push(
        this.sendEmail({
          to: customer.email,
          subject: "Service Request Rejected",
          template: "request-rejected",
          data: {
            customerName: customer.name,
            mechanicName: mechanic.name,
            requestId: serviceRequest._id,
            issueType: serviceRequest.issueType,
            reason: reason || "No reason provided",
            supportEmail: process.env.SUPPORT_EMAIL || "support@snapfix.com",
          },
        }),
      );
    }

    return await Promise.allSettled(notifications);
  }

  // Payment notifications
  async notifyPaymentSuccess(customer, payment, serviceRequest) {
    const notifications = [];

    if (customer.email) {
      notifications.push(
        this.sendEmail({
          to: customer.email,
          subject: this.templates.email.paymentSuccess.subject,
          template: "payment-success",
          data: {
            customerName: customer.name,
            amount: payment.amount,
            requestId: serviceRequest._id,
            paymentId: payment._id,
            receipt: payment.receipt,
          },
        }),
      );
    }

    if (customer.phone) {
      const message = this.templates.sms.paymentSuccess
        .replace("{{amount}}", payment.amount)
        .replace("{{requestId}}", serviceRequest._id.toString().slice(-6));

      notifications.push(
        this.sendSMS({
          to: customer.phone,
          message,
        }),
      );
    }

    return await Promise.allSettled(notifications);
  }

  // Mechanic Verification Notifications
  async notifyAdminNewVerification(verification) {
    const adminEmail = process.env.ADMIN_EMAIL || "admin@snapfix.com";
    try {
      return await this.sendEmail({
        to: adminEmail,
        subject: "New Mechanic Verification Request",
        template: "admin-new-verification",
        data: {
          mechanicName: verification.mechanicId.name,
          mechanicEmail: verification.mechanicId.email,
          shopName: verification.shopName,
          verificationId: verification._id.toString(),
        },
        priority: "medium",
      });
    } catch (error) {
      logger.error("Failed to send admin verification notification:", error);
    }
  }

  async notifyMechanicVerificationApproved(mechanic) {
    try {
      if (mechanic.email) {
        return await this.sendEmail({
          to: mechanic.email,
          subject: "Account Verified Successfully",
          template: "mechanic-verification-approved",
          data: {
            name: mechanic.name,
          },
          priority: "high",
        });
      }
    } catch (error) {
      logger.error("Failed to send mechanic verification approval notification:", error);
    }
  }

  async notifyMechanicVerificationRejected(mechanic, reason) {
    try {
      if (mechanic.email) {
        return await this.sendEmail({
          to: mechanic.email,
          subject: "Verification Request Update",
          template: "mechanic-verification-rejected",
          data: {
            name: mechanic.name,
            reason: reason || "No reason provided",
          },
          priority: "high",
        });
      }
    } catch (error) {
      logger.error("Failed to send mechanic verification rejection notification:", error);
    }
  }

  // Utility methods
  generateEmailHTML(template, data) {
    // Simple template engine for hackathon
    // In production, use proper template engine like Handlebars

    const templates = {
      welcome: `
        <h2>Welcome to SnapFix, {{name}}!</h2>
        <p>Your account has been created successfully.</p>
        <p>Get roadside assistance whenever you need it.</p>
      `,
      otp: `
        <h2>Your SnapFix OTP</h2>
        <p>Your verification code is: <strong>{{code}}</strong></p>
        <p>This code expires in {{expiresIn}}.</p>
      `,
      "request-created": `
        <h2>Service Request Created</h2>
        <p>Hi {{customerName}},</p>
        <p>Your service request has been created successfully.</p>
        <p><strong>Request ID:</strong> {{requestId}}</p>
        <p><strong>Issue:</strong> {{issueType}}</p>
        <p><strong>Location:</strong> {{location}}</p>
        <p>We're finding the best mechanic for you!</p>
      `,
      "request-assigned": `
        <h2>Mechanic Assigned</h2>
        <p>Hi {{customerName}},</p>
        <p>Great news! {{mechanicName}} has been assigned to your request.</p>
        <p><strong>Mechanic Contact:</strong> {{mechanicPhone}}</p>
        <p><strong>Estimated Arrival:</strong> {{estimatedArrival}}</p>
      `,
      "payment-success": `
        <h2>Payment Successful</h2>
        <p>Hi {{customerName}},</p>
        <p>Payment of ₹{{amount}} has been processed successfully.</p>
        <p><strong>Receipt Number:</strong> {{receipt}}</p>
        <p>Thank you for using SnapFix!</p>
      `,
      "password-reset": `
        <h2>Password Reset Request</h2>
        <p>Hi {{name}},</p>
        <p>You requested a password reset for your SnapFix account.</p>
        <p>Please click the link below to reset your password:</p>
        <p><a href="{{resetUrl}}" style="background-color: #2196F3; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Reset Password</a></p>
        <p>If you cannot click the link, copy and paste this URL into your browser:</p>
        <p>{{resetUrl}}</p>
        <p>This link will expire in {{expiresIn}}.</p>
        <p>If you didn't request this reset, please ignore this email.</p>
      `,
      "request-rejected": `
        <h2>Service Request Rejected</h2>
        <p>Hi {{customerName}},</p>
        <p>We regret to inform you that your service request has been rejected by mechanic {{mechanicName}}.</p>
        <p><strong>Reason:</strong> {{reason}}</p>
        <p>We are searching for another mechanic to assist you, or you can create a new request.</p>
      `,
      "admin-new-verification": `
        <h2>New Mechanic Verification Request</h2>
        <p>A new mechanic has submitted a verification request.</p>
        <p><strong>Mechanic Name:</strong> {{mechanicName}}</p>
        <p><strong>Email:</strong> {{mechanicEmail}}</p>
        <p><strong>Shop Name:</strong> {{shopName}}</p>
        <p>Please review this request in the Admin Dashboard.</p>
      `,
      "mechanic-verification-approved": `
        <h2>Verification Approved</h2>
        <p>Hi {{name}},</p>
        <p>Great news! Your SnapFix mechanic account has been verified successfully.</p>
        <p>You can now go online to receive service requests and start earning.</p>
      `,
      "mechanic-verification-rejected": `
        <h2>Verification Update</h2>
        <p>Hi {{name}},</p>
        <p>We regret to inform you that your SnapFix mechanic verification request was not approved.</p>
        <p><strong>Reason:</strong> {{reason}}</p>
        <p>You can update your details and submit a new request via the app.</p>
      `,
    };

    let html = templates[template] || "<p>{{message}}</p>";

    // Replace placeholders
    Object.keys(data).forEach((key) => {
      const regex = new RegExp(`{{${key}}}`, "g");
      html = html.replace(regex, data[key] || "");
    });

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            h2 { color: #2c5282; }
            .footer { margin-top: 20px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          ${html}
          <div class="footer">
            <p>This is an automated message from SnapFix. Please do not reply.</p>
          </div>
        </body>
      </html>
    `;
  }

  stripHTML(html) {
    return html.replace(/<[^>]*>/g, "").trim();
  }

  addToQueue(priority, type, data) {
    this.queues[priority].push({
      type,
      data,
      timestamp: new Date(),
      attempts: 0,
    });
  }

  isRateLimited(type, identifier) {
    const key = `${type}:${identifier}`;
    const limit = this.rateLimits.get(key);

    if (!limit) return false;

    const now = Date.now();
    const resetTime = limit.resetTime;

    if (now > resetTime) {
      this.rateLimits.delete(key);
      return false;
    }

    return limit.count >= this.getRateLimit(type);
  }

  updateRateLimit(type, identifier) {
    const key = `${type}:${identifier}`;
    const now = Date.now();
    const resetTime = now + 60 * 1000; // 1 minute window

    const existing = this.rateLimits.get(key);
    if (existing && now < existing.resetTime) {
      existing.count++;
    } else {
      this.rateLimits.set(key, { count: 1, resetTime });
    }
  }

  getRateLimit(type) {
    const limits = {
      email: 5, // 5 emails per minute
      sms: 3, // 3 SMS per minute
      push: 10, // 10 push notifications per minute
    };
    return limits[type] || 5;
  }

  // Queue processing
  startQueueProcessing() {
    setInterval(() => {
      this.processQueue("high");
    }, 1000); // Process high priority every second

    setInterval(() => {
      this.processQueue("medium");
    }, 5000); // Process medium priority every 5 seconds

    setInterval(() => {
      this.processQueue("low");
    }, 30000); // Process low priority every 30 seconds
  }

  async processQueue(priority) {
    const queue = this.queues[priority];
    if (queue.length === 0) return;

    const item = queue.shift();
    const { type, data } = item;

    try {
      switch (type) {
        case "email":
          await this.emailTransporter.sendMail(data);
          break;
        case "sms":
          // Process SMS from queue
          logger.info("SMS sent from queue (simulated):", data);
          break;
        case "push":
          // Process push notification from queue
          logger.info("Push notification sent from queue (simulated):", data);
          break;
      }

      logger.info(
        `${priority} priority ${type} notification processed from queue`,
      );
    } catch (error) {
      logger.error(`Queue processing failed for ${type}:`, error);

      // Retry logic
      item.attempts++;
      if (item.attempts < 3) {
        queue.push(item);
      }
    }
  }

  // Get queue status (for monitoring)
  getQueueStatus() {
    return {
      high: this.queues.high.length,
      medium: this.queues.medium.length,
      low: this.queues.low.length,
      total:
        this.queues.high.length +
        this.queues.medium.length +
        this.queues.low.length,
    };
  }
}

module.exports = new NotificationService();
