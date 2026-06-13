const swaggerJsdoc = require("swagger-jsdoc");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "SnapFix API",
      version: "1.0.0",
      description: "Real-time roadside assistance platform API documentation",
      contact: {
        name: "SnapFix Team",
        email: "support@snapfix.com",
      },
    },
    servers: [
      {
        url:
          process.env.NODE_ENV === "production"
            ? "https://api.snapfix.com"
            : `http://localhost:${process.env.PORT || 3001}`,
        description:
          process.env.NODE_ENV === "production"
            ? "Production server"
            : "Development server",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
      schemas: {
        User: {
          type: "object",
          properties: {
            _id: { type: "string" },
            name: { type: "string" },
            email: { type: "string" },
            phone: { type: "string" },
            role: { type: "string", enum: ["customer", "mechanic", "admin"] },
            location: {
              type: "object",
              properties: {
                lat: { type: "number" },
                lng: { type: "number" },
              },
            },
            vehicles: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  type: { type: "string" },
                  model: { type: "string" },
                  plate: { type: "string" },
                },
              },
            },
            rating: { type: "number" },
            totalReviews: { type: "number" },
          },
        },
        ServiceRequest: {
          type: "object",
          properties: {
            _id: { type: "string" },
            customerId: { type: "string" },
            mechanicId: { type: "string" },
            issueType: { type: "string" },
            vehicleInfo: { type: "object" },
            images: { type: "array", items: { type: "string" } },
            location: {
              type: "object",
              properties: {
                lat: { type: "number" },
                lng: { type: "number" },
              },
            },
            status: {
              type: "string",
              enum: [
                "pending",
                "assigned",
                "enroute",
                "in_progress",
                "completed",
                "cancelled",
              ],
            },
            quotation: { type: "number" },
            history: { type: "array" },
          },
        },
        Error: {
          type: "object",
          properties: {
            success: { type: "boolean", example: false },
            message: { type: "string" },
            error: { type: "string" },
          },
        },
        Success: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            message: { type: "string" },
            data: { type: "object" },
          },
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ["./src/routes/*.js", "./src/controllers/*.js"],
};

const specs = swaggerJsdoc(options);

module.exports = specs;
