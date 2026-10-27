
const jwt = require("jsonwebtoken");

function authenticateToken(req, res, next) {
  // 1. Make sure the JWT secret is configured.
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    console.error("JWT_SECRET is missing");

    return res.status(500).json({
      message: "Internal server error"
    });
  }

  // 2. Read the Authorization header.
  const authHeader = req.headers.authorization;

  // 3. Require the Bearer token format.
  if (!authHeader || !/^Bearer\s+\S+$/i.test(authHeader)) {
    return res.status(401).json({
      message: "Authentication token required"
    });
  }

  // 4. Extract the token.
  const token = authHeader.split(/\s+/)[1];

  try {
    // 5. Verify the token's signature and expiration.
    const decoded = jwt.verify(token, secret);

    // 6. Validate the user ID stored in the token.
    if (
      typeof decoded.sub !== "string" ||
      !/^[1-9]\d*$/.test(decoded.sub) ||
      !Number.isSafeInteger(Number(decoded.sub))
    ) {
      return res.status(401).json({
        message: "Invalid or expired token"
      });
    }

    // 7. Attach the authenticated user's ID to the request.
    req.user = {
      id: Number(decoded.sub)
    };

    // 8. Allow the request to continue.
    return next();
  } catch (err) {
    // Invalid, expired, or incorrectly signed token.
    return res.status(401).json({
      message: "Invalid or expired token"
    });
  }
}

module.exports = authenticateToken;
