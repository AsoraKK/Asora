import { ready } from '../../src/shared/routes/ready';
import { configService } from '../../shared/configService';

// Mock the HttpRequest
const mockRequest = {} as any;

describe('ready endpoint', () => {
  it('should return 200 with ready status when Cosmos is configured', async () => {
    jest.spyOn(configService, 'getHealthSummary').mockReturnValue({
      environment: 'test',
      cosmos: { configured: true, databaseName: 'asora-db' },
      notifications: { enabled: false, fcmProjectId: '', fcmConfigured: false },
    });

    const response = await ready(mockRequest);

    expect(response.status).toBe(200);
    expect(response.jsonBody).toMatchObject({ status: 'ready', checks: { cosmos: true } });
  });

  it('should return 503 when Cosmos is not configured', async () => {
    jest.spyOn(configService, 'getHealthSummary').mockReturnValue({
      environment: 'test',
      cosmos: { configured: false, databaseName: '' },
      notifications: { enabled: false, fcmProjectId: '', fcmConfigured: false },
    });

    const response = await ready(mockRequest);

    expect(response.status).toBe(503);
    expect(response.jsonBody).toMatchObject({ status: 'not_ready', checks: { cosmos: false } });
  });
});
