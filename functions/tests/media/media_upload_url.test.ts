/// <reference types="jest" />
/**
 * Media Upload URL Endpoint Tests
 *
 * Tests for presigned SAS URL generation endpoint.
 */

// Mock Cosmos (required by shared modules)
jest.mock('@shared/clients/cosmos', () => ({
  getCosmosDatabase: jest.fn(() => ({
    container: jest.fn(() => ({
      item: jest.fn(),
      items: { create: jest.fn() },
    })),
  })),
}));

// Mock logger
jest.mock('@shared/utils/logger', () => ({
  getAzureLogger: jest.fn(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  })),
}));

// Mock JWT service
jest.mock('@auth/service/jwtService', () => ({
  jwtService: {
    verifyToken: jest.fn(),
  },
}));

// Mock media storage client
jest.mock('@media/mediaStorageClient', () => ({
  generateUploadSasUrl: jest.fn(),
  extractExtension: jest.requireActual('@media/mediaStorageClient').extractExtension,
  isMediaStorageConfigured: jest.fn(() => true),
  ALLOWED_CONTENT_TYPES: new Set([
    'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic',
  ]),
  ALLOWED_EXTENSIONS: new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic']),
  MAX_FILE_SIZE_MB: { free: 10, premium: 25, black: 25, admin: 50 },
  MAX_MEDIA_PER_POST: { free: 1, premium: 4, black: 5, admin: 10 },
}));

import type { InvocationContext } from '@azure/functions';
import { media_upload_url } from '@media/media_upload_url.function';
import { jwtService } from '@auth/service/jwtService';
import { generateUploadSasUrl, isMediaStorageConfigured } from '@media/mediaStorageClient';
import { httpReqMock } from '../helpers/http';

const mockedJwtService = jwtService as jest.Mocked<typeof jwtService>;
const mockedGenerateUploadSasUrl = generateUploadSasUrl as jest.MockedFunction<typeof generateUploadSasUrl>;
const mockedIsConfigured = isMediaStorageConfigured as jest.MockedFunction<typeof isMediaStorageConfigured>;

const createContextStub = (): InvocationContext =>
  ({
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    traceContext: {},
    invocationId: 'test-invocation-id',
    functionName: 'mediaUploadUrlTest',
  }) as unknown as InvocationContext;

