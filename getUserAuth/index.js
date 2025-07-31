module.exports = async function (context, req) {
    try {
        // Access secrets from environment variables
        const postgresPassword = process.env.POSTGRES_PASSWORD;
        const cosmosKey = process.env.COSMOS_KEY;
        const jwtSecret = process.env.JWT_SECRET;

        // Log for debugging (don't do this in production!)
        context.log('Environment variables loaded successfully');
        
        // Example: Create a response that shows the secrets are accessible
        // (In production, never return actual secret values!)
        const response = {
            message: "Secrets loaded successfully",
            secretsAvailable: {
                postgres: !!postgresPassword,
                cosmos: !!cosmosKey,
                jwt: !!jwtSecret
            },
            // Example of using the secrets (without exposing them)
            exampleUsage: {
                postgresConnection: postgresPassword ? "PostgreSQL connection available" : "PostgreSQL not configured",
                cosmosConnection: cosmosKey ? "Cosmos DB connection available" : "Cosmos DB not configured",
                jwtEnabled: jwtSecret ? "JWT authentication enabled" : "JWT not configured"
            }
        };

        context.res = {
            status: 200,
            headers: {
                'Content-Type': 'application/json'
            },
            body: response
        };

    } catch (error) {
        context.log.error('Error in getUserAuth function:', error);
        
        context.res = {
            status: 500,
            headers: {
                'Content-Type': 'application/json'
            },
            body: {
                error: 'Internal server error',
                message: error.message
            }
        };
    }
};
