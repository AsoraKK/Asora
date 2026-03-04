/**
 * Analytics Validation Tests
 *
 * Purpose: Test strict validation and PII prevention
 */

import { describe, it, expect } from '@jest/globals';
import { validatePayload, sanitizePayload, ValidationError } from './validation';
import type { AnalyticsPayload } from './types';

describe('Analytics Validation', () => {
	describe('validatePayload', () => {
		const validPayload: AnalyticsPayload = {
			sessionId: 'test-session-123',
			events: [
				{
					name: 'screen_view',
					ts: new Date().toISOString(),
					props: { screen_name: 'feed' },
				},
			],
			app: {
				version: '1.0.0',
				platform: 'android',
			},
		};

		it('should accept valid payload', () => {
			expect(() => validatePayload(validPayload)).not.toThrow();
		});

		it('should reject payload with invalid event name', () => {
			const invalid = {
				...validPayload,
				events: [{ name: 'Invalid Name!', ts: new Date().toISOString() }],
			};
			expect(() => validatePayload(invalid)).toThrow(ValidationError);
		});

		it('should reject payload with too many events', () => {
			const invalid = {
				...validPayload,
				events: Array(51)
					.fill(null)
					.map(() => ({ name: 'test', ts: new Date().toISOString() })),
			};
			expect(() => validatePayload(invalid)).toThrow(ValidationError);
			expect(() => validatePayload(invalid)).toThrow(/Too many events/);
		});

		it('should reject payload with too many properties', () => {
			const props = Object.fromEntries(Array(21).fill(null).map((_, i) => [`key${i}`, 'value']));
			const invalid = {
				...validPayload,
				events: [{ name: 'test', ts: new Date().toISOString(), props }],
			};
			expect(() => validatePayload(invalid)).toThrow(ValidationError);
			expect(() => validatePayload(invalid)).toThrow(/Too many properties/);
		});

		it('should reject invalid platform', () => {
			const invalid = {
				...validPayload,
				app: { version: '1.0.0', platform: 'invalid' as any },
			};
			expect(() => validatePayload(invalid)).toThrow(ValidationError);
		});

		it('should reject payload with nested objects in properties', () => {
			const invalid = {
				...validPayload,
				events: [
					{
						name: 'test',
						ts: new Date().toISOString(),
						props: { nested: { bad: 'object' } },
					},
				],
			};
			expect(() => validatePayload(invalid)).toThrow(ValidationError);
		});

		it('should accept scalar property types', () => {
			const payload = {
				...validPayload,
				events: [
					{
						name: 'test',
						ts: new Date().toISOString(),
						props: {
							string: 'value',
							number: 42,
							boolean: true,
							null_value: null,
						},
					},
				],
			};
			expect(() => validatePayload(payload)).not.toThrow();
		});

		it('should accept small arrays of scalars', () => {
			const payload = {
				...validPayload,
				events: [
					{
						name: 'test',
						ts: new Date().toISOString(),
						props: {
							tags: ['tag1', 'tag2', 'tag3'],
							ids: [1, 2, 3],
						},
					},
				],
			};
			expect(() => validatePayload(payload)).not.toThrow();
		});

		it('should reject large arrays', () => {
			const payload = {
				...validPayload,
				events: [
					{
						name: 'test',
						ts: new Date().toISOString(),
						props: {
							large_array: Array(11).fill('item'),
						},
					},
				],
			};
			expect(() => validatePayload(payload)).toThrow(ValidationError);
		});

		it('should reject timestamps too far in past', () => {
			const old = new Date();
			old.setDate(old.getDate() - 2); // 2 days ago
			const payload = {
				...validPayload,
				events: [{ name: 'test', ts: old.toISOString() }],
			};
			expect(() => validatePayload(payload)).toThrow(ValidationError);
		});
	});

	describe('sanitizePayload', () => {
		it('should use verified userId instead of client-provided', () => {
			const payload: AnalyticsPayload = {
				userId: 'client-provided-id',
				sessionId: 'test-session',
				events: [{ name: 'test', ts: new Date().toISOString() }],
				app: { version: '1.0.0', platform: 'android' },
			};

			const sanitized = sanitizePayload(payload, 'verified-user-id', 'ip-hash', 'prod', 'eu-west');

			expect(sanitized[0].userId).toBe('verified-user-id');
		});

		it('should set userId to null for guests', () => {
			const payload: AnalyticsPayload = {
				sessionId: 'test-session',
				events: [{ name: 'test', ts: new Date().toISOString() }],
				app: { version: '1.0.0', platform: 'android' },
			};

			const sanitized = sanitizePayload(payload, null, undefined, 'dev', 'local');

			expect(sanitized[0].userId).toBeNull();
			expect(sanitized[0].metadata.userType).toBe('guest');
		});

		it('should include server-side metadata', () => {
			const payload: AnalyticsPayload = {
				sessionId: 'test-session',
				events: [{ name: 'test', ts: new Date().toISOString() }],
				app: { version: '1.0.0', platform: 'android' },
			};

			const sanitized = sanitizePayload(payload, 'user-id', 'ip-hash-123', 'prod', 'north-europe');

			expect(sanitized[0].metadata).toMatchObject({
				env: 'prod',
				region: 'north-europe',
				userType: 'registered',
				ipHash: 'ip-hash-123',
			});
			expect(sanitized[0].metadata.ingestedAt).toBeInstanceOf(Date);
		});

		it('should sanitize multiple events in batch', () => {
			const payload: AnalyticsPayload = {
				sessionId: 'test-session',
				events: [
					{ name: 'event1', ts: new Date().toISOString() },
					{ name: 'event2', ts: new Date().toISOString() },
					{ name: 'event3', ts: new Date().toISOString() },
				],
				app: { version: '1.0.0', platform: 'ios' },
			};

			const sanitized = sanitizePayload(payload, 'user-id', undefined, 'dev', 'local');

			expect(sanitized).toHaveLength(3);
			expect(sanitized.map((e) => e.eventName)).toEqual(['event1', 'event2', 'event3']);
		});
	});
});
