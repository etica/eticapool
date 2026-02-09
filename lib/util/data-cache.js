
import GeneralEventEmitterHandler from "./GeneralEventEmitterHandler.js";

class DataCache {

    constructor() {
        this.cache = new Map();
        this._challengeListenerRegistered = false;
    }

    // Register newChallenge listener using the appropriate method
    // (cross-process if Redis Pub/Sub is available, local-only otherwise).
    // Called lazily on first getInstance() use after Redis Pub/Sub may be set up.
    _ensureChallengeListener() {
        if (this._challengeListenerRegistered) return;
        this._challengeListenerRegistered = true;

        const handler = GeneralEventEmitterHandler.getInstance();
        const invalidator = () => {
            this.invalidate('miningContractData');
            this.invalidate('poolData');
            this.invalidate('ethBlockNumber');
        };

        if (handler.redisPubSub) {
            // onCrossProcess is async (awaits Redis SUBSCRIBE). Fire-and-forget here since
            // getInstance() is synchronous. Subscription completes well before first newChallenge.
            handler.onCrossProcess('newChallenge', invalidator).catch(err => {
                console.error('DataCache newChallenge listener registration failed:', err);
            });
        } else {
            handler.on('newChallenge', invalidator);
        }
    }

    get(key) {
        const entry = this.cache.get(key);
        if (!entry) return null;
        if (Date.now() > entry.expiresAt) {
            this.cache.delete(key);
            return null;
        }
        return entry.value;
    }

    set(key, value, ttlMs) {
        this.cache.set(key, {
            value: value,
            expiresAt: Date.now() + ttlMs
        });
    }

    invalidate(key) {
        this.cache.delete(key);
    }

    invalidateAll() {
        this.cache.clear();
    }

    static getInstance() {
        if (!DataCache.instance) {
            DataCache.instance = new DataCache();
        }
        DataCache.instance._ensureChallengeListener();
        return DataCache.instance;
    }

}

DataCache.instance = null;

export default DataCache;
