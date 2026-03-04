// Force @azure/functions test mode and stub app.http registration
process.env.AZURE_FUNCTIONS_UNIT_TEST = '1';

// Mock app.http to no-op to avoid console warnings and side effects
jest.mock('@azure/functions', () => {
  const actual = jest.requireActual('@azure/functions');
  return {
    ...actual,
    app: {
      http: jest.fn(),
      storageQueue: jest.fn(),
      timer: jest.fn(),
    },
  };
});

// Global Cosmos DB mock to prevent module-level initialization errors
jest.mock('@azure/cosmos', () => {
  const mockContainer = {
    item: jest.fn().mockReturnValue({
      read: jest.fn(),
      delete: jest.fn(),
      replace: jest.fn(),
    }),
    items: {
      query: jest.fn().mockReturnValue({ fetchAll: jest.fn().mockResolvedValue({ resources: [] }) }),
      create: jest.fn(),
    },
  };

  return {
    CosmosClient: jest.fn().mockImplementation(() => ({
      database: jest.fn().mockReturnValue({
        container: jest.fn().mockReturnValue(mockContainer),
      }),
    })),
  };
});
