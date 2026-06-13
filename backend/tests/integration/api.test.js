const request = require("supertest");
const mongoose = require("mongoose");
const app = require("../../server");

// Test database connection
const TEST_DB_URI = process.env.TEST_MONGODB_URI || process.env.MONGODB_URI;

describe("SnapFix API Integration Tests", () => {
  let server;
  let customerToken;
  let mechanicToken;
  let customerId;
  let mechanicId;
  let vehicleId;
  let serviceRequestId;

  beforeAll(async () => {
    // Start server
    server = app.listen(4001);

    // Wait for database connection
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(TEST_DB_URI);
    }
  });

  afterAll(async () => {
    // Clean up test data
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.db.dropDatabase();
      await mongoose.connection.close();
    }

    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  describe("Health Check", () => {
    test("GET /health should return server status", async () => {
      const response = await request(app).get("/health").expect(200);

      expect(response.body).toHaveProperty("success", true);
      expect(response.body).toHaveProperty("message", "SnapFix API is running");
      expect(response.body).toHaveProperty("timestamp");
      expect(response.body).toHaveProperty("environment", "development");
    });
  });

  describe("Authentication", () => {
    describe("User Registration", () => {
      test("POST /api/auth/register should register a customer", async () => {
        const customerData = {
          name: "Test Customer",
          email: "customer@test.com",
          phone: "+11234567890",
          password: "Password123!",
          role: "customer",
        };

        const response = await request(app)
          .post("/api/auth/register")
          .send(customerData)
          .expect(201);

        expect(response.body).toHaveProperty("success", true);
        expect(response.body.data).toHaveProperty("user");
        expect(response.body.data).toHaveProperty("tokens");
        expect(response.body.data.user.email).toBe(customerData.email);
        expect(response.body.data.user.role).toBe("customer");

        customerToken = response.body.data.tokens.accessToken;
        customerId = response.body.data.user.id;
      });

      test("POST /api/auth/register should register a mechanic", async () => {
        const mechanicData = {
          name: "Test Mechanic",
          email: "mechanic@test.com",
          phone: "+11234567891",
          password: "Password123!",
          role: "mechanic",
        };

        const response = await request(app)
          .post("/api/auth/register")
          .send(mechanicData)
          .expect(201);

        expect(response.body).toHaveProperty("success", true);
        expect(response.body.data.user.role).toBe("mechanic");

        mechanicToken = response.body.data.tokens.accessToken;
        mechanicId = response.body.data.user.id;
      });

      test("POST /api/auth/register should reject invalid data", async () => {
        const invalidData = {
          name: "Test",
          email: "invalid-email",
          phone: "123",
          password: "weak",
          role: "invalid",
        };

        const response = await request(app)
          .post("/api/auth/register")
          .send(invalidData)
          .expect(400);

        expect(response.body).toHaveProperty("success", false);
        expect(response.body).toHaveProperty("errors");
      });
    });

    describe("User Login", () => {
      test("POST /api/auth/login should login successfully", async () => {
        const loginData = {
          email: "customer@test.com",
          password: "Password123!",
        };

        const response = await request(app)
          .post("/api/auth/login")
          .send(loginData)
          .expect(200);

        expect(response.body).toHaveProperty("success", true);
        expect(response.body.data).toHaveProperty("user");
        expect(response.body.data).toHaveProperty("tokens");
      });

      test("POST /api/auth/login should reject invalid credentials", async () => {
        const invalidLogin = {
          email: "customer@test.com",
          password: "wrongpassword",
        };

        const response = await request(app)
          .post("/api/auth/login")
          .send(invalidLogin)
          .expect(401);

        expect(response.body).toHaveProperty("success", false);
      });
    });
  });

  describe("Customer Features", () => {
    describe("Profile Management", () => {
      test("GET /api/customer/profile should return customer profile", async () => {
        const response = await request(app)
          .get("/api/customer/profile")
          .set("Authorization", `Bearer ${customerToken}`)
          .expect(200);

        expect(response.body).toHaveProperty("success", true);
        expect(response.body.data).toHaveProperty("email", "customer@test.com");
        expect(response.body.data).toHaveProperty("vehicles");
      });

      test("PATCH /api/customer/profile should update profile", async () => {
        const updateData = {
          name: "Updated Customer Name",
        };

        const response = await request(app)
          .patch("/api/customer/profile")
          .set("Authorization", `Bearer ${customerToken}`)
          .send(updateData)
          .expect(200);

        expect(response.body).toHaveProperty("success", true);
        expect(response.body.data.name).toBe(updateData.name);
      });
    });

    describe("Vehicle Management", () => {
      test("POST /api/customer/vehicles should add a vehicle", async () => {
        const vehicleData = {
          type: "car",
          model: "Toyota Camry 2020",
          plate: "TEST123",
        };

        const response = await request(app)
          .post("/api/customer/vehicles")
          .set("Authorization", `Bearer ${customerToken}`)
          .send(vehicleData)
          .expect(201);

        expect(response.body).toHaveProperty("success", true);
        expect(response.body.data.type).toBe(vehicleData.type);
        expect(response.body.data.plate).toBe(vehicleData.plate);

        vehicleId = response.body.data._id;
      });

      test("GET /api/customer/vehicles should return user vehicles", async () => {
        const response = await request(app)
          .get("/api/customer/vehicles")
          .set("Authorization", `Bearer ${customerToken}`)
          .expect(200);

        expect(response.body).toHaveProperty("success", true);
        expect(Array.isArray(response.body.data)).toBe(true);
        expect(response.body.data.length).toBeGreaterThan(0);
      });

      test("PATCH /api/customer/vehicles/:vehicleId should update vehicle", async () => {
        const updateData = {
          model: "Toyota Camry 2021 Updated",
        };

        const response = await request(app)
          .patch(`/api/customer/vehicles/${vehicleId}`)
          .set("Authorization", `Bearer ${customerToken}`)
          .send(updateData)
          .expect(200);

        expect(response.body).toHaveProperty("success", true);
        expect(response.body.data.model).toBe(updateData.model);
      });
    });

    describe("Service Requests", () => {
      test("POST /api/customer/requests should create a service request", async () => {
        const requestData = {
          issueType: "engine_trouble",
          description: "Car broke down on highway",
          vehicleInfo: {
            type: "car",
            model: "Toyota Camry",
            year: 2020,
            plate: "TEST123",
          },
          location: {
            lat: 40.7128,
            lng: -74.006,
            address: "New York, NY",
          },
          priority: "high",
        };

        const response = await request(app)
          .post("/api/customer/requests")
          .set("Authorization", `Bearer ${customerToken}`)
          .send(requestData)
          .expect(201);

        expect(response.body).toHaveProperty("success", true);
        expect(response.body.data.request.issueType).toBe(
          requestData.issueType,
        );
        expect(response.body.data.request.status).toBe("pending");
        expect(response.body.data).toHaveProperty("quotation");

        serviceRequestId = response.body.data.request._id;
      });

      test("GET /api/customer/requests should return customer requests", async () => {
        const response = await request(app)
          .get("/api/customer/requests")
          .set("Authorization", `Bearer ${customerToken}`)
          .expect(200);

        expect(response.body).toHaveProperty("success", true);
        expect(Array.isArray(response.body.data.requests)).toBe(true);
        expect(response.body.data.requests.length).toBeGreaterThan(0);
      });

      test("GET /api/customer/requests/:id should return specific request", async () => {
        const response = await request(app)
          .get(`/api/customer/requests/${serviceRequestId}`)
          .set("Authorization", `Bearer ${customerToken}`)
          .expect(200);

        expect(response.body).toHaveProperty("success", true);
        expect(response.body.data._id).toBe(serviceRequestId);
      });
    });
  });

  describe("Mechanic Features", () => {
    describe("Service Requests", () => {
      test("GET /api/mechanic/requests should return available requests", async () => {
        const response = await request(app)
          .get("/api/mechanic/requests")
          .set("Authorization", `Bearer ${mechanicToken}`)
          .expect(200);

        expect(response.body).toHaveProperty("success", true);
        expect(response.body.data).toHaveProperty("requests");
        expect(response.body.data).toHaveProperty("pagination");
      });

      test("GET /api/mechanic/profile should return mechanic profile", async () => {
        const response = await request(app)
          .get("/api/mechanic/profile")
          .set("Authorization", `Bearer ${mechanicToken}`)
          .expect(200);

        expect(response.body).toHaveProperty("success", true);
        expect(response.body.data.role).toBe("mechanic");
      });
    });
  });

  describe("Payment System", () => {
    test("POST /api/payments/create-order should validate payment data", async () => {
      const paymentData = {
        serviceRequestId: serviceRequestId,
        amount: 100,
        paymentMethod: "card",
      };

      const response = await request(app)
        .post("/api/payments/create-order")
        .set("Authorization", `Bearer ${customerToken}`)
        .send(paymentData);

      // Should fail because service request is not completed
      expect(response.body).toHaveProperty("success", false);
    });
  });

  describe("Authorization Tests", () => {
    test("Should reject requests without token", async () => {
      const response = await request(app)
        .get("/api/customer/profile")
        .expect(401);

      expect(response.body).toHaveProperty("success", false);
    });

    test("Should reject customer accessing mechanic routes", async () => {
      const response = await request(app)
        .get("/api/mechanic/requests")
        .set("Authorization", `Bearer ${customerToken}`)
        .expect(403);

      expect(response.body).toHaveProperty("success", false);
    });

    test("Should reject mechanic accessing customer routes", async () => {
      const response = await request(app)
        .post("/api/customer/vehicles")
        .set("Authorization", `Bearer ${mechanicToken}`)
        .send({ type: "car", model: "Test", plate: "TEST" })
        .expect(403);

      expect(response.body).toHaveProperty("success", false);
    });
  });

  describe("Validation Tests", () => {
    test("Should validate service request data", async () => {
      const invalidRequest = {
        issueType: "invalid_type",
        description: "",
        vehicleInfo: {},
        location: {},
      };

      const response = await request(app)
        .post("/api/customer/requests")
        .set("Authorization", `Bearer ${customerToken}`)
        .send(invalidRequest)
        .expect(400);

      expect(response.body).toHaveProperty("success", false);
      expect(response.body).toHaveProperty("errors");
    });

    test("Should validate vehicle data", async () => {
      const invalidVehicle = {
        type: "invalid_type",
        model: "",
        plate: "",
      };

      const response = await request(app)
        .post("/api/customer/vehicles")
        .set("Authorization", `Bearer ${customerToken}`)
        .send(invalidVehicle)
        .expect(400);

      expect(response.body).toHaveProperty("success", false);
    });
  });

  describe("Rate Limiting", () => {
    test("Should enforce rate limits", async () => {
      // Make multiple rapid requests to test rate limiting
      const promises = Array(20)
        .fill()
        .map(() =>
          request(app).post("/api/auth/login").send({
            email: "test@example.com",
            password: "password",
          }),
        );

      const responses = await Promise.all(promises);

      // Some requests should be rate limited (429 status)
      const rateLimitedResponses = responses.filter(
        (res) => res.status === 429,
      );
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });
});