describe('media_upload_url endpoint', () => {
  let context: InvocationContext;

  beforeEach(() => {
    jest.clearAllMocks();
    context = createContextStub();
    mockedJwtService.verifyToken.mockResolvedValue({
      sub: 'user-abc',
      roles: ['user'],
      tier: 'free',
    });
    mockedIsConfigured.mockReturnValue(true);
    mockedGenerateUploadSasUrl.mockResolvedValue({
      uploadUrl: 'https://storage.blob.core.windows.net/user-media/user-abc/2026-02-06/uuid.jpg?sas=token',
      blobUrl: 'https://storage.blob.core.windows.net/user-media/user-abc/2026-02-06/uuid.jpg',
      expiresAt: '2026-02-06T12:15:00.000Z',
    });
  });

  function authRequest(body?: Record<string, unknown>) {
    return httpReqMock({
      method: 'POST',
      headers: { authorization: 'Bearer token' },
      body,
    });
  }

  it('returns 401 when no auth token is provided', async () => {
    mockedJwtService.verifyToken.mockRejectedValue(new Error('Missing Authorization header'));
    const response = await media_upload_url(
      httpReqMock({ method: 'POST', body: { fileName: 'test.jpg', contentType: 'image/jpeg' } }),
      context,
    );
    expect(response.status).toBe(401);
  });

  it('returns 400 when fileName is missing', async () => {
    const response = await media_upload_url(
      authRequest({ contentType: 'image/jpeg' }),
      context,
    );
    expect(response.status).toBe(400);
    expect(response.jsonBody?.error.code).toBe('INVALID_FILE_NAME');
  });

  it('returns 400 when contentType is missing', async () => {
    const response = await media_upload_url(
      authRequest({ fileName: 'test.jpg' }),
      context,
    );
    expect(response.status).toBe(400);
    expect(response.jsonBody?.error.code).toBe('INVALID_CONTENT_TYPE');
  });

  it('returns 400 for unsupported file extension', async () => {
    const response = await media_upload_url(
      authRequest({ fileName: 'test.exe', contentType: 'application/exe' }),
      context,
    );
    expect(response.status).toBe(400);
    expect(response.jsonBody?.error.code).toBe('UNSUPPORTED_FILE_TYPE');
  });

  it('returns 400 for unsupported content type', async () => {
    const response = await media_upload_url(
      authRequest({ fileName: 'test.jpg', contentType: 'video/mp4' }),
      context,
    );
    expect(response.status).toBe(400);
    expect(response.jsonBody?.error.code).toBe('UNSUPPORTED_CONTENT_TYPE');
  });

  it('returns 400 when file size exceeds tier limit', async () => {
    const response = await media_upload_url(
      authRequest({
        fileName: 'test.jpg',
        contentType: 'image/jpeg',
        fileSizeBytes: 15 * 1024 * 1024, // 15MB, free tier allows 10MB
      }),
      context,
    );
    expect(response.status).toBe(400);
    expect(response.jsonBody?.error.code).toBe('FILE_TOO_LARGE');
  });

  it('returns 200 with upload URL for valid request', async () => {
    const response = await media_upload_url(
      authRequest({
        fileName: 'photo.jpg',
        contentType: 'image/jpeg',
        fileSizeBytes: 5 * 1024 * 1024, // 5MB
      }),
      context,
    );

    expect(response.status).toBe(200);
    expect(response.jsonBody?.uploadUrl).toContain('sas=token');
    expect(response.jsonBody?.blobUrl).toContain('user-media');
    expect(response.jsonBody?.expiresAt).toBeDefined();
    expect(mockedGenerateUploadSasUrl).toHaveBeenCalledWith(
      'user-abc',
      expect.any(String),
      'jpg',
      'image/jpeg',
    );
  });

  it('allows PNG uploads', async () => {
    const response = await media_upload_url(
      authRequest({
        fileName: 'screenshot.png',
        contentType: 'image/png',
      }),
      context,
    );

    expect(response.status).toBe(200);
    expect(mockedGenerateUploadSasUrl).toHaveBeenCalledWith(
      'user-abc',
      expect.any(String),
      'png',
      'image/png',
    );
  });

  it('allows larger files for premium tier', async () => {
    mockedJwtService.verifyToken.mockResolvedValue({
      sub: 'user-premium',
      roles: ['user'],
      tier: 'premium',
    });

    const response = await media_upload_url(
      authRequest({
        fileName: 'photo.jpg',
        contentType: 'image/jpeg',
        fileSizeBytes: 20 * 1024 * 1024, // 20MB, premium allows 25MB
      }),
      context,
    );

    expect(response.status).toBe(200);
  });

  it('returns 500 when media storage is not configured', async () => {
    mockedIsConfigured.mockReturnValue(false);
    const response = await media_upload_url(
      authRequest({
        fileName: 'photo.jpg',
        contentType: 'image/jpeg',
      }),
      context,
    );
    expect(response.status).toBe(500);
  });
});

describe('extractExtension', () => {
  // Import the real implementation
  const { extractExtension } = jest.requireActual('@media/mediaStorageClient');

  it('extracts jpg extension', () => {
    expect(extractExtension('photo.jpg')).toBe('jpg');
  });

  it('extracts png extension', () => {
    expect(extractExtension('screenshot.PNG')).toBe('png');
  });

  it('extracts webp extension', () => {
    expect(extractExtension('image.webp')).toBe('webp');
  });

  it('returns null for unsupported extensions', () => {
    expect(extractExtension('file.exe')).toBeNull();
    expect(extractExtension('file.pdf')).toBeNull();
    expect(extractExtension('file.mp4')).toBeNull();
  });

  it('returns null for files without extension', () => {
    expect(extractExtension('noextension')).toBeNull();
  });
});
