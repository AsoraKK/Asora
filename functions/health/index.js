module.exports = async function (context, _req) {
  context.log('Health check endpoint called');

  const healthCheck = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'asora-functions',
    version: '1.0.0',
  };

  context.res = {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
    },
    body: healthCheck,
  };
};
