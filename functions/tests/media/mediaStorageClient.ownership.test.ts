describe('mediaStorageClient ownership validation', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = {
      ...originalEnv,
      MEDIA_STORAGE_ACCOUNT: 'asoramedia',
      MEDIA_CONTAINER: 'user-media',
      MEDIA_VERIFY_BLOB_ON_POST: 'false',
    };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('accepts owned blob URLs for the authenticated user', async () => {
    const module = await import('../../src/media/mediaStorageClient');
    const result = await module.validateOwnedMediaUrls('user-123', [
      'https://asoramedia.blob.core.windows.net/user-media/user-123/2026-02-16/a.jpg',
    ]);

    expect(result).toEqual({ valid: true, invalidUrls: [] });
  });

  it('rejects blob URLs owned by a different user', async () => {
    const module = await import('../../src/media/mediaStorageClient');
    const result = await module.validateOwnedMediaUrls('user-123', [
      'https://asoramedia.blob.core.windows.net/user-media/user-999/2026-02-16/a.jpg',
    ]);

    expect(result.valid).toBe(false);
    expect(result.reason).toBe('ownership_mismatch');
    expect(result.invalidUrls).toHaveLength(1);
  });

  it('rejects non-storage or malformed URLs', async () => {
    const module = await import('../../src/media/mediaStorageClient');
    const result = await module.validateOwnedMediaUrls('user-123', [
      'https://example.com/not-our-blob.jpg',
      'not a url',
    ]);

    expect(result.valid).toBe(false);
    expect(result.reason).toBe('ownership_mismatch');
    expect(result.invalidUrls).toHaveLength(2);
  });
});
