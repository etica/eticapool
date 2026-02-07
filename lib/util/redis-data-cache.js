import GeneralEventEmitterHandler from "./GeneralEventEmitterHandler.js";

class RedisDataCache {

    constructor(redisClient) {
        this.client = redisClient;
        this.prefix = 'eticapool:cache:';

        const handler = GeneralEventEmitterHandler.getInstance();
        const invalidator = () => {
            this.invalidate('miningContractData');
            this.invalidate('poolData');
            this.invalidate('ethBlockNumber');
        };

        if (handler.redisPubSub) {
            handler.onCrossProcess('newChallenge', invalidator).catch(err => {
                console.error('RedisDataCache newChallenge listener registration failed:', err);
            });
        } else {
            handler.on('newChallenge', invalidator);
        }
    }

    async get(key) {
        try {
            const val = await this.client.get(this.prefix + key);
            if (val === null) return null;
            return JSON.parse(val);
        } catch {
            return null;
        }
    }

    async set(key, value, ttlMs) {
        try {
            await this.client.set(this.prefix + key, JSON.stringify(value), 'PX', ttlMs);
        } catch (err) {
            console.error('RedisDataCache set error:', err);
        }
    }

    async invalidate(key) {
        try {
            await this.client.del(this.prefix + key);
        } catch (err) {
            console.error('RedisDataCache invalidate error:', err);
        }
    }

    async invalidateAll() {
        try {
            const keys = await this.client.keys(this.prefix + '*');
            if (keys.length > 0) {
                await this.client.del(...keys);
            }
        } catch (err) {
            console.error('RedisDataCache invalidateAll error:', err);
        }
    }

    static init(redisClient) {
        RedisDataCache._instance = new RedisDataCache(redisClient);
        return RedisDataCache._instance;
    }

    static getInstance() {
        return RedisDataCache._instance;
    }
}

RedisDataCache._instance = null;

export default RedisDataCache;
