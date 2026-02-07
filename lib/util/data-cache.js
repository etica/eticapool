
import GeneralEventEmitterHandler from "./GeneralEventEmitterHandler.js";

class DataCache {

    constructor() {
        this.cache = new Map();

        GeneralEventEmitterHandler.getInstance().on('newChallenge', () => {
            this.invalidate('miningContractData');
            this.invalidate('poolData');
            this.invalidate('ethBlockNumber');
        });
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
        return DataCache.instance;
    }

}

DataCache.instance = null;

export default DataCache;
