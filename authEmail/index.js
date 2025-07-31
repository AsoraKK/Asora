const jwt = require("jsonwebtoken");
const { Client } = require("pg");

module.exports = async function (context, req) {
  try {
    const email = req.body?.email;
    const jwtSecret = process.env.JWT_SECRET;

    // Validate input
    if (!email) {
      context.res = { 
        status: 400, 
        headers: { 'Content-Type': 'application/json' },
        body: { error: "Missing email address" } 
      };
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      context.res = { 
        status: 400, 
        headers: { 'Content-Type': 'application/json' },
        body: { error: "Invalid email format" } 
      };
      return;
    }

    if (!jwtSecret) {
      context.log.error('JWT_SECRET not configured');
      context.res = { 
        status: 500, 
        headers: { 'Content-Type': 'application/json' },
        body: { error: "Server configuration error" } 
      };
      return;
    }

    // Connect to PostgreSQL with improved settings
    const client = new Client({
      host: "asora-pg-dev-ne.postgres.database.azure.com",
      port: 5432,
      user: "KyleKern@asora-pg-dev-ne",
      password: process.env.POSTGRES_PASSWORD,
      database: "asora",
      ssl: {
        rejectUnauthorized: false
      },
      connectionTimeoutMillis: 10000, // Increased timeout
      query_timeout: 5000, // Increased query timeout
      statement_timeout: 5000
    });

    try {
      await client.connect();
      context.log(`✅ Connected to PostgreSQL database for: ${email}`);

      // Ensure users table exists (create if needed)
      await client.query(`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          email TEXT UNIQUE NOT NULL,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          role TEXT DEFAULT 'user' CHECK (role IN ('user', 'moderator', 'admin')),
          reputation_score INT DEFAULT 0 CHECK (reputation_score >= 0),
          tier TEXT DEFAULT 'free' CHECK (tier IN ('free', 'premium', 'enterprise'))
        )
      `);

      // Check if user exists or create new user
      const checkQuery = await client.query(
        "SELECT id, email, role, reputation_score, tier, created_at FROM users WHERE email = $1", 
        [email]
      );

      let user;

      if (checkQuery.rows.length > 0) {
        // Existing user
        user = checkQuery.rows[0];
        context.log(`✅ Existing user authenticated: ${email} (ID: ${user.id})`);
      } else {
        // Create new user
        const insertQuery = await client.query(
          `INSERT INTO users (email, created_at, role, reputation_score, tier) 
           VALUES ($1, NOW(), 'user', 0, 'free') 
           RETURNING id, email, role, reputation_score, tier, created_at`,
          [email]
        );
        user = insertQuery.rows[0];
        context.log(`🆕 New user created: ${email} (ID: ${user.id})`);
      }

      // Generate JWT with user data from database
      const token = jwt.sign(
        {
          sub: user.id.toString(),
          email: user.email,
          role: user.role,
          tier: user.tier,
          iat: Math.floor(Date.now() / 1000)
        },
        jwtSecret,
        { expiresIn: "24h" }
      );

      context.res = {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: {
          message: "Authentication successful",
          token,
          user: {
            id: user.id,
            email: user.email,
            role: user.role,
            tier: user.tier,
            isNewUser: checkQuery.rows.length === 0
          }
        }
      };

    } catch (dbError) {
      context.log.warn(`Database connection failed: ${dbError.message}`);
      context.log.warn('Falling back to temporary user creation for development');
      
      // Fallback: Create temporary user for development/testing
      const tempUser = {
        id: Math.floor(Math.random() * 1000000), // Temporary ID
        email: email,
        role: 'user',
        tier: 'free'
      };

      const token = jwt.sign(
        {
          sub: tempUser.id.toString(),
          email: tempUser.email,
          role: tempUser.role,
          tier: tempUser.tier,
          iat: Math.floor(Date.now() / 1000),
          temp: true // Flag to indicate this is a temporary user
        },
        jwtSecret,
        { expiresIn: "24h" }
      );

      context.res = {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: {
          message: "Authentication successful (temporary mode)",
          token,
          user: {
            id: tempUser.id,
            email: tempUser.email,
            role: tempUser.role,
            tier: tempUser.tier,
            isNewUser: true,
            isTemporary: true
          }
        }
      };
    } finally {
      try {
        await client.end();
      } catch (e) {
        // Ignore cleanup errors
      }
    }

  } catch (error) {
    context.log.error('Error in authEmail function:', error);
    
    context.res = {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
      body: {
        error: 'Authentication failed',
        message: process.env.NODE_ENV === 'development' ? error.message : 'Unable to process authentication'
      }
    };
  }
};
