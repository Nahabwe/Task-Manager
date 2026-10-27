
const request = require("supertest");
const app = require("../app");

describe("Authentication API", () => {
  const testEmail = `test-${Date.now()}@example.com`;

  test("POST /auth/register creates a user", async () => {
    const response = await request(app)
      .post("/auth/register")
      .send({
        name: "Test User",
        email: testEmail,
        password: "SecurePass123"
      });

    expect(response.status).toBe(201);
    expect(response.body.message).toBe(
      "User registered successfully"
    );

    expect(response.body.user.name).toBe("Test User");
    expect(response.body.user.email).toBe(testEmail);
    expect(response.body.user.id).toBeDefined();

    // The password and its hash must not be returned.
    expect(response.body.user.password).toBeUndefined();
    expect(response.body.user.password_hash).toBeUndefined();
  });

  test("POST /auth/register rejects an invalid email", async () => {
    const response = await request(app)
      .post("/auth/register")
      .send({
        name: "Test User",
        email: "not-an-email",
        password: "SecurePass123"
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe(
      "A valid email is required"
    );
  });

  test("POST /auth/register rejects a short password", async () => {
    const response = await request(app)
      .post("/auth/register")
      .send({
        name: "Test User",
        email: `short-${Date.now()}@example.com`,
        password: "123"
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe(
      "Password must be at least 8 characters"
    );
  });

  test("POST /auth/register rejects a duplicate email", async () => {
    const email = `duplicate-${Date.now()}@example.com`;

    const firstResponse = await request(app)
      .post("/auth/register")
      .send({
        name: "First User",
        email,
        password: "SecurePass123"
      });

    expect(firstResponse.status).toBe(201);

    const secondResponse = await request(app)
      .post("/auth/register")
      .send({
        name: "Second User",
        email: email.toUpperCase(),
        password: "AnotherPass123"
      });

    expect(secondResponse.status).toBe(409);
    expect(secondResponse.body.message).toBe(
      "An account with this email already exists"
    );
  });


  
  describe("Login API", () => {
    test("logs in a registered user", async () => {
      const email = `login-${Date.now()}@example.com`;
      const password = "SecurePass123";
  
      // Create a user first.
      const registration = await request(app)
        .post("/auth/register")
        .send({
          name: "Login Test User",
          email,
          password
        });
  
      expect(registration.status).toBe(201);
  
      // Attempt to log in with the same credentials.
      const response = await request(app)
        .post("/auth/login")
        .send({ email, password });
  
      expect(response.status).toBe(200);
      expect(response.body.message).toBe("Login successful");
      expect(response.body.token).toBeDefined();
      expect(response.body.user.email).toBe(email);
      expect(response.body.user.password_hash).toBeUndefined();
    });
  
    test("rejects an incorrect password", async () => {
      const email = `wrong-password-${Date.now()}@example.com`;
  
      await request(app)
        .post("/auth/register")
        .send({
          name: "Password Test User",
          email,
          password: "CorrectPass123"
        });
  
      const response = await request(app)
        .post("/auth/login")
        .send({
          email,
          password: "WrongPass123"
        });
  
      expect(response.status).toBe(401);
      expect(response.body.message).toBe(
        "Invalid email or password"
      );
    });
  
    test("rejects an email that does not exist", async () => {
      const response = await request(app)
        .post("/auth/login")
        .send({
          email: `missing-${Date.now()}@example.com`,
          password: "SecurePass123"
        });
  
      expect(response.status).toBe(401);
      expect(response.body.message).toBe(
        "Invalid email or password"
      );
    });
  });



  
  describe("Login API", () => {
    test("logs in a registered user", async () => {
      const email = `login-${Date.now()}@example.com`;
      const password = "SecurePass123";
  
      // Create a user first.
      const registration = await request(app)
        .post("/auth/register")
        .send({
          name: "Login Test User",
          email,
          password
        });
  
      expect(registration.status).toBe(201);
  
      // Attempt to log in with the same credentials.
      const response = await request(app)
        .post("/auth/login")
        .send({ email, password });
  
      expect(response.status).toBe(200);
      expect(response.body.message).toBe("Login successful");
      expect(response.body.token).toBeDefined();
      expect(response.body.user.email).toBe(email);
      expect(response.body.user.password_hash).toBeUndefined();
    });
  
    test("rejects an incorrect password", async () => {
      const email = `wrong-password-${Date.now()}@example.com`;
  
      await request(app)
        .post("/auth/register")
        .send({
          name: "Password Test User",
          email,
          password: "CorrectPass123"
        });
  
      const response = await request(app)
        .post("/auth/login")
        .send({
          email,
          password: "WrongPass123"
        });
  
      expect(response.status).toBe(401);
      expect(response.body.message).toBe(
        "Invalid email or password"
      );
    });
  
    test("rejects an email that does not exist", async () => {
      const response = await request(app)
        .post("/auth/login")
        .send({
          email: `missing-${Date.now()}@example.com`,
          password: "SecurePass123"
        });
  
      expect(response.status).toBe(401);
      expect(response.body.message).toBe(
        "Invalid email or password"
      );
    });
  });
  
});
