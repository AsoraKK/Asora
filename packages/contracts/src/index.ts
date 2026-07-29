export type DeclaredCreationMode = 'human' | 'ai_assisted' | 'ai_generated';

export type PublicContentLabel =
  | 'Human-authored'
  | 'AI-assisted'
  | 'AI-generated'
  | 'Under review';

export type GeoScope =
  | 'global'
  | 'country'
  | 'province'
  | 'municipality'
  | 'community'
  | 'none';

export interface EmailDeliveryReference {
  provider: string;
  messageId: string;
  acceptedAt: string;
}

export interface TransactionalEmailProvider {
  sendVerification(input: { to: string; token: string }): Promise<EmailDeliveryReference>;
  sendPasswordReset(input: { to: string; token: string }): Promise<EmailDeliveryReference>;
  sendSecurityNotice(input: { to: string; reason: string }): Promise<EmailDeliveryReference>;
  sendEmailChangeNotice(input: { to: string; token: string }): Promise<EmailDeliveryReference>;
  sendAccountDeletionNotice(input: { to: string; requestId: string }): Promise<EmailDeliveryReference>;
}

export interface CreatePostInput {
  body: string;
  declaredCreationMode: DeclaredCreationMode;
  geoScope: GeoScope;
  placeId?: string;
}

export interface ApiErrorBody {
  error: string;
  correlationId: string;
}

export interface UploadSessionResponse {
  uploadSessionId: string;
  objectKey: string;
  putUrl: string;
  expiresAt: string;
  contentType: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/avif';
  maxBytes: number;
  checksumSha256: string;
}
