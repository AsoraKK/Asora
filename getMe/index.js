const jwt = require("jsonwebtoken");
const { Client } = require("pg");

module.exports = async function (context, req) {
    try {
        // Extract and validate Authorization header
        const authHeader = req.headers.authorization;
        const jwtSecret = process.env.JWT_SECRET;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            context.res = { 
                status: 401, 
                headers: { 'Content-Type': 'application/json' },
                body: { error: "Missing or invalid Authorization header" } 
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

        // Extract token and verify
        const token = authHeader.replace("Bearer ", "");
        let decoded;

        try {
            decoded = jwt.verify(token, jwtSecret);
            context.log(`Token verified for user: ${decoded.email}`);
        } catch (jwtError) {
            context.log.error('JWT verification failed:', jwtError.message);
            context.res = { 
                status: 401, 
                headers: { 'Content-Type': 'application/json' },
                body: { error: "Invalid or expired token" } 
            };
            return;
        }

        // Connect to PostgreSQL and fetch user data
        const client = new Client({
            host: "asora-pg-dev-ne.postgres.database.azure.com",
            port: 5432,
            user: "KyleKern@asora-pg-dev-ne",
            password: process.env.POSTGRES_PASSWORD,
            database: "asora",
            ssl: {
                rejectUnauthorized: false
            },
            connectionTimeoutMillis: 10000,
            query_timeout: 5000,
            statement_timeout: 5000
        });

        try {
            await client.connect();
            context.log(`Connected to database for user lookup: ${decoded.email}`);

            // Fetch full user profile from database
            const userQuery = await client.query(
                "SELECT id, email, created_at, role, reputation_score, tier FROM users WHERE email = $1",
                [decoded.email]
            );

            if (userQuery.rows.length === 0) {
                context.log.warn(`User not found in database: ${decoded.email}`);
                
                // Check if this is a temporary token
                if (decoded.temp) {
                    context.res = {
                        status: 200,
                        headers: { 'Content-Type': 'application/json' },
                        body: {
                            message: "User verified successfully (temporary mode)",
                            user: {
                                id: decoded.sub,
                                email: decoded.email,
                                role: decoded.role,
                                reputationScore: 0,
                                tier: decoded.tier,
                                createdAt: new Date().toISOString(),
                                isTemporary: true,
                                tokenIssued: new Date(decoded.iat * 1000).toISOString(),
                                tokenExpires: new Date(decoded.exp * 1000).toISOString()
                            }
                        }
                    };
                    return;
                }
                
                context.res = { 
                    status: 404, 
                    headers: { 'Content-Type': 'application/json' },
                    body: { error: "User not found" } 
                };
                return;
            }

            const user = userQuery.rows[0];
            
            // Return user profile data
            context.res = {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
                body: {
                    message: "User verified successfully",
                    user: {
                        id: user.id,
                        email: user.email,
                        role: user.role,
                        reputationScore: user.reputation_score,
                        tier: user.tier,
                        createdAt: user.created_at,
                        // Token metadata for client validation
                        tokenIssued: new Date(decoded.iat * 1000).toISOString(),
                        tokenExpires: new Date(decoded.exp * 1000).toISOString()
                    }
                }
            };

            context.log(`✅ User profile returned for: ${user.email} (ID: ${user.id})`);

        } catch (dbError) {
            context.log.warn(`Database lookup failed: ${dbError.message}`);
            
            // Fallback: Return user info from JWT token
            context.res = {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
                body: {
                    message: "User verified successfully (from token)",
                    user: {
                        id: decoded.sub,
                        email: decoded.email,
                        role: decoded.role || 'user',
                        reputationScore: 0,
                        tier: decoded.tier || 'free',
                        createdAt: new Date(decoded.iat * 1000).toISOString(),
                        isTemporary: true,
                        tokenIssued: new Date(decoded.iat * 1000).toISOString(),
                        tokenExpires: new Date(decoded.exp * 1000).toISOString()
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
        context.log.error('Error in getMe function:', error);
        
        context.res = {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
            body: {
                error: 'Internal server error',
                message: process.env.NODE_ENV === 'development' ? error.message : 'Unable to fetch user profile'
            }
        };
    }
};
