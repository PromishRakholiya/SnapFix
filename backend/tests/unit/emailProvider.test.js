const nodemailer = require("nodemailer");
const https = require("https");
const logger = require("../../src/config/logger");

// Mock nodemailer
jest.mock("nodemailer", () => ({
  createTransport: jest.fn().mockReturnValue({
    verify: jest.fn().mockResolvedValue(true),
    sendMail: jest.fn().mockResolvedValue({ messageId: "smtp_test_123" })
  })
}));

// Mock https request
jest.mock("https", () => ({
  request: jest.fn()
}));

// Mock logger
jest.mock("../../src/config/logger", () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
}));

describe("EmailProvider", () => {
  const originalEnv = { ...process.env };
  let emailProvider;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe("SMTP Mode (Default)", () => {
    it("should initialize with SMTP by default when no EMAIL_PROVIDER is set", () => {
      process.env.EMAIL_USER = "test@gmail.com";
      process.env.EMAIL_PASS = "app_password_123";
      process.env.EMAIL_PROVIDER = undefined;

      jest.isolateModules(() => {
        emailProvider = require("../../src/services/emailProvider");
      });

      expect(emailProvider.provider).toBe("smtp");
      expect(nodemailer.createTransport).toHaveBeenCalled();
      expect(emailProvider.isConfigured).toBe(true);
    });

    it("should send email via SMTP when provider is smtp", async () => {
      process.env.EMAIL_USER = "test@gmail.com";
      process.env.EMAIL_PASS = "app_password_123";
      process.env.EMAIL_PROVIDER = "smtp";

      jest.isolateModules(() => {
        emailProvider = require("../../src/services/emailProvider");
      });

      const mailOptions = {
        to: "recipient@test.com",
        subject: "SMTP Test",
        html: "<p>SMTP</p>"
      };

      const result = await emailProvider.sendMail(mailOptions);
      expect(result.messageId).toBe("smtp_test_123");
      expect(emailProvider.transporter.sendMail).toHaveBeenCalled();
    });

    it("should run in simulation mode if credentials are missing", async () => {
      process.env.EMAIL_USER = undefined;
      process.env.EMAIL_PASS = undefined;

      jest.isolateModules(() => {
        emailProvider = require("../../src/services/emailProvider");
      });

      expect(emailProvider.isConfigured).toBe(false);

      const result = await emailProvider.sendMail({
        to: "recipient@test.com",
        subject: "Simulated Test",
        html: "<p>Simulated</p>"
      });

      expect(result.messageId).toContain("simulated_");
    });
  });

  describe("Resend Mode", () => {
    it("should initialize with Resend provider when EMAIL_PROVIDER is resend", () => {
      process.env.EMAIL_PROVIDER = "resend";
      process.env.RESEND_API_KEY = "re_123456";

      jest.isolateModules(() => {
        emailProvider = require("../../src/services/emailProvider");
      });

      expect(emailProvider.provider).toBe("resend");
      expect(emailProvider.isConfigured).toBe(true);
    });

    it("should send email via Resend API HTTP POST request", async () => {
      process.env.EMAIL_PROVIDER = "resend";
      process.env.RESEND_API_KEY = "re_123456";
      process.env.EMAIL_USER = "test@gmail.com";

      jest.isolateModules(() => {
        emailProvider = require("../../src/services/emailProvider");
      });

      // Mock https.request success response
      const mockReq = {
        write: jest.fn(),
        end: jest.fn(),
        on: jest.fn()
      };
      
      https.request.mockImplementation((url, options, callback) => {
        expect(url).toBe("https://api.resend.com/emails");
        expect(options.method).toBe("POST");
        expect(options.headers.Authorization).toBe("Bearer re_123456");

        const mockRes = {
          statusCode: 200,
          on: jest.fn((event, handler) => {
            if (event === "data") {
              setImmediate(() => handler(JSON.stringify({ id: "resend_123_abc" })));
            }
            if (event === "end") {
              setImmediate(() => handler());
            }
          })
        };
        setImmediate(() => callback(mockRes));
        return mockReq;
      });

      const mailOptions = {
        to: "recipient@test.com",
        subject: "Resend Test",
        html: "<p>Resend</p>"
      };

      const result = await emailProvider.sendMail(mailOptions);
      expect(result.messageId).toBe("resend_123_abc");
      expect(mockReq.write).toHaveBeenCalled();
      expect(mockReq.end).toHaveBeenCalled();
    });
  });

  describe("SendGrid Mode", () => {
    it("should initialize with SendGrid provider when EMAIL_PROVIDER is sendgrid", () => {
      process.env.EMAIL_PROVIDER = "sendgrid";
      process.env.SENDGRID_API_KEY = "sg_123456";

      jest.isolateModules(() => {
        emailProvider = require("../../src/services/emailProvider");
      });

      expect(emailProvider.provider).toBe("sendgrid");
      expect(emailProvider.isConfigured).toBe(true);
    });

    it("should send email via SendGrid API HTTP POST request", async () => {
      process.env.EMAIL_PROVIDER = "sendgrid";
      process.env.SENDGRID_API_KEY = "sg_123456";
      process.env.EMAIL_USER = "test@gmail.com";

      jest.isolateModules(() => {
        emailProvider = require("../../src/services/emailProvider");
      });

      const mockReq = {
        write: jest.fn(),
        end: jest.fn(),
        on: jest.fn()
      };
      
      https.request.mockImplementation((url, options, callback) => {
        expect(url).toBe("https://api.sendgrid.com/v3/mail/send");
        expect(options.method).toBe("POST");
        expect(options.headers.Authorization).toBe("Bearer sg_123456");

        const mockRes = {
          statusCode: 202,
          headers: { "x-message-id": "sg_msg_id_789" },
          on: jest.fn((event, handler) => {
            if (event === "end") {
              setImmediate(() => handler());
            }
          })
        };
        setImmediate(() => callback(mockRes));
        return mockReq;
      });

      const mailOptions = {
        to: "recipient@test.com",
        subject: "SendGrid Test",
        html: "<p>SendGrid</p>"
      };

      const result = await emailProvider.sendMail(mailOptions);
      expect(result.messageId).toBe("sg_msg_id_789");
      expect(mockReq.write).toHaveBeenCalled();
      expect(mockReq.end).toHaveBeenCalled();
    });
  });
});
