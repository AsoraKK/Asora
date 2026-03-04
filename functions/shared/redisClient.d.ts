import Redis from 'ioredis';
export declare function isRedisEnabled(): boolean;
export declare function getRedisClient(): Redis | null;
export declare function closeRedis(): Promise<void>;
export declare function withRedis<T>(fn: (client: Redis) => Promise<T>): Promise<T | null>;
//# sourceMappingURL=redisClient.d.ts.map