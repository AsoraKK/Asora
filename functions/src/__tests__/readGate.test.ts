import { enforceReadGate } from '../shared/guards';

// Mock dependencies
jest.mock('@azure/cosmos');

describe('Read Gate Enforcement', () => {
  let mockContainer: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockContainer = {
      item: jest.fn().mockReturnThis(),
      read: jest.fn(),
    };
  });

  it('should allow access for users without accountLocked', async () => {
    // Arrange
    mockContainer.read.mockResolvedValue({
      resource: { id: 'user123', accountLocked: false },
    });

    const user = { sub: 'user123' };

    // Act & Assert
    await expect(enforceReadGate(user, mockContainer)).resolves.not.toThrow();
  });

  it('should block access for users with accountLocked=true', async () => {
    // Arrange
    mockContainer.read.mockResolvedValue({
      resource: { id: 'user123', accountLocked: true },
    });

    const user = { sub: 'user123' };

    // Act & Assert
    await expect(enforceReadGate(user, mockContainer)).rejects.toThrow(
      'First post required to unlock reading'
    );
  });

  it('should allow access when user not found', async () => {
    // Arrange
    mockContainer.read.mockResolvedValue({ resource: null });

    const user = { sub: 'user123' };

    // Act & Assert
    await expect(enforceReadGate(user, mockContainer)).resolves.not.toThrow();
  });
});
